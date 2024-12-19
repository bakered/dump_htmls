(async () => {

    // Fetch the world map topology
    const topology = await fetch(
        'https://code.highcharts.com/mapdata/custom/middle-east.topo.json' //'https://code.highcharts.com/mapdata/custom/world-highres2.topo.json'
    ).then(response => response.json());

    // Fetch the ships data
    const shipsData = await fetch('disappearing_tankers.json')
    .then(response => response.json());
    
    // Prepare the ships data for plotting
    const shipsDataMapped = shipsData.map(ship => ({
        name: ship.name,  // Vessel name for the point
        lat: ship.lat,           // Latitude of the ship
        lon: ship.lon,           // Longitude of the ship
        mmsi: ship.mmsi,         // MMSI number for the ship
        destination: ship.destination, // Destination of the ship
        pre_gap_time: ship.pre_gap_time,
        post_gap_time: ship.post_gap_time,
        distance: ship.distance_km,
        vessel_type: ship.vessel_type
    }));

    // Fetch the ships data line
    const shipsDataLine = await fetch('disappearing_tankers_line.json')
    .then(response => response.json());
    
    
    console.log(shipsDataLine);

    // Initialize the chart
    Highcharts.mapChart('container', {
        chart: {
            map: topology
        },

        title: {
            text: '',
        },

        accessibility: {
            description: 'Map where ship positions have been defined using latitude/longitude.'
        },

        mapNavigation: {
            enabled: true
        },

        series: [{
            // Use the world map as a basemap
            name: 'World Map',
            borderColor: '#A0A0A0',
            nullColor: 'rgba(200, 200, 200, 0.3)',
            showInLegend: false
        }, {
            name: 'Separators',
            type: 'mapline',
            nullColor: '#707070',
            showInLegend: false,
            enableMouseTracking: false,
            accessibility: {
                enabled: false
            }
        }, {
            // New mappoint series for ships data
            type: 'mappoint',
            name: 'Point Ship Disappeared',
            color: '#FF0000',  // You can change the color as needed
            data: shipsDataMapped,
            marker: {
                radius: 2,  // Adjust the size of the points
                fillColor: '#FF0000'  // Set the color of the markers
            },
            dataLabels: {
                enabled: false // Disable point labels
            },
            tooltip: {
                pointFormat: '<b>{point.name}</b><br>type: {point.vessel_type}<br>disappeared here: {point.pre_gap_time}<br>reappeared on: {point.post_gap_time}<br>{point.distance} km away'
            }
        }, {
            // New mapline series for ships data
            type: 'mapline',
            name: 'Path to where it reappeared',
            data: shipsDataLine,
            color: '#FF0000',
            lineWidth: 1,
            tooltip: {
                pointFormat: '<b>{point.name}</b><br>type: {point.vessel_type}<br>disappeared here: {point.pre_gap_time}<br>reappeared on: {point.post_gap_time}<br>{point.distance} km away'
            }

        }
    ]
    });

})();