/**
 * Applications Tables Component
 * Interactive data tables with sorting, search, and filtering
 */

class ApplicationsTables {
    constructor() {
        this.tables = {};
        this.currentFilters = {
            titleId: null,
            countryId: null,
            regionId: null,
            cityId: null,
            fieldId: null,
            minN: 5
        };
        this.metricMode = 'median'; // 'median' or 'mean'

        // Event callbacks
        this.onRowClick = null;
    }

    /**
     * Initialize all tables
     */
    init() {
        this.setupMetricToggle();
    }

    /**
     * Setup metric toggle (median/mean)
     */
    setupMetricToggle() {
        const toggle = document.getElementById('metric-toggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.metricMode = e.target.checked ? 'mean' : 'median';
                this.refreshAllTables();
            });
        }
    }

    /**
     * Format number with locale
     */
    formatNumber(value, decimals = 1) {
        if (value === null || value === undefined) return '-';
        return value.toLocaleString('es-ES', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Get delivery level badge (high volume = good = green)
     */
    getCompetitionBadge(median, globalMedian) {
        const ratio = median / globalMedian;
        let level, className;

        // High volume = good delivery = green
        if (ratio >= 1.4) {
            level = 'Excelente';
            className = 'badge-success';
        } else if (ratio >= 1.1) {
            level = 'Bueno';
            className = 'badge-good';
        } else if (ratio >= 0.9) {
            level = 'Promedio';
            className = 'badge-neutral';
        } else if (ratio >= 0.7) {
            level = 'Bajo';
            className = 'badge-warning';
        } else {
            level = 'Crítico';
            className = 'badge-danger';
        }

        return `<span class="competition-badge ${className}">${level}</span>`;
    }

    /**
     * Get comparison badge (vs reference)
     */
    getComparisonBadge(value, reference) {
        if (!reference || reference === 0) return '';

        const diff = ((value - reference) / reference) * 100;
        const sign = diff > 0 ? '+' : '';
        const className = diff > 0 ? 'badge-warning' : 'badge-success';

        return `<span class="comparison-badge ${className}">${sign}${diff.toFixed(0)}%</span>`;
    }

    /**
     * Create a sortable table
     */
    createTable(containerId, data, columns, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { searchable = true, sortable = true, clickable = true, pageSize = 20 } = options;

        // Store table reference
        this.tables[containerId] = {
            data,
            columns,
            options,
            currentSort: { column: 'median', direction: 'desc' },
            searchQuery: '',
            currentPage: 1
        };

        // Create table structure
        let html = `
            <div class="table-controls">
                ${searchable ? `
                    <div class="search-wrapper">
                        <input type="text"
                               class="table-search"
                               id="${containerId}-search"
                               placeholder="Buscar...">
                    </div>
                ` : ''}
                <div class="table-info">
                    <span id="${containerId}-count">0 resultados</span>
                </div>
            </div>
            <div class="table-wrapper">
                <table class="data-table" id="${containerId}-table">
                    <thead>
                        <tr>
                            ${columns.map(col => `
                                <th class="${sortable ? 'sortable' : ''}"
                                    data-column="${col.key}"
                                    data-type="${col.type || 'string'}">
                                    ${col.label}
                                    ${sortable ? '<span class="sort-indicator"></span>' : ''}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody id="${containerId}-body">
                    </tbody>
                </table>
            </div>
            <div class="table-pagination" id="${containerId}-pagination"></div>
        `;

        container.innerHTML = html;

        // Add event listeners
        if (searchable) {
            const searchInput = document.getElementById(`${containerId}-search`);
            searchInput.addEventListener('input', (e) => {
                this.tables[containerId].searchQuery = e.target.value;
                this.tables[containerId].currentPage = 1;
                this.renderTableBody(containerId);
            });
        }

        if (sortable) {
            container.querySelectorAll('th.sortable').forEach(th => {
                th.addEventListener('click', () => {
                    const column = th.dataset.column;
                    const table = this.tables[containerId];

                    if (table.currentSort.column === column) {
                        table.currentSort.direction = table.currentSort.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        table.currentSort.column = column;
                        table.currentSort.direction = 'desc';
                    }

                    this.renderTableBody(containerId);
                    this.updateSortIndicators(containerId);
                });
            });
        }

        // Initial render
        this.renderTableBody(containerId);
        this.updateSortIndicators(containerId);
    }

    /**
     * Render table body with current filters, sort, and search
     */
    renderTableBody(containerId) {
        const table = this.tables[containerId];
        if (!table) return;

        const { data, columns, options, currentSort, searchQuery, currentPage } = table;
        const { pageSize = 20, clickable = true } = options;

        // Filter by search
        let filteredData = data;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredData = data.filter(row =>
                columns.some(col => {
                    const value = row[col.key];
                    return value && String(value).toLowerCase().includes(query);
                })
            );
        }

        // Sort
        filteredData = [...filteredData].sort((a, b) => {
            const aVal = a[currentSort.column];
            const bVal = b[currentSort.column];

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return currentSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }

            const aStr = String(aVal || '').toLowerCase();
            const bStr = String(bVal || '').toLowerCase();
            return currentSort.direction === 'asc'
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr);
        });

        // Paginate
        const totalPages = Math.ceil(filteredData.length / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const pageData = filteredData.slice(startIndex, startIndex + pageSize);

        // Render rows
        const tbody = document.getElementById(`${containerId}-body`);
        const globalMedian = window.applicationsDataLoader?.data.globalMetrics?.globalMedian || 30;

        tbody.innerHTML = pageData.map((row, index) => {
            const rowHtml = columns.map(col => {
                let value = row[col.key];
                let cellContent;

                switch (col.type) {
                    case 'number':
                        cellContent = this.formatNumber(value, col.decimals || 1);
                        break;
                    case 'integer':
                        cellContent = value?.toLocaleString('es-ES') || '-';
                        break;
                    case 'competition':
                        cellContent = `
                            <div class="cell-competition">
                                <span class="cell-value">${this.formatNumber(value)}</span>
                                ${this.getCompetitionBadge(value, globalMedian)}
                            </div>
                        `;
                        break;
                    case 'comparison':
                        const reference = col.reference || globalMedian;
                        cellContent = `
                            <div class="cell-comparison">
                                <span class="cell-value">${this.formatNumber(value)}</span>
                                ${this.getComparisonBadge(value, reference)}
                            </div>
                        `;
                        break;
                    case 'rank':
                        cellContent = `<span class="rank-badge">#${startIndex + index + 1}</span>`;
                        break;
                    default:
                        cellContent = value || '-';
                }

                return `<td class="cell-${col.type || 'text'}">${cellContent}</td>`;
            }).join('');

            const rowClass = clickable ? 'clickable-row' : '';
            return `<tr class="${rowClass}" data-id="${row.id}" data-name="${row.name}">${rowHtml}</tr>`;
        }).join('');

        // Update count
        document.getElementById(`${containerId}-count`).textContent =
            `${filteredData.length} resultados`;

        // Render pagination
        this.renderPagination(containerId, currentPage, totalPages);

        // Add row click handlers
        if (clickable) {
            tbody.querySelectorAll('tr.clickable-row').forEach(tr => {
                tr.addEventListener('click', () => {
                    const id = parseInt(tr.dataset.id);
                    const name = tr.dataset.name;
                    if (this.onRowClick) {
                        this.onRowClick({ id, name, table: containerId });
                    }
                });
            });
        }
    }

    /**
     * Render pagination controls
     */
    renderPagination(containerId, currentPage, totalPages) {
        const paginationEl = document.getElementById(`${containerId}-pagination`);
        if (!paginationEl || totalPages <= 1) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        let html = '<div class="pagination-controls">';

        // Previous button
        html += `<button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}"
                        data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                    ← Anterior
                </button>`;

        // Page numbers
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            html += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) html += `<span class="pagination-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                            data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">...</span>`;
            html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        html += `<button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}"
                        data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
                    Siguiente →
                </button>`;

        html += '</div>';
        paginationEl.innerHTML = html;

        // Add click handlers
        paginationEl.querySelectorAll('.pagination-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                this.tables[containerId].currentPage = page;
                this.renderTableBody(containerId);
            });
        });
    }

    /**
     * Update sort indicators in table header
     */
    updateSortIndicators(containerId) {
        const table = this.tables[containerId];
        if (!table) return;

        const container = document.getElementById(containerId);
        container.querySelectorAll('th.sortable').forEach(th => {
            const indicator = th.querySelector('.sort-indicator');
            if (th.dataset.column === table.currentSort.column) {
                indicator.textContent = table.currentSort.direction === 'asc' ? '↑' : '↓';
                th.classList.add('sorted');
            } else {
                indicator.textContent = '';
                th.classList.remove('sorted');
            }
        });
    }

    /**
     * Refresh all tables with current data
     */
    refreshAllTables() {
        Object.keys(this.tables).forEach(containerId => {
            this.renderTableBody(containerId);
        });
    }

    /**
     * Set callback for row clicks
     */
    setRowClickCallback(callback) {
        this.onRowClick = callback;
    }

    /**
     * Apply filters to all tables
     */
    applyFilters(filters) {
        this.currentFilters = { ...this.currentFilters, ...filters };
        // Tables will need to be recreated with filtered data
    }

    /**
     * Create the main titles table
     */
    createTitlesTable(containerId, data) {
        const columns = [
            { key: 'name', label: 'Puesto', type: 'text' },
            { key: 'n', label: 'Ofertas', type: 'integer' },
            { key: 'median', label: 'Mediana', type: 'competition' },
            { key: 'mean', label: 'Media', type: 'number' }
        ];

        this.createTable(containerId, data, columns, {
            searchable: true,
            sortable: true,
            clickable: true,
            pageSize: 15
        });
    }

    /**
     * Create the regions table
     */
    createRegionsTable(containerId, data) {
        const columns = [
            { key: 'name', label: 'Región', type: 'text' },
            { key: 'n', label: 'Ofertas', type: 'integer' },
            { key: 'median', label: 'Mediana', type: 'competition' },
            { key: 'mean', label: 'Media', type: 'number' }
        ];

        this.createTable(containerId, data, columns, {
            searchable: true,
            sortable: true,
            clickable: true,
            pageSize: 15
        });
    }

    /**
     * Create the cities table
     */
    createCitiesTable(containerId, data) {
        const columns = [
            { key: 'name', label: 'Ciudad', type: 'text' },
            { key: 'regionName', label: 'Región', type: 'text' },
            { key: 'n', label: 'Ofertas', type: 'integer' },
            { key: 'median', label: 'Mediana', type: 'competition' },
            { key: 'mean', label: 'Media', type: 'number' }
        ];

        this.createTable(containerId, data, columns, {
            searchable: true,
            sortable: true,
            clickable: true,
            pageSize: 15
        });
    }

    /**
     * Create the fields/sectors table
     */
    createFieldsTable(containerId, data) {
        const columns = [
            { key: 'name', label: 'Sector', type: 'text' },
            { key: 'n', label: 'Ofertas', type: 'integer' },
            { key: 'median', label: 'Mediana', type: 'competition' },
            { key: 'mean', label: 'Media', type: 'number' }
        ];

        this.createTable(containerId, data, columns, {
            searchable: true,
            sortable: true,
            clickable: true,
            pageSize: 15
        });
    }

    /**
     * Create a comparison table between two segments
     */
    createComparisonTable(containerId, segment1, segment2, segmentType = 'title') {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Get segment type label
        const typeLabels = {
            title: 'Puesto',
            country: 'País',
            region: 'Región',
            city: 'Ciudad',
            field: 'Sector'
        };
        const typeLabel = typeLabels[segmentType] || 'Segmento';

        const metrics = [
            { key: 'n', label: 'Número de Ofertas', format: 'integer' },
            { key: 'totalApplications', label: 'Total Inscripciones', format: 'integer' },
            { key: 'median', label: 'Mediana por Oferta', format: 'number' },
            { key: 'mean', label: 'Media por Oferta', format: 'number' }
        ];

        const globalMedian = window.applicationsDataLoader?.data.globalMetrics?.globalMedian || 30;

        let html = `
            <div class="comparison-header">
                <span class="comparison-type-label">Comparando: ${typeLabel}</span>
            </div>
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Métrica</th>
                        <th class="segment-col">
                            <span class="segment-name">${segment1.name}</span>
                            ${this.getCompetitionBadge(segment1.median, globalMedian)}
                        </th>
                        <th class="segment-col">
                            <span class="segment-name">${segment2.name}</span>
                            ${this.getCompetitionBadge(segment2.median, globalMedian)}
                        </th>
                        <th>Diferencia</th>
                    </tr>
                </thead>
                <tbody>
        `;

        metrics.forEach(metric => {
            const val1 = segment1[metric.key] || 0;
            const val2 = segment2[metric.key] || 0;
            const diff = val1 - val2;
            const pctDiff = val2 !== 0 ? ((diff / val2) * 100) : 0;

            const formatValue = (val) => {
                if (metric.format === 'integer') return val.toLocaleString('es-ES');
                return this.formatNumber(val);
            };

            // For delivery perspective: higher is better (green), lower is worse (red)
            const diffClass = diff > 0 ? 'diff-positive' : (diff < 0 ? 'diff-negative' : 'diff-neutral');
            const diffSign = diff > 0 ? '+' : '';

            html += `
                <tr>
                    <td class="metric-label">${metric.label}</td>
                    <td class="metric-value">${formatValue(val1)}</td>
                    <td class="metric-value">${formatValue(val2)}</td>
                    <td class="metric-diff ${diffClass}">
                        ${diffSign}${formatValue(diff)}
                        <span class="pct-diff">(${diffSign}${pctDiff.toFixed(1)}%)</span>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }
}

// Create global instance
window.applicationsTables = new ApplicationsTables();
