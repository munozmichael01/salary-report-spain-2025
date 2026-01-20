// Data Loader - Loads and parses CSV files

class DataLoader {
    constructor() {
        this.data = {
            positions: [],
            bestPaid: [],
            regions: [],
            cities: [],
            fields: [],
            areas: [],
            regionTitle: [],
            cityTitle: []
        };
        this.loaded = false;
    }

    async loadAllData() {
        try {
            console.log('Loading data...');

            // Load all CSVs in parallel
            const [
                positionsData,
                bestPaidData,
                regionsData,
                citiesData,
                fieldsData,
                areasData,
                regionTitleData,
                cityTitleData
            ] = await Promise.all([
                this.loadCSV('data/01_by_title.csv'),
                this.loadCSV('data/10_best_paid_titles.csv'),
                this.loadCSV('data/03_by_region.csv'),
                this.loadCSV('data/04_by_city.csv'),
                this.loadCSV('data/08_by_field.csv'),
                this.loadCSV('data/09_by_area.csv'),
                this.loadCSV('data/06_by_region_title.csv'),
                this.loadCSV('data/07_by_city_title.csv')
            ]);

            this.data.positions = this.parsePositions(positionsData);
            this.data.bestPaid = this.parseBestPaid(bestPaidData);
            this.data.regions = this.parseRegions(regionsData);
            this.data.cities = this.parseCities(citiesData);
            this.data.fields = this.parseFields(fieldsData);
            this.data.areas = this.parseAreas(areasData);
            this.data.regionTitle = this.parseRegionTitle(regionTitleData);
            this.data.cityTitle = this.parseCityTitle(cityTitleData);

            this.loaded = true;
            console.log('Data loaded successfully:', this.data);
            return this.data;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    loadCSV(path) {
        return new Promise((resolve, reject) => {
            Papa.parse(path, {
                download: true,
                header: true,
                dynamicTyping: false,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (error) => reject(error)
            });
        });
    }

    parseNumber(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            // Handle European format: "1.234,56" -> 1234.56
            // Also handle dots and commas in thousands
            const cleaned = value.replace(/\./g, '').replace(',', '.');
            return parseFloat(cleaned) || 0;
        }
        return 0;
    }

    parsePositions(data) {
        return data.map(row => ({
            titleId: parseInt(row.TitleId),
            name: row.JobTitleName,
            n: parseInt(row.N),
            p25: this.parseNumber(row.P25),
            median: this.parseNumber(row.P50),
            p75: this.parseNumber(row.P75),
            p90: this.parseNumber(row.P90),
            mean: this.parseNumber(row.Mean),
            iqr: this.parseNumber(row.IQR)
        })).filter(p => p.n > 0);
    }

    parseBestPaid(data) {
        return data.map((row, index) => ({
            rank: parseInt(row.Rank) || index + 1,
            titleId: parseInt(row.TitleId),
            name: row.JobTitleName,
            n: parseInt(row.N),
            p25: this.parseNumber(row.P25),
            median: this.parseNumber(row.P50),
            p75: this.parseNumber(row.P75),
            p90: this.parseNumber(row.P90),
            mean: this.parseNumber(row.Mean),
            iqr: this.parseNumber(row.IQR)
        })).filter(p => p.n > 0);
    }

    parseRegions(data) {
        return data.map(row => ({
            name: row.RegionName,
            n: parseInt(row.N),
            p25: this.parseNumber(row.P25),
            median: this.parseNumber(row.P50),
            p75: this.parseNumber(row.P75),
            p90: this.parseNumber(row.P90),
            mean: this.parseNumber(row.Mean),
            iqr: this.parseNumber(row.IQR)
        })).filter(r => r.n > 0);
    }

    parseCities(data) {
        return data.map(row => ({
            name: row.CityName,
            region: row.RegionName,
            n: parseInt(row.N),
            p25: this.parseNumber(row.P25),
            median: this.parseNumber(row.P50),
            p75: this.parseNumber(row.P75),
            p90: this.parseNumber(row.P90),
            mean: this.parseNumber(row.Mean),
            iqr: this.parseNumber(row.IQR)
        })).filter(c => c.n > 0);
    }

    parseFields(data) {
        return data.map(row => ({
            name: row.FieldName,
            n: parseInt(row.N),
            p25: this.parseNumber(row.P25),
            median: this.parseNumber(row.P50),
            p75: this.parseNumber(row.P75),
            p90: this.parseNumber(row.P90),
            mean: this.parseNumber(row.Mean),
            iqr: this.parseNumber(row.IQR)
        })).filter(f => f.n > 0);
    }

    parseAreas(data) {
        return data.map(row => ({
            name: row.AreaName,
            n: parseInt(row.N),
            p25: this.parseNumber(row.P25),
            median: this.parseNumber(row.P50),
            p75: this.parseNumber(row.P75),
            p90: this.parseNumber(row.P90),
            mean: this.parseNumber(row.Mean),
            iqr: this.parseNumber(row.IQR)
        })).filter(a => a.n > 0);
    }

    parseRegionTitle(data) {
        return data.map(row => ({
            region: row.RegionName,
            titleId: parseInt(row.TitleId),
            title: row.JobTitleName,
            n: parseInt(row.N),
            p25: this.parseNumber(row.P25),
            median: this.parseNumber(row.P50),
            p75: this.parseNumber(row.P75),
            p90: this.parseNumber(row.P90),
            mean: this.parseNumber(row.Mean),
            iqr: this.parseNumber(row.IQR)
        })).filter(rt => rt.n > 0);
    }

    parseCityTitle(data) {
        return data.map(row => ({
            city: row.CityName,
            region: row.RegionName,
            titleId: parseInt(row.TitleId),
            title: row.JobTitleName,
            n: parseInt(row.N),
            p25: this.parseNumber(row.P25),
            median: this.parseNumber(row.P50),
            p75: this.parseNumber(row.P75),
            p90: this.parseNumber(row.P90),
            mean: this.parseNumber(row.Mean),
            iqr: this.parseNumber(row.IQR)
        })).filter(ct => ct.n > 0);
    }

    // Utility methods
    getTop(arr, field, n = 20) {
        return [...arr].sort((a, b) => b[field] - a[field]).slice(0, n);
    }

    getPositionByName(name) {
        return this.data.positions.find(p => p.name === name);
    }

    getRegionByName(name) {
        return this.data.regions.find(r => r.name === name);
    }

    filterRegionTitle(positionName, regionName) {
        return this.data.regionTitle.filter(rt =>
            (!positionName || rt.title === positionName) &&
            (!regionName || rt.region === regionName)
        );
    }
}

// Create global instance
window.dataLoader = new DataLoader();
