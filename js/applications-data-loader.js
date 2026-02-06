/**
 * Applications Data Loader
 * Handles loading and parsing of all application competition CSV files
 */

class ApplicationsDataLoader {
    constructor() {
        this.data = {
            titles: [],
            countries: [],
            regions: [],
            cities: [],
            fields: [],
            titleCountry: [],
            titleRegion: [],
            titleCity: [],
            fieldCountry: [],
            fieldRegion: [],
            fieldCity: [],
            // Country-Region mapping
            countryRegions: [],
            regionToCountry: {}, // Map regionId -> countryId
            // Computed global metrics
            globalMetrics: null
        };
        this.isLoaded = false;
    }

    /**
     * Parse a CSV file using PapaParse
     * Note: Most files use semicolon (;) as delimiter
     */
    loadCSV(url, delimiter = ';') {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                delimiter: delimiter,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    /**
     * Parse numeric value
     */
    parseNumber(value) {
        if (value === null || value === undefined || value === '') return 0;
        return parseFloat(value) || 0;
    }

    /**
     * Load all CSV files in parallel
     */
    async loadAllData() {
        try {
            const [
                titlesRaw,
                countriesRaw,
                regionsRaw,
                citiesRaw,
                fieldsRaw,
                titleCountryRaw,
                titleRegionRaw,
                titleCityRaw,
                fieldCityRaw,
                fieldRegionRaw,
                fieldCountryRaw,
                countryRegionsRaw
            ] = await Promise.all([
                this.loadCSV('data-applications/01_by_title.csv'),
                this.loadCSV('data-applications/02_by_country.csv'),
                this.loadCSV('data-applications/03_by_region.csv'),
                this.loadCSV('data-applications/04_by_city.csv'),
                this.loadCSV('data-applications/08_by_field.csv'),
                this.loadCSV('data-applications/05_by_title_country.csv'),
                this.loadCSV('data-applications/06_by_title_region.csv'),
                this.loadCSV('data-applications/07_by_title_city.csv'),
                this.loadCSV('data-applications/09_by_field_city.csv'),
                this.loadCSV('data-applications/10_by_field_region.csv'),
                this.loadCSV('data-applications/11_by_field_country.csv'),
                this.loadCSV('data-applications/country_regions.csv', ',')  // Uses comma separator
            ]);

            // Parse country-region mapping FIRST (needed for other parsers)
            this.data.countryRegions = this.parseCountryRegions(countryRegionsRaw);
            this.buildRegionToCountryMap();

            // Parse and store data
            this.data.titles = this.parseTitles(titlesRaw);
            this.data.countries = this.parseCountries(countriesRaw);
            this.data.regions = this.parseRegions(regionsRaw);
            this.data.cities = this.parseCities(citiesRaw);
            this.data.fields = this.parseFields(fieldsRaw);
            this.data.titleCountry = this.parseTitleCountry(titleCountryRaw);
            this.data.titleRegion = this.parseTitleRegion(titleRegionRaw);
            this.data.titleCity = this.parseTitleCity(titleCityRaw);
            this.data.fieldCountry = this.parseFieldCountry(fieldCountryRaw);
            this.data.fieldRegion = this.parseFieldRegion(fieldRegionRaw);
            this.data.fieldCity = this.parseFieldCity(fieldCityRaw);

            // Calculate global metrics
            this.data.globalMetrics = this.calculateGlobalMetrics();

            this.isLoaded = true;
            return this.data;
        } catch (error) {
            console.error('Error loading application data:', error);
            throw error;
        }
    }

    /**
     * Parse country-region relationships
     */
    parseCountryRegions(raw) {
        return raw
            .filter(row => row.IDCountry && row.IDRegion)
            .map(row => ({
                countryId: parseInt(row.IDCountry) || 0,
                countryName: row.CountryName || '',
                regionId: parseInt(row.IDRegion) || 0,
                regionName: row.RegionName || ''
            }));
    }

    /**
     * Build a map from regionId to countryId for quick lookups
     */
    buildRegionToCountryMap() {
        this.data.regionToCountry = {};
        this.data.countryRegions.forEach(cr => {
            this.data.regionToCountry[cr.regionId] = {
                countryId: cr.countryId,
                countryName: cr.countryName
            };
        });
    }

    /**
     * Parse job titles data
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseTitles(raw) {
        return raw
            .filter(row => row.TitleId && row.JobTitleName && row.JobTitleName !== 'NULL')
            .map(row => ({
                id: parseInt(row.TitleId) || 0,
                name: row.JobTitleName,
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Parse countries data
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseCountries(raw) {
        return raw
            .filter(row => row.IDCountry && row.CountryName)
            .map(row => ({
                id: parseInt(row.IDCountry) || 0,
                name: row.CountryName,
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Parse regions data (includes country mapping)
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseRegions(raw) {
        return raw
            .filter(row => row.IDRegion && row.RegionName)
            .map(row => {
                const regionId = parseInt(row.IDRegion) || 0;
                const countryInfo = this.data.regionToCountry[regionId] || {};
                return {
                    id: regionId,
                    name: row.RegionName,
                    countryId: countryInfo.countryId || null,
                    countryName: countryInfo.countryName || '',
                    n: parseInt(row.N) || 0,
                    totalApplications: parseInt(row.TotalApplications) || 0,
                    mean: this.parseNumber(row.Mean),
                    median: this.parseNumber(row.P50)
                };
            });
    }

    /**
     * Parse cities data
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseCities(raw) {
        return raw
            .filter(row => row.IDCity && row.CityName)
            .map(row => ({
                id: parseInt(row.IDCity) || 0,
                name: row.CityName,
                regionId: parseInt(row.IDRegion) || 0,
                regionName: row.RegionName || '',
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Parse fields data
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseFields(raw) {
        return raw
            .filter(row => row.FieldId && row.FieldName)
            .map(row => ({
                id: parseInt(row.FieldId) || 0,
                name: row.FieldName,
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Parse title + country combinations
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseTitleCountry(raw) {
        return raw
            .filter(row => row.TitleId && row.IDCountry)
            .map(row => ({
                titleId: parseInt(row.TitleId) || 0,
                titleName: row.JobTitleName || '',
                countryId: parseInt(row.IDCountry) || 0,
                countryName: row.CountryName || '',
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Parse title + region combinations
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseTitleRegion(raw) {
        return raw
            .filter(row => row.TitleId && row.IDRegion)
            .map(row => ({
                titleId: parseInt(row.TitleId) || 0,
                titleName: row.JobTitleName || '',
                regionId: parseInt(row.IDRegion) || 0,
                regionName: row.RegionName || '',
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Parse title + city combinations
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseTitleCity(raw) {
        return raw
            .filter(row => row.TitleId && row.IDCity)
            .map(row => ({
                titleId: parseInt(row.TitleId) || 0,
                titleName: row.JobTitleName || '',
                cityId: parseInt(row.IDCity) || 0,
                cityName: row.CityName || '',
                regionId: parseInt(row.IDRegion) || 0,
                regionName: row.RegionName || '',
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Parse field + country combinations
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseFieldCountry(raw) {
        return raw
            .filter(row => row.FieldId && row.IDCountry)
            .map(row => ({
                fieldId: parseInt(row.FieldId) || 0,
                fieldName: row.FieldName || '',
                countryId: parseInt(row.IDCountry) || 0,
                countryName: row.CountryName || '',
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Parse field + region combinations
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseFieldRegion(raw) {
        return raw
            .filter(row => row.FieldId && row.IDRegion)
            .map(row => ({
                fieldId: parseInt(row.FieldId) || 0,
                fieldName: row.FieldName || '',
                regionId: parseInt(row.IDRegion) || 0,
                regionName: row.RegionName || '',
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Parse field + city combinations
     * Note: No minimum N filter applied - user can filter via UI
     */
    parseFieldCity(raw) {
        return raw
            .filter(row => row.FieldId && row.IDCity)
            .map(row => ({
                fieldId: parseInt(row.FieldId) || 0,
                fieldName: row.FieldName || '',
                cityId: parseInt(row.IDCity) || 0,
                cityName: row.CityName || '',
                regionId: parseInt(row.IDRegion) || 0,
                regionName: row.RegionName || '',
                n: parseInt(row.N) || 0,
                totalApplications: parseInt(row.TotalApplications) || 0,
                mean: this.parseNumber(row.Mean),
                median: this.parseNumber(row.P50)
            }));
    }

    /**
     * Calculate global metrics from all data
     */
    calculateGlobalMetrics() {
        // Calculate weighted global median from countries
        const totalOffers = this.data.countries.reduce((sum, c) => sum + c.n, 0);
        const totalApps = this.data.countries.reduce((sum, c) => sum + c.totalApplications, 0);

        // Calculate global median as weighted average of country medians
        const weightedMedianSum = this.data.countries.reduce((sum, c) => sum + (c.median * c.n), 0);
        const globalMedian = totalOffers > 0 ? weightedMedianSum / totalOffers : 0;

        // Calculate global mean
        const globalMean = totalOffers > 0 ? totalApps / totalOffers : 0;

        // Calculate P25 (25th percentile approximation from data)
        const allMedians = this.data.titles.map(t => t.median).sort((a, b) => a - b);
        const p25Index = Math.floor(allMedians.length * 0.25);
        const p25 = allMedians[p25Index] || 0;

        return {
            totalOffers,
            totalApplications: totalApps,
            globalMedian: Math.round(globalMedian * 100) / 100,
            globalMean: Math.round(globalMean * 100) / 100,
            p25: p25,
            numTitles: this.data.titles.length,
            numCountries: this.data.countries.length,
            numRegions: this.data.regions.length,
            numCities: this.data.cities.length,
            numFields: this.data.fields.length
        };
    }

    // ==================== QUERY METHODS ====================

    /**
     * Get top N items by a specific field (default: median)
     */
    getTop(array, field = 'median', n = 20, ascending = false) {
        return [...array]
            .sort((a, b) => ascending ? a[field] - b[field] : b[field] - a[field])
            .slice(0, n);
    }

    /**
     * Get title by ID
     */
    getTitleById(id) {
        return this.data.titles.find(t => t.id === id);
    }

    /**
     * Get title by name
     */
    getTitleByName(name) {
        return this.data.titles.find(t => t.name.toLowerCase() === name.toLowerCase());
    }

    /**
     * Get country by ID
     */
    getCountryById(id) {
        return this.data.countries.find(c => c.id === id);
    }

    /**
     * Get region by ID
     */
    getRegionById(id) {
        return this.data.regions.find(r => r.id === id);
    }

    /**
     * Get city by ID
     */
    getCityById(id) {
        return this.data.cities.find(c => c.id === id);
    }

    /**
     * Get field by ID
     */
    getFieldById(id) {
        return this.data.fields.find(f => f.id === id);
    }

    /**
     * Get regions for a specific country using the country-region mapping
     */
    getRegionsForCountry(countryId) {
        return this.data.regions.filter(r => r.countryId === countryId);
    }

    /**
     * Get country for a specific region
     */
    getCountryForRegion(regionId) {
        const region = this.data.regions.find(r => r.id === regionId);
        if (region && region.countryId) {
            return this.getCountryById(region.countryId);
        }
        return null;
    }

    /**
     * Get cities for a specific region
     */
    getCitiesForRegion(regionId) {
        return this.data.cities.filter(c => c.regionId === regionId);
    }

    /**
     * Get title data for a specific country
     */
    getTitlesForCountry(countryId) {
        return this.data.titleCountry.filter(tc => tc.countryId === countryId);
    }

    /**
     * Get title data for a specific region
     */
    getTitlesForRegion(regionId) {
        return this.data.titleRegion.filter(tr => tr.regionId === regionId);
    }

    /**
     * Get title data for a specific city
     */
    getTitlesForCity(cityId) {
        return this.data.titleCity.filter(tc => tc.cityId === cityId);
    }

    /**
     * Get field data for a specific country
     */
    getFieldsForCountry(countryId) {
        return this.data.fieldCountry.filter(fc => fc.countryId === countryId);
    }

    /**
     * Get field data for a specific region
     */
    getFieldsForRegion(regionId) {
        return this.data.fieldRegion.filter(fr => fr.regionId === regionId);
    }

    /**
     * Get field data for a specific city
     */
    getFieldsForCity(cityId) {
        return this.data.fieldCity.filter(fc => fc.cityId === cityId);
    }

    /**
     * Search titles by partial name match
     */
    searchTitles(query) {
        const lowerQuery = query.toLowerCase();
        return this.data.titles.filter(t =>
            t.name.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Search regions by partial name match
     */
    searchRegions(query) {
        const lowerQuery = query.toLowerCase();
        return this.data.regions.filter(r =>
            r.name.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Search cities by partial name match
     */
    searchCities(query) {
        const lowerQuery = query.toLowerCase();
        return this.data.cities.filter(c =>
            c.name.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get data with applied filters
     */
    getFilteredData(filters = {}) {
        const { titleId, countryId, regionId, cityId, fieldId, minN = 5 } = filters;

        let result = {
            titles: [...this.data.titles],
            regions: [...this.data.regions],
            cities: [...this.data.cities],
            fields: [...this.data.fields]
        };

        // Filter by minimum N
        result.titles = result.titles.filter(t => t.n >= minN);
        result.regions = result.regions.filter(r => r.n >= minN);
        result.cities = result.cities.filter(c => c.n >= minN);
        result.fields = result.fields.filter(f => f.n >= minN);

        // If country is selected, filter regions and cities
        if (countryId) {
            // Get titles for this country from titleCountry
            const titlesInCountry = this.data.titleCountry
                .filter(tc => tc.countryId === countryId && tc.n >= minN);
            result.titles = titlesInCountry.map(tc => ({
                id: tc.titleId,
                name: tc.titleName,
                n: tc.n,
                totalApplications: tc.totalApplications,
                mean: tc.mean,
                median: tc.median
            }));
        }

        // If region is selected, filter cities
        if (regionId) {
            result.cities = this.data.cities.filter(c => c.regionId === regionId && c.n >= minN);

            // Get titles for this region
            const titlesInRegion = this.data.titleRegion
                .filter(tr => tr.regionId === regionId && tr.n >= minN);
            result.titles = titlesInRegion.map(tr => ({
                id: tr.titleId,
                name: tr.titleName,
                n: tr.n,
                totalApplications: tr.totalApplications,
                mean: tr.mean,
                median: tr.median
            }));
        }

        // If city is selected
        if (cityId) {
            // Get titles for this city
            const titlesInCity = this.data.titleCity
                .filter(tc => tc.cityId === cityId && tc.n >= minN);
            result.titles = titlesInCity.map(tc => ({
                id: tc.titleId,
                name: tc.titleName,
                n: tc.n,
                totalApplications: tc.totalApplications,
                mean: tc.mean,
                median: tc.median
            }));
        }

        // If title is selected, get location data for that title
        if (titleId) {
            // Filter regions that have this title
            const regionsWithTitle = this.data.titleRegion
                .filter(tr => tr.titleId === titleId && tr.n >= minN);
            result.regions = regionsWithTitle.map(tr => ({
                id: tr.regionId,
                name: tr.regionName,
                n: tr.n,
                totalApplications: tr.totalApplications,
                mean: tr.mean,
                median: tr.median
            }));

            // Filter cities that have this title
            const citiesWithTitle = this.data.titleCity
                .filter(tc => tc.titleId === titleId && tc.n >= minN);
            result.cities = citiesWithTitle.map(tc => ({
                id: tc.cityId,
                name: tc.cityName,
                regionId: tc.regionId,
                regionName: tc.regionName,
                n: tc.n,
                totalApplications: tc.totalApplications,
                mean: tc.mean,
                median: tc.median
            }));
        }

        return result;
    }
}

// Create global instance
window.applicationsDataLoader = new ApplicationsDataLoader();
