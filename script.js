document.addEventListener('DOMContentLoaded', function () {
    fetch('cleaned_bottle.csv')
        .then(response => response.text())
        .then(csvData => {
            const data = parseCSV(csvData);
            const sampledData = getRandomSample(data, 3000); // Use random sample of 3000 records
            const regression = calculateRegression(sampledData);

            updateDataOverview(data);
            updateDataSummary(sampledData); // Ensure calculations are performed here
            updateStatistics(regression);
            renderVisualizations(sampledData, regression);
        })
        .catch(error => console.error('Error loading data:', error));

    // Parse CSV data
    function parseCSV(csvText) {
        const [headers, ...rows] = csvText.trim().split('\n').map(row => row.split(','));
        return rows.map(row => Object.fromEntries(headers.map((h, i) => [h.trim(), row[i].trim()])));
    }

    // Randomly sample 3,000 records
    function getRandomSample(data, size) {
        return data.sort(() => 0.5 - Math.random()).slice(0, size);
    }

    // Update data overview
    function updateDataOverview(data) {
        const totalRecords = data.length;
        const totalColumns = Object.keys(data[0]).length;
        document.getElementById('totalRecords').textContent = totalRecords;
        document.getElementById('totalColumns').textContent = totalColumns;
        document.getElementById('samplingPeriod').textContent = 'Random 3000(n)';
    }

    // Update data summary (Calculate Mean, Median, Min, Max)
    function updateDataSummary(data) {
        const salinity = data.map(d => parseFloat(d.Salinity)).filter(v => !isNaN(v));
        const temperature = data.map(d => parseFloat(d.Temperature)).filter(v => !isNaN(v));

        document.getElementById('salinityMean').textContent = computeMean(salinity).toFixed(2);
        document.getElementById('salinityMedian').textContent = computeMedian(salinity).toFixed(2);
        document.getElementById('salinityMin').textContent = Math.min(...salinity).toFixed(2);
        document.getElementById('salinityMax').textContent = Math.max(...salinity).toFixed(2);

        document.getElementById('temperatureMean').textContent = computeMean(temperature).toFixed(2);
        document.getElementById('temperatureMedian').textContent = computeMedian(temperature).toFixed(2);
        document.getElementById('temperatureMin').textContent = Math.min(...temperature).toFixed(2);
        document.getElementById('temperatureMax').textContent = Math.max(...temperature).toFixed(2);
    }

    // Update statistical analysis
    function updateStatistics({ slope, intercept, correlation }) {
        document.getElementById('correlation').textContent = correlation.toFixed(2);
        document.getElementById('regression').textContent = `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`;
    }

    // Compute mean
    function computeMean(values) {
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
    }

    // Compute median
    function computeMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // Render visualizations
    function renderVisualizations(data, regression) {
        const scatterData = data.map(d => ({
            x: parseFloat(d.Salinity),
            y: parseFloat(d.Temperature),
        }));

        createScatterChart(scatterData, regression);
        createHistogram('salinityHistogram', data.map(d => parseFloat(d.Salinity)), 'Salinity');
        createHistogram('temperatureHistogram', data.map(d => parseFloat(d.Temperature)), 'Temperature');
    }

    // Chart.js: Create Scatter Plot with Regression Line
    function createScatterChart(data, regression) {
        const ctx = document.getElementById('scatterChart').getContext('2d');
        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Salinity vs Temperature',
                        data: data,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    },
                    {
                        label: `Regression Line: y = ${regression.slope.toFixed(2)}x + ${regression.intercept.toFixed(2)}`,
                        data: regression.line,
                        type: 'line',
                        borderColor: 'rgba(255, 99, 132, 0.7)',
                        borderWidth: 2,
                        fill: false,
                    },
                ],
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Salinity (PSU)' } },
                    y: { title: { display: true, text: 'Temperature (°C)' } },
                },
            },
        });
    }

    // Chart.js: Create Histogram
    function createHistogram(canvasId, values, label) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const bins = Array.from(new Set(values)).sort((a, b) => a - b);
        const frequencies = bins.map(bin => values.filter(v => v === bin).length);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: bins,
                datasets: [{
                    label: `${label} Distribution`,
                    data: frequencies,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                }],
            },
            options: {
                scales: {
                    x: { title: { display: true, text: label } },
                    y: { title: { display: true, text: 'Frequency' } },
                },
            },
        });
    }

    // Calculate regression line and correlation
    function calculateRegression(data) {
        const validData = data.map(d => ({
            x: parseFloat(d.Salinity),
            y: parseFloat(d.Temperature),
        })).filter(d => !isNaN(d.x) && !isNaN(d.y));

        const n = validData.length;
        const sumX = validData.reduce((acc, val) => acc + val.x, 0);
        const sumY = validData.reduce((acc, val) => acc + val.y, 0);
        const sumXY = validData.reduce((acc, val) => acc + val.x * val.y, 0);
        const sumX2 = validData.reduce((acc, val) => acc + val.x ** 2, 0);
        const sumY2 = validData.reduce((acc, val) => acc + val.y ** 2, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
        const intercept = (sumY - slope * sumX) / n;

        const rNumerator = (n * sumXY - sumX * sumY);
        const rDenominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
        const correlation = rNumerator / rDenominator;

        const xMin = Math.min(...validData.map(d => d.x));
        const xMax = Math.max(...validData.map(d => d.x));

        return {
            slope,
            intercept,
            correlation,
            line: [
                { x: xMin, y: slope * xMin + intercept },
                { x: xMax, y: slope * xMax + intercept },
            ],
        };
    }
});
