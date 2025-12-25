# EA Annual Statistics GeoJSON API Documentation

## Overview

The EA Annual Statistics GeoJSON API provides Enumeration Area (EA) boundaries combined with annual demographic statistics in GeoJSON format. This endpoint is perfect for map visualization, choropleth maps, and geographic data analysis at the EA level.

**Key Features:**
- Returns GeoJSON FeatureCollection with EA boundaries and statistics
- Includes current year statistics by default
- Filters EAs by Sub-Administrative Zone (SAZ)
- Provides comprehensive demographic metrics and calculated ratios
- Includes hierarchical parent information (SAZ → Administrative Zone → Dzongkhag)

## Table of Contents

1. [API Endpoint](#api-endpoint)
2. [Data Structures](#data-structures)
3. [Request Examples](#request-examples)
4. [Response Examples](#response-examples)
5. [Map Visualization](#map-visualization)
6. [Error Handling](#error-handling)
7. [Use Cases](#use-cases)

---

## API Endpoint

### Get EA Stats by Sub-Administrative Zone as GeoJSON

**Endpoint:** `GET /ea-annual-stats/all/geojson&stats/current&bysubadministrativezone/:subAdministrativeZoneId`

**Access:** Public  
**Authentication:** Not required

**Path Parameters:**
- `subAdministrativeZoneId` (number, required): The ID of the Sub-Administrative Zone (SAZ) to filter EAs by

**Description:** Returns all Enumeration Areas within the specified Sub-Administrative Zone with their geographic boundaries and current year annual statistics embedded in the GeoJSON properties.

**Response:** `EABySubAdministrativeZoneGeoJsonResponse` (GeoJSON FeatureCollection)

---

## Data Structures

### EAStatsProperties

Properties embedded in each GeoJSON Feature:

```typescript
interface EAStatsProperties {
  // Basic EA information
  id: number;
  name: string;
  areaCode: string;
  description: string;

  // Parent references
  subAdministrativeZoneId: number | null;
  subAdministrativeZoneName: string | null;
  subAdministrativeZoneType: 'chiwog' | 'lap' | null;
  administrativeZoneId: number;
  administrativeZoneName: string;
  administrativeZoneType: 'Gewog' | 'Thromde';
  dzongkhagId: number;
  dzongkhagName: string;

  // Statistics year
  year: number;

  // Household statistics
  totalHouseholds: number;

  // Population statistics
  totalPopulation: number;
  totalMale: number;
  totalFemale: number;

  // Calculated metrics
  averageHouseholdSize: number; // Total population / total households
  genderRatio: number; // Males per 100 females
  malePercentage: number;
  femalePercentage: number;

  // Additional metadata
  hasData: boolean; // Whether statistics exist for this year
  lastUpdated: string; // ISO timestamp
}
```

### SubAdministrativeZoneEASummary

Summary statistics aggregated at the SAZ level:

```typescript
interface SubAdministrativeZoneEASummary {
  subAdministrativeZoneId: number;
  subAdministrativeZoneName: string;
  subAdministrativeZoneType: 'chiwog' | 'lap' | null;
  administrativeZoneId: number;
  administrativeZoneName: string;
  administrativeZoneType: 'Gewog' | 'Thromde';
  dzongkhagId: number;
  dzongkhagName: string;
  year: number;
  totalEAs: number;
  totalPopulation: number;
  totalHouseholds: number;
  totalMale: number;
  totalFemale: number;
}
```

### EABySubAdministrativeZoneGeoJsonResponse

Complete response structure:

```typescript
interface EABySubAdministrativeZoneGeoJsonResponse {
  type: 'FeatureCollection';
  metadata: {
    year: number;
    subAdministrativeZoneId: number;
    subAdministrativeZoneName: string;
    subAdministrativeZoneType: 'chiwog' | 'lap' | null;
    administrativeZoneId: number;
    administrativeZoneName: string;
    administrativeZoneType: 'Gewog' | 'Thromde';
    dzongkhagId: number;
    dzongkhagName: string;
    generatedAt: string;
    summary: SubAdministrativeZoneEASummary;
  };
  features: EAStatsFeature[];
}
```

---

## Request Examples

### Basic Request

```bash
GET /ea-annual-stats/all/geojson&stats/current&bysubadministrativezone/1
```

### Using cURL

```bash
curl -X GET \
  'http://localhost:3000/ea-annual-stats/all/geojson&stats/current&bysubadministrativezone/1' \
  -H 'Accept: application/json'
```

### Using JavaScript (Fetch API)

```javascript
const response = await fetch(
  'http://localhost:3000/ea-annual-stats/all/geojson&stats/current&bysubadministrativezone/1'
);
const geoJsonData = await response.json();
```

### Using Axios

```javascript
const { data } = await axios.get(
  'http://localhost:3000/ea-annual-stats/all/geojson&stats/current&bysubadministrativezone/1'
);
```

---

## Response Examples

### Success Response (200 OK)

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "year": 2024,
    "subAdministrativeZoneId": 1,
    "subAdministrativeZoneName": "Chiwog A",
    "subAdministrativeZoneType": "chiwog",
    "administrativeZoneId": 5,
    "administrativeZoneName": "Gewog X",
    "administrativeZoneType": "Gewog",
    "dzongkhagId": 2,
    "dzongkhagName": "Thimphu",
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "summary": {
      "subAdministrativeZoneId": 1,
      "subAdministrativeZoneName": "Chiwog A",
      "subAdministrativeZoneType": "chiwog",
      "administrativeZoneId": 5,
      "administrativeZoneName": "Gewog X",
      "administrativeZoneType": "Gewog",
      "dzongkhagId": 2,
      "dzongkhagName": "Thimphu",
      "year": 2024,
      "totalEAs": 3,
      "totalPopulation": 1250,
      "totalHouseholds": 280,
      "totalMale": 620,
      "totalFemale": 630
    }
  },
  "features": [
    {
      "type": "Feature",
      "id": 10,
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [89.5, 27.3],
              [89.6, 27.3],
              [89.6, 27.4],
              [89.5, 27.4],
              [89.5, 27.3]
            ]
          ]
        ]
      },
      "properties": {
        "id": 10,
        "name": "EA-001",
        "areaCode": "EA001",
        "description": "Enumeration Area 001",
        "subAdministrativeZoneId": 1,
        "subAdministrativeZoneName": "Chiwog A",
        "subAdministrativeZoneType": "chiwog",
        "administrativeZoneId": 5,
        "administrativeZoneName": "Gewog X",
        "administrativeZoneType": "Gewog",
        "dzongkhagId": 2,
        "dzongkhagName": "Thimphu",
        "year": 2024,
        "totalHouseholds": 95,
        "totalPopulation": 420,
        "totalMale": 210,
        "totalFemale": 210,
        "averageHouseholdSize": 4.42,
        "genderRatio": 100.0,
        "malePercentage": 50.0,
        "femalePercentage": 50.0,
        "hasData": true,
        "lastUpdated": "2024-01-15T08:00:00.000Z"
      }
    }
    // ... more features
  ]
}
```

### Error Response (404 Not Found)

```json
{
  "statusCode": 404,
  "message": "No Enumeration Areas found for Sub-Administrative Zone ID 999",
  "error": "Not Found"
}
```

### Error Response (404 - SAZ Not Found)

```json
{
  "statusCode": 404,
  "message": "Sub-Administrative Zone with ID 999 not found",
  "error": "Not Found"
}
```
