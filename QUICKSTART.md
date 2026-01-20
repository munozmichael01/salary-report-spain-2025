# 🚀 INICIO RÁPIDO - Dashboard Salarial 2025

## ⚡ Inicio en 3 Pasos

### 1️⃣ Abrir Terminal en la Carpeta del Proyecto

```bash
cd "C:\Users\munozm02\OneDrive - The Stepstone Group\Documentos\Reporte Salarial 2025\Web-Reporte-Salarial-España-2025"
```

### 2️⃣ Iniciar Servidor Web

**Opción A - Python (más común):**
```bash
python -m http.server 8000
```

**Opción B - Doble click en el archivo:**
```
START.bat
```

### 3️⃣ Abrir en Navegador

```
http://localhost:8000
```

---

## ✅ ¿Qué Incluye el Dashboard?

### 📊 **6+ Gráficos Interactivos**
- Distribución salarial (percentiles)
- Top 20 posiciones por volumen
- Top 15 mejor pagadas
- Top 20 regiones
- Top 15 ciudades
- Análisis por sector (31 tipos)
- Análisis por área funcional (23 áreas)

### 📋 **Tablas Interactivas**
- 123 posiciones con search/sorting
- 76 regiones con filtros
- 31 sectores ordenados
- Todas con hover effects

### 🗺️ **Mapa de Calor**
- Top 30 regiones codificadas por color según mediana

### 🔍 **Explorador de Datos**
- Filtro dinámico: Posición + Región
- Comparativas automáticas (vs nacional/regional)
- Top 5 rankings contextuales

### 🎯 **Career Pathways**
- 3 rutas completas visualizadas
- Incrementos salariales por nivel
- Brechas críticas identificadas

### 🎨 **Diseño Moderno**
- Animaciones suaves
- Totalmente responsive
- Navegación sticky
- Paleta corporativa

---

## 🎯 Navegación del Dashboard

| Sección | Contenido |
|---------|-----------|
| **Resumen** | Métricas clave + distribución general |
| **Posiciones** | Gráficos + tabla completa (123) |
| **Geografía** | Regiones + ciudades + heatmap |
| **Sectores** | 31 tipos empresa + 23 áreas |
| **Explorador** | Filtros dinámicos + comparativas |
| **Career Path** | 3 rutas de carrera visualizadas |

---

## 📊 Datos Clave

- **10.134 ofertas** analizadas
- **123 posiciones** únicas
- **76 regiones** de España
- **294 ciudades** con datos
- **31 tipos** de empresa
- **23 áreas** funcionales

**Mediana sectorial:** €20.000
**Rango IQR:** €16.000–€24.000
**Prima regional máxima:** +10% (Baleares)

---

## 🐛 Si Algo No Funciona

### Error CORS / CSV no carga
→ **Solución:** Debes usar un servidor web (no file://)
→ Ejecuta `python -m http.server 8000`

### Gráficos vacíos
→ **Solución:** Verifica conexión a internet (Chart.js CDN)
→ O descarga Chart.js localmente

### Tablas vacías
→ **Solución:** Revisa consola del navegador (F12)
→ Verifica que todos los CSVs estén en `data/`

---

## 📱 Compatibilidad

✅ Chrome 90+
✅ Firefox 88+
✅ Edge 90+
✅ Safari 14+

✅ Desktop
✅ Tablet
✅ Mobile

---

## 🎨 Capturas de Pantalla (Conceptual)

```
┌─────────────────────────────────────────────┐
│  📊 Dashboard Salarial 2025                 │
│  [Resumen][Posiciones][Geografía][...]     │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                  │
│  │20K│ │10K│ │16K│ │+10%│  ← Métricas    │
│  └───┘ └───┘ └───┘ └───┘                  │
│                                             │
│  ┌─────────────────────────┐               │
│  │   Gráfico Distribución  │               │
│  │   [====================] │               │
│  └─────────────────────────┘               │
│                                             │
│  🎯 Hallazgos Clave:                       │
│  • Brecha liderazgo: +50%                  │
│  • Concentración: Baleares + Barcelona    │
│  • Dispersión por rol: ±40%               │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🚀 Para Empezar Ahora

1. Doble click en **START.bat**
2. Espera que abra tu navegador
3. ¡Explora los datos!

**O manualmente:**
```bash
python -m http.server 8000
```

Luego visita: **http://localhost:8000**

---

## 📄 Más Información

Ver **README.md** para:
- Estructura completa del proyecto
- Personalización de colores/gráficos
- Troubleshooting detallado
- Mejoras futuras posibles

---

**¡Disfruta del dashboard!** 🎉📊
