# Buildings API Documentation

This document describes the API endpoint for retrieving buildings as GeoJSON by enumeration area ID(s).

## Overview

The Buildings API provides endpoints to retrieve building geometries and properties as GeoJSON FeatureCollections. Buildings can be queried by one or more enumeration area IDs.

## Authentication

All endpoints are **public** (no authentication required).

---

## Endpoints

### Get Buildings by Enumeration Area ID(s)

Retrieves all buildings within one or more enumeration areas as a GeoJSON FeatureCollection.

**Endpoint:** `GET /buildings/by-enumeration-area/:enumerationAreaId`

**URL Parameters:**
- `enumerationAreaId` (string, required) - Single enumeration area ID or comma-separated list of IDs
  - Single ID: `"983"`
  - Multiple IDs: `"1,2,983"` or `"1, 2, 983"` (spaces are trimmed)
  - Invalid IDs are filtered out (non-numeric, zero, or negative values)

**Request Headers:**
```
Content-Type: application/json
Accept: application/json
```

**Request Body:**
None (no body required)

**Response (200 OK):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[89.123, 27.456], [89.124, 27.456], [89.124, 27.457], [89.123, 27.457], [89.123, 27.456]]]
      },
      "properties": {
        "id": 1,
        "eaId": 983,
        "structureId": "STR001",
        "buildingType": "Residential",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[89.125, 27.458], [89.126, 27.458], [89.126, 27.459], [89.125, 27.459], [89.125, 27.458]]]
      },
      "properties": {
        "id": 2,
        "eaId": 983,
        "structureId": "STR002",
        "buildingType": "Commercial",
        "createdAt": "2024-01-02T00:00:00.000Z",
        "updatedAt": "2024-01-16T10:30:00.000Z"
      }
    }
  ]
}
```

**Empty Response (200 OK):**
When no buildings are found or all IDs are invalid, returns an empty FeatureCollection:
```json
{
  "type": "FeatureCollection",
  "features": []
}
```

**Response Schema:**
- `type`: Always `"FeatureCollection"` for GeoJSON format
- `features`: Array of GeoJSON Feature objects
  - `type`: Always `"Feature"`
  - `geometry`: GeoJSON geometry object (converted from PostGIS `geom` column)
  - `properties`: Building properties object (all columns except `geom`)

**Error Responses:**

- **400 Bad Request** - Invalid parameter format
```json
{
  "statusCode": 400,
  "message": "Bad Request"
}
```

**Example Requests (cURL):**

Single Enumeration Area:
```bash
curl -X GET \
  http://localhost:3000/buildings/by-enumeration-area/983 \
  -H 'Content-Type: application/json'
```

Multiple Enumeration Areas:
```bash
curl -X GET \
  http://localhost:3000/buildings/by-enumeration-area/1,2,983 \
  -H 'Content-Type: application/json'
```

Multiple Enumeration Areas (with spaces):
```bash
curl -X GET \
  http://localhost:3000/buildings/by-enumeration-area/1,%202,%20983 \
  -H 'Content-Type: application/json'
```

**Example Requests (JavaScript/Fetch):**

Single Enumeration Area:
```javascript
const response = await fetch('http://localhost:3000/buildings/by-enumeration-area/983');
const geoJson = await response.json();
console.log(geoJson);
```

Multiple Enumeration Areas:
```javascript
const eaIds = [1, 2, 983];
const response = await fetch(
  `http://localhost:3000/buildings/by-enumeration-area/${eaIds.join(',')}`
);
const geoJson = await response.json();
console.log(geoJson);
```

**Notes:**
- The endpoint accepts both single IDs and comma-separated lists
- Invalid IDs (non-numeric, zero, or negative) are automatically filtered out
- All valid enumeration area IDs are queried simultaneously, and results are merged into a single FeatureCollection
- The `geom` column is converted to GeoJSON geometry using PostGIS `ST_AsGeoJSON`
- All other columns from the `buildingGeom` table are included in the `properties` object
- Empty result sets return a valid GeoJSON FeatureCollection with an empty `features` array

---

## Data Source

Buildings are retrieved from the `public."buildingGeom"` table, filtered by the `eaId` column matching the provided enumeration area ID(s).

