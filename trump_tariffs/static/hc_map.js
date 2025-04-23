document.addEventListener("DOMContentLoaded", function() {
    (async () => {
        // set the filepath to where the data and the settings are saved 
        const data_filepath = `/static/${user_id}`;  // Path to user-specific map data
        // set the filepath to where the topology worldmap-economies-54030.topo.json is saved
        const topology_filepath = '/static';  // Path to topology file

        // Fetch the topology
        const topology = await fetch(`${topology_filepath}/worldmap-economies-54030.topo.json`).then(response => response.json());

        // Fetch the user-specific data and settings files
        const data = await fetch(`${data_filepath}/mapData.json`).then(response => response.json());
        const settings = await fetch(`${data_filepath}/settings.json`).then(response => response.json());

        // Helper function to convert hex color to RGB
        function hexToRgb(hex) {
            let r = 0, g = 0, b = 0;
            // 3 digits
            if (hex.length === 4) {
                r = parseInt(hex[1] + hex[1], 16);
                g = parseInt(hex[2] + hex[2], 16);
                b = parseInt(hex[3] + hex[3], 16);
            }
            // 6 digits
            else if (hex.length === 7) {
                r = parseInt(hex[1] + hex[2], 16);
                g = parseInt(hex[3] + hex[4], 16);
                b = parseInt(hex[5] + hex[6], 16);
            }
            return { r, g, b };
        }

        // Helper function to convert RGB to hex color
        function rgbToHex(r, g, b) {
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }

        // Define a color mapping function based on value (special cases dealt with by getColor)
        function getColorFromValue(value) {
            // Return grey if value is null, NaN, or undefined
            if (value === null || value === undefined || isNaN(value)) {
                return '#DDDDDD';
            }

            // Check if the mode is continuous
            if (settings.non_dw.colorscale.mode === 'continuous') {
                // Find the closest two stops around the value
                let lowerStop = null;
                let upperStop = null;

                for (let i = 0; i < settings.non_dw.colorscale.colors.length; i++) {
                    const stop = settings.non_dw.colorscale.colors[i];
                    if (stop.position <= value) {
                        lowerStop = stop;
                    } else {
                        upperStop = stop;
                        break;
                    }
                }

                // If both stops are found, interpolate between them
                if (lowerStop && upperStop) {
                    const range = upperStop.position - lowerStop.position;
                    const valueRatio = (value - lowerStop.position) / range;
                    const lowerColor = lowerStop.color;
                    const upperColor = upperStop.color;

                    // Interpolate color (simple linear interpolation for RGB)
                    const lowerRGB = hexToRgb(lowerColor);
                    const upperRGB = hexToRgb(upperColor);
                    const interpolatedRGB = {
                        r: Math.round(lowerRGB.r + valueRatio * (upperRGB.r - lowerRGB.r)),
                        g: Math.round(lowerRGB.g + valueRatio * (upperRGB.g - lowerRGB.g)),
                        b: Math.round(lowerRGB.b + valueRatio * (upperRGB.b - lowerRGB.b)),
                    };

                    return rgbToHex(interpolatedRGB.r, interpolatedRGB.g, interpolatedRGB.b);
                }

                // If value is below the first stop, return the color of the first stop
                if (lowerStop) {
                    return lowerStop.color;
                }

                // If value is above the last stop, return the color of the last stop
                if (upperStop) {
                    return upperStop.color;
                }
            }

            // If not continuous, fall back to discrete handling
            for (let i = 0; i < settings.non_dw.colorRanges.length; i++) {
                const range = settings.non_dw.colorRanges[i];
                // Use a large negative value if `fromValue` is null (representing the minimum range)
                const fromValue = range.fromValue === null ? -Infinity : range.fromValue;
                // Use a large positive value if `toValue` is null (representing the maximum range)
                const toValue = range.toValue === null ? Infinity : range.toValue;
                // Check if value falls within the current range
                if (value >= fromValue && value <= toValue) {
                    return range.color;
                }
            }

            return '#DDDDDD'; // Default color if no range matches
        }

        // Define a color mapping function based on value **and code**
        function getColor(value, code) {
            const AksaiChin = 'C00002'; // code for disputed area Aksai Chin
            const Kosovo = '412'; // code for Kosovo

            // First check if this code is special
            if (code === AksaiChin) {
                const kashmirData = data.find(item => item.code === 'C00007'); // Find kashmir in data
                const kashmirValue = kashmirData ? kashmirData.value : null; // Get kashmir's value, default to null
                const chinaData = data.find(item => item.code === '156'); // Find china in data
                const chinaValue = chinaData ? chinaData.value : null; // Get china's value, default to null
                return {
                    pattern: {
                        path: {
                            d: 'M 0 10 L 10 0 M -2 2 L 2 -2 M 8 12 L 12 8',
                            strokeWidth: (2.5 * Math.sqrt(2)),
                        },
                        width: 10,  // Width of the pattern ## IF YOU WANT TO CHANGE: THEN YOU HAVE TO CHANGE WIDTH, HEIGHT, D, AND STROKEWIDTH
                        height: 10,  // Height of the pattern
                        color: getColorFromValue(chinaValue), 
                        backgroundColor: getColorFromValue(kashmirValue),
                    }
                };
            }
            // First check if this code is special
            if (code === Kosovo) {
                const serbiaData = data.find(item => item.code === '688'); // Find Serbia in data
                const serbiaValue = serbiaData ? serbiaData.value : null; // Get Serbia's value, default to null

                return getColorFromValue(serbiaValue);
            }

            return getColorFromValue(value)
        }

        let dataClasses;

        if (settings.non_dw.colorscale.mode === 'discrete') {
            // Check if custom labels exist and are not empty
            const customLabels = settings?.dw?.metadata?.visualize?.legends?.color?.customLabels;
            const useCustomLabels = Array.isArray(customLabels) && customLabels.some(label => label.trim() !== '');
            console.log(customLabels)

            // Generate dataClasses from settings.non_dw.colorRanges for discrete mode
            dataClasses = settings.non_dw.colorRanges.map((range, index) => ({
                from: range.fromValue != null ? range.fromValue : undefined, // Treat null as undefined
                to: range.toValue != null ? range.toValue : undefined,       // Treat null as undefined
                color: range.color,
                name: useCustomLabels && customLabels[index] ? customLabels[index] :
                    (range.fromValue != null && range.toValue != null
                        ? `${range.fromValue} to ${range.toValue}`
                        : (range.fromValue != null ? `> ${range.fromValue}` : `< ${range.toValue}`)
                    )
            }));
        } else if (settings.non_dw.colorscale.mode === 'continuous') {
            // we do not need dataClasses if it is continuous
        }


        // Prepare a mapping of code -> labelen, labelfr from topology
        const labelMap = topology.objects['economies'].geometries.reduce((map, geometry) => {
            const { code, labelen, labelfr } = geometry.properties; // Extract properties from geometry
            map[code] = { labelen, labelfr }; // Map code to labelen and labelfr
            return map;
        }, {});

        // Extract the transformation values from the TopoJSON
        const scale = topology.transform.scale;
        const translate = topology.transform.translate;

        // Extract and transform the point coordinates for 'economies-point'
        const coordinatesMap = topology.objects['economies-point'].geometries.reduce((map, geometry) => {
            const [x, y] = geometry.coordinates; // Original projected coordinates

            // Apply inverse transformation (reverse scaling and translation)
            const lon = x * scale[0] + translate[0];
            const lat = y * scale[1] + translate[1];

            const economyCode = geometry.properties.code;
            map[economyCode] = { lon, lat }; // Map code to coordinates
            return map;
        }, {});

        

        // Log the final consolidated data
        // console.log(data);
        
        function processTopoObject(topology, objectName) {
            // Create a deep clone of the topology object
            const topologyClone = JSON.parse(JSON.stringify(topology));
        
            const { arcs: topologyArcs, transform } = topologyClone;
            
            // Function to decode an individual arc (handles negative indices)
            function decodeArc(index) {
                // Get the arc based on index
                let arc = topologyArcs[index < 0 ? ~index : index]; // If index is negative, flip and get arc

                // Start with the first point, which is absolute (e.g., [0, 0] or the first point in the arc)
                let currentPoint = arc[0]; // The first point is absolute, not a delta

                // Convert from projected coordinates to latitude/longitude using the transform
                const decodedArc = arc.map(([dx, dy], idx) => {
                    // If it's not the first point, apply the delta to the previous point
                    if (idx !== 0) {
                        currentPoint[0] += dx; // Cumulative change in x
                        currentPoint[1] += dy; // Cumulative change in y
                    }

                    // Apply the transformation to convert from projected to lat/lon
                    return [
                        currentPoint[0] * transform.scale[0] + transform.translate[0],
                        currentPoint[1] * transform.scale[1] + transform.translate[1]
                    ];
                });

                // If the original index was negative, reverse the decoded arc
                return index < 0 ? decodedArc.reverse() : decodedArc;
            }
        
            // Access the specified object in the topology
            const topoObject = topologyClone.objects[objectName];
            if (!topoObject) {
                console.error(`Object "${objectName}" not found in topology.`);
                return [];
            }
        
            // Process the geometries in the specified object
            const processedGeometries = topoObject.geometries.map(geometry => {
                const decodedCoordinates = geometry.arcs.map(arcSet => {
                    // Decode arcs for LineString or MultiLineString
                    if (Array.isArray(arcSet)) {
                        return arcSet.map(arcIndex => decodeArc(arcIndex));
                    } else {
                        return decodeArc(arcSet);
                    }
                });
        
                return {
                    geometry: {
                        type: geometry.type,
                        coordinates: geometry.type === 'LineString'
                            ? decodedCoordinates[0] // Flatten for LineString
                            : decodedCoordinates    // Retain nested for MultiLineString
                    }
                };
            });
        
            return processedGeometries;
        }
        
        function processTopoObject(topology, objectName) {
            // Create a deep clone of the topology object
            const topologyClone = JSON.parse(JSON.stringify(topology));
        
            const { arcs: topologyArcs, transform } = topologyClone;
        
            // Function to decode an individual arc (handles negative indices)
            function decodeArc(index) {
                // Get the arc based on index
                let arc = topologyArcs[index < 0 ? ~index : index]; // If index is negative, flip and get arc
        
                // Start with the first point, which is absolute (e.g., [0, 0] or the first point in the arc)
                let currentPoint = arc[0]; // The first point is absolute, not a delta
        
                // Convert from projected coordinates to latitude/longitude using the transform
                const decodedArc = arc.map(([dx, dy], idx) => {
                    // If it's not the first point, apply the delta to the previous point
                    if (idx !== 0) {
                        currentPoint[0] += dx; // Cumulative change in x
                        currentPoint[1] += dy; // Cumulative change in y
                    }
        
                    // Apply the transformation to convert from projected to lat/lon
                    return [
                        currentPoint[0] * transform.scale[0] + transform.translate[0],
                        currentPoint[1] * transform.scale[1] + transform.translate[1]
                    ];
                });
        
                // If the original index was negative, reverse the decoded arc
                return index < 0 ? decodedArc.reverse() : decodedArc;
            }
        
            // Access the specified object in the topology
            const topoObject = topologyClone.objects[objectName];
            if (!topoObject) {
                console.error(`Object "${objectName}" not found in topology.`);
                return [];
            }
        
            // Process the geometries in the specified object
            const processedGeometries = topoObject.geometries.map(geometry => {
                const decodedCoordinates = geometry.arcs.map(arcSet => {
                    // Decode arcs for LineString or MultiLineString
                    if (Array.isArray(arcSet)) {
                        return arcSet.map(arcIndex => decodeArc(arcIndex));
                    } else {
                        return decodeArc(arcSet);
                    }
                });
        
                // Combine all decoded arcs into a MultiLineString
                const multiLineCoordinates = decodedCoordinates.flat();
        
                return {
                    geometry: {
                        type: geometry.type,
                        coordinates: geometry.type === 'LineString'
                            ? decodedCoordinates[0]  // Flatten for LineString
                            : multiLineCoordinates    // Combined MultiLineString
                    },
                    properties: geometry.properties
                };
            });
        
            return processedGeometries;
        }



        const plainborders = processTopoObject(topology, 'plain-borders'); 
        const dashedborders = processTopoObject(topology, 'dashed-borders');
        const dottedborders = processTopoObject(topology, 'dotted-borders');
        const dashdottedborders = processTopoObject(topology, 'dash-dotted-borders');


        // process polygons objects 
        function processTopoObjectPolygons(topology, objectName) {
            // Create a deep clone of the topology object
            const topologyClone = JSON.parse(JSON.stringify(topology));
        
            const { arcs: topologyArcs, transform } = topologyClone;
        
            // Function to decode an individual arc (handles negative indices)
            function decodeArc(index) {
                // Get the arc based on index
                let arc = topologyArcs[index < 0 ? ~index : index]; // If index is negative, flip and get arc
            
                // Create a copy of the arc to avoid side effects
                let currentPoint = [...arc[0]]; // Clone the first point
                let arcCopy = arc.map(([dx, dy]) => [dx, dy]); // Deep copy the arc
            
                // Convert from projected coordinates to latitude/longitude using the transform
                const decodedArc = arcCopy.map(([dx, dy], idx) => {
                    if (idx !== 0) {
                        currentPoint[0] += dx; // Cumulative change in x
                        currentPoint[1] += dy; // Cumulative change in y
                    }
            
                    // Apply the transformation to convert from projected to lat/lon
                    return [
                        currentPoint[0] * transform.scale[0] + transform.translate[0],
                        currentPoint[1] * transform.scale[1] + transform.translate[1]
                    ];
                });
            
                // If the original index was negative, reverse the decoded arc
                return index < 0 ? decodedArc.reverse() : decodedArc;
            }
            
        
            // Function to decode arcs for polygons or multipolygons
            function decodeArcs(arcSet, geometryType) {
                if (geometryType === "Polygon") {
                    // For a single polygon, merge all arcs into one array
                    const mergedArcs = arcSet.flat(); // Flatten the array of arc indices
                    return [mergedArcs.map(decodeArc).flat()]; // Decode and merge into one array
                } else if (geometryType === "MultiPolygon") {
                    // For a multipolygon, decode each polygon separately
                    return arcSet.map((polygonArcs) => {
                        // Collapse all arcs for each polygon within the multipolygon
                        const mergedArcs = polygonArcs.flat(); // Flatten arc indices for this polygon
                        return [mergedArcs.map(decodeArc).flat()]; // Decode and merge into one array
                    });
                }
            }
        
            // Access the specified object in the topology
            const topoObject = topologyClone.objects[objectName];
            if (!topoObject) {
                console.error(`Object "${objectName}" not found in topology.`);
                return [];
            }
        
            // Process the geometries in the specified object
            const processedGeometries = topoObject.geometries
            //.filter(geometry => ["604", "250", "398", "352"].includes(geometry.properties.code)) // Filter for multiple codes
            .map(geometry => {
                const decodedCoordinates = geometry.arcs.map(arcSet => {
                    if (Array.isArray(arcSet[0])) {
                        // MultiPolygon
                        return arcSet.map(subArcSet => subArcSet.flatMap(decodeArc));
                    }
                    // Polygon
                    return arcSet.flatMap(decodeArc);
                });
                return {
                    geometry: {
                        type: geometry.type,
                        coordinates: geometry.type === "Polygon"
                            ? decodedCoordinates
                            : decodedCoordinates
                    },
                    properties: geometry.properties
                };
            });
        
            return processedGeometries;
        }
            

        
        const economiescolor = processTopoObjectPolygons(topology, 'economies-color'); 
        const economies = processTopoObjectPolygons(topology, 'economies'); 

        // Function to create mapline series
        function createMaplineSeries(name, mapData, dashStyle) {
            return {
                type: 'mapline',
                name: name,
                mapData: mapData.map(border => ({
                    geometry: border.geometry,
                    name: border.properties.code,
                    tooltip: {
                        pointFormat: 'Code: {point.name}'
                    }
                })),
                dashStyle: dashStyle
            };
        }

        // Create the chart
        const map = Highcharts.mapChart('container', {
            chart: {
                type: "map",
                style: {
                    fontFamily: '"Helvetica Neue LT Std", Inter, Helvetica, Arial, sans-serif'
                }
            },
            
            title: {
                text: null
            },

            subtitle: {
                text: null
            },

            mapNavigation: {
                enabled: true,
                buttonOptions: {
                    verticalAlign: 'bottom'
                }
            },

            plotOptions: {
                series: {
                    animation: false,
                    states: {
                        hover: {
                            enabled: true,
                            brightness: 0.1
                        }
                    }
                },
                mapline: {
                    lineWidth: settings.non_dw.lineWidth,
                    borderWidth: settings.non_dw.lineWidth,
                    color: '#FFFFFF',
                    tooltip: {
                        pointFormat: 'Region: {point.name}'
                    }
                }
            },

            exporting: {
                sourceWidth: 2000*1.25,
                sourceHeight: 1500*1.25,
                scale: 1,
                enabled: true
            },

            colorAxis: settings.non_dw.colorscale.mode === 'continuous' ? {
                //min: 0, // 
                //max: 16, //
                stops: settings.non_dw.colorscale.colors.map(colorInfo => [colorInfo.position, colorInfo.color]),
                startOnTick: false,
                endOnTick: false
            } : {
                dataClasses: dataClasses // 
            },

            credits: {
                enabled: false
            },

            legend: {
                enabled: settings?.dw?.metadata?.visualize?.legends?.color?.enabled ?? true,
                layout: settings?.dw?.metadata?.visualize?.legends?.color?.orientation === 'horizontal' ? 'horizontal' : 'vertical',
                align: (() => {
                    switch (settings?.dw?.metadata?.visualize?.legends?.color?.position) {
                        case 'left': return 'left';
                        case 'right': return 'right';
                        default: return 'center'; // Default is centered
                    }
                })(),
                verticalAlign: (() => {
                    switch (settings?.dw?.metadata?.visualize?.legends?.color?.position) {
                        case 'above': return 'top';
                        case 'below': return 'bottom';
                        default: return 'middle'; // Default is middle
                    }
                })(),
                floating: false,
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderWidth: 1
            },

            series: [
                {
                    type: 'map',
                    name: 'Economies-colour',
                    data: economiescolor.map(region => {
                        const match = data.find(row => row.code === region.properties.code);
                        const value = match ? parseFloat(match.value) : null;
                        const code = region.properties.code; // Store region code
                        const labelen = labelMap[code]?.labelen || code;

                        return {
                            geometry: region.geometry,
                            name: labelen,
                            color: getColor(value, code),
                            value,
                            borderWidth: 0,
                            borderColor: 'rgba(0, 0, 0, 0)'
                        };
                    }),
                    states: {
                        hover: {
                            enabled: true,
                            borderColor: '#FFFFFF',
                            brightness: -0.2
                        },
                        inactive: {
                            enabled: false,
                            opacity: 1
                        }
                    },
                },
                {
                    type: 'map',
                    name: 'Economies',
                    data: economies.map(region => {
                        const match = data.find(row => row.code === region.properties.code);
                        const value = match ? parseFloat(match.value) : null;
                        const code = region.properties.code; // Store region code
                        const labelen = labelMap[code]?.labelen || code;

                        return {
                            geometry: region.geometry,
                            name: labelen,
                            color: 'rgba(0, 0, 0, 0)', 
                            value,
                            borderWidth: 0,
                            borderColor: 'rgba(0, 0, 0, 0)'
                        };
                    }),
                    states: {
                        hover: {
                            enabled: true,
                            borderColor: '#FFFFFF',
                            brightness: 0.2
                        },
                        inactive: {
                            enabled: true,
                            opacity: 0.5
                        }
                    },
                    tooltip: {
                        pointFormat: '{point.name}<br>{point.value}' 
                    },
                },
                
                // Using the function to create mapline series
                createMaplineSeries('Dashed Borders', dashedborders, 'Dash'),
                createMaplineSeries('Dotted Borders', dottedborders, 'Dot'),
                createMaplineSeries('Dash Dotted Borders', dashdottedborders, 'DashDot'),
                createMaplineSeries('Plain Borders', plainborders, 'Solid'),
            ]
        });


    })();
});