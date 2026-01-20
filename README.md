# 📊 Dashboard Salarial Interactivo 2025
## Sector Turístico-Hostelero España

Dashboard web interactivo completo para análisis salarial del sector turístico-hostelero en España basado en 10.134 ofertas de empleo.

---

## 🚀 Características

### ✅ Implementado (Nivel 3 Completo)

- **Navegación Sticky**: Barra de navegación fija con links a todas las secciones
- **6+ Gráficos Interactivos** (Chart.js):
  - Distribución salarial general (percentiles)
  - Top 20 posiciones por volumen
  - Top 15 posiciones mejor pagadas
  - Top 20 regiones por mediana
  - Top 15 ciudades por mediana
  - Análisis por tipo de empresa (31 sectores)
  - Análisis por área funcional (23 áreas)

- **Tablas Interactivas**:
  - Todas las posiciones (123) con sorting y búsqueda
  - Todas las regiones (76) con filtros
  - Todos los sectores (31) ordenados
  - Hover effects y estilos responsivos

- **Mapa de Calor Regional**: Top 30 regiones con codificación por colores basada en medianas

- **Explorador de Datos**:
  - Filtros dinámicos: Posición + Región
  - Resultados en tiempo real
  - Comparativas automáticas (vs nacional, vs regional)
  - Top 5 regiones para cada posición
  - Top 5 posiciones para cada región

- **Career Pathways Visualizados**:
  - 3 rutas de carrera completas (Cocina, Sala, Management)
  - Incrementos salariales por nivel
  - Brechas críticas identificadas
  - Insights de progresión profesional

- **Diseño Avanzado**:
  - CSS moderno con gradientes y sombras
  - Animaciones suaves (fade-in, slide-up, hover effects)
  - Totalmente responsive (mobile, tablet, desktop)
  - Paleta de colores corporativa

---

## 📁 Estructura del Proyecto

```
Web-Reporte-Salarial-España-2025/
│
├── index.html              # Página principal
│
├── css/
│   └── styles.css          # Estilos completos (variables, animaciones, responsive)
│
├── js/
│   ├── data-loader.js      # Carga y parseo de CSVs (PapaParse)
│   ├── charts.js           # Gráficos interactivos (Chart.js)
│   ├── tables.js           # Tablas con sorting/filtering
│   ├── explorer.js         # Explorador de datos con filtros
│   └── main.js             # Orquestador principal
│
├── data/
│   ├── 01_by_title.csv     # 123 posiciones
│   ├── 02_by_country.csv   # Solo Spain
│   ├── 03_by_region.csv    # 76 regiones
│   ├── 04_by_city.csv      # 294 ciudades
│   ├── 05_by_country_title.csv
│   ├── 06_by_region_title.csv  # 519 combos región+posición
│   ├── 07_by_city_title.csv    # 449 combos ciudad+posición
│   ├── 08_by_field.csv     # 31 tipos de empresa
│   ├── 09_by_area.csv      # 23 áreas funcionales
│   └── 10_best_paid_titles.csv # Ranking completo por mediana
│
├── assets/                 # (Opcional) Imágenes, logos
│
└── README.md               # Este archivo
```

---

## 🖥️ Cómo Usar

### Opción 1: Servidor Local (Recomendado)

**IMPORTANTE:** Los navegadores modernos bloquean la carga de archivos CSV locales por seguridad (CORS policy). Debes ejecutar un servidor web local.

#### Usando Python:

```bash
# En la carpeta del proyecto, ejecuta:
cd "C:\Users\munozm02\OneDrive - The Stepstone Group\Documentos\Reporte Salarial 2025\Web-Reporte-Salarial-España-2025"

# Python 3.x:
python -m http.server 8000

# Luego abre en tu navegador:
# http://localhost:8000
```

#### Usando Node.js (http-server):

```bash
# Instalar globalmente (solo una vez):
npm install -g http-server

# Ejecutar en la carpeta del proyecto:
cd "C:\Users\munozm02\OneDrive - The Stepstone Group\Documentos\Reporte Salarial 2025\Web-Reporte-Salarial-España-2025"
http-server -p 8000

# Abrir: http://localhost:8000
```

#### Usando VSCode Live Server:

1. Instala la extensión "Live Server" en VSCode
2. Abre la carpeta del proyecto en VSCode
3. Click derecho en `index.html` → "Open with Live Server"

### Opción 2: Subir a un Servidor Web

Si tienes acceso a un servidor web corporativo:

1. Sube toda la carpeta al servidor
2. Asegúrate de que los archivos CSV estén accesibles
3. Abre `index.html` desde el navegador

---

## 🔧 Dependencias

Todas las librerías se cargan desde CDN (no requiere instalación):

- **Chart.js** v4.4.1 - Gráficos interactivos
- **PapaParse** v5.4.1 - Parser de CSV en JavaScript

No se requiere `npm install` ni build process.

---

## 📊 Datos Fuente

