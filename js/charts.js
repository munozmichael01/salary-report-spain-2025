// Charts - Create interactive charts with Chart.js

class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#2c5aa0',
            secondary: '#4a90a4',
            accent: '#e74c3c',
            success: '#27ae60',
            warning: '#f39c12',
            gradient1: ['#1a3a52', '#2c5aa0', '#4a90a4'],
            gradient2: ['#27ae60', '#229954', '#1e8449']
        };
    }

    createAll(data) {
        this.createDistributionChart();
        this.createTopPositionsChart(data.positions);
        this.createBestPaidChart(data.bestPaid);
        this.createRegionsChart(data.regions);
        this.createCitiesChart(data.cities);
        this.createFieldsChart(data.fields);
        this.createAreasChart(data.areas);
    }

    createDistributionChart() {
        const ctx = document.getElementById('chartDistribution');
        if (!ctx) return;

        this.charts.distribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['P10', 'P25', 'Mediana', 'P75', 'P90'],
                datasets: [{
                    label: 'Salario (€)',
                    data: [14000, 16000, 20000, 24000, 27500],
                    backgroundColor: [
                        'rgba(231, 76, 60, 0.7)',
                        'rgba(243, 156, 18, 0.7)',
                        'rgba(39, 174, 96, 0.7)',
                        'rgba(52, 152, 219, 0.7)',
                        'rgba(155, 89, 182, 0.7)'
                    ],
                    borderColor: [
                        'rgba(231, 76, 60, 1)',
                        'rgba(243, 156, 18, 1)',
                        'rgba(39, 174, 96, 1)',
                        'rgba(52, 152, 219, 1)',
                        'rgba(155, 89, 182, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y.toLocaleString('es-ES')}€`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${(value/1000).toFixed(0)}K€`
                        }
                    }
                }
            }
        });
    }

    createTopPositionsChart(positions) {
        const ctx = document.getElementById('chartTopPositions');
        if (!ctx) return;

        const top20 = positions
            .sort((a, b) => b.n - a.n)
            .slice(0, 20);

        this.charts.topPositions = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top20.map(p => p.name),
                datasets: [{
                    label: 'Número de Ofertas',
                    data: top20.map(p => p.n),
                    backgroundColor: this.colors.primary,
                    borderColor: this.colors.primary,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.x.toLocaleString('es-ES')} ofertas`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createBestPaidChart(bestPaid) {
        const ctx = document.getElementById('chartBestPaid');
        if (!ctx) return;

        const top15 = bestPaid.slice(0, 15);

        this.charts.bestPaid = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top15.map(p => p.name),
                datasets: [{
                    label: 'Mediana (€)',
                    data: top15.map(p => p.median),
                    backgroundColor: this.colors.success,
                    borderColor: this.colors.success,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.x.toLocaleString('es-ES')}€`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${(value/1000).toFixed(0)}K€`
                        }
                    }
                }
            }
        });
    }

    createRegionsChart(regions) {
        const ctx = document.getElementById('chartRegions');
        if (!ctx) return;

        const top20 = regions
            .sort((a, b) => b.median - a.median)
            .slice(0, 20);

        // Create gradient colors based on median
        const maxMedian = Math.max(...top20.map(r => r.median));
        const minMedian = Math.min(...top20.map(r => r.median));

        const colors = top20.map(r => {
            const ratio = (r.median - minMedian) / (maxMedian - minMedian);
            if (ratio > 0.8) return 'rgba(231, 76, 60, 0.8)';
            if (ratio > 0.6) return 'rgba(243, 156, 18, 0.8)';
            if (ratio > 0.4) return 'rgba(39, 174, 96, 0.8)';
            if (ratio > 0.2) return 'rgba(52, 152, 219, 0.8)';
            return 'rgba(149, 165, 166, 0.8)';
        });

        this.charts.regions = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top20.map(r => r.name),
                datasets: [{
                    label: 'Mediana (€)',
                    data: top20.map(r => r.median),
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const region = top20[context.dataIndex];
                                return [
                                    `Mediana: ${context.parsed.x.toLocaleString('es-ES')}€`,
                                    `Ofertas: ${region.n.toLocaleString('es-ES')}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${(value/1000).toFixed(0)}K€`
                        }
                    }
                }
            }
        });
    }

    createCitiesChart(cities) {
        const ctx = document.getElementById('chartCities');
        if (!ctx) return;

        const top15 = cities
            .sort((a, b) => b.median - a.median)
            .slice(0, 15);

        this.charts.cities = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top15.map(c => c.name),
                datasets: [{
                    label: 'Mediana (€)',
                    data: top15.map(c => c.median),
                    backgroundColor: this.colors.secondary,
                    borderColor: this.colors.secondary,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const city = top15[context.dataIndex];
                                return [
                                    `Mediana: ${context.parsed.x.toLocaleString('es-ES')}€`,
                                    `Ofertas: ${city.n.toLocaleString('es-ES')}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${(value/1000).toFixed(0)}K€`
                        }
                    }
                }
            }
        });
    }

    createFieldsChart(fields) {
        const ctx = document.getElementById('chartFields');
        if (!ctx) return;

        const top15 = fields
            .sort((a, b) => b.median - a.median)
            .slice(0, 15);

        this.charts.fields = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top15.map(f => f.name),
                datasets: [{
                    label: 'Mediana (€)',
                    data: top15.map(f => f.median),
                    backgroundColor: this.colors.warning,
                    borderColor: this.colors.warning,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const field = top15[context.dataIndex];
                                return [
                                    `Mediana: ${context.parsed.x.toLocaleString('es-ES')}€`,
                                    `Ofertas: ${field.n.toLocaleString('es-ES')}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${(value/1000).toFixed(0)}K€`
                        }
                    }
                }
            }
        });
    }

    createAreasChart(areas) {
        const ctx = document.getElementById('chartAreas');
        if (!ctx) return;

        const sorted = areas.sort((a, b) => b.median - a.median);

        this.charts.areas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(a => a.name),
                datasets: [{
                    label: 'Mediana (€)',
                    data: sorted.map(a => a.median),
                    backgroundColor: this.colors.accent,
                    borderColor: this.colors.accent,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const area = sorted[context.dataIndex];
                                return [
                                    `Mediana: ${context.parsed.x.toLocaleString('es-ES')}€`,
                                    `Ofertas: ${area.n.toLocaleString('es-ES')}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${(value/1000).toFixed(0)}K€`
                        }
                    }
                }
            }
        });
    }

    destroy(chartName) {
        if (this.charts[chartName]) {
            this.charts[chartName].destroy();
            delete this.charts[chartName];
        }
    }

    destroyAll() {
        Object.keys(this.charts).forEach(name => this.destroy(name));
    }
}

// Create global instance
window.chartManager = new ChartManager();
