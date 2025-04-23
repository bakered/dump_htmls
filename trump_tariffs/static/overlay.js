// overlay.js
// Handles chart overlay rendering and interaction (pie + 2 bar charts)

let pieChart = null;
let importsChart = null;
let tariffsChart = null;

let importsData = [];
let tariffsData = [];
let contribData = [];

let productGroupColors = {};
const baseColors = Highcharts.getOptions().colors.slice();

function initializeProductGroupColors() {
  const uniqueGroups = [...new Set(importsData.map(d => d.product_group))].sort(); // stable order
  uniqueGroups.forEach((group, i) => {
    productGroupColors[group] = baseColors[i % baseColors.length];
  });
}

// Load data files once
(async () => {
  try {
    importsData = await fetch('/static/data/imports_by_group.json').then(res => res.json());
    initializeProductGroupColors();
    tariffsData = await fetch('/static/data/avg_tariff_by_group.json').then(res => res.json());
    contribData = await fetch('/static/data/tariff_contrib_by_group.json').then(res => res.json());
  } catch (err) {
    console.error("Error loading data:", err);
  }
})();

export function showPieChart(code, tariff_structure) {
  const numericCode = parseInt(code);

  const overlay = document.getElementById("pieOverlay");
  const pieContainer = document.getElementById("pieContainer");
  const importsContainer = document.getElementById("importsBarContainer");
  const tariffsContainer = document.getElementById("tariffBarContainer");
  const info = document.getElementById("pieInfo");

  if (!overlay || !pieContainer || !importsContainer || !tariffsContainer || !info) return;

  document.getElementById("pieOverlay").classList.add("visible");

    // --- PIE CHART ---
    const contribRows = contribData.filter(d => d.code === numericCode && d.tariff_structure === tariff_structure);
    const overallTariffRate = contribRows.reduce((sum, d) => sum + parseFloat(d.value), 0);
    console.log(overallTariffRate)
    const sorted = contribRows.sort((a, b) => b.value - a.value);
  
    const chartData = sorted.map(d => ({
      name: d.product_group,
      y: parseFloat(d.value) / overallTariffRate,  // proportion of pie
      rawValue: parseFloat(d.value),               // actual contribution value
      color: productGroupColors[d.product_group]
    }));
  
    const pieTitle = `Contribution to tariff rate of ${overallTariffRate.toFixed(1)}%`;
  
    if (pieChart) {
      pieChart.series[0].setData(chartData);
      pieChart.setTitle({ text: pieTitle });
    } else {
      pieChart = Highcharts.chart('pieContainer', {
        chart: { type: 'pie' },
        title: { text: pieTitle },
        tooltip: {
          pointFormat: 'Contribution: <b>{point.rawValue:.1f}%</b>'
        },
        series: [{ name: 'Contribution', data: chartData }],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    }

    // --- IMPORTS BAR CHART ---
    const countryImports = importsData.filter(d => d.code === numericCode);

    const importSeriesData = sorted.map(d => {
      const match = countryImports.find(row => row.product_group === d.product_group);
      return {
        y: match ? parseFloat(match.value) : 0,
        color: productGroupColors[d.product_group]
      };            
    });
  
    const sortedProductGroups = sorted.map(d => d.product_group);
  
    if (importsChart) {
      importsChart.series[0].setData(importSeriesData);
      importsChart.xAxis[0].setCategories(sortedProductGroups);
    } else {
      importsChart = Highcharts.chart('importsBarContainer', {
        chart: {
          type: 'bar', inverted: true, height: 480, marginLeft: 130
        },
        title: { text: 'Imports by Product Group' },
        xAxis: {
          categories: sortedProductGroups,
          title: { text: null },
          labels: {
            style: { fontSize: '11px' }
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
            style: { whiteSpace: 'nowrap', fontSize: '11px' },
            overflow: 'justify',
            rotation: 0,
          }
        },
        legend: { enabled: false },
        series: [{ name: 'Imports', data: importSeriesData }],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    }


  // --- TARIFFS BAR CHART ---
  const tariffData = tariffsData.filter(d => d.code === numericCode && d.tariff_structure === tariff_structure);

  const tariffSeriesData = sorted.map(d => {
    const match = tariffData.find(row => row.product_group === d.product_group);
    return {
      y: match ? parseFloat(match.value) : 0,
      color: productGroupColors[d.product_group]
    };
  });

  if (tariffsChart) {
    tariffsChart.series[0].setData(tariffSeriesData);
    tariffsChart.xAxis[0].setCategories(sorted.map(d => d.product_group));
  } else {
    tariffsChart = Highcharts.chart('tariffBarContainer', {
      chart: {
        type: 'bar', inverted: true, height: 480, marginLeft: 20
      },
      title: { text: 'Tariff Level by Product Group' },
      xAxis: {
        categories: sorted.map(d => d.product_group),
        title: { text: null },
        labels: { enabled: false }
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
            return `${Math.round(this.value)}%`;
          },
          style: { whiteSpace: 'nowrap', fontSize: '11px' },
          overflow: 'justify',
          rotation: 0
        }
      },
      legend: { enabled: false },
      series: [{ name: 'Tariff', data: tariffSeriesData }],
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

  document.getElementById("pieOverlayTitle").innerText = `Breakdown for ${contribRows[0]?.exp_name || code}`;
  info.innerText = `This shows the shift in tariffs for ${contribRows[0]?.exp_name || code}.`;
}

export function hidePieChart() {
  const controls = document.getElementById("controls");
  const mainSlot = document.getElementById("mainControlsSlot");
  if (controls && mainSlot && !mainSlot.contains(controls)) {
    mainSlot.appendChild(controls);
  }
  document.getElementById("pieOverlay").classList.remove("visible");
}


