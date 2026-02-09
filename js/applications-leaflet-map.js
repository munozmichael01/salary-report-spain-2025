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

        // Add back button control
        this.addBackButtonControl();
    }

    /**
     * Add back button control to the map
     */
    addBackButtonControl() {
        const BackControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-back-control');
                container.innerHTML = `
                    <a href="#" id="map-back-btn" class="leaflet-back-btn" title="Volver" style="display:none;">
                        <span style="font-size:18px;">←</span> Volver
                    </a>
                `;
                L.DomEvent.disableClickPropagation(container);
                return container;
            }
        });
        this.map.addControl(new BackControl());

        // Bind click event
        setTimeout(() => {
            const backBtn = document.getElementById('map-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.goBack();
                });
            }
        }, 100);
    }

    /**
     * Go back one level in navigation
     */
    goBack() {
        const dataLoader = window.applicationsDataLoader;
        if (!dataLoader || !dataLoader.isLoaded) return;

        if (this.currentLevel === 'cities') {
            // Go back to regions
            const country = dataLoader.getCountryById(this.currentCountryId);
            if (country) {
                this.drillDownToRegions(this.currentCountryId, country.name);
            }
        } else if (this.currentLevel === 'regions') {
            // Go back to countries
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

        this.updateBackButton();
    }

    /**
     * Update back button visibility
     */
    updateBackButton() {
        const backBtn = document.getElementById('map-back-btn');
        if (backBtn) {
            backBtn.style.display = this.currentLevel === 'countries' ? 'none' : 'block';
        }
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
        this.updateBackButton();

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

        this.updateBackButton();

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

        this.updateBackButton();

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
     * Based on actual data from CSV files
     */
    getRegionCoordinates(regionName, countryName) {
        // All Spanish regions from the data
        const spanishRegions = {
            // Main provinces
            'Madrid': { lat: 40.4168, lng: -3.7038 },
            'Barcelona': { lat: 41.3874, lng: 2.1686 },
            'Valencia': { lat: 39.4699, lng: -0.3763 },
            'Sevilla': { lat: 37.3891, lng: -5.9845 },
            'Málaga': { lat: 36.7213, lng: -4.4214 },
            'Tarragona': { lat: 41.1189, lng: 1.2445 },
            'Girona': { lat: 41.9794, lng: 2.8214 },
            'Lleida': { lat: 41.6176, lng: 0.6200 },
            'Alicante': { lat: 38.3452, lng: -0.4810 },
            'Granada': { lat: 37.1773, lng: -3.5986 },
            'Almería': { lat: 36.8340, lng: -2.4637 },
            'Cádiz': { lat: 36.5271, lng: -6.2886 },
            'Zaragoza': { lat: 41.6488, lng: -0.8891 },
            'Murcia': { lat: 37.9922, lng: -1.1307 },
            'A Coruña': { lat: 43.3623, lng: -8.4115 },
            'Pontevedra': { lat: 42.4310, lng: -8.6446 },
            'Asturias': { lat: 43.3619, lng: -5.8494 },
            'Cantabria': { lat: 43.4623, lng: -3.8099 },
            'Navarra': { lat: 42.8125, lng: -1.6458 },
            'La Rioja': { lat: 42.2871, lng: -2.5396 },
            'Castellón': { lat: 39.9864, lng: -0.0513 },
            'Huelva': { lat: 37.2614, lng: -6.9447 },
            'Córdoba': { lat: 37.8882, lng: -4.7794 },
            'Jaén': { lat: 37.7796, lng: -3.7849 },
            'Toledo': { lat: 39.8628, lng: -4.0273 },
            'Segovia': { lat: 40.9429, lng: -4.1088 },
            'Salamanca': { lat: 40.9701, lng: -5.6635 },
            'Valladolid': { lat: 41.6523, lng: -4.7245 },
            'Burgos': { lat: 42.3440, lng: -3.6969 },
            'León': { lat: 42.5987, lng: -5.5671 },
            'Palencia': { lat: 42.0096, lng: -4.5288 },
            'Guadalajara': { lat: 40.6337, lng: -3.1674 },
            'Badajoz': { lat: 38.8794, lng: -6.9706 },
            'Cáceres': { lat: 39.4753, lng: -6.3724 },
            'Teruel': { lat: 40.3456, lng: -1.1065 },
            'Huesca': { lat: 42.1401, lng: -0.4089 },
            // Basque Country
            'Vizcaya': { lat: 43.2630, lng: -2.9350 },
            'Guipúzcoa': { lat: 43.3183, lng: -1.9812 },
            'Álava': { lat: 42.8467, lng: -2.6716 },
            // Island regions
            'Islas Baleares': { lat: 39.5696, lng: 2.6502 },
            'Mallorca': { lat: 39.6953, lng: 3.0176 },
            'Las Palmas': { lat: 28.1235, lng: -15.4363 },
            'Santa Cruz de Tenerife': { lat: 28.4636, lng: -16.2518 },
            'Islas Canarias': { lat: 28.2916, lng: -16.6291 },
            // Autonomous communities as regions
            'Cataluña': { lat: 41.5912, lng: 1.5209 },
            // Andorra
            'Canillo': { lat: 42.5676, lng: 1.5977 },
            'San Miguel de Abona': { lat: 28.0833, lng: -16.6167 }
        };

        // Check for exact match first
        if (spanishRegions[regionName]) {
            return spanishRegions[regionName];
        }

        // Check for partial match
        for (const [name, coords] of Object.entries(spanishRegions)) {
            if (regionName.includes(name) || name.includes(regionName)) {
                return coords;
            }
        }

        // Default to country center with some offset
        const countryCoords = this.countryCoordinates[countryName];
        if (countryCoords) {
            // Use hash of name for consistent positioning
            const hash = regionName.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
            return {
                lat: countryCoords.lat + ((hash % 100) / 100 - 0.5) * 2,
                lng: countryCoords.lng + (((hash >> 8) % 100) / 100 - 0.5) * 2
            };
        }

        return null;
    }

    /**
     * Get city coordinates (using geocoding or cache)
     * Complete list based on CSV data
     */
    getCityCoordinates(cityName, regionName) {
        // Cache key
        const key = `${cityName}_${regionName}`;

        if (this.cityCoordinates[key]) {
            return this.cityCoordinates[key];
        }

        // All cities from the data with accurate coordinates
        const knownCities = {
            // Major cities
            'Madrid': { lat: 40.4168, lng: -3.7038 },
            'Barcelona': { lat: 41.3874, lng: 2.1686 },
            'València': { lat: 39.4699, lng: -0.3763 },
            'Valencia': { lat: 39.4699, lng: -0.3763 },
            'Sevilla': { lat: 37.3891, lng: -5.9845 },
            'Zaragoza': { lat: 41.6488, lng: -0.8891 },
            'Málaga': { lat: 36.7213, lng: -4.4214 },
            'Murcia': { lat: 37.9922, lng: -1.1307 },
            'Bilbao': { lat: 43.2630, lng: -2.9350 },
            'Granada': { lat: 37.1773, lng: -3.5986 },

            // Balearic Islands
            'Palma de Mallorca': { lat: 39.5696, lng: 2.6502 },
            'Ibiza': { lat: 38.9067, lng: 1.4206 },
            'Calviá': { lat: 39.5657, lng: 2.5063 },
            'Alcúdia': { lat: 39.8532, lng: 3.1218 },
            'Can Picafort': { lat: 39.7583, lng: 3.1456 },
            'Santa Eulària des Riu': { lat: 38.9847, lng: 1.5328 },
            'San Antonio Abad': { lat: 38.9803, lng: 1.3006 },
            'Ciutadella de Menorca': { lat: 40.0000, lng: 3.8417 },
            'Islas Baleares': { lat: 39.5696, lng: 2.6502 },
            'Palmanova': { lat: 39.5194, lng: 2.5378 },
            'Santanyí': { lat: 39.3547, lng: 3.1247 },
            'Portocolom': { lat: 39.4172, lng: 3.2603 },
            'Menorca': { lat: 39.9496, lng: 4.1106 },
            'Puigpuñent': { lat: 39.6231, lng: 2.5172 },
            'Camp de Mar': { lat: 39.5356, lng: 2.4256 },
            'Llucmajor': { lat: 39.4914, lng: 2.8914 },
            'Canyamel': { lat: 39.6461, lng: 3.4369 },
            'Cala d\'Or': { lat: 39.3742, lng: 3.2328 },
            'Portals Nous': { lat: 39.5333, lng: 2.5500 },
            'Can Pastilla': { lat: 39.5283, lng: 2.7178 },
            'Cala Sant Vicenç': { lat: 39.9181, lng: 3.0564 },
            'Peguera': { lat: 39.5361, lng: 2.4478 },
            'Playas de Muro': { lat: 39.7811, lng: 3.1044 },
            'Colonia de Sant Jordi': { lat: 39.3169, lng: 2.9886 },
            'Alaró': { lat: 39.7033, lng: 2.7900 },
            'Puerto de Alcudia': { lat: 39.8456, lng: 3.1439 },
            'Sóller': { lat: 39.7656, lng: 2.7147 },
            'Formentera': { lat: 38.7081, lng: 1.4361 },
            'Cala Millor': { lat: 39.6028, lng: 3.3836 },
            'Maó-Mahón': { lat: 39.8858, lng: 4.2664 },
            'ses Illetes': { lat: 39.5456, lng: 2.6078 },
            'Manacor': { lat: 39.5700, lng: 3.2092 },
            'Santa Ponsa': { lat: 39.5086, lng: 2.4744 },
            'Ferreries': { lat: 39.9794, lng: 4.0117 },
            'Es Pujols': { lat: 38.7261, lng: 1.4450 },
            'Cala Murada': { lat: 39.4331, lng: 3.2833 },
            'Montuïri': { lat: 39.5675, lng: 2.9836 },
            'Cala Rajada': { lat: 39.7094, lng: 3.4631 },
            'Illes Balears': { lat: 39.5696, lng: 2.6502 },
            'Mallorca': { lat: 39.6953, lng: 3.0176 },
            'Artá': { lat: 39.6964, lng: 3.3492 },
            'Salines, Ses': { lat: 39.3333, lng: 2.9833 },
            'El Arenal': { lat: 39.5047, lng: 2.7494 },
            'Pobla, Sa': { lat: 39.7653, lng: 3.0228 },
            'Es Migjorn Gran': { lat: 39.9378, lng: 4.0297 },
            'El Toro': { lat: 39.5333, lng: 2.5167 },
            'Platges de Fornells': { lat: 40.0544, lng: 4.1344 },
            'Son Servera': { lat: 39.6211, lng: 3.3589 },
            'Porto Cristo': { lat: 39.5403, lng: 3.3339 },
            'Port de Sóller': { lat: 39.7958, lng: 2.6919 },
            'Puerto Nous': { lat: 39.5333, lng: 2.5500 },
            'Magaluf': { lat: 39.5056, lng: 2.5361 },
            'Sant Josep de sa Talaia': { lat: 38.9214, lng: 1.2894 },
            'Portinatx': { lat: 39.1147, lng: 1.5150 },
            'Son Vida': { lat: 39.5892, lng: 2.6389 },
            'Felanitx': { lat: 39.4703, lng: 3.1489 },
            'Pollença': { lat: 39.8772, lng: 3.0167 },
            'Cales de Mallorca': { lat: 39.4650, lng: 3.2650 },
            'Muro': { lat: 39.7267, lng: 3.0008 },

            // Canary Islands - Las Palmas
            'Las Palmas de Gran Canaria': { lat: 28.1235, lng: -15.4363 },
            'San Bartolomé de Tirajana': { lat: 27.9233, lng: -15.5731 },
            'Playa Blanca': { lat: 28.8619, lng: -13.8383 },
            'Yaiza': { lat: 28.9544, lng: -13.7650 },
            'Maspalomas': { lat: 27.7603, lng: -15.5869 },
            'Mogán': { lat: 27.8894, lng: -15.7239 },
            'Puerto del Carmen': { lat: 28.9219, lng: -13.6667 },
            'Corralejo': { lat: 28.7300, lng: -13.8678 },
            'Fuerteventura': { lat: 28.3587, lng: -14.0537 },
            'Morro Jable': { lat: 28.0500, lng: -14.3500 },
            'Jandia': { lat: 28.0444, lng: -14.3306 },
            'Lanzarote': { lat: 29.0469, lng: -13.5900 },
            'Pájara': { lat: 28.3544, lng: -14.1078 },
            'Esquinzo': { lat: 28.0833, lng: -14.3000 },
            'Gran Canaria': { lat: 28.1235, lng: -15.4363 },
            'Teguise': { lat: 29.0625, lng: -13.5611 },
            'Tías': { lat: 28.9478, lng: -13.6519 },
            'Costa Calma': { lat: 28.1639, lng: -14.2239 },
            'Montaña Roja': { lat: 28.0283, lng: -14.3572 },

            // Canary Islands - Tenerife
            'Santa Cruz de Tenerife': { lat: 28.4636, lng: -16.2518 },
            'Adeje': { lat: 28.1225, lng: -16.7258 },
            'Costa Adeje': { lat: 28.0833, lng: -16.7333 },
            'Puerto de la Cruz': { lat: 28.4167, lng: -16.5500 },
            'Arona': { lat: 28.0997, lng: -16.6808 },
            'Guía de Isora': { lat: 28.2111, lng: -16.7792 },
            'Candelaria': { lat: 28.3544, lng: -16.3728 },
            'Playa de Fañabé': { lat: 28.0786, lng: -16.7339 },
            'Tenerife': { lat: 28.2916, lng: -16.6291 },
            'Puerto de Santiago': { lat: 28.2347, lng: -16.8478 },
            'Los Realejos': { lat: 28.3833, lng: -16.5833 },
            'Golf del Sur': { lat: 28.0333, lng: -16.6167 },
            'San Miguel de Abona': { lat: 28.0833, lng: -16.6167 },

            // Islas Canarias (generic)
            'Islas Canarias': { lat: 28.2916, lng: -16.6291 },

            // Costa Brava - Girona
            'Girona': { lat: 41.9794, lng: 2.8214 },
            'Lloret de Mar': { lat: 41.7000, lng: 2.8453 },
            'Tossa de Mar': { lat: 41.7194, lng: 2.9314 },
            'Sant Feliu de Guíxols': { lat: 41.7839, lng: 3.0297 },
            'Torrent': { lat: 41.8167, lng: 2.9500 },
            'Castell-Platja d\'Aro': { lat: 41.8167, lng: 3.0667 },
            'Castelló d\'Empúries': { lat: 42.2592, lng: 3.0728 },
            'Caldes de Malavella': { lat: 41.8375, lng: 2.8117 },
            'Estartit': { lat: 42.0519, lng: 3.1986 },
            'L\'Escala': { lat: 42.1231, lng: 3.1333 },
            'Roses': { lat: 42.2622, lng: 3.1772 },
            'Palamós': { lat: 41.8500, lng: 3.1292 },
            'Blanes': { lat: 41.6742, lng: 2.7903 },
            'Empuriabrava': { lat: 42.2500, lng: 3.1167 },
            'Santa Cristina d\'Aro': { lat: 41.8167, lng: 2.9833 },
            'Figueres': { lat: 42.2667, lng: 2.9614 },
            'Begur': { lat: 41.9536, lng: 3.2072 },
            'Santa Susana': { lat: 41.6333, lng: 2.7167 },
            'Llanars': { lat: 42.3333, lng: 2.2667 },
            'Vilobí d\'Onyar': { lat: 41.8833, lng: 2.7667 },
            'Riudellots de la Selva': { lat: 41.9000, lng: 2.8000 },
            'Torroella de Montgrí': { lat: 42.0422, lng: 3.1261 },

            // Costa Dorada - Tarragona
            'Tarragona': { lat: 41.1189, lng: 1.2445 },
            'Salou': { lat: 41.0767, lng: 1.1417 },
            'Cambrils': { lat: 41.0667, lng: 1.0500 },
            'Reus': { lat: 41.1561, lng: 1.1069 },
            'Altafulla': { lat: 41.1417, lng: 1.3750 },
            'Creixell': { lat: 41.1667, lng: 1.4500 },
            'L\'Ampolla': { lat: 40.8167, lng: 0.7167 },
            'L\'Hospitalet de l\'Infant': { lat: 41.0000, lng: 0.9167 },
            'El Priorato': { lat: 41.2167, lng: 0.8500 },

            // Costa Blanca - Alicante
            'Alicante/Alacant': { lat: 38.3452, lng: -0.4810 },
            'Benidorm': { lat: 38.5411, lng: -0.1225 },
            'Calp': { lat: 38.6447, lng: 0.0447 },
            'El Albir': { lat: 38.5667, lng: -0.0500 },
            'Dehesa de Campoamor': { lat: 37.9167, lng: -0.7500 },
            'Dénia': { lat: 38.8408, lng: 0.1106 },
            'Jávea/Xàbia': { lat: 38.7833, lng: 0.1667 },
            'Crevillent': { lat: 38.2500, lng: -0.8000 },
            'Altea': { lat: 38.5992, lng: -0.0517 },

            // Costa del Sol - Málaga
            'Marbella': { lat: 36.5099, lng: -4.8858 },
            'Fuengirola': { lat: 36.5397, lng: -4.6247 },
            'Torremolinos': { lat: 36.6214, lng: -4.4992 },
            'Benalmádena': { lat: 36.5986, lng: -4.5169 },
            'Estepona': { lat: 36.4261, lng: -5.1458 },
            'Manilva': { lat: 36.3833, lng: -5.2500 },
            'Mijas': { lat: 36.5958, lng: -4.6367 },
            'Archidona': { lat: 37.0942, lng: -4.3919 },
            'San Pedro': { lat: 36.4833, lng: -4.9833 },

            // Barcelona province
            'L\'Hospitalet de Llobregat': { lat: 41.3597, lng: 2.1006 },
            'Sabadell': { lat: 41.5486, lng: 2.1075 },
            'Santa Susanna': { lat: 41.6333, lng: 2.7167 },
            'Calella': { lat: 41.6139, lng: 2.6583 },
            'Sant Cugat del Vallès': { lat: 41.4722, lng: 2.0867 },
            'Pineda de Mar': { lat: 41.6281, lng: 2.6903 },
            'Badalona': { lat: 41.4500, lng: 2.2474 },
            'Granollers': { lat: 41.6083, lng: 2.2875 },
            'Sitges': { lat: 41.2375, lng: 1.8117 },
            'El Prat de Llobregat': { lat: 41.3244, lng: 2.0950 },
            'Terrassa': { lat: 41.5611, lng: 2.0089 },
            'Malgrat de Mar': { lat: 41.6456, lng: 2.7414 },
            'Castelldefels': { lat: 41.2800, lng: 1.9767 },
            'Viladecans': { lat: 41.3139, lng: 2.0150 },
            'Sant Andreu de la Barca': { lat: 41.4500, lng: 1.9667 },
            'Barberà del Vallès': { lat: 41.5167, lng: 2.1333 },
            'Mataró': { lat: 41.5400, lng: 2.4445 },
            'La Garriga': { lat: 41.6833, lng: 2.2833 },
            'Sant Just Desvern': { lat: 41.3833, lng: 2.0750 },
            'Palafolls': { lat: 41.6667, lng: 2.7500 },
            'Mollet del Vallès': { lat: 41.5400, lng: 2.2139 },
            'Molins de Rei': { lat: 41.4167, lng: 2.0167 },
            'Cornellà de Llobregat': { lat: 41.3550, lng: 2.0700 },
            'El Maresme': { lat: 41.5400, lng: 2.4445 },

            // Madrid province
            'Alcalá de Henares': { lat: 40.4818, lng: -3.3635 },
            'Alcobendas': { lat: 40.5478, lng: -3.6419 },
            'San Sebastián de los Reyes': { lat: 40.5478, lng: -3.6258 },
            'Pozuelo de Alarcón': { lat: 40.4333, lng: -3.8167 },
            'Alcorcón': { lat: 40.3489, lng: -3.8244 },
            'Somosaguas': { lat: 40.4333, lng: -3.8000 },
            'Villaviciosa de Odón': { lat: 40.3583, lng: -3.9017 },
            'San Fernando de Henares': { lat: 40.4250, lng: -3.5333 },
            'Rivas-Vaciamadrid': { lat: 40.3500, lng: -3.5167 },
            'Tres Cantos': { lat: 40.6000, lng: -3.7000 },
            'Coslada': { lat: 40.4236, lng: -3.5614 },

            // Lleida province
            'Lleida': { lat: 41.6176, lng: 0.6200 },
            'Naut Aran': { lat: 42.7000, lng: 0.8000 },
            'Baqueira': { lat: 42.7000, lng: 0.9500 },
            'Pla de l\'Ermita': { lat: 42.6833, lng: 0.8500 },
            'Beret': { lat: 42.7167, lng: 0.9333 },
            'Castell-llebre': { lat: 42.1333, lng: 1.0000 },

            // Basque Country
            'Donostia/San Sebastián': { lat: 43.3183, lng: -1.9812 },
            'Vitoria-Gasteiz': { lat: 42.8467, lng: -2.6716 },

            // Galicia
            'Vigo': { lat: 42.2406, lng: -8.7207 },
            'Santiago de Compostela': { lat: 42.8782, lng: -8.5448 },
            'A Coruña': { lat: 43.3623, lng: -8.4115 },
            'Sanxenxo': { lat: 42.4000, lng: -8.8000 },

            // Andalucía
            'Roquetas de Mar': { lat: 36.7639, lng: -2.6147 },
            'Almería': { lat: 36.8340, lng: -2.4637 },
            'Andalucía': { lat: 37.0000, lng: -4.0000 },
            'El Puerto de Santa María': { lat: 36.5933, lng: -6.2317 },
            'Cádiz': { lat: 36.5271, lng: -6.2886 },
            'San Roque': { lat: 36.2108, lng: -5.3833 },
            'Chipiona': { lat: 36.7375, lng: -6.4400 },
            'Jerez de la Frontera': { lat: 36.6850, lng: -6.1261 },
            'Sotogrande': { lat: 36.2833, lng: -5.2833 },
            'La Alcaidesa': { lat: 36.3000, lng: -5.2667 },
            'Chiclana de la Frontera': { lat: 36.4194, lng: -6.1500 },
            'Aguadulce': { lat: 36.8167, lng: -2.5500 },
            'Córdoba': { lat: 37.8882, lng: -4.7794 },
            'Sierra Nevada': { lat: 37.0956, lng: -3.3961 },
            'La Herradura': { lat: 36.7333, lng: -3.7333 },
            'Almuñécar': { lat: 36.7333, lng: -3.6900 },

            // Other regions
            'Salamanca': { lat: 40.9701, lng: -5.6635 },
            'Burgos': { lat: 42.3440, lng: -3.6969 },
            'Miranda de Ebro': { lat: 42.6867, lng: -2.9472 },
            'Toledo': { lat: 39.8628, lng: -4.0273 },
            'Pamplona/Iruña': { lat: 42.8125, lng: -1.6458 },
            'Haro': { lat: 42.5767, lng: -2.8500 },
            'Logroño': { lat: 42.4650, lng: -2.4456 },
            'Santander': { lat: 43.4623, lng: -3.8099 },
            'Noja': { lat: 43.4833, lng: -3.5167 },
            'Gijón': { lat: 43.5322, lng: -5.6611 },
            'Oviedo': { lat: 43.3619, lng: -5.8494 },
            'Cáceres': { lat: 39.4753, lng: -6.3724 },
            'Badajoz': { lat: 38.8794, lng: -6.9706 },
            'Valladolid': { lat: 41.6523, lng: -4.7245 },
            'Olmedo': { lat: 41.2967, lng: -4.6850 },
            'Teruel': { lat: 40.3456, lng: -1.1065 },
            'Segovia': { lat: 40.9429, lng: -4.1088 },
            'Guadalajara': { lat: 40.6337, lng: -3.1674 },
            'Huelva': { lat: 37.2614, lng: -6.9447 },
            'Huesca': { lat: 42.1401, lng: -0.4089 },
            'Fraga': { lat: 41.5208, lng: 0.3500 },
            'Dos Hermanas': { lat: 37.2833, lng: -5.9200 },
            'Bormujos': { lat: 37.3667, lng: -6.0667 },
            'Orpesa': { lat: 40.1000, lng: 0.1333 },
            'Castellón de la Plana': { lat: 39.9864, lng: -0.0513 },
            'Peníscola/Peñíscola': { lat: 40.3567, lng: 0.4086 },
            'Oliva': { lat: 38.9194, lng: -0.1208 },
            'Cullera': { lat: 39.1667, lng: -0.2500 },
            'Manises': { lat: 39.4917, lng: -0.4614 },

            // Murcia
            'La Manga': { lat: 37.6333, lng: -0.7167 },
            'Cartagena': { lat: 37.6257, lng: -0.9966 },
            'Puerto de Mazarrón': { lat: 37.5667, lng: -1.2500 },
            'Fuente Álamo de Murcia': { lat: 37.7167, lng: -1.1667 },
            'Alcázares, Los': { lat: 37.7500, lng: -0.8500 },
            'Alhama de Murcia': { lat: 37.8500, lng: -1.4333 },

            // Andorra
            'Soldeu': { lat: 42.5775, lng: 1.6675 },
            'Canillo': { lat: 42.5676, lng: 1.5977 }
        };

        if (knownCities[cityName]) {
            this.cityCoordinates[key] = knownCities[cityName];
            return knownCities[cityName];
        }

        // Try to get from region coordinates with consistent offset based on city name
        const regionCoords = this.getRegionCoordinates(regionName, 'Spain');
        if (regionCoords) {
            // Use hash of name for consistent positioning instead of random
            const hash = cityName.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
            const coords = {
                lat: regionCoords.lat + ((hash % 100) / 100 - 0.5) * 0.3,
                lng: regionCoords.lng + (((hash >> 8) % 100) / 100 - 0.5) * 0.3
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
