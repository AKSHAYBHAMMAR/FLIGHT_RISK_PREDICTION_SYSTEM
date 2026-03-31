// chart.js
// Handles Chart.js visualization for the dashboard

let delayChartInstance = null;

function initChart() {
    // Configure Chart.js global defaults
    Chart.defaults.color = '#94a3b8'; // slate-400
    Chart.defaults.font.family = "'Inter', sans-serif";
}

function updateDelayChart(waypoints) {
    const el = document.getElementById('delayChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    
    const labels = waypoints.map((wp, i) => wp.name);
    const data = waypoints.map(wp => wp.delay);
    
    // Colors matching delay severity
    const pointColors = data.map(val => {
        if (val < 15) return '#22c55e'; // green-500
        if (val < 35) return '#eab308'; // yellow-500
        return '#ef4444'; // red-500
    });

    // Create a smooth gradient for the area under the curve
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.5)'); // aviation-accent
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

    if (delayChartInstance) {
        delayChartInstance.destroy();
    }

    delayChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Predicted Delay (mins)',
                data: data,
                borderColor: '#38bdf8', // sky-400
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.4, // Smooth curves
                fill: true,
                pointBackgroundColor: pointColors,
                pointBorderColor: '#0f172a',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: false // Hide legend to save space
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#38bdf8',
                    borderColor: 'rgba(56,189,248,0.3)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return ` Delay: ${context.parsed.y} mins`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)', // slate-700
                        drawBorder: false
                    },
                    ticks: {
                        stepSize: 15
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

let riskPieChartInstance = null;

function updateRiskPieChart(waypoints) {
    const el = document.getElementById('riskPieChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    
    let low = 0, moderate = 0, high = 0;
    waypoints.forEach(wp => {
        if (wp.delay >= 35) high++;
        else if (wp.delay >= 15) moderate++;
        else low++;
    });

    if (riskPieChartInstance) {
        riskPieChartInstance.destroy();
    }

    riskPieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Low Risk', 'Moderate', 'High Risk'],
            datasets: [{
                data: [low, moderate, high],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: '#1e293b',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { size: 11, family: "'Inter', sans-serif" }, boxWidth: 12 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#e2e8f0',
                    padding: 8,
                }
            }
        }
    });
}

window.nexusChart = { initChart, updateDelayChart, updateRiskPieChart };
