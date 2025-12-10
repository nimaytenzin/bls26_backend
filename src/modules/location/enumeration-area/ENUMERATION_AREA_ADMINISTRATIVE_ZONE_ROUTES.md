# Enumeration Area Routes by Administrative Zone - Angular Data Service Guide

## Overview
This guide provides route details for integrating Enumeration Area endpoints filtered by Administrative Zone in your Angular data service. These routes allow you to fetch enumeration areas and their GeoJSON representations for a specific administrative zone.

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Data Service Implementation](#data-service-implementation)
3. [Response Types](#response-types)
4. [Usage Examples](#usage-examples)

---

## API Endpoints

### 1. Get Enumeration Areas by Administrative Zone

**Endpoint:** `GET /enumeration-area/by-administrative-zone/:administrativeZoneId`

**Description:** Retrieves all enumeration areas that belong to sub-administrative zones within the specified administrative zone.

**Path Parameters:**
- `administrativeZoneId` (integer, required) - The ID of the Administrative Zone

**Query Parameters:**
- `withGeom` (boolean, optional) - Include geometry data (default: `false`)
- `includeSubAdminZone` (boolean, optional) - Include parent sub-administrative zone data (default: `false`)

**Response:** Array of EnumerationArea objects

**Example Requests:**
```
GET /enumeration-area/by-administrative-zone/1
GET /enumeration-area/by-administrative-zone/1?withGeom=true
GET /enumeration-area/by-administrative-zone/1?includeSubAdminZone=true
GET /enumeration-area/by-administrative-zone/1?withGeom=true&includeSubAdminZone=true
```

---

### 2. Get Enumeration Areas by Administrative Zone as GeoJSON

**Endpoint:** `GET /enumeration-area/geojson/by-administrative-zone/:administrativeZoneId`

**Description:** Retrieves all enumeration areas for the specified administrative zone as a GeoJSON FeatureCollection.

**Path Parameters:**
- `administrativeZoneId` (integer, required) - The ID of the Administrative Zone

**Response:** GeoJSON FeatureCollection object

**Example Request:**
```
GET /enumeration-area/geojson/by-administrative-zone/1
```

---

## Data Service Implementation

### TypeScript/Angular Service Example

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EnumerationArea {
  id: number;
  subAdministrativeZoneId: number;
  name: string;
  description: string;
  areaCode: string;
  areaSqKm: number;
  geom?: string; // Only included if withGeom=true
  subAdministrativeZone?: {
    id: number;
    administrativeZoneId: number;
    name: string;
    type: 'chiwog' | 'lap';
    areaCode: string;
    areaSqKm: number;
    administrativeZone?: {
      id: number;
      dzongkhagId: number;
      name: string;
      type: 'Gewog' | 'Thromde';
      areaCode: string;
      areaSqKm: number;
    };
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: number;
    geometry: {
      type: string;
      coordinates: any;
    };
    properties: Omit<EnumerationArea, 'geom'>;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class EnumerationAreaDataService {
  private apiUrl = 'http://your-api-url/api'; // Replace with your API base URL

  constructor(private http: HttpClient) {}

  /**
   * Get enumeration areas by administrative zone
   * @param administrativeZoneId - The ID of the administrative zone
   * @param withGeom - Include geometry data (default: false)
   * @param includeSubAdminZone - Include parent sub-administrative zone (default: false)
   * @returns Observable of enumeration areas array
   */
  getByAdministrativeZone(
    administrativeZoneId: number,
    withGeom: boolean = false,
    includeSubAdminZone: boolean = false
  ): Observable<EnumerationArea[]> {
    let params = new HttpParams();
    
    if (withGeom) {
      params = params.set('withGeom', 'true');
    }
    
    if (includeSubAdminZone) {
      params = params.set('includeSubAdminZone', 'true');
    }

    return this.http.get<EnumerationArea[]>(
      `${this.apiUrl}/enumeration-area/by-administrative-zone/${administrativeZoneId}`,
      { params }
    );
  }

  /**
   * Get enumeration areas by administrative zone as GeoJSON
   * @param administrativeZoneId - The ID of the administrative zone
   * @returns Observable of GeoJSON FeatureCollection
   */
  getGeoJSONByAdministrativeZone(
    administrativeZoneId: number
  ): Observable<GeoJSONFeatureCollection> {
    return this.http.get<GeoJSONFeatureCollection>(
      `${this.apiUrl}/enumeration-area/geojson/by-administrative-zone/${administrativeZoneId}`
    );
  }
}
```

---

## Response Types

### EnumerationArea Response (Regular Endpoint)

```typescript
{
  id: number;
  subAdministrativeZoneId: number;
  name: string;
  description: string;
  areaCode: string;
  areaSqKm: number;
  // Optional fields based on query parameters:
  geom?: string; // Only if withGeom=true
  subAdministrativeZone?: {
    id: number;
    administrativeZoneId: number;
    name: string;
    type: 'chiwog' | 'lap';
    areaCode: string;
    areaSqKm: number;
    administrativeZone?: {
      id: number;
      dzongkhagId: number;
      name: string;
      type: 'Gewog' | 'Thromde';
      areaCode: string;
      areaSqKm: number;
    };
  };
}
```

### GeoJSON Response

```typescript
{
  type: 'FeatureCollection';
  features: [
    {
      type: 'Feature';
      id: number;
      geometry: {
        type: 'MultiPolygon';
        coordinates: number[][][][];
      };
      properties: {
        id: number;
        subAdministrativeZoneId: number;
        name: string;
        description: string;
        areaCode: string;
        areaSqKm: number;
      };
    }
  ];
}
```

---

## Usage Examples

### Example 1: Basic Usage - Get Enumeration Areas

```typescript
// In your component or service
this.enumerationAreaService
  .getByAdministrativeZone(1)
  .subscribe({
    next: (enumerationAreas) => {
      console.log('Enumeration Areas:', enumerationAreas);
      // Process enumeration areas
    },
    error: (error) => {
      console.error('Error fetching enumeration areas:', error);
    }
  });
```

### Example 2: Get Enumeration Areas with Geometry

```typescript
this.enumerationAreaService
  .getByAdministrativeZone(1, true, false)
  .subscribe({
    next: (enumerationAreas) => {
      // Enumeration areas now include geometry data
      enumerationAreas.forEach(ea => {
        if (ea.geom) {
          // Process geometry
        }
      });
    }
  });
```

### Example 3: Get Enumeration Areas with Sub-Administrative Zone Data

```typescript
this.enumerationAreaService
  .getByAdministrativeZone(1, false, true)
  .subscribe({
    next: (enumerationAreas) => {
      enumerationAreas.forEach(ea => {
        if (ea.subAdministrativeZone) {
          console.log('Sub-Admin Zone:', ea.subAdministrativeZone.name);
        }
      });
    }
  });
```

### Example 4: Get GeoJSON for Mapping

```typescript
this.enumerationAreaService
  .getGeoJSONByAdministrativeZone(1)
  .subscribe({
    next: (geoJson) => {
      // Use with mapping libraries like Leaflet, Mapbox, etc.
      // geoJson is a FeatureCollection ready for display
      console.log('GeoJSON Features:', geoJson.features.length);
    }
  });
```

### Example 5: Error Handling

```typescript
this.enumerationAreaService
  .getByAdministrativeZone(1)
  .subscribe({
    next: (data) => {
      // Handle success
    },
    error: (error) => {
      if (error.status === 404) {
        console.error('Administrative zone not found');
      } else if (error.status === 500) {
        console.error('Server error');
      } else {
        console.error('Unexpected error:', error);
      }
    }
  });
```

---

## Route Summary

| Method | Route | Description | Query Params |
|--------|-------|-------------|--------------|
| `GET` | `/enumeration-area/by-administrative-zone/:administrativeZoneId` | Get enumeration areas by administrative zone | `withGeom`, `includeSubAdminZone` |
| `GET` | `/enumeration-area/geojson/by-administrative-zone/:administrativeZoneId` | Get enumeration areas as GeoJSON | None |

---

## Notes

1. **Authentication:** These routes are public (no authentication required) as per the controller implementation.

2. **Performance:** 
   - Use `withGeom=false` (default) when geometry is not needed to reduce response size
   - Use `includeSubAdminZone=true` only when you need parent zone information

3. **GeoJSON Format:** The GeoJSON endpoint returns a complete FeatureCollection that can be directly used with mapping libraries.

4. **Relationship Hierarchy:**
   - EnumerationArea → SubAdministrativeZone → AdministrativeZone → Dzongkhag
   - The routes filter enumeration areas through their parent sub-administrative zones

5. **Empty Results:** If an administrative zone has no sub-administrative zones or no enumeration areas, the endpoints will return an empty array `[]` or an empty FeatureCollection `{ type: 'FeatureCollection', features: [] }`.

