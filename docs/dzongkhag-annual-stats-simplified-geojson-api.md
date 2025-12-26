# Dzongkhag Annual Statistics GeoJSON API Documentation

## Overview

The Dzongkhag Annual Statistics GeoJSON API provides Dzongkhag boundaries combined with essential annual statistics in a lightweight GeoJSON format. This endpoint is optimized for map visualization and contains only the most essential fields: EA counts, household counts, and population statistics.

**Key Features:**
- Returns GeoJSON FeatureCollection with Dzongkhag boundaries and essential statistics
- Includes current year statistics by default
- Lightweight response with only essential fields
- Perfect for fast map rendering and choropleth visualizations
- Includes national summary statistics

**Base URL:** `/dzongkhag-annual-stats`

---

## API Endpoint

### Get Dzongkhag Stats as GeoJSON

**Endpoint:** `GET /dzongkhag-annual-stats/all/geojson&Stats`

**Access:** Public  
**Authentication:** Not required

**Query Parameters:**
- `year` (number, optional): Statistical year (defaults to current year)
  - Minimum: 2000
  - Example: `?year=2024`

**Description:** Returns all Dzongkhags with their geographic boundaries and annual statistics embedded in the GeoJSON properties. Includes only essential fields: EA counts, household counts, and population statistics.

**Response:** `DzongkhagStatsSimplifiedGeoJsonResponse` (GeoJSON FeatureCollection)

---

## Data Structures

### DzongkhagStatsSimplifiedProperties

Properties embedded in each GeoJSON Feature:

```typescript
interface DzongkhagStatsSimplifiedProperties {
  // Basic Dzongkhag information
  id: number;                    // Dzongkhag ID
  name: string;                  // Dzongkhag name
  areaCode: string;              // Dzongkhag area code

  // Statistics year
  year: number;                  // Statistical year

  // Enumeration Area counts
  totalEA: number;                // Total enumeration areas
  urbanEA: number;                // Urban enumeration areas
  ruralEA: number;                // Rural enumeration areas

  // Household counts
  totalHousehold: number;         // Total households
  urbanHousehold: number;         // Urban households
  ruralHousehold: number;         // Rural households

  // Population statistics
  totalPopulation: number;        // Total population
  urbanPopulation: number;        // Urban population
  ruralPopulation: number;        // Rural population

  // Metadata
  hasData: boolean;               // Whether statistics exist for this year
  lastUpdated: string;            // ISO timestamp of last update
}
```

### DzongkhagStatsSimplifiedNationalSummary

National summary statistics aggregated across all Dzongkhags:

```typescript
interface DzongkhagStatsSimplifiedNationalSummary {
  totalEA: number;                // Total enumeration areas (national)
  urbanEA: number;                // Urban enumeration areas (national)
  ruralEA: number;                // Rural enumeration areas (national)
  totalHousehold: number;         // Total households (national)
  urbanHousehold: number;         // Urban households (national)
  ruralHousehold: number;         // Rural households (national)
  totalPopulation: number;        // Total population (national)
  urbanPopulation: number;        // Urban population (national)
  ruralPopulation: number;        // Rural population (national)
}
```

### DzongkhagStatsSimplifiedGeoJsonResponse

Complete response structure:

```typescript
interface DzongkhagStatsSimplifiedGeoJsonResponse {
  type: 'FeatureCollection';
  metadata: {
    year: number;                 // Statistical year
    totalDzongkhags: number;      // Total number of Dzongkhags
    generatedAt: string;           // ISO timestamp of response generation
    nationalSummary: DzongkhagStatsSimplifiedNationalSummary;
  };
  features: DzongkhagStatsSimplifiedFeature[];
}
```

### DzongkhagStatsSimplifiedFeature

Individual GeoJSON Feature:

