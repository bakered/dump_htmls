// overlay.js
// Handles pie chart overlay rendering and interaction

let pieChart = null;
let importsChart = null;
let tariffsChart = null;

let importsData = [];
let tariffsData = [];
  
// Load both data files once
(async () => {
    // set the filepath to where the data and the settings are saved 
    const data_filepath = `/static/${user_id}`;  // Path to user-specific map data
    
    // Fetch the user-specific data and settings files
    const data = await fetch(`${data_filepath}/mapData.json`).then(response => response.json());

    try {
        importsData = await fetch(`${data_filepath}/imports_by_group.json`).then(res => res.json());
        tariffsData = await fetch(`${data_filepath}/avg_tariff_by_group.json`).then(res => res.json());
    } catch (err) {
        console.error("Error loading bar chart data:", err);
    }

    //console.log(importsData);
    //console.log(tariffsData);


    })();


export function showPieChart(code, tariff_structure) {
    
    const numericCode = parseInt(code); // ensure number
    //console.log("Imports for", code, importsData.filter(d => d.code === code));
    //console.log("Tariffs for", code, "year", tariff_structure, tariffsData.filter(d => d.code === code && d.tariff_structure === tariff_structure));

    const overlay = document.getElementById("pieOverlay");
    const pieContainer = document.getElementById("pieContainer");
    const importsContainer = document.getElementById("importsBarContainer");
    const tariffsContainer = document.getElementById("tariffBarContainer");
    const info = document.getElementById("pieInfo");
    
    if (!overlay || !pieContainer || !importsContainer || !tariffsContainer || !info) return;
    
    document.getElementById("pieOverlay").classList.add("visible");
    
    // PIE CHART DATA from mapData
    const row = window.mapData?.find(d => d.code === code && d.tariff_structure === tariff_structure);
    if (!row) return;
    
    const chartData = [
        { name: "Old Tariff Level", y: parseFloat(row.change_old) },
        { name: "New Tariff Level", y: parseFloat(row.change) }
    ];
    
    if (pieChart) {
        pieChart.series[0].setData(chartData, true);
        pieChart.setTitle({ text: `${row.exp_name || code} — Tariff Comparison` });
    } else {
        pieChart = Highcharts.chart('pieContainer', {
        chart: { type: 'pie' },
        credits: { enabled: false },
        exporting: { enabled: false },
        title: { text: `${row.exp_name || code} — Tariff Comparison` },
        series: [{ name: 'Tariff', data: chartData }]
        });
    }
    
    
    // get values
    const countryImports = importsData.filter(d => d.code === numericCode);
    const productGroups = countryImports.map(d => d.product_group);
    const importValues = countryImports.map(d => parseFloat(d.value));
    const tariffData = tariffsData.filter(d => d.code === numericCode && d.tariff_structure === tariff_structure);
    const tariffGroups = tariffData.map(d => d.product_group);
    const tariffValues = tariffData.map(d => parseFloat(d.value));

    function formatMoneyLabel(value, isLast = false) {
        if (value >= 1e9) return (isLast ? `$${(value / 1e9).toFixed(1)}B` : `${(value / 1e9).toFixed(1)}B`);
        if (value >= 1e6) return (isLast ? `$${(value / 1e6).toFixed(1)}M` : `${(value / 1e6).toFixed(1)}M`);
        return value; // fallback
      }

    // IMPORTS BAR CHART (includes y-axis labels)
    if (importsChart) {
        importsChart.series[0].setData(importValues);
        importsChart.xAxis[0].setCategories(productGroups);
    } else {
        importsChart = Highcharts.chart('importsBarContainer', {
            chart: {
                type: 'bar',
                inverted: true,
                height: 480,
                marginLeft: 130 // gives room for y-axis labels
            },
            title: { text: 'Imports by Product Group' },
            xAxis: {
                categories: productGroups,
                title: { text: null },
                labels: {
                    style: { 
                        width: '120px' ,
                        fontSize: '10px',
                    },
                    align: 'right'
                }
            },
            yAxis: {
                title: { text: null },
                labels: {
                  formatter: function () {
                    const ticks = this.axis.tickPositions;
                    const midIndex = Math.floor(ticks.length / 2);
                    const isFirst = this.value === ticks[0];
                    const isMiddle = this.value === ticks[midIndex];
              
                    if (!isFirst && !isMiddle) return '';
              
                    if (this.value >= 1e9) return `$${Math.round(this.value / 1e9)}B`;
                    if (this.value >= 1e6) return `$${Math.round(this.value / 1e6)}M`;
                    if (this.value >= 1e3) return `$${Math.round(this.value / 1e3)}K`;
                    return `$${Math.round(this.value)}`;
                  },
                  style: {
                    whiteSpace: 'nowrap',
                    fontSize: '11px'
                  },
                  overflow: 'justify'
                }
              },
            legend: { enabled: false },
            series: [{ name: 'Imports', data: importValues }],
            credits: { enabled: false },
            exporting: { enabled: false }
        });
    }

    // TARIFFS BAR CHART (no y-axis labels)
    if (tariffsChart) {
        tariffsChart.series[0].setData(tariffValues);
        tariffsChart.xAxis[0].setCategories(tariffGroups);
    } else {
        tariffsChart = Highcharts.chart('tariffBarContainer', {
            chart: {
                type: 'bar',
                inverted: true,
                height: 480,
                marginLeft: 20 // minimize left margin since no labels
            },
            title: { text: 'Tariff Level by Product Group' },
            xAxis: {  // actually the y-axis
                categories: tariffGroups,
                title: { text: null },
                labels: { enabled: false } // disables y-axis labels
            },
            yAxis: {
                title: { text: null },
                labels: {
                    formatter: function () {
                      const ticks = this.axis.tickPositions;
                      const isLast = this.value === ticks[ticks.length - 1];
                      return isLast ? `${this.value}%` : this.value;
                    },
                    overflow: 'justify'
                  }
            },
            legend: { enabled: false },
            series: [{ name: 'Tariff', data: tariffValues }],
            credits: { enabled: false },
            exporting: { enabled: false }
        });
    }

    
    // Move the tariff_structureSlider into the overlay
    const sliderWrapper = document.getElementById("controls");
    const overlaySlot = document.getElementById("overlaySliderSlot");
    if (sliderWrapper && overlaySlot && !overlaySlot.contains(sliderWrapper)) {
        overlaySlot.appendChild(sliderWrapper);
    }
    
    info.innerText = `This shows the shift in tariffs and import values for ${row.exp_name || code}.`;
    }
    
    export function hidePieChart() {
    const controls = document.getElementById("controls");
    const mainSlot = document.getElementById("mainControlsSlot");
    
    if (controls && mainSlot && !mainSlot.contains(controls)) {
        mainSlot.appendChild(controls);
    }
    
    document.getElementById("pieOverlay").classList.remove("visible");
    }
    