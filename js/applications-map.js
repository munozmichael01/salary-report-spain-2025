/**
 * Applications Interactive Map Component
 *
 * MAP INTERACTION RULES:
 * - Initial view: Countries
 * - Click country → Zoom to regions → Apply Country filter globally
 * - Click region → Zoom to cities → Apply Region filter globally
 * - Click city → Apply City filter → No further zoom
 * - All filters update map, tables, and insights simultaneously
 * - Breadcrumb navigation for context
 */

class ApplicationsMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.chart = null;

        // Current navigation state
        this.currentLevel = 'countries'; // 'countries', 'regions', 'cities'
        this.currentCountryId = null;
        this.currentRegionId = null;
        this.currentCityId = null;

        // Breadcrumb path
        this.breadcrumb = [];

        // Event callbacks
        this.onNavigate = null;
        this.onSelect = null;

        // Color scale for DELIVERY (high volume = good = green)
        this.colorScale = {
            veryHigh: '#27ae60',   // Green - excellent delivery (high volume)
            high: '#58d68d',       // Light green - good delivery
            medium: '#f4d03f',     // Yellow - average delivery
            low: '#e67e22',        // Orange - below average delivery
            veryLow: '#e74c3c'     // Red - poor delivery (low volume)
        };
    }

    /**
     * Initialize the map component
     */
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`Map container #${this.containerId} not found`);
            return;
        }

        // Create the map structure
        this.createMapStructure();
        this.renderBreadcrumb();
    }

    /**
     * Create the map HTML structure
     */
    createMapStructure() {
        this.container.innerHTML = `
            <div class="map-wrapper">
                <div class="map-header">
                    <div class="map-breadcrumb" id="map-breadcrumb"></div>
                    <div class="map-controls">
                        <button class="map-btn map-btn-back" id="map-back-btn" style="display:none">
                            <span>← Volver</span>
                        </button>
                        <button class="map-btn map-btn-reset" id="map-reset-btn" style="display:none">
                            <span>🏠 Inicio</span>
                        </button>
                    </div>
                </div>
                <div class="map-content">
                    <div class="map-chart-container">
                        <canvas id="map-chart"></canvas>
                    </div>
                    <div class="map-legend" id="map-legend"></div>
                </div>
                <div class="map-info-panel" id="map-info-panel"></div>
            </div>
        `;

        // Set up event listeners
        document.getElementById('map-back-btn').addEventListener('click', () => this.goBack());
        document.getElementById('map-reset-btn').addEventListener('click', () => this.reset());

        // Render the legend
        this.renderLegend();
    }

    /**
     * Render the color legend
     */
    renderLegend() {
        const legendEl = document.getElementById('map-legend');
        legendEl.innerHTML = `
            <div class="legend-title">Volumen de Delivery</div>
            <div class="legend-items">
                <div class="legend-item">
                    <span class="legend-color" style="background:${this.colorScale.veryHigh}"></span>
                    <span>Excelente</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background:${this.colorScale.high}"></span>
                    <span>Bueno</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background:${this.colorScale.medium}"></span>
                    <span>Promedio</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background:${this.colorScale.low}"></span>
                    <span>Bajo</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background:${this.colorScale.veryLow}"></span>
                    <span>Crítico</span>
                </div>
            </div>
        `;
    }

    /**
     * Render the breadcrumb navigation
     */
    renderBreadcrumb() {
        const breadcrumbEl = document.getElementById('map-breadcrumb');
        const backBtn = document.getElementById('map-back-btn');
        const resetBtn = document.getElementById('map-reset-btn');

        let html = '<span class="breadcrumb-item breadcrumb-home" data-action="reset">🌍 Global</span>';

        this.breadcrumb.forEach((item, index) => {
            html += ` <span class="breadcrumb-separator">›</span> `;
            const isLast = index === this.breadcrumb.length - 1;
            html += `<span class="breadcrumb-item ${isLast ? 'breadcrumb-current' : ''}"
                          data-level="${item.level}"
                          data-id="${item.id}">${item.name}</span>`;
        });

        breadcrumbEl.innerHTML = html;

        // Show/hide navigation buttons
        backBtn.style.display = this.breadcrumb.length > 0 ? 'inline-flex' : 'none';
        resetBtn.style.display = this.breadcrumb.length > 0 ? 'inline-flex' : 'none';

        // Add click handlers to breadcrumb items
        breadcrumbEl.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'reset') {
                    this.reset();
                } else {
                    const level = e.target.dataset.level;
                    const id = parseInt(e.target.dataset.id);
                    this.navigateToLevel(level, id);
                }
            });
        });
    }

    /**
     * Get color based on median value (high = good delivery = green)
     */
    getColorForMedian(median, globalMedian) {
        const ratio = median / globalMedian;

        // High volume = good delivery = green
        if (ratio >= 1.4) return this.colorScale.veryHigh;  // Excellent delivery
        if (ratio >= 1.15) return this.colorScale.high;     // Good delivery
        if (ratio >= 0.85) return this.colorScale.medium;   // Average delivery
        if (ratio >= 0.6) return this.colorScale.low;       // Below average
        return this.colorScale.veryLow;                      // Poor delivery
    }

    /**
     * Render the chart for current level
     */
    renderChart(data, globalMedian) {
        const ctx = document.getElementById('map-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Sort by median descending
        const sortedData = [...data].sort((a, b) => b.median - a.median);

        // Limit to top 30 for readability
        const displayData = sortedData.slice(0, 30);

        const labels = displayData.map(d => d.name);
        const values = displayData.map(d => d.median);
        const colors = displayData.map(d => this.getColorForMedian(d.median, globalMedian));
        const ids = displayData.map(d => d.id);
        const nValues = displayData.map(d => d.n);

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Mediana de Inscripciones por Oferta',
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors.map(c => this.adjustColor(c, -20)),
                    borderWidth: 1,
                    borderRadius: 4,
                    ids: ids,
                    nValues: nValues
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
                            title: (items) => {
                                return items[0].label;
                            },
                            label: (context) => {
                                const median = context.raw;
                                const n = context.dataset.nValues[context.dataIndex];
                                const ratio = (median / globalMedian * 100).toFixed(0);
                                return [
                                    `Mediana: ${median.toFixed(1)} inscripciones/oferta`,
                                    `Ofertas: ${n.toLocaleString()}`,
                                    `vs. Global: ${ratio}%`
                                ];
                            }
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Mediana de Inscripciones por Oferta',
                            font: { size: 12, weight: 'bold' }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { size: 11 },
                            callback: function(value) {
                                const label = this.getLabelForValue(value);
                                return label.length > 25 ? label.substring(0, 25) + '...' : label;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const id = this.chart.data.datasets[0].ids[index];
                        const name = this.chart.data.labels[index];
                        this.handleItemClick(id, name);
                    }
                },
                onHover: (event, elements) => {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });

        // Update info panel
        this.updateInfoPanel(displayData.length, data.length, globalMedian);
    }

    /**
     * Adjust color brightness
     */
    adjustColor(color, amount) {
        const clamp = (num) => Math.min(255, Math.max(0, num));

        // Parse hex color
        let r = parseInt(color.slice(1, 3), 16);
        let g = parseInt(color.slice(3, 5), 16);
        let b = parseInt(color.slice(5, 7), 16);

        r = clamp(r + amount);
        g = clamp(g + amount);
        b = clamp(b + amount);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Update the info panel
     */
    updateInfoPanel(displayed, total, globalMedian) {
        const panel = document.getElementById('map-info-panel');

        let levelText = '';
        switch (this.currentLevel) {
            case 'countries':
                levelText = 'Países';
                break;
            case 'regions':
                levelText = 'Regiones';
                break;
            case 'cities':
                levelText = 'Ciudades';
                break;
        }

        panel.innerHTML = `
            <div class="info-stats">
                <div class="info-stat">
                    <span class="info-stat-value">${displayed}</span>
                    <span class="info-stat-label">${levelText} mostrados</span>
                </div>
                <div class="info-stat">
                    <span class="info-stat-value">${total}</span>
                    <span class="info-stat-label">Total ${levelText.toLowerCase()}</span>
                </div>
                <div class="info-stat">
                    <span class="info-stat-value">${globalMedian.toFixed(1)}</span>
                    <span class="info-stat-label">Mediana referencia</span>
                </div>
            </div>
            <p class="info-hint">Haz clic en una barra para explorar</p>
        `;
    }

    /**
     * Handle click on chart item
     */
    handleItemClick(id, name) {
        switch (this.currentLevel) {
            case 'countries':
                this.drillDownToRegions(id, name);
                break;
            case 'regions':
                this.drillDownToCities(id, name);
                break;
            case 'cities':
                this.selectCity(id, name);
                break;
        }
    }

    /**
     * Load countries view
     */
    loadCountries(data) {
        this.currentLevel = 'countries';
        this.currentCountryId = null;
        this.currentRegionId = null;
        this.currentCityId = null;
        this.breadcrumb = [];

        const globalMedian = window.applicationsDataLoader?.data.globalMetrics.globalMedian || 30;
        this.renderChart(data.countries, globalMedian);
        this.renderBreadcrumb();

        // Trigger navigation event
        if (this.onNavigate) {
            this.onNavigate({
                level: 'countries',
                countryId: null,
                regionId: null,
                cityId: null
            });
        }
    }

    /**
     * Drill down to regions of a country
     */
    drillDownToRegions(countryId, countryName) {
        this.currentLevel = 'regions';
        this.currentCountryId = countryId;
        this.currentRegionId = null;
        this.currentCityId = null;

        this.breadcrumb = [
            { level: 'countries', id: countryId, name: countryName }
        ];

        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader) return;

        // Get regions filtered by country using the country-region mapping
        const regions = dataLoader.getRegionsForCountry(countryId);

        // Get the country median as reference
        const country = dataLoader.getCountryById(countryId);
        const referenceMedian = country ? country.median : dataLoader.data.globalMetrics.globalMedian;

        this.renderChart(regions, referenceMedian);
        this.renderBreadcrumb();

        // Trigger navigation event
        if (this.onNavigate) {
            this.onNavigate({
                level: 'regions',
                countryId: countryId,
                countryName: countryName,
                regionId: null,
                cityId: null
            });
        }
    }

    /**
     * Drill down to cities of a region
     */
    drillDownToCities(regionId, regionName) {
        this.currentLevel = 'cities';
        this.currentRegionId = regionId;
        this.currentCityId = null;

        // Keep country in breadcrumb if exists
        const countryBreadcrumb = this.breadcrumb.find(b => b.level === 'countries');

        this.breadcrumb = countryBreadcrumb
            ? [countryBreadcrumb, { level: 'regions', id: regionId, name: regionName }]
            : [{ level: 'regions', id: regionId, name: regionName }];

        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader) return;

        // Get cities for this region
        const cities = dataLoader.getCitiesForRegion(regionId);

        // Get the region median as reference
        const region = dataLoader.getRegionById(regionId);
        const referenceMedian = region ? region.median : dataLoader.data.globalMetrics.globalMedian;

        this.renderChart(cities, referenceMedian);
        this.renderBreadcrumb();

        // Trigger navigation event
        if (this.onNavigate) {
            this.onNavigate({
                level: 'cities',
                countryId: this.currentCountryId,
                regionId: regionId,
                regionName: regionName,
                cityId: null
            });
        }
    }

    /**
     * Select a city (final level)
     */
    selectCity(cityId, cityName) {
        this.currentCityId = cityId;

        // Add city to breadcrumb
        const cityBreadcrumb = { level: 'cities', id: cityId, name: cityName };
        if (!this.breadcrumb.find(b => b.level === 'cities')) {
            this.breadcrumb.push(cityBreadcrumb);
        } else {
            this.breadcrumb = this.breadcrumb.filter(b => b.level !== 'cities');
            this.breadcrumb.push(cityBreadcrumb);
        }

        this.renderBreadcrumb();

        // Trigger selection event
        if (this.onSelect) {
            this.onSelect({
                level: 'cities',
                countryId: this.currentCountryId,
                regionId: this.currentRegionId,
                cityId: cityId,
                cityName: cityName
            });
        }
    }

    /**
     * Navigate to a specific level
     */
    navigateToLevel(level, id) {
        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader) return;

        switch (level) {
            case 'countries':
                this.drillDownToRegions(id, this.breadcrumb.find(b => b.id === id)?.name || '');
                break;
            case 'regions':
                this.drillDownToCities(id, this.breadcrumb.find(b => b.id === id)?.name || '');
                break;
        }
    }

    /**
     * Go back one level
     */
    goBack() {
        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader) return;

        if (this.currentLevel === 'cities') {
            // Go back to regions for the current country
            if (this.currentCountryId) {
                // Remove city from breadcrumb
                this.breadcrumb = this.breadcrumb.filter(b => b.level !== 'cities');
                this.currentLevel = 'regions';
                this.currentCityId = null;
                this.currentRegionId = null;

                // Get regions filtered by current country
                const countryRegions = dataLoader.getRegionsForCountry(this.currentCountryId);
                const referenceMedian = dataLoader.data.globalMetrics.globalMedian;

                // Get country reference for proper context
                const country = dataLoader.getCountryById(this.currentCountryId);
                const countryMedian = country ? country.median : referenceMedian;

                this.renderChart(countryRegions, countryMedian);
                this.renderBreadcrumb();

                if (this.onNavigate) {
                    this.onNavigate({
                        level: 'regions',
                        countryId: this.currentCountryId,
                        countryName: country?.name,
                        regionId: null,
                        cityId: null
                    });
                }
            } else {
                // No country context, go back to global
                this.reset();
            }
        } else if (this.currentLevel === 'regions') {
            // Go back to countries
            this.reset();
        }
    }

    /**
     * Reset to initial country view
     */
    reset() {
        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader || !dataLoader.isLoaded) return;

        this.loadCountries(dataLoader.data);
    }

    /**
     * Set callback for navigation events
     */
    setNavigationCallback(callback) {
        this.onNavigate = callback;
    }

    /**
     * Set callback for selection events
     */
    setSelectionCallback(callback) {
        this.onSelect = callback;
    }

    /**
     * Get current filter state
     */
    getCurrentFilters() {
        return {
            countryId: this.currentCountryId,
            regionId: this.currentRegionId,
            cityId: this.currentCityId,
            level: this.currentLevel
        };
    }

    /**
     * Apply external filter (e.g., from title selector)
     */
    applyFilter(filters) {
        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader) return;

        const { titleId, fieldId } = filters;

        if (titleId) {
            // Show locations for this specific title
            let data;
            let referenceMedian;

            if (this.currentLevel === 'cities' && this.currentRegionId) {
                data = dataLoader.data.titleCity
                    .filter(tc => tc.titleId === titleId && tc.regionId === this.currentRegionId);
                const region = dataLoader.getRegionById(this.currentRegionId);
                referenceMedian = region ? region.median : dataLoader.data.globalMetrics.globalMedian;
            } else if (this.currentLevel === 'regions') {
                data = dataLoader.data.titleRegion
                    .filter(tr => tr.titleId === titleId)
                    .map(tr => ({
                        id: tr.regionId,
                        name: tr.regionName,
                        n: tr.n,
                        median: tr.median,
                        mean: tr.mean,
                        totalApplications: tr.totalApplications
                    }));
                referenceMedian = dataLoader.data.globalMetrics.globalMedian;
            } else {
                data = dataLoader.data.titleCountry
                    .filter(tc => tc.titleId === titleId)
                    .map(tc => ({
                        id: tc.countryId,
                        name: tc.countryName,
                        n: tc.n,
                        median: tc.median,
                        mean: tc.mean,
                        totalApplications: tc.totalApplications
                    }));
                referenceMedian = dataLoader.data.globalMetrics.globalMedian;
            }

            if (data.length > 0) {
                this.renderChart(data, referenceMedian);
            }
        }
    }

    /**
     * Clear all filters and reset
     */
    clearFilters() {
        this.reset();
    }
}

// Create global instance
window.applicationsMap = null;