- **Dataset:** Salary report 2025 V7 - Solo Spain.json
- **Total registros:** 20.130 ofertas
- **Filtradas (usables):** 10.134 ofertas
- **Criterios:** `IsSalaryUsable=1 AND IsJobTitleUsable=1 AND IsOutlier=0`
- **Período:** 2025
- **Geografía:** Solo España

---

## 🎯 Secciones del Dashboard

### 1. Resumen Ejecutivo
- Métricas clave (mediana, total ofertas, IQR, prima regional)
- Gráfico de distribución salarial
- Hallazgos clave destacados

### 2. Análisis de Posiciones
- Top 20 posiciones por volumen (gráfico)
- Top 15 mejor pagadas (gráfico)
- Tabla completa de 123 posiciones con search y sorting

### 3. Análisis Geográfico
- Top 20 regiones (gráfico con heat colors)
- Top 15 ciudades (gráfico)
- Mapa de calor: Top 30 regiones
- Tabla completa de regiones con % vs nacional

### 4. Análisis por Sector y Área
- Medianas por tipo de empresa (31 sectores)
- Medianas por área funcional (23 áreas)
- Tablas completas ordenadas

### 5. Explorador de Datos Interactivo
- Filtro: Posición + Región
- Resultados dinámicos con comparativas
- Top 5 rankings contextuales

### 6. Career Pathways
- 3 rutas de carrera visualizadas:
  - 🍳 Cocina: Kitchen Assistant → Executive Chef
  - 🍽️ Sala: Waiter Assistant → F&B Manager
  - 🏨 Management: Receptionist → COO
- Incrementos salariales por nivel
- Brechas críticas identificadas

### 7. Recomendaciones Estratégicas
- Para empleadores
- Para profesionales
- Para analistas

---

## 🎨 Personalización

### Cambiar Colores

Edita las variables CSS en `css/styles.css` (líneas 1-15):

```css
:root {
    --primary: #1a3a52;        /* Azul oscuro */
    --secondary: #4a90a4;      /* Azul claro */
    --accent: #e74c3c;         /* Rojo */
    --success: #27ae60;        /* Verde */
    /* ... más colores ... */
}
```

### Agregar Nuevos Gráficos

En `js/charts.js`, agrega un nuevo método:

```javascript
createMyNewChart(data) {
    const ctx = document.getElementById('myChart');
    this.charts.myChart = new Chart(ctx, {
        // Configuración del gráfico
    });
}
```

Y llámalo desde `createAll()`.

### Agregar Nuevas Secciones

1. Agrega el HTML en `index.html`
2. Agrega estilos en `css/styles.css`
3. Agrega funcionalidad en el JS correspondiente
4. Actualiza la navegación

---

## 📱 Responsive Design

El dashboard está optimizado para:

- **Desktop:** 1920px+ (diseño completo)
- **Laptop:** 1024px-1920px (adaptado)
- **Tablet:** 768px-1024px (simplificado)
- **Mobile:** <768px (vertical, navegación colapsada)

---

## 🐛 Troubleshooting

### Error: "Failed to load CSV"

**Causa:** CORS policy - navegador bloqueando archivos locales

**Solución:** Ejecuta un servidor web local (ver arriba)

### Error: "Chart.js is not defined"

**Causa:** CDN no cargó o no hay conexión a internet

**Solución:**
- Verifica conexión a internet
- O descarga Chart.js localmente y actualiza el `<script>`

### Gráficos no se muestran

**Causa:** Datos no cargados o formato incorrecto en CSV

**Solución:**
- Abre la consola del navegador (F12)
- Revisa errores en la carga de datos
- Verifica que todos los CSVs estén en `data/`

### Tablas vacías

**Causa:** Parsing de CSV falló (formato europeo vs americano)

**Solución:** Revisa el método `parseNumber()` en `data-loader.js` (línea 54)

---

## 🚀 Mejoras Futuras Posibles

- [ ] Exportar datos filtrados a Excel/PDF
- [ ] Comparador lado a lado (2 posiciones/regiones)
- [ ] Gráfico de scatter: Volumen vs Mediana
- [ ] Mapa interactivo de España con SVG
- [ ] Filtro por rango de salario (slider)
- [ ] Histórico temporal (si se agregan datos de años anteriores)
- [ ] Dark mode toggle
- [ ] Guardar filtros en localStorage
- [ ] Compartir URLs con filtros pre-aplicados

---

## 📄 Licencia y Uso

**Confidencial para uso interno**

© 2026 Informe Salarial Turístico-Hostelero España

---

## 📧 Soporte

Para consultas o problemas, contactar al equipo de analytics.

---

## 🎉 ¡Listo!

El dashboard está 100% funcional con todas las características del Nivel 3:

✅ Gráficos interactivos (6+)
✅ Tablas con sorting/filtering
✅ Explorador de datos dinámico
✅ Career pathways visualizados
✅ Mapa de calor regional
✅ Diseño responsive y moderno
✅ Animaciones y transiciones suaves

**Disfruta explorando los datos!** 📊🚀
