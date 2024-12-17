document.addEventListener('DOMContentLoaded', () => {
    const scatterChartCtx = document.getElementById('scatterChart').getContext('2d');
    const salinityHistogramCtx = document.getElementById('salinityHistogram').getContext('2d');
    const temperatureHistogramCtx = document.getElementById('temperatureHistogram').getContext('2d');

    async function loadAndVisualizeResults() {
        try {
            const [bottleData, castData] = await Promise.all([
                loadCSV('cleaned_bottle.csv'),
                loadCSV('cleaned_cast.csv')
            ]);

            // Merge datasets based on Station
            const mergedData = mergeDatasets(bottleData, castData, 'Station');

            if (mergedData.length === 0) {
                alert('No valid data available for visualization.');
                return;
            }

            // Calculate statistics
            const stats = calculateStats(mergedData);

            // Display stats and generate visuals
            displayStats(stats);
            createScatterChart(scatterChartCtx, mergedData);
            createHistogram(salinityHistogramCtx, mergedData, 'Salinity', 'Distribution of Salinity');
            createHistogram(temperatureHistogramCtx, mergedData, 'Temperature', 'Distribution of Temperature');
        } catch (error) {
            console.error('Error during visualization:', error);
        }
    }

    async function loadCSV(filePath) {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
        const text = await response.text();
        return parseCSV(text);
    }

    function parseCSV(csvText) {
        const rows = csvText.split('\n').map(row => row.split(',').map(col => col.trim()));
        const headers = rows.shift(); // Extract headers
        return rows
            .filter(row => row.length === headers.length) // Remove incomplete rows
            .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
    }

    function mergeDatasets(data1, data2, key) {
        const data2Keys = new Set(data2.map(d => d[key]));
        return data1.filter(d => data2Keys.has(d[key]));
    }

    function calculateStats(data) {
        const n = data.length;
        const salinities = data.map(d => parseFloat(d.Salinity));
        const temperatures = data.map(d => parseFloat(d.Temperature));

        const avgSalinity = salinities.reduce((sum, v) => sum + v, 0) / n;
        const avgTemperature = temperatures.reduce((sum, v) => sum + v, 0) / n;

        const covariance = salinities.reduce((sum, s, i) =>
            sum + (s - avgSalinity) * (temperatures[i] - avgTemperature), 0) / n;
        const salinityVariance = salinities.reduce((sum, s) =>
            sum + Math.pow(s - avgSalinity, 2), 0) / n;

        const slope = covariance / salinityVariance;
        const intercept = avgTemperature - slope * avgSalinity;
        const correlation = covariance / Math.sqrt(salinityVariance);

        return { n, avgSalinity, avgTemperature, slope, intercept, correlation };
    }

    function displayStats(stats) {
        document.getElementById('totalRecords').textContent = stats.n;
        document.getElementById('avgSalinity').textContent = stats.avgSalinity.toFixed(2);
        document.getElementById('avgTemperature').textContent = stats.avgTemperature.toFixed(2);
        document.getElementById('slope').textContent = stats.slope.toFixed(2);
        document.getElementById('intercept').textContent = stats.intercept.toFixed(2);
        document.getElementById('correlation').textContent = stats.correlation.toFixed(2);
    }

    function createScatterChart(ctx, data) {
        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Salinity vs Temperature',
                    data: data.map(d => ({
                        x: parseFloat(d.Salinity),
                        y: parseFloat(d.Temperature),
                    })),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Salinity (PSU)' } },
                    y: { title: { display: true, text: 'Temperature (°C)' } },
                }
            }
        });
    }

    function createHistogram(ctx, data, field, title) {
        const values = data.map(d => parseFloat(d[field])).filter(val => !isNaN(val));
        const bins = Array.from(new Set(values)).sort((a, b) => a - b);

        const frequencies = bins.map(bin =>
            values.filter(val => val === bin).length
        );

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: bins,
                datasets: [{
                    label: title,
                    data: frequencies,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: field } },
                    y: { title: { display: true, text: 'Frequency' } },
                },
                plugins: { title: { display: true, text: title } },
            }
        });
    }

    loadAndVisualizeResults();
});
