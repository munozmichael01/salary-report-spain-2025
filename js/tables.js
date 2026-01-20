// Tables - Interactive tables with sorting and filtering

class TableManager {
    constructor() {
        this.currentData = {};
    }

    populateAll(data) {
        this.populatePositionsTable(data.positions);
        this.populateRegionsTable(data.regions);
        this.populateFieldsTable(data.fields);
        this.createRegionalHeatmap(data.regions);
    }

    populatePositionsTable(positions) {
        this.currentData.positions = positions;
        const tbody = document.getElementById('tablePositionsBody');
        if (!tbody) return;

        this.renderPositionsTable(positions);

        // Setup search
        const searchInput = document.getElementById('searchPositions');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = positions.filter(p =>
                    p.name.toLowerCase().includes(query)
                );
                this.renderPositionsTable(filtered);
            });
        }

        // Setup sort
        const sortSelect = document.getElementById('sortPositions');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const sortBy = e.target.value;
                let sorted = [...positions];

                switch(sortBy) {
                    case 'n':
                        sorted.sort((a, b) => b.n - a.n);
                        break;
                    case 'median':
                        sorted.sort((a, b) => b.median - a.median);
                        break;
                    case 'name':
                        sorted.sort((a, b) => a.name.localeCompare(b.name));
                        break;
                }

                this.renderPositionsTable(sorted);
            });
        }
    }

    renderPositionsTable(positions) {
        const tbody = document.getElementById('tablePositionsBody');
        if (!tbody) return;

        tbody.innerHTML = positions.map(p => `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.n.toLocaleString('es-ES')}</td>
                <td>${this.formatCurrency(p.p25)}</td>
                <td><span class="currency">${this.formatCurrency(p.median)}</span></td>
                <td>${this.formatCurrency(p.p75)}</td>
                <td>${this.formatCurrency(p.p90)}</td>
                <td>${this.formatCurrency(p.iqr)}</td>
            </tr>
        `).join('');
    }

    populateRegionsTable(regions) {
        this.currentData.regions = regions;
        const tbody = document.getElementById('tableRegionsBody');
        if (!tbody) return;

        const nationalMedian = 20000; // From data

        const sorted = regions.sort((a, b) => b.median - a.median);

        tbody.innerHTML = sorted.map(r => {
            const pctVsNational = ((r.median - nationalMedian) / nationalMedian * 100).toFixed(1);
            const pctClass = pctVsNational > 0 ? 'badge-success' : 'badge-warning';
            const pctSign = pctVsNational > 0 ? '+' : '';

            return `
                <tr>
                    <td><strong>${r.name}</strong></td>
                    <td>${r.n.toLocaleString('es-ES')}</td>
                    <td><span class="currency">${this.formatCurrency(r.median)}</span></td>
                    <td><span class="badge ${pctClass}">${pctSign}${pctVsNational}%</span></td>
                </tr>
            `;
        }).join('');

        // Setup search
        const searchInput = document.getElementById('searchRegions');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = regions.filter(r =>
                    r.name.toLowerCase().includes(query)
                );
                this.renderRegionsTable(filtered);
            });
        }
    }

    renderRegionsTable(regions) {
        const tbody = document.getElementById('tableRegionsBody');
        if (!tbody) return;

        const nationalMedian = 20000;
        const sorted = regions.sort((a, b) => b.median - a.median);

        tbody.innerHTML = sorted.map(r => {
            const pctVsNational = ((r.median - nationalMedian) / nationalMedian * 100).toFixed(1);
            const pctClass = pctVsNational > 0 ? 'badge-success' : 'badge-warning';
            const pctSign = pctVsNational > 0 ? '+' : '';

            return `
                <tr>
                    <td><strong>${r.name}</strong></td>
                    <td>${r.n.toLocaleString('es-ES')}</td>
                    <td><span class="currency">${this.formatCurrency(r.median)}</span></td>
                    <td><span class="badge ${pctClass}">${pctSign}${pctVsNational}%</span></td>
                </tr>
            `;
        }).join('');
    }

    populateFieldsTable(fields) {
        const tbody = document.getElementById('tableFieldsBody');
        if (!tbody) return;

        const sorted = fields.sort((a, b) => b.median - a.median);

        tbody.innerHTML = sorted.map(f => `
            <tr>
                <td><strong>${f.name}</strong></td>
                <td>${f.n.toLocaleString('es-ES')}</td>
                <td><span class="currency">${this.formatCurrency(f.median)}</span></td>
                <td>${this.formatCurrency(f.p25)}–${this.formatCurrency(f.p75)}</td>
            </tr>
        `).join('');
    }

    createRegionalHeatmap(regions) {
        const container = document.getElementById('regionalHeatmap');
        if (!container) return;

        // Sort by median
        const sorted = regions.sort((a, b) => b.median - a.median);

        // Calculate heat levels
        const maxMedian = Math.max(...sorted.map(r => r.median));
        const minMedian = Math.min(...sorted.map(r => r.median));

        container.innerHTML = sorted.slice(0, 30).map(r => {
            const ratio = (r.median - minMedian) / (maxMedian - minMedian);
            let heatClass;

            if (ratio > 0.8) heatClass = 'heat-high';
            else if (ratio > 0.6) heatClass = 'heat-medium-high';
            else if (ratio > 0.4) heatClass = 'heat-medium';
            else if (ratio > 0.2) heatClass = 'heat-medium-low';
            else heatClass = 'heat-low';

            const pctVsNational = ((r.median - 20000) / 20000 * 100).toFixed(1);
            const pctSign = pctVsNational > 0 ? '+' : '';

            return `
                <div class="heatmap-cell ${heatClass}" title="${r.name}: ${this.formatCurrency(r.median)}">
                    <div class="cell-name">${r.name}</div>
                    <div class="cell-value">${this.formatCurrency(r.median)}</div>
                    <div class="cell-count">${pctSign}${pctVsNational}% | N=${r.n}</div>
                </div>
            `;
        }).join('');
    }

    formatCurrency(value) {
        if (!value && value !== 0) return '—';
        return `€${Math.round(value).toLocaleString('es-ES')}`;
    }
}

// Create global instance
window.tableManager = new TableManager();
