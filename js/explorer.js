// Explorer - Interactive data explorer with filters

class ExplorerManager {
    constructor() {
        this.data = null;
        this.filters = {
            position: '',
            region: ''
        };
    }

    init(data) {
        this.data = data;
        this.populateFilters();
        this.setupEventListeners();
    }

    populateFilters() {
        // Populate position dropdown
        const positionSelect = document.getElementById('filterPosition');
        if (positionSelect && this.data) {
            const positions = [...this.data.positions]
                .sort((a, b) => a.name.localeCompare(b.name));

            positionSelect.innerHTML = '<option value="">-- Todas las posiciones --</option>' +
                positions.map(p =>
                    `<option value="${p.name}">${p.name} (N=${p.n})</option>`
                ).join('');
        }

        // Populate region dropdown
        const regionSelect = document.getElementById('filterRegion');
        if (regionSelect && this.data) {
            const regions = [...this.data.regions]
                .sort((a, b) => a.name.localeCompare(b.name));

            regionSelect.innerHTML = '<option value="">-- Todas las regiones --</option>' +
                regions.map(r =>
                    `<option value="${r.name}">${r.name} (N=${r.n})</option>`
                ).join('');
        }
    }

    setupEventListeners() {
        const applyBtn = document.getElementById('btnApplyFilters');
        const resetBtn = document.getElementById('btnResetFilters');

        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyFilters());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }
    }

    applyFilters() {
        const positionSelect = document.getElementById('filterPosition');
        const regionSelect = document.getElementById('filterRegion');

        this.filters.position = positionSelect?.value || '';
        this.filters.region = regionSelect?.value || '';

        this.displayResults();
    }

    resetFilters() {
        const positionSelect = document.getElementById('filterPosition');
        const regionSelect = document.getElementById('filterRegion');

        if (positionSelect) positionSelect.value = '';
        if (regionSelect) regionSelect.value = '';

        this.filters = { position: '', region: '' };
        this.clearResults();
    }

    displayResults() {
        const resultsContainer = document.getElementById('explorerResults');
        if (!resultsContainer) return;

        const { position, region } = this.filters;

        if (!position && !region) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Selecciona al menos un filtro para explorar los datos...</p>';
            return;
        }

        let results = {};

        // Case 1: Both filters selected
        if (position && region) {
            const match = this.data.regionTitle.find(rt =>
                rt.title === position && rt.region === region
            );

            if (match) {
                results = {
                    title: `${position} en ${region}`,
                    n: match.n,
                    median: match.median,
                    p25: match.p25,
                    p75: match.p75,
                    p90: match.p90,
                    iqr: match.iqr,
                    comparison: this.getComparisons(match)
                };
            } else {
                resultsContainer.innerHTML = `
                    <div class="insights-box">
                        <h4>⚠️ Sin Datos</h4>
                        <p>No se encontraron datos para <strong>${position}</strong> en <strong>${region}</strong>.</p>
                        <p>Esto puede deberse a que no hay suficientes ofertas (N<10) o no existe esta combinación en el dataset.</p>
                    </div>
                `;
                return;
            }
        }
        // Case 2: Only position selected
        else if (position && !region) {
            const posData = this.data.positions.find(p => p.name === position);
            if (posData) {
                results = {
                    title: `${position} (Nacional)`,
                    n: posData.n,
                    median: posData.median,
                    p25: posData.p25,
                    p75: posData.p75,
                    p90: posData.p90,
                    iqr: posData.iqr,
                    topRegions: this.getTopRegionsForPosition(position)
                };
            }
        }
        // Case 3: Only region selected
        else if (!position && region) {
            const regionData = this.data.regions.find(r => r.name === region);
            if (regionData) {
                results = {
                    title: `Todas las posiciones en ${region}`,
                    n: regionData.n,
                    median: regionData.median,
                    p25: regionData.p25,
                    p75: regionData.p75,
                    p90: regionData.p90,
                    iqr: regionData.iqr,
                    topPositions: this.getTopPositionsInRegion(region)
                };
            }
        }

        this.renderResults(results);
    }

    getComparisons(match) {
        const nationalData = this.data.positions.find(p => p.name === match.title);
        const regionalData = this.data.regions.find(r => r.name === match.region);

        return {
            vsNational: nationalData ? ((match.median - nationalData.median) / nationalData.median * 100).toFixed(1) : null,
            vsRegional: regionalData ? ((match.median - regionalData.median) / regionalData.median * 100).toFixed(1) : null
        };
    }

    getTopRegionsForPosition(position) {
        const matches = this.data.regionTitle.filter(rt => rt.title === position);
        return matches
            .sort((a, b) => b.median - a.median)
            .slice(0, 5)
            .map(m => ({
                name: m.region,
                median: m.median,
                n: m.n
            }));
    }

    getTopPositionsInRegion(region) {
        const matches = this.data.regionTitle.filter(rt => rt.region === region);
        return matches
            .sort((a, b) => b.median - a.median)
            .slice(0, 5)
            .map(m => ({
                name: m.title,
                median: m.median,
                n: m.n
            }));
    }

    renderResults(results) {
        const resultsContainer = document.getElementById('explorerResults');
        if (!resultsContainer) return;

        let html = `
            <h3>${results.title}</h3>
            <div class="results-grid">
                <div class="result-card">
                    <div class="result-label">Ofertas (N)</div>
                    <div class="result-value">${results.n.toLocaleString('es-ES')}</div>
                </div>
                <div class="result-card">
                    <div class="result-label">Mediana</div>
                    <div class="result-value currency">${this.formatCurrency(results.median)}</div>
                </div>
                <div class="result-card">
                    <div class="result-label">P25</div>
                    <div class="result-value">${this.formatCurrency(results.p25)}</div>
                </div>
                <div class="result-card">
                    <div class="result-label">P75</div>
                    <div class="result-value">${this.formatCurrency(results.p75)}</div>
                </div>
                <div class="result-card">
                    <div class="result-label">P90</div>
                    <div class="result-value">${this.formatCurrency(results.p90)}</div>
                </div>
                <div class="result-card">
                    <div class="result-label">IQR</div>
                    <div class="result-value">${this.formatCurrency(results.iqr)}</div>
                </div>
            </div>
        `;

        // Add comparisons if available
        if (results.comparison) {
            html += '<div class="insights-box" style="margin-top: 20px;">';
            html += '<h4>📊 Comparativas</h4><ul>';

            if (results.comparison.vsNational) {
                const sign = results.comparison.vsNational > 0 ? '+' : '';
                const color = results.comparison.vsNational > 0 ? 'success' : 'danger';
                html += `<li><strong>vs. Mediana Nacional:</strong> <span class="badge badge-${color === 'danger' ? 'warning' : color}">${sign}${results.comparison.vsNational}%</span></li>`;
            }

            if (results.comparison.vsRegional) {
                const sign = results.comparison.vsRegional > 0 ? '+' : '';
                const color = results.comparison.vsRegional > 0 ? 'success' : 'danger';
                html += `<li><strong>vs. Mediana Regional:</strong> <span class="badge badge-${color === 'danger' ? 'warning' : color}">${sign}${results.comparison.vsRegional}%</span></li>`;
            }

            html += '</ul></div>';
        }

        // Add top regions if available
        if (results.topRegions && results.topRegions.length > 0) {
            html += '<div class="insights-box" style="margin-top: 20px;">';
            html += '<h4>🏆 Top 5 Regiones para esta Posición</h4>';
            html += '<table class="data-table"><thead><tr><th>Región</th><th>Mediana</th><th>N</th></tr></thead><tbody>';

            results.topRegions.forEach(r => {
                html += `<tr><td>${r.name}</td><td class="currency">${this.formatCurrency(r.median)}</td><td>${r.n}</td></tr>`;
            });

            html += '</tbody></table></div>';
        }

        // Add top positions if available
        if (results.topPositions && results.topPositions.length > 0) {
            html += '<div class="insights-box" style="margin-top: 20px;">';
            html += '<h4>🏆 Top 5 Posiciones en esta Región</h4>';
            html += '<table class="data-table"><thead><tr><th>Posición</th><th>Mediana</th><th>N</th></tr></thead><tbody>';

            results.topPositions.forEach(p => {
                html += `<tr><td>${p.name}</td><td class="currency">${this.formatCurrency(p.median)}</td><td>${p.n}</td></tr>`;
            });

            html += '</tbody></table></div>';
        }

        resultsContainer.innerHTML = html;
    }

    clearResults() {
        const resultsContainer = document.getElementById('explorerResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Selecciona filtros para explorar los datos...</p>';
        }
    }

    formatCurrency(value) {
        if (!value && value !== 0) return '—';
        return `€${Math.round(value).toLocaleString('es-ES')}`;
    }
}

// Create global instance
window.explorerManager = new ExplorerManager();