```typescript
interface DzongkhagStatsSimplifiedFeature {
  type: 'Feature';
  id: number;                     // Dzongkhag ID
  geometry: {
    type: 'MultiPolygon';
    coordinates: number[][][][];  // GeoJSON MultiPolygon coordinates
  };
  properties: DzongkhagStatsSimplifiedProperties;
}
```

---

## Request Examples

### Get Current Year Statistics

```bash
GET /dzongkhag-annual-stats/all/geojson&Stats
```

### Get Specific Year Statistics

```bash
GET /dzongkhag-annual-stats/all/geojson&Stats?year=2024
```

### Using cURL

```bash
# Current year
curl -X GET "https://api.example.com/dzongkhag-annual-stats/all/geojson&Stats"

# Specific year
curl -X GET "https://api.example.com/dzongkhag-annual-stats/all/geojson&Stats?year=2024"
```

### Using JavaScript/TypeScript

```typescript
// Fetch current year statistics
const response = await fetch('/dzongkhag-annual-stats/all/geojson&Stats');
const data = await response.json();

// Fetch specific year statistics
const response2024 = await fetch('/dzongkhag-annual-stats/all/geojson&Stats?year=2024');
const data2024 = await response2024.json();
```

---

## Response Examples

### Success Response (200 OK)

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "year": 2024,
    "totalDzongkhags": 20,
    "generatedAt": "2024-12-26T06:30:00.000Z",
    "nationalSummary": {
      "totalEA": 3310,
      "urbanEA": 1464,
      "ruralEA": 1846,
      "totalHousehold": 125000,
      "urbanHousehold": 55000,
      "ruralHousehold": 70000,
      "totalPopulation": 750000,
      "urbanPopulation": 330000,
      "ruralPopulation": 420000
    }
  },
  "features": [
    {
      "type": "Feature",
      "id": 1,
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [[[[89.5, 27.0], [89.6, 27.0], [89.6, 27.1], [89.5, 27.1], [89.5, 27.0]]]]
      },
      "properties": {
        "id": 1,
        "name": "Thimphu",
        "areaCode": "TH",
        "year": 2024,
        "totalEA": 250,
        "urbanEA": 180,
        "ruralEA": 70,
        "totalHousehold": 15000,
        "urbanHousehold": 12000,
        "ruralHousehold": 3000,
        "totalPopulation": 120000,
        "urbanPopulation": 100000,
        "ruralPopulation": 20000,
        "hasData": true,
        "lastUpdated": "2024-12-25T10:00:00.000Z"
      }
    },
    {
      "type": "Feature",
      "id": 2,
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [[[[90.0, 27.2], [90.1, 27.2], [90.1, 27.3], [90.0, 27.3], [90.0, 27.2]]]]
      },
      "properties": {
        "id": 2,
        "name": "Paro",
        "areaCode": "PA",
        "year": 2024,
        "totalEA": 150,
        "urbanEA": 50,
        "ruralEA": 100,
        "totalHousehold": 8000,
        "urbanHousehold": 3000,
        "ruralHousehold": 5000,
        "totalPopulation": 45000,
        "urbanPopulation": 18000,
        "ruralPopulation": 27000,
        "hasData": true,
        "lastUpdated": "2024-12-25T10:00:00.000Z"
      }
    }
  ]
}
```

### Response with No Data

When a Dzongkhag has no statistics for the requested year:

```json
{
  "type": "Feature",
  "id": 3,
  "geometry": { ... },
  "properties": {
    "id": 3,
    "name": "Punakha",
    "areaCode": "PU",
    "year": 2024,
    "totalEA": 0,
    "urbanEA": 0,
    "ruralEA": 0,
    "totalHousehold": 0,
    "urbanHousehold": 0,
    "ruralHousehold": 0,
    "totalPopulation": 0,
    "urbanPopulation": 0,
    "ruralPopulation": 0,
    "hasData": false,
    "lastUpdated": "2024-12-26T06:30:00.000Z"
  }
}
```

---

## Field Descriptions

### Enumeration Area (EA) Counts

- **totalEA**: Total number of enumeration areas in the Dzongkhag
- **urbanEA**: Number of urban enumeration areas (typically in Thromdes)
- **ruralEA**: Number of rural enumeration areas (typically in Gewogs)

### Household Counts

- **totalHousehold**: Total number of households in the Dzongkhag
- **urbanHousehold**: Number of households in urban areas
- **ruralHousehold**: Number of households in rural areas

### Population Statistics

- **totalPopulation**: Total population (sum of male and female)
- **urbanPopulation**: Total urban population (sum of urban male and female)
- **ruralPopulation**: Total rural population (sum of rural male and female)

### Metadata

- **hasData**: Boolean indicating whether statistics exist for the requested year
- **lastUpdated**: ISO timestamp of when the statistics were last updated

---

## Map Visualization

### Using Leaflet

```javascript
// Fetch GeoJSON data
const response = await fetch('/dzongkhag-annual-stats/all/geojson&Stats?year=2024');
const geojson = await response.json();

