/**
 * Applications Dashboard Main Controller
 * Orchestrates all components and manages global state
 */

class ApplicationsDashboard {
    constructor() {
        this.isLoaded = false;
        this.data = null;

        // Global filter state
        this.filters = {
            titleId: null,
            countryId: null,
            regionId: null,
            cityId: null,
            fieldId: null,
            minN: 0  // No filter by default - user can apply via UI
        };

        // Component references
        this.dataLoader = null;
        this.insights = null;
        this.map = null;
        this.tables = null;
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            this.showLoading();

            // Initialize data loader
            this.dataLoader = window.applicationsDataLoader;
            if (!this.dataLoader) {
                throw new Error('Data loader not found. Make sure applications-data-loader.js is loaded.');
            }
            this.data = await this.dataLoader.loadAllData();

            // Initialize insights calculator
            window.insightsCalculator = new InsightsCalculator(this.dataLoader);
            this.insights = window.insightsCalculator;

            // Initialize tables FIRST (before other components that might need it)
            this.tables = new ApplicationsTables();
            window.applicationsTables = this.tables;
            this.tables.init();
            this.tables.setRowClickCallback((row) => this.handleTableRowClick(row));

            // Initialize bar chart map (default view)
            this.map = new ApplicationsMap('map-container');
            this.map.init();
            this.map.setNavigationCallback((nav) => this.handleMapNavigation(nav));
            this.map.setSelectionCallback((sel) => this.handleMapSelection(sel));
            this.map.loadCountries(this.data);

            // Initialize Leaflet map (alternative view)
            this.leafletMap = new ApplicationsLeafletMap('leaflet-map');
            this.leafletMap.init();
            this.leafletMap.setNavigationCallback((nav) => this.handleMapNavigation(nav));
            this.leafletMap.setSelectionCallback((sel) => this.handleMapSelection(sel));
            this.leafletMap.loadCountries(this.data);

            // Current view mode
            this.currentViewMode = 'bars'; // 'bars' or 'map'

            // Populate filter dropdowns
            this.populateFilters();

            // Render initial data
            this.renderSummaryCards();
            this.renderTables();
            this.renderCharts();

            // Setup event listeners
            this.setupEventListeners();

            this.isLoaded = true;
            this.hideLoading();

            // Setup scroll animations
            this.setupScrollAnimations();

        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError(error.message);
        }
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('active');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.hideLoading();
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error al cargar los datos</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()">Reintentar</button>
                </div>
            `;
            errorContainer.style.display = 'block';
        }
    }

    /**
     * Populate filter dropdowns
     */
    populateFilters() {
        // Job Title filter
        const titleSelect = document.getElementById('filter-title');
        if (titleSelect) {
            const titles = this.dataLoader.getTop(this.data.titles, 'n', 100);
            titleSelect.innerHTML = '<option value="">Todos los puestos</option>' +
                titles.map(t => `<option value="${t.id}">${t.name} (${t.n})</option>`).join('');
        }

        // Field filter
        const fieldSelect = document.getElementById('filter-field');
        if (fieldSelect) {
            fieldSelect.innerHTML = '<option value="">Todos los sectores</option>' +
                this.data.fields.map(f => `<option value="${f.id}">${f.name} (${f.n})</option>`).join('');
        }

        // Country filter
        const countrySelect = document.getElementById('filter-country');
        if (countrySelect) {
            countrySelect.innerHTML = '<option value="">Todos los países</option>' +
                this.data.countries.map(c => `<option value="${c.id}">${c.name} (${c.n})</option>`).join('');
        }

        // Min N filter
        const minNSelect = document.getElementById('filter-min-n');
        if (minNSelect) {
            minNSelect.innerHTML = `
                <option value="0">Sin mínimo</option>
                <option value="5">Min. 5 ofertas</option>
                <option value="10">Min. 10 ofertas</option>
                <option value="20">Min. 20 ofertas</option>
                <option value="50">Min. 50 ofertas</option>
                <option value="100">Min. 100 ofertas</option>
            `;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filter change handlers
        document.getElementById('filter-title')?.addEventListener('change', (e) => {
            this.filters.titleId = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });

        document.getElementById('filter-field')?.addEventListener('change', (e) => {
            this.filters.fieldId = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });

        document.getElementById('filter-country')?.addEventListener('change', (e) => {
            this.filters.countryId = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });

        document.getElementById('filter-min-n')?.addEventListener('change', (e) => {
            this.filters.minN = parseInt(e.target.value) || 0;
            this.applyFilters();
        });

        // Clear filters button
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Clear geo filter button
        document.getElementById('geo-clear-filter')?.addEventListener('click', () => {
            this.clearGeoFilter();
        });

        // View toggle buttons (bars vs map)
        document.getElementById('view-bars')?.addEventListener('click', () => {
            this.switchView('bars');
        });

        document.getElementById('view-map')?.addEventListener('click', () => {
            this.switchView('map');
        });

        // Comparison type selector
        document.getElementById('compare-type')?.addEventListener('change', (e) => {
            this.handleCompareTypeChange(e.target.value);
        });

        // Comparison value selectors
        document.getElementById('compare-segment-1')?.addEventListener('change', () => {
            this.updateComparison();
        });

        document.getElementById('compare-segment-2')?.addEventListener('change', () => {
            this.updateComparison();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    /**
     * Handle map navigation events
     */
    handleMapNavigation(nav) {
        // Update filters based on map navigation
        this.filters.countryId = nav.countryId || null;
        this.filters.regionId = nav.regionId || null;
        this.filters.cityId = nav.cityId || null;

        // Update filter dropdowns (without triggering change events)
        const countrySelect = document.getElementById('filter-country');
        if (countrySelect && nav.countryId) {
            countrySelect.value = nav.countryId;
        }

        // Update breadcrumb display
        this.updateBreadcrumb(nav);

        // Update geo filter indicator
        this.updateGeoFilterIndicator(nav);

        // Refresh tables and insights for the new context
        this.renderTablesForContext(nav);
        this.renderInsightsForContext(nav);
    }

    /**
     * Update geo filter indicator visibility and text
     */
    updateGeoFilterIndicator(nav) {
        const indicator = document.getElementById('geo-filter-indicator');
        const filterText = document.getElementById('geo-filter-text');
        const regionsBadge = document.getElementById('regions-filter-badge');
        const citiesBadge = document.getElementById('cities-filter-badge');
        const titlesBadge = document.getElementById('titles-filter-badge');

        if (!nav || (!nav.countryId && !nav.regionId)) {
            // No geo filter active
            if (indicator) indicator.style.display = 'none';
            if (regionsBadge) regionsBadge.style.display = 'none';
            if (citiesBadge) citiesBadge.style.display = 'none';
            if (titlesBadge) titlesBadge.style.display = 'none';
            return;
        }

        // Show indicator
        if (indicator) indicator.style.display = 'flex';

        let contextText = '';

        if (nav.cityName) {
            contextText = `Mostrando datos para: ${nav.cityName}`;
        } else if (nav.regionName) {
            contextText = `Mostrando datos para: ${nav.regionName}`;
        } else if (nav.countryName) {
            contextText = `Mostrando regiones de: ${nav.countryName}`;
        }

        if (filterText) filterText.textContent = contextText;

        // Update badges
        if (regionsBadge && nav.countryName) {
            regionsBadge.textContent = nav.countryName;
            regionsBadge.style.display = 'inline-flex';
        }

        if (citiesBadge && nav.regionName) {
            citiesBadge.textContent = nav.regionName;
            citiesBadge.style.display = 'inline-flex';
        }
    }

    /**
     * Handle map selection events (city clicked)
     */
    handleMapSelection(sel) {
        this.filters.cityId = sel.cityId;

        // Show detailed city view
        this.showCityDetails(sel.cityId, sel.cityName);
    }

    /**
     * Handle table row clicks
     */
    handleTableRowClick(row) {
        const { id, name, table } = row;

        switch (table) {
            case 'titles-table':
                this.filters.titleId = id;
                document.getElementById('filter-title').value = id;
                this.applyFilters();
                this.showTitleDetails(id, name);
                break;
            case 'regions-table':
                this.map.drillDownToCities(id, name);
                break;
            case 'cities-table':
                this.showCityDetails(id, name);
                break;
            case 'fields-table':
                this.filters.fieldId = id;
                document.getElementById('filter-field').value = id;
                this.applyFilters();
                break;
        }
    }

    /**
     * Apply current filters to all components
     */
    applyFilters() {
        // Get filtered data
        const filteredData = this.dataLoader.getFilteredData(this.filters);

        // Update map
        if (this.filters.titleId) {
            this.map.applyFilter({ titleId: this.filters.titleId });
        }

        // Update tables
        this.renderTables(filteredData);

        // Update insights
        this.renderInsightsForFilters();

        // Update charts
        this.renderCharts(filteredData);

        // Update active filters display
        this.updateActiveFiltersDisplay();
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = {
            titleId: null,
            countryId: null,
            regionId: null,
            cityId: null,
            fieldId: null,
            minN: 0
        };

        // Reset dropdowns
        document.getElementById('filter-title').value = '';
        document.getElementById('filter-field').value = '';
        document.getElementById('filter-country').value = '';
        document.getElementById('filter-min-n').value = '0';

        // Reset map
        this.map.clearFilters();

        // Hide geo filter indicator
        this.updateGeoFilterIndicator(null);

        // Re-render everything
        this.renderTables();
        this.renderSummaryCards();
        this.renderCharts();
        this.updateActiveFiltersDisplay();
    }

    /**
     * Clear only geo filters and reset map
     */
    clearGeoFilter() {
        this.filters.countryId = null;
        this.filters.regionId = null;
        this.filters.cityId = null;

        // Reset country dropdown
        const countrySelect = document.getElementById('filter-country');
        if (countrySelect) countrySelect.value = '';

        // Reset both maps to initial view
        this.map.reset();
        if (this.leafletMap) this.leafletMap.reset();

        // Hide geo filter indicator
        this.updateGeoFilterIndicator(null);

        // Re-render tables with unfiltered data
        this.renderTables();
        this.updateActiveFiltersDisplay();
    }

    /**
     * Switch between bar chart and leaflet map views
     */
    switchView(viewMode) {
        if (this.currentViewMode === viewMode) return;

        this.currentViewMode = viewMode;

        const barChartContainer = document.getElementById('map-container');
        const leafletContainer = document.getElementById('leaflet-map-container');
        const viewBarsBtn = document.getElementById('view-bars');
        const viewMapBtn = document.getElementById('view-map');

        if (viewMode === 'bars') {
            // Show bar chart, hide leaflet map
            if (barChartContainer) barChartContainer.style.display = 'block';
            if (leafletContainer) leafletContainer.style.display = 'none';
            if (viewBarsBtn) viewBarsBtn.classList.add('active');
            if (viewMapBtn) viewMapBtn.classList.remove('active');
        } else {
            // Show leaflet map, hide bar chart
            if (barChartContainer) barChartContainer.style.display = 'none';
            if (leafletContainer) leafletContainer.style.display = 'block';
            if (viewBarsBtn) viewBarsBtn.classList.remove('active');
            if (viewMapBtn) viewMapBtn.classList.add('active');

            // Invalidate leaflet map size to fix rendering issues
            if (this.leafletMap) {
                this.leafletMap.invalidateSize();
            }
        }
    }

    /**
     * Update active filters display
     */
    updateActiveFiltersDisplay() {
        const container = document.getElementById('active-filters');
        if (!container) return;

        const activeFilters = [];

        if (this.filters.titleId) {
            const title = this.dataLoader.getTitleById(this.filters.titleId);
            if (title) activeFilters.push({ key: 'titleId', label: `Puesto: ${title.name}` });
        }

        if (this.filters.countryId) {
            const country = this.dataLoader.getCountryById(this.filters.countryId);
            if (country) activeFilters.push({ key: 'countryId', label: `País: ${country.name}` });
        }

        if (this.filters.regionId) {
            const region = this.dataLoader.getRegionById(this.filters.regionId);
            if (region) activeFilters.push({ key: 'regionId', label: `Región: ${region.name}` });
        }

        if (this.filters.cityId) {
            const city = this.dataLoader.getCityById(this.filters.cityId);
            if (city) activeFilters.push({ key: 'cityId', label: `Ciudad: ${city.name}` });
        }

        if (this.filters.fieldId) {
            const field = this.dataLoader.getFieldById(this.filters.fieldId);
            if (field) activeFilters.push({ key: 'fieldId', label: `Sector: ${field.name}` });
        }

        if (activeFilters.length === 0) {
            container.innerHTML = '<span class="no-filters">Sin filtros activos</span>';
        } else {
            container.innerHTML = activeFilters.map(f => `
                <span class="filter-tag">
                    ${f.label}
                    <button class="filter-remove" data-key="${f.key}">×</button>
                </span>
            `).join('');

            // Add remove handlers
            container.querySelectorAll('.filter-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.dataset.key;
                    this.filters[key] = null;
                    this.applyFilters();
                });
            });
        }
    }

    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumb(nav) {
        const container = document.getElementById('location-breadcrumb');
        if (!container) return;

        let html = '<span class="breadcrumb-home" onclick="appDashboard.map.reset()">Global</span>';

        if (nav.countryName) {
            html += ` <span class="breadcrumb-sep">›</span> <span class="breadcrumb-item">${nav.countryName}</span>`;
        }

        if (nav.regionName) {
            html += ` <span class="breadcrumb-sep">›</span> <span class="breadcrumb-item">${nav.regionName}</span>`;
        }

        if (nav.cityName) {
            html += ` <span class="breadcrumb-sep">›</span> <span class="breadcrumb-item breadcrumb-current">${nav.cityName}</span>`;
        }

        container.innerHTML = html;
    }

    /**
     * Render summary cards
     */
    renderSummaryCards() {
        const metrics = this.data.globalMetrics;
        if (!metrics) return;

        const cards = [
            {
                id: 'metric-offers',
                icon: '📋',
                label: 'Total Ofertas',
                value: metrics.totalOffers.toLocaleString('es-ES'),
                subtext: 'Ofertas analizadas'
            },
            {
                id: 'metric-applications',
                icon: '📝',
                label: 'Total Inscripciones',
                value: metrics.totalApplications.toLocaleString('es-ES'),
                subtext: 'Inscripciones registradas'
            },
            {
                id: 'metric-median',
                icon: '📊',
                label: 'Mediana Global',
                value: metrics.globalMedian.toFixed(1),
                subtext: 'Inscripciones por oferta'
            },
            {
                id: 'metric-mean',
                icon: '📈',
                label: 'Media Global',
                value: metrics.globalMean.toFixed(1),
                subtext: 'Inscripciones por oferta'
            }
        ];

        cards.forEach(card => {
            const el = document.getElementById(card.id);
            if (el) {
                el.innerHTML = `
                    <div class="metric-icon">${card.icon}</div>
                    <div class="metric-label">${card.label}</div>
                    <div class="metric-value">${card.value}</div>
                    <div class="metric-subtext">${card.subtext}</div>
                `;
            }
        });
    }

    /**
     * Render all tables
     */
    renderTables(data = null) {
        const tableData = data || this.data;

        // Titles table
        this.tables.createTitlesTable('titles-table', tableData.titles);

        // Regions table
        this.tables.createRegionsTable('regions-table', tableData.regions);

        // Cities table
        this.tables.createCitiesTable('cities-table', tableData.cities);

        // Fields table
        this.tables.createFieldsTable('fields-table', tableData.fields);
    }

    /**
     * Render tables for specific navigation context
     */
    renderTablesForContext(nav) {
        let titlesData, citiesData;

        if (nav.cityId) {
            titlesData = this.dataLoader.getTitlesForCity(nav.cityId);
        } else if (nav.regionId) {
            titlesData = this.dataLoader.getTitlesForRegion(nav.regionId);
            citiesData = this.dataLoader.getCitiesForRegion(nav.regionId);
        } else if (nav.countryId) {
            titlesData = this.dataLoader.getTitlesForCountry(nav.countryId);
        } else {
            titlesData = this.data.titles;
            citiesData = this.data.cities;
        }

        // Transform to consistent format
        if (titlesData && titlesData[0]?.titleId !== undefined) {
            titlesData = titlesData.map(t => ({
                id: t.titleId,
                name: t.titleName,
                n: t.n,
                median: t.median,
                mean: t.mean,
                totalApplications: t.totalApplications
            }));
        }

        if (titlesData) {
            this.tables.createTitlesTable('titles-table', titlesData);
        }

        if (citiesData) {
            this.tables.createCitiesTable('cities-table', citiesData);
        }
    }

    /**
     * Render insights for current filters
     */
    renderInsightsForFilters() {
        const container = document.getElementById('insights-panel');
        if (!container) return;

        let insights = [];

        if (this.filters.titleId) {
            insights = this.insights.generateTitleInsights(this.filters.titleId);
        } else if (this.filters.cityId) {
            insights = this.insights.generateCityInsights(this.filters.cityId);
        } else if (this.filters.regionId) {
            insights = this.insights.generateRegionInsights(this.filters.regionId, this.filters.countryId);
        }

        if (insights.length === 0) {
            container.innerHTML = '<p class="no-insights">Selecciona un segmento para ver insights</p>';
        } else {
            container.innerHTML = insights.map(i => this.insights.formatInsightHTML(i)).join('');
        }
    }

    /**
     * Render insights for navigation context
     */
    renderInsightsForContext(nav) {
        const container = document.getElementById('insights-panel');
        if (!container) return;

        let insights = [];

        if (nav.cityId) {
            insights = this.insights.generateCityInsights(nav.cityId);
        } else if (nav.regionId) {
            insights = this.insights.generateRegionInsights(nav.regionId, nav.countryId);
        }

        if (insights.length === 0) {
            container.innerHTML = '<p class="no-insights">Explora el mapa para ver insights de ubicaciones</p>';
        } else {
            container.innerHTML = insights.map(i => this.insights.formatInsightHTML(i)).join('');
        }
    }

    /**
     * Render charts
     */
    renderCharts(data = null) {
        const chartData = data || this.data;

        // Top positions by competition chart
        this.renderTopCompetitionChart('chart-top-competition', chartData.titles);

        // Top positions by volume chart
        this.renderTopVolumeChart('chart-top-volume', chartData.titles);

        // Fields distribution chart
        this.renderFieldsChart('chart-fields', chartData.fields);
    }

    /**
     * Render top competition chart
     */
    renderTopCompetitionChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Destroy existing chart
        if (window[`chart_${canvasId}`]) {
            window[`chart_${canvasId}`].destroy();
        }

        const topData = [...data].sort((a, b) => b.median - a.median).slice(0, 15);
        const globalMedian = this.data.globalMetrics.globalMedian;

        window[`chart_${canvasId}`] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topData.map(d => d.name),
                datasets: [{
                    label: 'Mediana de inscripciones',
                    data: topData.map(d => d.median),
                    backgroundColor: topData.map(d => {
                        const ratio = d.median / globalMedian;
                        // High volume = good delivery = green
                        if (ratio >= 1.4) return '#27ae60';  // Excellent
                        if (ratio >= 1.1) return '#58d68d';  // Good
                        if (ratio >= 0.9) return '#f4d03f';  // Average
                        if (ratio >= 0.7) return '#e67e22';  // Below average
                        return '#e74c3c';                     // Critical
                    }),
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const item = topData[ctx.dataIndex];
                                return [
                                    `Mediana: ${item.median.toFixed(1)} inscripciones`,
                                    `Ofertas: ${item.n.toLocaleString()}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Mediana de inscripciones por oferta'
                        }
                    },
                    y: {
                        ticks: {
                            callback: function(value) {
                                const label = this.getLabelForValue(value);
                                return label.length > 20 ? label.substring(0, 20) + '...' : label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render top volume chart
     */
    renderTopVolumeChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (window[`chart_${canvasId}`]) {
            window[`chart_${canvasId}`].destroy();
        }

        const topData = [...data].sort((a, b) => b.n - a.n).slice(0, 15);

        window[`chart_${canvasId}`] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topData.map(d => d.name),
                datasets: [{
                    label: 'Número de ofertas',
                    data: topData.map(d => d.n),
                    backgroundColor: '#2c5aa0',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const item = topData[ctx.dataIndex];
                                return [
                                    `Ofertas: ${item.n.toLocaleString()}`,
                                    `Mediana: ${item.median.toFixed(1)} inscripciones`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de ofertas'
                        }
                    },
                    y: {
                        ticks: {
                            callback: function(value) {
                                const label = this.getLabelForValue(value);
                                return label.length > 20 ? label.substring(0, 20) + '...' : label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render fields/sectors chart
     */
    renderFieldsChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (window[`chart_${canvasId}`]) {
            window[`chart_${canvasId}`].destroy();
        }

        const topData = [...data].sort((a, b) => b.median - a.median).slice(0, 12);
        const globalMedian = this.data.globalMetrics.globalMedian;

        window[`chart_${canvasId}`] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topData.map(d => d.name),
                datasets: [{
                    label: 'Mediana de inscripciones',
                    data: topData.map(d => d.median),
                    backgroundColor: topData.map(d => {
                        const ratio = d.median / globalMedian;
                        // High volume = good delivery = green
                        if (ratio >= 1.4) return '#27ae60';  // Excellent
                        if (ratio >= 1.1) return '#58d68d';  // Good
                        if (ratio >= 0.9) return '#f4d03f';  // Average
                        if (ratio >= 0.7) return '#e67e22';  // Below average
                        return '#e74c3c';                     // Critical
                    }),
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const item = topData[ctx.dataIndex];
                                return [
                                    `Mediana: ${item.median.toFixed(1)} inscripciones`,
                                    `Ofertas: ${item.n.toLocaleString()}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Mediana de inscripciones por oferta'
                        }
                    },
                    y: {
                        ticks: {
                            callback: function(value) {
                                const label = this.getLabelForValue(value);
                                return label.length > 25 ? label.substring(0, 25) + '...' : label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Show title details panel
     */
    showTitleDetails(titleId, titleName) {
        const title = this.dataLoader.getTitleById(titleId);
        if (!title) return;

        const insights = this.insights.generateTitleInsights(titleId);

        const modal = document.getElementById('detail-modal');
        if (modal) {
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${titleName}</h3>
                        <button class="modal-close" onclick="appDashboard.closeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-stats">
                            <div class="detail-stat">
                                <span class="stat-value">${title.n.toLocaleString()}</span>
                                <span class="stat-label">Ofertas</span>
                            </div>
                            <div class="detail-stat">
                                <span class="stat-value">${title.median.toFixed(1)}</span>
                                <span class="stat-label">Mediana</span>
                            </div>
                            <div class="detail-stat">
                                <span class="stat-value">${title.mean.toFixed(1)}</span>
                                <span class="stat-label">Media</span>
                            </div>
                        </div>
                        <div class="detail-insights">
                            ${insights.map(i => this.insights.formatInsightHTML(i)).join('')}
                        </div>
                    </div>
                </div>
            `;
            modal.classList.add('active');
        }
    }

    /**
     * Show city details panel
     */
    showCityDetails(cityId, cityName) {
        const city = this.dataLoader.getCityById(cityId);
        if (!city) return;

        const insights = this.insights.generateCityInsights(cityId);

        const modal = document.getElementById('detail-modal');
        if (modal) {
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${cityName}</h3>
                        <span class="modal-subtitle">${city.regionName}</span>
                        <button class="modal-close" onclick="appDashboard.closeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-stats">
                            <div class="detail-stat">
                                <span class="stat-value">${city.n.toLocaleString()}</span>
                                <span class="stat-label">Ofertas</span>
                            </div>
                            <div class="detail-stat">
                                <span class="stat-value">${city.median.toFixed(1)}</span>
                                <span class="stat-label">Mediana</span>
                            </div>
                            <div class="detail-stat">
                                <span class="stat-value">${city.mean.toFixed(1)}</span>
                                <span class="stat-label">Media</span>
                            </div>
                        </div>
                        <div class="detail-insights">
                            ${insights.map(i => this.insights.formatInsightHTML(i)).join('')}
                        </div>
                    </div>
                </div>
            `;
            modal.classList.add('active');
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('detail-modal');
        if (modal) modal.classList.remove('active');
    }

    /**
     * Handle comparison type change (first level of comparator)
     */
    handleCompareTypeChange(segmentType) {
        const valuesContainer = document.getElementById('comparison-values');
        const seg1Select = document.getElementById('compare-segment-1');
        const seg2Select = document.getElementById('compare-segment-2');
        const label1 = document.getElementById('compare-label-1');
        const label2 = document.getElementById('compare-label-2');
        const tableContainer = document.getElementById('comparison-table');
        const insightsContainer = document.getElementById('comparison-insights');

        // Clear previous comparison
        if (tableContainer) tableContainer.innerHTML = '';
        if (insightsContainer) insightsContainer.innerHTML = '';

        if (!segmentType) {
            if (valuesContainer) valuesContainer.style.display = 'none';
            return;
        }

        // Show values container
        if (valuesContainer) valuesContainer.style.display = 'flex';

        // Store current segment type
        this.currentCompareType = segmentType;

        // Get data based on segment type and populate selectors
        let items = [];
        let labelText = '';

        switch (segmentType) {
            case 'title':
                items = this.dataLoader.getTop(this.data.titles, 'n', 100);
                labelText = 'Puesto';
                break;
            case 'country':
                items = this.data.countries;
                labelText = 'País';
                break;
            case 'region':
                items = this.dataLoader.getTop(this.data.regions, 'n', 100);
                labelText = 'Región';
                break;
            case 'city':
                items = this.dataLoader.getTop(this.data.cities, 'n', 100);
                labelText = 'Ciudad';
                break;
            case 'field':
                items = this.data.fields;
                labelText = 'Sector';
                break;
        }

        // Update labels
        if (label1) label1.textContent = labelText + ' 1';
        if (label2) label2.textContent = labelText + ' 2';

        // Populate select options
        const placeholder = `Selecciona ${labelText.toLowerCase()}...`;
        const options = items.map(item =>
            `<option value="${item.id}">${item.name} (${item.n} ofertas)</option>`
        ).join('');

        if (seg1Select) {
            seg1Select.innerHTML = `<option value="">${placeholder}</option>${options}`;
            seg1Select.value = '';
        }
        if (seg2Select) {
            seg2Select.innerHTML = `<option value="">${placeholder}</option>${options}`;
            seg2Select.value = '';
        }
    }

    /**
     * Update comparison view
     */
    updateComparison() {
        const seg1Select = document.getElementById('compare-segment-1');
        const seg2Select = document.getElementById('compare-segment-2');

        if (!seg1Select || !seg2Select) return;

        const seg1Id = parseInt(seg1Select.value);
        const seg2Id = parseInt(seg2Select.value);

        if (!seg1Id || !seg2Id) return;

        // Get segment data based on current comparison type
        let segment1, segment2;
        const segmentType = this.currentCompareType || 'title';

        switch (segmentType) {
            case 'title':
                segment1 = this.dataLoader.getTitleById(seg1Id);
                segment2 = this.dataLoader.getTitleById(seg2Id);
                break;
            case 'country':
                segment1 = this.dataLoader.getCountryById(seg1Id);
                segment2 = this.dataLoader.getCountryById(seg2Id);
                break;
            case 'region':
                segment1 = this.dataLoader.getRegionById(seg1Id);
                segment2 = this.dataLoader.getRegionById(seg2Id);
                break;
            case 'city':
                segment1 = this.dataLoader.getCityById(seg1Id);
                segment2 = this.dataLoader.getCityById(seg2Id);
                break;
            case 'field':
                segment1 = this.dataLoader.getFieldById(seg1Id);
                segment2 = this.dataLoader.getFieldById(seg2Id);
                break;
        }

        if (!segment1 || !segment2) return;

        // Create comparison table
        this.tables.createComparisonTable('comparison-table', segment1, segment2, segmentType);

        // Generate comparison insights
        const comparisonInsights = this.insights.generateComparisonInsights(segment1, segment2, segmentType);
        const insightsContainer = document.getElementById('comparison-insights');
        if (insightsContainer) {
            insightsContainer.innerHTML = comparisonInsights.map(i => this.insights.formatInsightHTML(i)).join('');
        }
    }

    /**
     * Setup scroll animations
     */
    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('.section, .card, .chart-container').forEach(el => {
            el.classList.add('animate-on-scroll');
            observer.observe(el);
        });
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.appDashboard = new ApplicationsDashboard();
    window.appDashboard.init();
});
