/**
 * Applications Insights Calculator
 *
 * DELIVERY PERSPECTIVE: Higher median = better candidate delivery = positive outcome
 *
 * INSIGHT REGISTRY - Only these 6 insights are allowed:
 *
 * INSIGHT_01: Delivery Index (ID = SegmentMedian / GlobalMedian)
 * INSIGHT_02: High Delivery (ID > 1.4) - Excellent candidate delivery
 * INSIGHT_03: Low Delivery (SegmentMedian < P25) - Area needs attention
 * INSIGHT_04: Opportunity Segment (Low Median AND High N) - Growth potential
 * INSIGHT_05: Geographic Gap ((GeoMedian - CountryMedian) / CountryMedian)
 * INSIGHT_06: Ranking Position (Rank by SegmentMedian)
 */

class InsightsCalculator {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.THRESHOLDS = {
            HIGH_COMPETITION_IC: 1.4,
            LOW_ATTRACTION_PERCENTILE: 0.25,
            OPPORTUNITY_MEDIAN_FACTOR: 0.7,  // Below 70% of global median
            OPPORTUNITY_MIN_N: 50,           // High N threshold
            SIGNIFICANT_GAP: 0.15            // 15% difference considered significant
        };
    }

    /**
     * Generate all applicable insights for a segment
     * @param {Object} segment - The segment data (title, region, city, etc.)
     * @param {Object} context - Context data (parentMedian, globalMetrics, etc.)
     * @returns {Array} Array of insight objects
     */
    generateInsights(segment, context = {}) {
        const insights = [];
        const globalMetrics = this.dataLoader.data.globalMetrics;

        if (!segment || !globalMetrics) return insights;

        // INSIGHT_01: Competition Index (Always shown)
        const competitionIndex = this.calculateCompetitionIndex(segment, context);
        if (competitionIndex) {
            insights.push(competitionIndex);
        }

        // INSIGHT_02: High Competition (conditional)
        const highCompetition = this.checkHighCompetition(segment, context);
        if (highCompetition) {
            insights.push(highCompetition);
        }

        // INSIGHT_03: Low Attraction (conditional)
        const lowAttraction = this.checkLowAttraction(segment, context);
        if (lowAttraction) {
            insights.push(lowAttraction);
        }

        // INSIGHT_04: Opportunity Segment (conditional)
        const opportunitySegment = this.checkOpportunitySegment(segment, context);
        if (opportunitySegment) {
            insights.push(opportunitySegment);
        }

        // INSIGHT_05: Geographic Gap (only for geographic segments)
        if (context.parentMedian !== undefined) {
            const geographicGap = this.calculateGeographicGap(segment, context);
            if (geographicGap) {
                insights.push(geographicGap);
            }
        }

        // INSIGHT_06: Ranking Position (if ranking data provided)
        if (context.rank !== undefined && context.totalInRanking !== undefined) {
            const ranking = this.calculateRanking(segment, context);
            if (ranking) {
                insights.push(ranking);
            }
        }

        return insights;
    }

    /**
     * INSIGHT_01: Delivery Index
     * ID = SegmentMedian / GlobalMedian
     * High value = excellent candidate delivery (green)
     * Low value = needs attention (red)
     */
    calculateCompetitionIndex(segment, context) {
        const globalMedian = context.referenceMedian || this.dataLoader.data.globalMetrics.globalMedian;

        if (!globalMedian || globalMedian === 0) return null;

        const id = segment.median / globalMedian;
        const percentageDiff = ((segment.median - globalMedian) / globalMedian) * 100;

        let level, levelClass, explanation;

        // Delivery perspective: higher is better (green), lower needs attention (red)
        if (id >= 1.4) {
            level = 'Excelente';
            levelClass = 'success';
            explanation = `El delivery de candidatos es ${Math.abs(percentageDiff).toFixed(0)}% superior a la media. Excelente capacidad de atracción.`;
        } else if (id >= 1.1) {
            level = 'Bueno';
            levelClass = 'good';
            explanation = `El delivery de candidatos es ${Math.abs(percentageDiff).toFixed(0)}% superior a la media del mercado.`;
        } else if (id >= 0.9) {
            level = 'Promedio';
            levelClass = 'neutral';
            explanation = `El delivery de candidatos está en línea con la media del mercado.`;
        } else if (id >= 0.7) {
            level = 'Bajo';
            levelClass = 'warning';
            explanation = `El delivery de candidatos es ${Math.abs(percentageDiff).toFixed(0)}% inferior a la media. Posible área de mejora.`;
        } else {
            level = 'Crítico';
            levelClass = 'danger';
            explanation = `El delivery de candidatos es ${Math.abs(percentageDiff).toFixed(0)}% inferior a la media. Requiere atención urgente.`;
        }

        return {
            id: 'INSIGHT_01',
            type: 'delivery_index',
            title: 'Índice de Delivery',
            value: id.toFixed(2),
            level,
            levelClass,
            explanation,
            details: {
                segmentMedian: segment.median,
                globalMedian: globalMedian,
                percentageDiff: percentageDiff.toFixed(1)
            },
            priority: 1 // Always shown first
        };
    }

    /**
     * INSIGHT_02: High Delivery (Excellent Performance)
     * Triggered when ID > 1.4
     */
    checkHighCompetition(segment, context) {
        const globalMedian = context.referenceMedian || this.dataLoader.data.globalMetrics.globalMedian;

        if (!globalMedian || globalMedian === 0) return null;

        const id = segment.median / globalMedian;

        if (id <= this.THRESHOLDS.HIGH_COMPETITION_IC) return null;

        const percentageAbove = ((id - 1) * 100).toFixed(0);

        return {
            id: 'INSIGHT_02',
            type: 'high_delivery',
            title: 'Alto Delivery',
            value: `+${percentageAbove}%`,
            level: 'Destacado',
            levelClass: 'success',
            explanation: `Este segmento entrega ${percentageAbove}% más candidatos por oferta que la media. Excelente capacidad de atracción de talento.`,
            details: {
                id: id.toFixed(2),
                threshold: this.THRESHOLDS.HIGH_COMPETITION_IC
            },
            priority: 2,
            icon: '🌟'
        };
    }

    /**
     * INSIGHT_03: Low Delivery (Needs Attention)
     * Triggered when SegmentMedian < P25 of the market
     */
    checkLowAttraction(segment, context) {
        const p25 = context.p25 || this.dataLoader.data.globalMetrics.p25;

        if (!p25 || segment.median >= p25) return null;

        const percentageBelow = (((p25 - segment.median) / p25) * 100).toFixed(0);

        return {
            id: 'INSIGHT_03',
            type: 'low_delivery',
            title: 'Bajo Delivery',
            value: `-${percentageBelow}%`,
            level: 'Atención',
            levelClass: 'danger',
            explanation: `Este segmento entrega ${percentageBelow}% menos candidatos que el percentil 25 del mercado. Área que requiere atención para mejorar la atracción de talento.`,
            details: {
                segmentMedian: segment.median,
                p25: p25
            },
            priority: 3,
            icon: '⚠️'
        };
    }

    /**
     * INSIGHT_04: Growth Opportunity Segment
     * Low Median AND High N (many offers with low delivery - potential for improvement)
     */
    checkOpportunitySegment(segment, context) {
        const globalMedian = context.referenceMedian || this.dataLoader.data.globalMetrics.globalMedian;
        const medianThreshold = globalMedian * this.THRESHOLDS.OPPORTUNITY_MEDIAN_FACTOR;
        const nThreshold = context.nThreshold || this.THRESHOLDS.OPPORTUNITY_MIN_N;

        if (segment.median >= medianThreshold || segment.n < nThreshold) return null;

        const percentageBelowMedian = (((globalMedian - segment.median) / globalMedian) * 100).toFixed(0);

        return {
            id: 'INSIGHT_04',
            type: 'growth_opportunity',
            title: 'Oportunidad de Crecimiento',
            value: `${segment.n} ofertas`,
            level: 'Potencial',
            levelClass: 'warning',
            explanation: `Con ${segment.n} ofertas y ${percentageBelowMedian}% menos delivery que la media, este segmento tiene potencial de mejora en atracción de candidatos.`,
            details: {
                n: segment.n,
                median: segment.median,
                globalMedian: globalMedian,
                percentageBelowMedian
            },
            priority: 4,
            icon: '📈'
        };
    }

    /**
     * INSIGHT_05: Geographic Gap
     * (GeoMedian - CountryMedian) / CountryMedian
     * Delivery perspective: higher = better delivery
     */
    calculateGeographicGap(segment, context) {
        const parentMedian = context.parentMedian;
        const parentName = context.parentName || 'nivel superior';

        if (!parentMedian || parentMedian === 0) return null;

        const gap = ((segment.median - parentMedian) / parentMedian) * 100;
        const absGap = Math.abs(gap);

        // Only show if gap is significant
        if (absGap < this.THRESHOLDS.SIGNIFICANT_GAP * 100) return null;

        let level, levelClass, explanation;

        // Delivery perspective: higher is better (green), lower needs attention (red/warning)
        if (gap > 0) {
            level = 'Superior';
            levelClass = 'success';
            explanation = `El delivery aquí es ${absGap.toFixed(0)}% superior a ${parentName}. Excelente capacidad de atracción local.`;
        } else {
            level = 'Inferior';
            levelClass = 'warning';
            explanation = `El delivery aquí es ${absGap.toFixed(0)}% inferior a ${parentName}. Área geográfica con potencial de mejora.`;
        }

        return {
            id: 'INSIGHT_05',
            type: 'geographic_gap',
            title: 'Brecha Geográfica',
            value: `${gap > 0 ? '+' : ''}${gap.toFixed(0)}%`,
            level,
            levelClass,
            explanation,
            details: {
                segmentMedian: segment.median,
                parentMedian: parentMedian,
                gap: gap.toFixed(1),
                parentName
            },
            priority: 5,
            icon: '📍'
        };
    }

    /**
     * INSIGHT_06: Ranking Position
     * Delivery perspective: higher rank = better delivery performance
     */
    calculateRanking(segment, context) {
        const { rank, totalInRanking, rankingType } = context;

        if (rank === undefined || totalInRanking === undefined) return null;

        const percentile = ((totalInRanking - rank + 1) / totalInRanking) * 100;
        let level, levelClass, explanation;

        // Delivery perspective: top positions = best delivery (green)
        if (rank <= 3) {
            level = 'Top 3';
            levelClass = 'success';
            explanation = `Este segmento está entre los 3 con mejor delivery de candidatos. Excelente rendimiento.`;
        } else if (rank <= 10) {
            level = 'Top 10';
            levelClass = 'good';
            explanation = `Este segmento está entre los 10 con mejor delivery del mercado.`;
        } else if (percentile >= 75) {
            level = 'Alto Delivery';
            levelClass = 'good';
            explanation = `Este segmento está en el cuartil superior de delivery de candidatos.`;
        } else if (percentile >= 50) {
            level = 'Delivery Medio';
            levelClass = 'neutral';
            explanation = `Este segmento tiene un nivel de delivery medio.`;
        } else if (percentile >= 25) {
            level = 'Delivery Moderado';
            levelClass = 'warning';
            explanation = `Este segmento tiene delivery por debajo de la media. Posible área de mejora.`;
        } else {
            level = 'Bajo Delivery';
            levelClass = 'danger';
            explanation = `Este segmento está entre los de menor delivery del mercado. Requiere atención.`;
        }

        return {
            id: 'INSIGHT_06',
            type: 'ranking_position',
            title: 'Posición en Ranking',
            value: `#${rank} de ${totalInRanking}`,
            level,
            levelClass,
            explanation,
            details: {
                rank,
                totalInRanking,
                percentile: percentile.toFixed(0),
                rankingType: rankingType || 'general'
            },
            priority: 6,
            icon: '🏆'
        };
    }

    /**
     * Generate insights for a job title
     */
    generateTitleInsights(titleId) {
        const title = this.dataLoader.getTitleById(titleId);
        if (!title) return [];

        // Calculate ranking
        const allTitles = [...this.dataLoader.data.titles].sort((a, b) => b.median - a.median);
        const rank = allTitles.findIndex(t => t.id === titleId) + 1;

        return this.generateInsights(title, {
            rank,
            totalInRanking: allTitles.length,
            rankingType: 'puestos de trabajo',
            p25: this.dataLoader.data.globalMetrics.p25
        });
    }

    /**
     * Generate insights for a region
     */
    generateRegionInsights(regionId, countryId = null) {
        const region = this.dataLoader.getRegionById(regionId);
        if (!region) return [];

        // Get country median for geographic gap
        let parentMedian = this.dataLoader.data.globalMetrics.globalMedian;
        let parentName = 'la media global';

        if (countryId) {
            const country = this.dataLoader.getCountryById(countryId);
            if (country) {
                parentMedian = country.median;
                parentName = country.name;
            }
        }

        // Calculate ranking
        const allRegions = [...this.dataLoader.data.regions].sort((a, b) => b.median - a.median);
        const rank = allRegions.findIndex(r => r.id === regionId) + 1;

        return this.generateInsights(region, {
            parentMedian,
            parentName,
            rank,
            totalInRanking: allRegions.length,
            rankingType: 'regiones',
            p25: this.dataLoader.data.globalMetrics.p25
        });
    }

    /**
     * Generate insights for a city
     */
    generateCityInsights(cityId) {
        const city = this.dataLoader.getCityById(cityId);
        if (!city) return [];

        // Get region median for geographic gap
        const region = this.dataLoader.getRegionById(city.regionId);
        const parentMedian = region ? region.median : this.dataLoader.data.globalMetrics.globalMedian;
        const parentName = region ? region.name : 'la media global';

        // Calculate ranking within region
        const citiesInRegion = this.dataLoader.getCitiesForRegion(city.regionId);
        const sortedCities = [...citiesInRegion].sort((a, b) => b.median - a.median);
        const rank = sortedCities.findIndex(c => c.id === cityId) + 1;

        return this.generateInsights(city, {
            parentMedian,
            parentName,
            rank,
            totalInRanking: sortedCities.length,
            rankingType: `ciudades en ${parentName}`,
            p25: this.dataLoader.data.globalMetrics.p25
        });
    }

    /**
     * Generate insights for a title in a specific location
     */
    generateTitleLocationInsights(titleId, locationData, locationType) {
        if (!locationData) return [];

        // Get the title's global median as reference
        const titleGlobal = this.dataLoader.getTitleById(titleId);
        const referenceMedian = titleGlobal ? titleGlobal.median : this.dataLoader.data.globalMetrics.globalMedian;
        const parentName = titleGlobal ? `${titleGlobal.name} a nivel global` : 'la media global';

        // Calculate ranking within this title across locations
        let allLocations;
        if (locationType === 'region') {
            allLocations = this.dataLoader.data.titleRegion.filter(tr => tr.titleId === titleId);
        } else if (locationType === 'city') {
            allLocations = this.dataLoader.data.titleCity.filter(tc => tc.titleId === titleId);
        } else {
            allLocations = this.dataLoader.data.titleCountry.filter(tc => tc.titleId === titleId);
        }

        const sortedLocations = [...allLocations].sort((a, b) => b.median - a.median);
        const rank = sortedLocations.findIndex(l =>
            (locationType === 'region' && l.regionId === locationData.regionId) ||
            (locationType === 'city' && l.cityId === locationData.cityId) ||
            (locationType === 'country' && l.countryId === locationData.countryId)
        ) + 1;

        return this.generateInsights(locationData, {
            parentMedian: referenceMedian,
            parentName,
            referenceMedian,
            rank,
            totalInRanking: sortedLocations.length,
            rankingType: `ubicaciones para ${titleGlobal?.name || 'este puesto'}`,
            p25: this.dataLoader.data.globalMetrics.p25
        });
    }

    /**
     * Generate comparison insights between two segments
     * @param {Object} segment1 - First segment to compare
     * @param {Object} segment2 - Second segment to compare
     * @param {string} segmentType - Type of segments being compared (title, country, region, city, field)
     */
    generateComparisonInsights(segment1, segment2, segmentType = 'title') {
        const insights = [];

        if (!segment1 || !segment2) return insights;

        // Get segment type labels for better messaging
        const typeLabels = {
            title: 'puesto',
            country: 'país',
            region: 'región',
            city: 'ciudad',
            field: 'sector'
        };
        const typeLabel = typeLabels[segmentType] || 'segmento';

        const medianDiff = segment1.median - segment2.median;
        const percentDiff = segment2.median !== 0 ? ((medianDiff) / segment2.median) * 100 : 0;

        // Delivery perspective: higher median = better delivery = positive (green)
        insights.push({
            id: 'COMPARISON_DELIVERY',
            type: 'comparison',
            title: 'Diferencia en Delivery',
            value: `${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(0)}%`,
            levelClass: percentDiff > 0 ? 'success' : 'warning',
            explanation: percentDiff > 0
                ? `${segment1.name} entrega ${Math.abs(percentDiff).toFixed(0)}% más candidatos por oferta que ${segment2.name}. Mejor capacidad de delivery.`
                : `${segment1.name} entrega ${Math.abs(percentDiff).toFixed(0)}% menos candidatos por oferta que ${segment2.name}. Menor capacidad de delivery.`,
            details: {
                segment1Median: segment1.median,
                segment2Median: segment2.median,
                difference: medianDiff.toFixed(1)
            },
            icon: '📦'
        });

        // Compare volume (N) - number of offers
        const nDiff = segment1.n - segment2.n;
        const nPercentDiff = segment2.n !== 0 ? ((nDiff) / segment2.n) * 100 : 0;

        insights.push({
            id: 'COMPARISON_VOLUME',
            type: 'comparison',
            title: 'Diferencia de Volumen',
            value: `${nPercentDiff > 0 ? '+' : ''}${nPercentDiff.toFixed(0)}%`,
            levelClass: 'neutral',
            explanation: nPercentDiff > 0
                ? `${segment1.name} tiene ${Math.abs(nPercentDiff).toFixed(0)}% más ofertas que ${segment2.name}. Mayor demanda laboral.`
                : `${segment1.name} tiene ${Math.abs(nPercentDiff).toFixed(0)}% menos ofertas que ${segment2.name}. Menor demanda laboral.`,
            details: {
                segment1N: segment1.n,
                segment2N: segment2.n,
                difference: nDiff
            },
            icon: '📋'
        });

        // Global context insight
        const globalMedian = this.dataLoader.data.globalMetrics?.globalMedian || 30;
        const ic1 = segment1.median / globalMedian;
        const ic2 = segment2.median / globalMedian;

        let contextExplanation;
        if (ic1 >= 1.0 && ic2 >= 1.0) {
            contextExplanation = `Ambos ${typeLabel}s tienen buen delivery de candidatos respecto a la media global.`;
        } else if (ic1 < 1.0 && ic2 < 1.0) {
            contextExplanation = `Ambos ${typeLabel}s tienen delivery de candidatos por debajo de la media global. Posibles áreas de mejora.`;
        } else if (ic1 >= 1.0) {
            contextExplanation = `${segment1.name} tiene buen delivery mientras que ${segment2.name} está por debajo de la media global.`;
        } else {
            contextExplanation = `${segment2.name} tiene buen delivery mientras que ${segment1.name} está por debajo de la media global.`;
        }

        insights.push({
            id: 'COMPARISON_CONTEXT',
            type: 'comparison',
            title: 'Contexto Global',
            value: `IC: ${ic1.toFixed(2)} vs ${ic2.toFixed(2)}`,
            levelClass: 'neutral',
            explanation: contextExplanation,
            details: {
                ic1: ic1.toFixed(2),
                ic2: ic2.toFixed(2),
                globalMedian
            },
            icon: '🌍'
        });

        return insights;
    }

    /**
     * Format an insight for display (HTML)
     */
    formatInsightHTML(insight) {
        const iconMap = {
            'delivery_index': '📊',
            'high_delivery': '🌟',
            'low_delivery': '⚠️',
            'growth_opportunity': '📈',
            'geographic_gap': '📍',
            'ranking_position': '🏆',
            'comparison': '⚖️'
        };

        const icon = insight.icon || iconMap[insight.type] || '📌';

        return `
            <div class="insight-card insight-${insight.levelClass}">
                <div class="insight-header">
                    <span class="insight-icon">${icon}</span>
                    <span class="insight-title">${insight.title}</span>
                </div>
                <div class="insight-value">${insight.value}</div>
                <div class="insight-level badge-${insight.levelClass}">${insight.level || ''}</div>
                <p class="insight-explanation">${insight.explanation}</p>
            </div>
        `;
    }

    /**
     * Generate summary text for a set of insights
     */
    generateSummaryText(insights) {
        if (!insights || insights.length === 0) return '';

        const summaryParts = [];

        const competitionInsight = insights.find(i => i.id === 'INSIGHT_01');
        if (competitionInsight) {
            summaryParts.push(`Competencia ${competitionInsight.level.toLowerCase()} (IC: ${competitionInsight.value})`);
        }

        const highCompInsight = insights.find(i => i.id === 'INSIGHT_02');
        if (highCompInsight) {
            summaryParts.push('mercado saturado');
        }

        const opportunityInsight = insights.find(i => i.id === 'INSIGHT_04');
        if (opportunityInsight) {
            summaryParts.push('segmento oportunidad');
        }

        return summaryParts.join(' | ');
    }
}

// Create global instance (will be initialized after data loader)
window.insightsCalculator = null;