// Create choropleth map based on total population
L.geoJSON(geojson, {
  style: function(feature) {
    const population = feature.properties.totalPopulation;
    return {
      fillColor: getColor(population),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  },
  onEachFeature: function(feature, layer) {
    const props = feature.properties;
    layer.bindPopup(`
      <strong>${props.name}</strong><br>
      Total EA: ${props.totalEA}<br>
      Total Households: ${props.totalHousehold}<br>
      Total Population: ${props.totalPopulation}
    `);
  }
}).addTo(map);
```

### Using Mapbox GL JS

```javascript
// Fetch GeoJSON data
const response = await fetch('/dzongkhag-annual-stats/all/geojson&Stats?year=2024');
const geojson = await response.json();

// Add source
map.addSource('dzongkhag-stats', {
  type: 'geojson',
  data: geojson
});

// Add layer with choropleth styling
map.addLayer({
  id: 'dzongkhag-fill',
  type: 'fill',
  source: 'dzongkhag-stats',
  paint: {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'totalPopulation'],
      0, '#f7f7f7',
      50000, '#fee5d9',
      100000, '#fcae91',
      150000, '#fb6a4a',
      200000, '#de2d26',
      250000, '#a50f15'
    ],
    'fill-opacity': 0.7
  }
});

// Add click handler
map.on('click', 'dzongkhag-fill', (e) => {
  const props = e.features[0].properties;
  new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(`
      <strong>${props.name}</strong><br>
      Total EA: ${props.totalEA}<br>
      Total Households: ${props.totalHousehold}<br>
      Total Population: ${props.totalPopulation}
    `)
    .addTo(map);
});
```

---

## Error Handling

### 400 Bad Request

Invalid year parameter:

```json
{
  "statusCode": 400,
  "message": ["year must be a number conforming to the specified constraints"],
  "error": "Bad Request"
}
```

### 500 Internal Server Error

Database or server error:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Use Cases

1. **Choropleth Maps**: Visualize population distribution, household counts, or EA counts across Dzongkhags
2. **Dashboard Widgets**: Display national summary statistics
3. **Data Analysis**: Quick access to essential statistics without loading full detailed data
4. **Mobile Applications**: Lightweight response ideal for mobile data constraints
5. **Real-time Visualizations**: Fast rendering for interactive maps

---

## Performance Considerations

- **Response Size**: Lightweight response optimized for fast map rendering
- **Caching**: Consider caching responses as statistics are updated periodically
- **Year Parameter**: Always specify year if known to avoid default year calculation overhead

---

## Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/dzongkhag-annual-stats/all/geojson&Stats` | GET | Get Dzongkhag statistics as GeoJSON | No |

**Key Benefits:**
- Lightweight response with only essential fields
- Fast map rendering
- Perfect for choropleth visualizations
- Includes national summary statistics
- Easy to parse and use in frontend applications

