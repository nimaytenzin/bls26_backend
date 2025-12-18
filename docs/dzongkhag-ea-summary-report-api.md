# Dzongkhag EA Summary Report API Documentation

## Overview

The Dzongkhag EA Summary Report provides a comprehensive view of a single dzongkhag with its complete administrative hierarchy (Gewogs → Chiwogs → Enumeration Areas). The report includes geographic boundaries for map visualization and is available in JSON, GeoJSON (for maps), PDF, and Excel formats.

**Note:** This report focuses only on **Gewogs** and **Chiwogs** (excludes Thromdes and LAPs).

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Structures](#data-structures)
3. [Request Examples](#request-examples)
4. [Response Examples](#response-examples)
5. [Map Visualization](#map-visualization)
6. [Error Handling](#error-handling)
7. [Frontend Implementation Guide](#frontend-implementation-guide)

---

## API Endpoints

### 1. Get Report Data (JSON)

**Endpoint:** `GET /reports/dzongkhag-ea-summary/:dzongkhagId/data`

**Access:** Public  
**Authentication:** Not required

**Path Parameters:**
- `dzongkhagId` (number, required): The ID of the dzongkhag to generate the report for

**Description:** Returns complete hierarchical report data as JSON, including all gewogs, chiwogs, and enumeration areas with their geometries.

**Response:** `DzongkhagEaSummaryResponse` (see [Data Structures](#data-structures))

---

### 2. Get Map Data (GeoJSON)

**Endpoint:** `GET /reports/dzongkhag-ea-summary/:dzongkhagId/map`

**Access:** Public  
**Authentication:** Not required

**Path Parameters:**
- `dzongkhagId` (number, required): The ID of the dzongkhag

**Description:** Returns all boundaries as a single GeoJSON FeatureCollection optimized for map rendering. Includes dzongkhag, gewog, and enumeration area boundaries with layer information.

**Response:** `MapFeatureCollection` (see [Data Structures](#data-structures))

---

### 3. Generate PDF Report

**Endpoint:** `GET /reports/dzongkhag-ea-summary/:dzongkhagId/pdf`

**Access:** Public  
**Authentication:** Not required

**Path Parameters:**
- `dzongkhagId` (number, required): The ID of the dzongkhag

**Query Parameters:**
- `download` (optional): Set to `true` to force download instead of inline display (default: inline)

**Description:** Generates and returns a PDF report with map visualization, summary tables, and detailed enumeration area listings.

**Response Headers:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="dzongkhag-ea-summary-{dzongkhagName}-{timestamp}.pdf"` (if download=true)
- `Content-Disposition: inline; filename="dzongkhag-ea-summary-{dzongkhagName}-{timestamp}.pdf"` (if download not set)

**Response:** PDF file (binary)

---

### 4. Generate Excel Report

**Endpoint:** `GET /reports/dzongkhag-ea-summary/:dzongkhagId/excel`

**Access:** Public  
**Authentication:** Not required

**Path Parameters:**
- `dzongkhagId` (number, required): The ID of the dzongkhag

**Description:** Generates and returns an Excel workbook (.xlsx) with multiple sheets containing summary, hierarchy, and detailed EA data.

**Response Headers:**
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="dzongkhag-ea-summary-{dzongkhagName}-{timestamp}.xlsx"`

**Response:** Excel file (binary)

---

## Data Structures

### DzongkhagEaSummaryResponse

```typescript
interface DzongkhagEaSummaryResponse {
  generatedAt: string;              // ISO timestamp
  dzongkhag: DzongkhagReportData;
  summary: DzongkhagSummary;
  gewogs: GewogReportData[];
}
```

### DzongkhagReportData

```typescript
interface DzongkhagReportData {
  id: number;
  name: string;
  code: string;
  geometry: GeoJSONFeature;          // Required for map
}
```

### DzongkhagSummary

```typescript
interface DzongkhagSummary {
  totalGewogs: number;
  totalChiwogs: number;
  totalEAs: number;
  totalHouseholds?: number;          // Optional
  totalPopulation?: number;           // Optional
}
```

### GewogReportData

```typescript
interface GewogReportData {
  id: number;
  name: string;
  code: string;
  geometry: GeoJSONFeature;          // Required for map
  summary: {
    totalChiwogs: number;
    totalEAs: number;
  };
  chiwogs: ChiwogReportData[];
}
```

### ChiwogReportData

```typescript
interface ChiwogReportData {
  id: number;
  name: string;
  code: string;
  geometry?: GeoJSONFeature;         // Optional
  summary: {
    totalEAs: number;
  };
  enumerationAreas: EnumerationAreaReportData[];
}
```

### EnumerationAreaReportData

```typescript
interface EnumerationAreaReportData {
  id: number;
  name: string;
  code: string;
  geometry: GeoJSONFeature;          // Required for map
  totalHouseholds?: number;          // Optional
  totalPopulation?: number;           // Optional
}
```

### GeoJSONFeature

```typescript
interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties?: {
    id?: number;
    name?: string;
    [key: string]: any;
  };
}
```

### MapFeatureCollection

```typescript
interface MapFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][];
    };
    properties: {
      layer: 'dzongkhag' | 'gewog' | 'enumerationArea';
      id: number;
      name: string;
      code: string;
      dzongkhagId?: number;
      gewogId?: number;
      chiwogId?: number;
    };
  }>;
}
```

---

## Request Examples

### Get JSON Data

**cURL:**
```bash
curl "http://localhost:3000/reports/dzongkhag-ea-summary/1/data"
```

**JavaScript:**
```javascript
const response = await fetch('/reports/dzongkhag-ea-summary/1/data');
const data = await response.json();
console.log(data);
```

**Response Time:** Typically 2-8 seconds depending on data volume

---

### Get Map Data (GeoJSON)

**cURL:**
```bash
curl "http://localhost:3000/reports/dzongkhag-ea-summary/1/map"
```

**JavaScript:**
```javascript
const response = await fetch('/reports/dzongkhag-ea-summary/1/map');
const geoJson = await response.json();

// Use with Leaflet or other mapping library
L.geoJSON(geoJson).addTo(map);
```

---

### Generate PDF Report

**cURL (Inline Display):**
```bash
curl "http://localhost:3000/reports/dzongkhag-ea-summary/1/pdf" \
  --output report.pdf
```

**cURL (Force Download):**
```bash
curl "http://localhost:3000/reports/dzongkhag-ea-summary/1/pdf?download=true" \
  --output report.pdf
```

**JavaScript:**
```javascript
// Inline display
const response = await fetch('/reports/dzongkhag-ea-summary/1/pdf');
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
window.open(url);

// Force download
const response = await fetch('/reports/dzongkhag-ea-summary/1/pdf?download=true');
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'dzongkhag-ea-summary.pdf';
a.click();
```

---

### Generate Excel Report

**cURL:**
```bash
curl "http://localhost:3000/reports/dzongkhag-ea-summary/1/excel" \
  --output report.xlsx
```

**JavaScript:**
```javascript
const response = await fetch('/reports/dzongkhag-ea-summary/1/excel');
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'dzongkhag-ea-summary.xlsx';
a.click();
```

---

## Response Examples

### JSON Response Example

```json
{
  "generatedAt": "2024-12-18T10:30:00.000Z",
  "dzongkhag": {
    "id": 1,
    "name": "Thimphu",
    "code": "01",
    "geometry": {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[89.5, 27.3], [89.6, 27.3], ...]]
      },
      "properties": {
        "id": 1,
        "name": "Thimphu"
      }
    }
  },
  "summary": {
    "totalGewogs": 8,
    "totalChiwogs": 45,
    "totalEAs": 120
  },
  "gewogs": [
    {
      "id": 1,
      "name": "Chang",
      "code": "01-01",
      "geometry": {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[89.5, 27.3], ...]]
        }
      },
      "summary": {
        "totalChiwogs": 5,
        "totalEAs": 15
      },
      "chiwogs": [
        {
          "id": 1,
          "name": "Chang Chiwog 1",
          "code": "01-01-01",
          "summary": {
            "totalEAs": 3
          },
          "enumerationAreas": [
            {
              "id": 101,
              "name": "EA 001",
              "code": "01-01-01-01",
              "geometry": {
                "type": "Feature",
                "geometry": {
                  "type": "Polygon",
                  "coordinates": [[[89.5, 27.3], ...]]
                }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### Map Data (GeoJSON) Response Example

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[89.5, 27.3], ...]]
      },
      "properties": {
        "layer": "dzongkhag",
        "id": 1,
        "name": "Thimphu",
        "code": "01"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[89.5, 27.3], ...]]
      },
      "properties": {
        "layer": "gewog",
        "id": 1,
        "name": "Chang",
        "code": "01-01",
        "dzongkhagId": 1
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[89.5, 27.3], ...]]
      },
      "properties": {
        "layer": "enumerationArea",
        "id": 101,
        "name": "EA 001",
        "code": "01-01-01-01",
        "dzongkhagId": 1,
        "gewogId": 1,
        "chiwogId": 1
      }
    }
  ]
}
```

---

## Map Visualization

### Using Leaflet.js

The map endpoint returns a GeoJSON FeatureCollection that can be directly used with Leaflet.js:

```javascript
import L from 'leaflet';

// Fetch map data
const response = await fetch('/reports/dzongkhag-ea-summary/1/map');
const geoJson = await response.json();

// Create map
const map = L.map('map').setView([27.5, 90.5], 8);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Style function based on layer type
function styleFeature(feature) {
  const layer = feature.properties.layer;
  
  if (layer === 'dzongkhag') {
    return {
      color: '#3498db',
      weight: 3,
      fillColor: '#3498db',
      fillOpacity: 0.3
    };
  } else if (layer === 'gewog') {
    return {
      color: '#2ecc71',
      weight: 2,
      fillColor: '#2ecc71',
      fillOpacity: 0.3
    };
  } else {
    return {
      color: '#e74c3c',
      weight: 1,
      fillColor: '#e74c3c',
      fillOpacity: 0.2
    };
  }
}

// Add GeoJSON layer
L.geoJSON(geoJson, {
  style: styleFeature,
  onEachFeature: function(feature, layer) {
    const props = feature.properties;
    const popupContent = `
      <div>
        <strong>${props.name}</strong><br>
        Code: ${props.code}<br>
        Type: ${props.layer}
      </div>
    `;
    layer.bindPopup(popupContent);
  }
}).addTo(map);

// Fit map to bounds
map.fitBounds(L.geoJSON(geoJson).getBounds());
```

### Layer Types

- **`dzongkhag`**: Dzongkhag boundary (single feature, thick border)
- **`gewog`**: All gewog boundaries (medium border)
- **`enumerationArea`**: All EA boundaries (thin border)

### Styling Recommendations

- **Dzongkhag**: Blue (#3498db), weight 3, fill opacity 0.3
- **Gewog**: Green (#2ecc71), weight 2, fill opacity 0.3
- **Enumeration Area**: Red (#e74c3c), weight 1, fill opacity 0.2

---

## Error Handling

### Common Error Responses

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Dzongkhag with ID 999 not found",
  "error": "Not Found"
}
```

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "Failed to generate PDF: [error details]"
}
```

### Error Handling Best Practices

1. **Check Response Status:**
   ```javascript
   const response = await fetch('/reports/dzongkhag-ea-summary/1/data');
   if (!response.ok) {
     if (response.status === 404) {
       throw new Error('Dzongkhag not found');
     }
     throw new Error(`HTTP error! status: ${response.status}`);
   }
   ```

2. **Handle Missing Geometries:**
   ```javascript
   // Some features may not have geometry
   if (feature.geometry) {
     // Add to map
   } else {
     console.warn(`Feature ${feature.properties.name} has no geometry`);
   }
   ```

3. **Timeout Handling:**
   ```javascript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
   
   try {
     const response = await fetch('/reports/dzongkhag-ea-summary/1/data', {
       signal: controller.signal
     });
     clearTimeout(timeoutId);
   } catch (error) {
     if (error.name === 'AbortError') {
       console.error('Request timeout');
     }
   }
   ```

---

## Frontend Implementation Guide

### React Component Example

```typescript
import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DzongkhagEaSummaryReportProps {
  dzongkhagId: number;
}

function DzongkhagEaSummaryReport({ dzongkhagId }: DzongkhagEaSummaryReportProps) {
  const [reportData, setReportData] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReportData();
    loadMapData();
  }, [dzongkhagId]);

  const loadReportData = async () => {
    try {
      const response = await fetch(`/reports/dzongkhag-ea-summary/${dzongkhagId}/data`);
      if (!response.ok) throw new Error('Failed to load report data');
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMapData = async () => {
    try {
      const response = await fetch(`/reports/dzongkhag-ea-summary/${dzongkhagId}/map`);
      if (!response.ok) throw new Error('Failed to load map data');
      const geoJson = await response.json();
      setMapData(geoJson);
    } catch (err) {
      console.error('Failed to load map data:', err);
    }
  };

  const handleExportPDF = () => {
    window.open(`/reports/dzongkhag-ea-summary/${dzongkhagId}/pdf?download=true`);
  };

  const handleExportExcel = () => {
    window.open(`/reports/dzongkhag-ea-summary/${dzongkhagId}/excel`);
  };

  if (loading) return <div>Loading report...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!reportData) return <div>No data available</div>;

  return (
    <div>
      <h1>Dzongkhag EA Summary Report</h1>
      <div>
        <button onClick={handleExportPDF}>Export PDF</button>
        <button onClick={handleExportExcel}>Export Excel</button>
      </div>
      
      <div>
        <h2>{reportData.dzongkhag.name} ({reportData.dzongkhag.code})</h2>
        <p>Total Gewogs: {reportData.summary.totalGewogs}</p>
        <p>Total Chiwogs: {reportData.summary.totalChiwogs}</p>
        <p>Total EAs: {reportData.summary.totalEAs}</p>
      </div>

      {/* Map Component */}
      {mapData && <MapComponent geoJson={mapData} />}

      {/* Gewog List */}
      <div>
        <h3>Gewogs</h3>
        {reportData.gewogs.map(gewog => (
          <div key={gewog.id}>
            <h4>{gewog.name} ({gewog.code})</h4>
            <p>Chiwogs: {gewog.summary.totalChiwogs}, EAs: {gewog.summary.totalEAs}</p>
            {/* Render chiwogs and EAs */}
          </div>
        ))}
      </div>
    </div>
  );
}

// Map Component
function MapComponent({ geoJson }) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([27.5, 90.5], 8);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add GeoJSON
    const geoJsonLayer = L.geoJSON(geoJson, {
      style: (feature) => {
        const layer = feature.properties.layer;
        if (layer === 'dzongkhag') {
          return { color: '#3498db', weight: 3, fillOpacity: 0.3 };
        } else if (layer === 'gewog') {
          return { color: '#2ecc71', weight: 2, fillOpacity: 0.3 };
        } else {
          return { color: '#e74c3c', weight: 1, fillOpacity: 0.2 };
        }
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindPopup(`<strong>${props.name}</strong><br>Code: ${props.code}`);
      }
    }).addTo(map);

    // Fit bounds
    map.fitBounds(geoJsonLayer.getBounds());

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geoJson]);

  return <div ref={mapRef} style={{ height: '500px', width: '100%' }} />;
}

export default DzongkhagEaSummaryReport;
```

### Vue.js Component Example

```vue
<template>
  <div>
    <h1>Dzongkhag EA Summary Report</h1>
    <button @click="exportPDF">Export PDF</button>
    <button @click="exportExcel">Export Excel</button>
    
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else-if="reportData">
      <h2>{{ reportData.dzongkhag.name }} ({{ reportData.dzongkhag.code }})</h2>
      <p>Total Gewogs: {{ reportData.summary.totalGewogs }}</p>
      <p>Total Chiwogs: {{ reportData.summary.totalChiwogs }}</p>
      <p>Total EAs: {{ reportData.summary.totalEAs }}</p>
      
      <div id="map" style="height: 500px; width: 100%;"></div>
      
      <div v-for="gewog in reportData.gewogs" :key="gewog.id">
        <h3>{{ gewog.name }} ({{ gewog.code }})</h3>
        <!-- Render chiwogs and EAs -->
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default {
  props: {
    dzongkhagId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      reportData: null,
      mapData: null,
      loading: true,
      error: null,
      map: null
    };
  },
  async mounted() {
    await this.loadReportData();
    await this.loadMapData();
    this.initMap();
  },
  methods: {
    async loadReportData() {
      try {
        const response = await fetch(`/reports/dzongkhag-ea-summary/${this.dzongkhagId}/data`);
        if (!response.ok) throw new Error('Failed to load report data');
        this.reportData = await response.json();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    async loadMapData() {
      try {
        const response = await fetch(`/reports/dzongkhag-ea-summary/${this.dzongkhagId}/map`);
        if (!response.ok) throw new Error('Failed to load map data');
        this.mapData = await response.json();
      } catch (error) {
        console.error('Failed to load map data:', error);
      }
    },
    initMap() {
      if (!this.mapData) return;
      
      this.map = L.map('map').setView([27.5, 90.5], 8);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
      
      L.geoJSON(this.mapData, {
        style: (feature) => {
          const layer = feature.properties.layer;
          if (layer === 'dzongkhag') {
            return { color: '#3498db', weight: 3, fillOpacity: 0.3 };
          } else if (layer === 'gewog') {
            return { color: '#2ecc71', weight: 2, fillOpacity: 0.3 };
          } else {
            return { color: '#e74c3c', weight: 1, fillOpacity: 0.2 };
          }
        }
      }).addTo(this.map);
    },
    exportPDF() {
      window.open(`/reports/dzongkhag-ea-summary/${this.dzongkhagId}/pdf?download=true`);
    },
    exportExcel() {
      window.open(`/reports/dzongkhag-ea-summary/${this.dzongkhagId}/excel`);
    }
  },
  beforeUnmount() {
    if (this.map) {
      this.map.remove();
    }
  }
};
</script>
```

---

## Performance Considerations

### Data Volume
- Reports include **only active enumeration areas** (`isActive = true`)
- Only **Gewogs** and **Chiwogs** are included (Thromdes and LAPs excluded)
- Large dzongkhags may take 5-15 seconds to generate
- PDF generation is typically faster than Excel for very large datasets

### Optimization Tips
1. **Caching:** Consider caching report data for frequently accessed dzongkhags
2. **Lazy Loading:** Load map data separately from report data
3. **Geometry Simplification:** For very large datasets, consider simplifying geometries
4. **Pagination:** For EA lists, consider implementing pagination (future enhancement)

### Database Queries
The service uses optimized queries with:
- Single query per level (dzongkhag, gewogs, chiwogs, EAs)
- Proper JOIN operations to avoid N+1 query problems
- Filtering at database level (only Gewogs, only Chiwogs, only active EAs)
- Geometry conversion using ST_AsGeoJSON for efficient GeoJSON generation

---

## Notes

### Data Accuracy
- Reports reflect the current state of the database at generation time
- Only active enumeration areas are included
- Historical/inactive EAs are excluded
- Only Gewogs are included (Thromdes excluded)
- Only Chiwogs are included (LAPs excluded)

### File Naming
- PDF files: `dzongkhag-ea-summary-{dzongkhagName}-{YYYY-MM-DDTHH-MM-SS}.pdf`
- Excel files: `dzongkhag-ea-summary-{dzongkhagName}-{YYYY-MM-DDTHH-MM-SS}.xlsx`
- Timestamp format: ISO 8601 without colons (filesystem-safe)

### Coordinate System
- All geometries are in **WGS84 (EPSG:4326)**
- GeoJSON format follows RFC 7946 specification

---

## Support

For questions or issues related to the Dzongkhag EA Summary Report API, please contact the development team or refer to the main API documentation.

