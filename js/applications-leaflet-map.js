/**
 * Applications Leaflet Map Component
 * Interactive map with drill-down for geographic data visualization
 */

class ApplicationsLeafletMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.markerLayer = null;

        // Current state
        this.currentLevel = 'countries'; // countries, regions, cities
        this.currentCountryId = null;
        this.currentRegionId = null;

        // Country coordinates (approximate centers)
        this.countryCoordinates = {
            'Spain': { lat: 40.4168, lng: -3.7038, zoom: 6 },
            'Portugal': { lat: 39.3999, lng: -8.2245, zoom: 7 },
            'Andorra': { lat: 42.5063, lng: 1.5218, zoom: 10 },
            'France': { lat: 46.2276, lng: 2.2137, zoom: 6 },
            'Italy': { lat: 41.8719, lng: 12.5674, zoom: 6 },
            'Germany': { lat: 51.1657, lng: 10.4515, zoom: 6 },
            'United Kingdom': { lat: 55.3781, lng: -3.4360, zoom: 6 },
            'Mexico': { lat: 23.6345, lng: -102.5528, zoom: 5 },
            'USA': { lat: 37.0902, lng: -95.7129, zoom: 4 }
        };

        // Region coordinates (will be populated dynamically or use approximate)
        this.regionCoordinates = {};

        // City coordinates cache
        this.cityCoordinates = {};

        // Color scale for delivery (green = high, red = low)
        this.colorScale = {
            veryHigh: '#27ae60',
            high: '#58d68d',
            medium: '#f4d03f',
            low: '#e67e22',
            veryLow: '#e74c3c'
        };

        // Callbacks
        this.onNavigate = null;
        this.onSelect = null;
    }

    /**
     * Initialize the map
     */
    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Leaflet map container not found');
            return;
        }

        // Create map centered on Europe/Spain
        this.map = L.map(this.containerId).setView([40.4168, -3.7038], 5);

        // Add tile layer (using OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Create marker layer group
        this.markerLayer = L.layerGroup().addTo(this.map);
    }

    /**
     * Load and display countries
     */
    loadCountries(data) {
        if (!this.map || !data || !data.countries) return;

        this.currentLevel = 'countries';
        this.currentCountryId = null;
        this.currentRegionId = null;
        this.clearMarkers();

        const globalMedian = data.globalMetrics?.globalMedian || 30;

        data.countries.forEach(country => {
            const coords = this.countryCoordinates[country.name];
            if (coords) {
                this.addMarker(country, coords.lat, coords.lng, globalMedian, 'country');
            }
        });

        // Fit map to show all markers
        if (this.markers.length > 0) {
            const group = L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    /**
     * Drill down to regions of a country
     */
    drillDownToRegions(countryId, countryName) {
        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader) return;

        this.currentLevel = 'regions';
        this.currentCountryId = countryId;
        this.clearMarkers();

        const regions = dataLoader.getRegionsForCountry(countryId);
        const country = dataLoader.getCountryById(countryId);
        const referenceMedian = country?.median || dataLoader.data.globalMetrics.globalMedian;

        // Zoom to country
        const countryCoords = this.countryCoordinates[countryName];
        if (countryCoords) {
            this.map.setView([countryCoords.lat, countryCoords.lng], countryCoords.zoom);
        }

        // Add region markers (using approximate coordinates based on name)
        regions.forEach(region => {
            const coords = this.getRegionCoordinates(region.name, countryName);
            if (coords) {
                this.addMarker(region, coords.lat, coords.lng, referenceMedian, 'region');
            }
        });

        // Trigger navigation callback
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
        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader) return;

        this.currentLevel = 'cities';
        this.currentRegionId = regionId;
        this.clearMarkers();

        const cities = dataLoader.getCitiesForRegion(regionId);
        const region = dataLoader.getRegionById(regionId);
        const referenceMedian = region?.median || dataLoader.data.globalMetrics.globalMedian;

        // Add city markers
        cities.forEach(city => {
            const coords = this.getCityCoordinates(city.name, regionName);
            if (coords) {
                this.addMarker(city, coords.lat, coords.lng, referenceMedian, 'city');
            }
        });

        // Fit to markers
        if (this.markers.length > 0) {
            const group = L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }

        // Trigger navigation callback
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
     * Add a marker to the map
     */
    addMarker(item, lat, lng, referenceMedian, type) {
        const color = this.getColorForMedian(item.median, referenceMedian);
        const deliveryLevel = this.getDeliveryLevel(item.median, referenceMedian);
        const radius = this.getMarkerRadius(item.n, type);

        // Create circle marker
        const marker = L.circleMarker([lat, lng], {
            radius: radius,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        // Create popup content
        const popupContent = this.createPopupContent(item, deliveryLevel, type);
        marker.bindPopup(popupContent);

        // Add click handler for drill-down
        marker.on('click', () => {
            if (type === 'country') {
                this.drillDownToRegions(item.id, item.name);
            } else if (type === 'region') {
                this.drillDownToCities(item.id, item.name);
            } else if (type === 'city') {
                if (this.onSelect) {
                    this.onSelect({ cityId: item.id, cityName: item.name });
                }
            }
        });

        // Add to layer
        marker.addTo(this.markerLayer);
        this.markers.push(marker);
    }

    /**
     * Create popup content HTML
     */
    createPopupContent(item, deliveryLevel, type) {
        const typeLabel = type === 'country' ? 'País' : (type === 'region' ? 'Región' : 'Ciudad');
        const clickHint = type !== 'city' ? '<p style="font-size:0.75rem;color:#888;margin-top:8px">Click para explorar</p>' : '';

        return `
            <div class="marker-popup">
                <h4>${item.name}</h4>
                <div class="popup-stats">
                    <div class="stat-row">
                        <span class="stat-label">Ofertas:</span>
                        <span class="stat-value">${item.n.toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Mediana:</span>
                        <span class="stat-value">${item.median.toFixed(1)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Media:</span>
                        <span class="stat-value">${item.mean.toFixed(1)}</span>
                    </div>
                </div>
                <span class="delivery-badge ${deliveryLevel.class}">${deliveryLevel.label}</span>
                ${clickHint}
            </div>
        `;
    }

    /**
     * Get color based on median value
     */
    getColorForMedian(median, referenceMedian) {
        const ratio = median / referenceMedian;

        if (ratio >= 1.4) return this.colorScale.veryHigh;
        if (ratio >= 1.15) return this.colorScale.high;
        if (ratio >= 0.85) return this.colorScale.medium;
        if (ratio >= 0.6) return this.colorScale.low;
        return this.colorScale.veryLow;
    }

    /**
     * Get delivery level info
     */
    getDeliveryLevel(median, referenceMedian) {
        const ratio = median / referenceMedian;

        if (ratio >= 1.4) return { label: 'Excelente', class: 'excellent' };
        if (ratio >= 1.15) return { label: 'Bueno', class: 'good' };
        if (ratio >= 0.85) return { label: 'Promedio', class: 'average' };
        if (ratio >= 0.6) return { label: 'Bajo', class: 'low' };
        return { label: 'Crítico', class: 'critical' };
    }

    /**
     * Get marker radius based on volume
     */
    getMarkerRadius(n, type) {
        const baseRadius = type === 'country' ? 20 : (type === 'region' ? 15 : 10);
        const maxRadius = type === 'country' ? 40 : (type === 'region' ? 30 : 20);

        // Scale logarithmically
        const scale = Math.log10(n + 1) / 4;
        return Math.min(baseRadius + scale * 10, maxRadius);
    }

    /**
     * Get approximate region coordinates
     */
    getRegionCoordinates(regionName, countryName) {
        // Spanish regions (principales)
        const spanishRegions = {
            'Madrid': { lat: 40.4168, lng: -3.7038 },
            'Barcelona': { lat: 41.3874, lng: 2.1686 },
            'Valencia': { lat: 39.4699, lng: -0.3763 },
            'Sevilla': { lat: 37.3891, lng: -5.9845 },
            'Málaga': { lat: 36.7213, lng: -4.4214 },
            'Tarragona': { lat: 41.1189, lng: 1.2445 },
            'Girona': { lat: 41.9794, lng: 2.8214 },
            'Lleida': { lat: 41.6176, lng: 0.6200 },
            'Alicante': { lat: 38.3452, lng: -0.4810 },
            'Mallorca': { lat: 39.5696, lng: 2.6502 },
            'Islas Baleares': { lat: 39.5696, lng: 2.6502 },
            'Tenerife': { lat: 28.2916, lng: -16.6291 },
            'Las Palmas': { lat: 28.1235, lng: -15.4363 },
            'Granada': { lat: 37.1773, lng: -3.5986 },
            'Almería': { lat: 36.8340, lng: -2.4637 },
            'Cádiz': { lat: 36.5271, lng: -6.2886 },
            'Bilbao': { lat: 43.2630, lng: -2.9350 },
            'Vizcaya': { lat: 43.2630, lng: -2.9350 },
            'San Sebastián': { lat: 43.3183, lng: -1.9812 },
            'Guipúzcoa': { lat: 43.3183, lng: -1.9812 },
            'Zaragoza': { lat: 41.6488, lng: -0.8891 },
            'Murcia': { lat: 37.9922, lng: -1.1307 },
            'A Coruña': { lat: 43.3623, lng: -8.4115 },
            'Pontevedra': { lat: 42.4310, lng: -8.6446 },
            'Asturias': { lat: 43.3619, lng: -5.8494 },
            'Cantabria': { lat: 43.1828, lng: -3.9878 },
            'Navarra': { lat: 42.6954, lng: -1.6761 },
            'La Rioja': { lat: 42.2871, lng: -2.5396 },
            'Castellón': { lat: 39.9864, lng: -0.0513 },
            'Huelva': { lat: 37.2614, lng: -6.9447 },
            'Córdoba': { lat: 37.8882, lng: -4.7794 },
            'Jaén': { lat: 37.7796, lng: -3.7849 },
            'Toledo': { lat: 39.8628, lng: -4.0273 },
            'Segovia': { lat: 40.9429, lng: -4.1088 },
            'Ávila': { lat: 40.6566, lng: -4.7000 },
            'Salamanca': { lat: 40.9701, lng: -5.6635 },
            'Valladolid': { lat: 41.6523, lng: -4.7245 },
            'Burgos': { lat: 42.3440, lng: -3.6969 },
            'León': { lat: 42.5987, lng: -5.5671 },
            'Palencia': { lat: 42.0096, lng: -4.5288 },
            'Zamora': { lat: 41.5034, lng: -5.7467 },
            'Soria': { lat: 41.7636, lng: -2.4649 },
            'Guadalajara': { lat: 40.6337, lng: -3.1674 },
            'Cuenca': { lat: 40.0704, lng: -2.1374 },
            'Ciudad Real': { lat: 38.9848, lng: -3.9274 },
            'Albacete': { lat: 38.9943, lng: -1.8585 },
            'Badajoz': { lat: 38.8794, lng: -6.9706 },
            'Cáceres': { lat: 39.4753, lng: -6.3724 },
            'Lugo': { lat: 43.0097, lng: -7.5568 },
            'Ourense': { lat: 42.3364, lng: -7.8639 },
            'Teruel': { lat: 40.3456, lng: -1.1065 },
            'Huesca': { lat: 42.1401, lng: -0.4089 }
        };

        // Portuguese regions
        const portugueseRegions = {
            'Lisboa': { lat: 38.7223, lng: -9.1393 },
            'Porto': { lat: 41.1579, lng: -8.6291 },
            'Faro': { lat: 37.0194, lng: -7.9304 },
            'Braga': { lat: 41.5454, lng: -8.4265 },
            'Setúbal': { lat: 38.5244, lng: -8.8882 },
            'Coimbra': { lat: 40.2033, lng: -8.4103 },
            'Aveiro': { lat: 40.6443, lng: -8.6455 },
            'Leiria': { lat: 39.7495, lng: -8.8077 },
            'Madeira': { lat: 32.6669, lng: -16.9241 },
            'Açores': { lat: 37.7412, lng: -25.6756 }
        };

        // Andorran regions
        const andorranRegions = {
            'Andorra la Vieja': { lat: 42.5063, lng: 1.5218 },
            'Escaldes-Engordany': { lat: 42.5100, lng: 1.5400 }
        };

        // Combine all
        const allRegions = { ...spanishRegions, ...portugueseRegions, ...andorranRegions };

        // Check for exact match first
        if (allRegions[regionName]) {
            return allRegions[regionName];
        }

        // Check for partial match
        for (const [name, coords] of Object.entries(allRegions)) {
            if (regionName.includes(name) || name.includes(regionName)) {
                return coords;
            }
        }

        // Default to country center with some offset
        const countryCoords = this.countryCoordinates[countryName];
        if (countryCoords) {
            return {
                lat: countryCoords.lat + (Math.random() - 0.5) * 2,
                lng: countryCoords.lng + (Math.random() - 0.5) * 2
            };
        }

        return null;
    }

    /**
     * Get city coordinates (using geocoding or cache)
     */
    getCityCoordinates(cityName, regionName) {
        // Cache key
        const key = `${cityName}_${regionName}`;

        if (this.cityCoordinates[key]) {
            return this.cityCoordinates[key];
        }

        // Known cities (principales ciudades)
        const knownCities = {
            'Madrid': { lat: 40.4168, lng: -3.7038 },
            'Barcelona': { lat: 41.3874, lng: 2.1686 },
            'Valencia': { lat: 39.4699, lng: -0.3763 },
            'Sevilla': { lat: 37.3891, lng: -5.9845 },
            'Zaragoza': { lat: 41.6488, lng: -0.8891 },
            'Málaga': { lat: 36.7213, lng: -4.4214 },
            'Murcia': { lat: 37.9922, lng: -1.1307 },
            'Palma de Mallorca': { lat: 39.5696, lng: 2.6502 },
            'Palma': { lat: 39.5696, lng: 2.6502 },
            'Las Palmas de Gran Canaria': { lat: 28.1235, lng: -15.4363 },
            'Bilbao': { lat: 43.2630, lng: -2.9350 },
            'Alicante': { lat: 38.3452, lng: -0.4810 },
            'Córdoba': { lat: 37.8882, lng: -4.7794 },
            'Valladolid': { lat: 41.6523, lng: -4.7245 },
            'Vigo': { lat: 42.2406, lng: -8.7207 },
            'Gijón': { lat: 43.5322, lng: -5.6611 },
            'Granada': { lat: 37.1773, lng: -3.5986 },
            'L\'Hospitalet de Llobregat': { lat: 41.3597, lng: 2.1006 },
            'Vitoria-Gasteiz': { lat: 42.8467, lng: -2.6716 },
            'A Coruña': { lat: 43.3623, lng: -8.4115 },
            'Elche': { lat: 38.2699, lng: -0.7126 },
            'Oviedo': { lat: 43.3619, lng: -5.8494 },
            'Badalona': { lat: 41.4500, lng: 2.2474 },
            'Terrassa': { lat: 41.5611, lng: 2.0089 },
            'Cartagena': { lat: 37.6257, lng: -0.9966 },
            'Jerez de la Frontera': { lat: 36.6850, lng: -6.1261 },
            'Sabadell': { lat: 41.5486, lng: 2.1075 },
            'Móstoles': { lat: 40.3225, lng: -3.8650 },
            'Santa Cruz de Tenerife': { lat: 28.4636, lng: -16.2518 },
            'Pamplona': { lat: 42.8125, lng: -1.6458 },
            'Almería': { lat: 36.8340, lng: -2.4637 },
            'Fuenlabrada': { lat: 40.2838, lng: -3.7994 },
            'Leganés': { lat: 40.3281, lng: -3.7657 },
            'San Sebastián': { lat: 43.3183, lng: -1.9812 },
            'Donostia': { lat: 43.3183, lng: -1.9812 },
            'Getafe': { lat: 40.3047, lng: -3.7311 },
            'Burgos': { lat: 42.3440, lng: -3.6969 },
            'Santander': { lat: 43.4623, lng: -3.8099 },
            'Albacete': { lat: 38.9943, lng: -1.8585 },
            'Alcalá de Henares': { lat: 40.4818, lng: -3.3635 },
            'Castellón de la Plana': { lat: 39.9864, lng: -0.0513 },
            'Logroño': { lat: 42.4650, lng: -2.4456 },
            'Huelva': { lat: 37.2614, lng: -6.9447 },
            'Badajoz': { lat: 38.8794, lng: -6.9706 },
            'Salamanca': { lat: 40.9701, lng: -5.6635 },
            'Tarragona': { lat: 41.1189, lng: 1.2445 },
            'Lleida': { lat: 41.6176, lng: 0.6200 },
            'Marbella': { lat: 36.5099, lng: -4.8858 },
            'León': { lat: 42.5987, lng: -5.5671 },
            'Cádiz': { lat: 36.5271, lng: -6.2886 },
            'Jaén': { lat: 37.7796, lng: -3.7849 },
            'Ourense': { lat: 42.3364, lng: -7.8639 },
            'Girona': { lat: 41.9794, lng: 2.8214 },
            'Lugo': { lat: 43.0097, lng: -7.5568 },
            'Santiago de Compostela': { lat: 42.8782, lng: -8.5448 },
            'Toledo': { lat: 39.8628, lng: -4.0273 },
            'Mataró': { lat: 41.5400, lng: 2.4445 },
            'Torrejón de Ardoz': { lat: 40.4603, lng: -3.4828 },
            'Reus': { lat: 41.1561, lng: 1.1069 },
            'Benidorm': { lat: 38.5411, lng: -0.1225 },
            // Portuguese cities
            'Lisboa': { lat: 38.7223, lng: -9.1393 },
            'Porto': { lat: 41.1579, lng: -8.6291 },
            'Faro': { lat: 37.0194, lng: -7.9304 },
            'Braga': { lat: 41.5454, lng: -8.4265 },
            'Coimbra': { lat: 40.2033, lng: -8.4103 },
            'Funchal': { lat: 32.6669, lng: -16.9241 }
        };

        if (knownCities[cityName]) {
            this.cityCoordinates[key] = knownCities[cityName];
            return knownCities[cityName];
        }

        // Try to get from region coordinates with offset
        const regionCoords = this.getRegionCoordinates(regionName, 'Spain');
        if (regionCoords) {
            const coords = {
                lat: regionCoords.lat + (Math.random() - 0.5) * 0.3,
                lng: regionCoords.lng + (Math.random() - 0.5) * 0.3
            };
            this.cityCoordinates[key] = coords;
            return coords;
        }

        return null;
    }

    /**
     * Clear all markers
     */
    clearMarkers() {
        this.markerLayer.clearLayers();
        this.markers = [];
    }

    /**
     * Reset map to initial state
     */
    reset() {
        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader || !dataLoader.isLoaded) return;

        this.loadCountries(dataLoader.data);
        this.map.setView([40.4168, -3.7038], 5);

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
     * Set navigation callback
     */
    setNavigationCallback(callback) {
        this.onNavigate = callback;
    }

    /**
     * Set selection callback
     */
    setSelectionCallback(callback) {
        this.onSelect = callback;
    }

    /**
     * Invalidate size (call after showing map)
     */
    invalidateSize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }
}

// Create global instance
window.applicationsLeafletMap = null;
