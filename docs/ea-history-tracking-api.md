# Enumeration Area History Tracking API Documentation

## Overview

The Enumeration Area History Tracking system allows you to track the lineage of enumeration areas when they are split or merged. This maintains historical references for existing surveys while providing complete lineage tracking.

## Table of Contents

1. [New Entity: EnumerationAreaLineage](#enumerationarealineage-entity)
2. [Updated Entity: EnumerationArea](#updated-enumerationarea-entity)
3. [Split Operation](#split-operation)
4. [Merge Operation](#merge-operation)
5. [Lineage Queries](#lineage-queries)
6. [History Queries](#history-queries)
7. [Active/Inactive EA Management](#activeinactive-ea-management)
8. [Paginated Split and Merge Lists](#paginated-split-and-merge-lists)
9. [Complex Scenarios Examples](#complex-scenarios-examples)

---

## EnumerationAreaLineage Entity

### Entity Structure

```typescript
export enum OperationType {
  SPLIT = 'SPLIT',
  MERGE = 'MERGE',
}

export class EnumerationAreaLineage {
  id: number;                    // Primary key
  parentEaId: number;            // FK to EnumerationArea (source EA)
  childEaId: number;             // FK to EnumerationArea (resulting EA)
  operationType: OperationType;  // 'SPLIT' or 'MERGE'
  operationDate: Date;           // When operation occurred
  reason?: string;               // Optional notes/reason for operation
}
```

### Database Table

**Table Name:** `EnumerationAreaLineages`

**Columns:**
- `id` (INTEGER, PK, AUTO_INCREMENT)
- `parentEaId` (INTEGER, FK to EnumerationAreas.id, NOT NULL)
- `childEaId` (INTEGER, FK to EnumerationAreas.id, NOT NULL)
- `operationType` (ENUM('SPLIT', 'MERGE'), NOT NULL)
- `operationDate` (DATE, NOT NULL, DEFAULT NOW)
- `reason` (TEXT, NULLABLE)

**Indexes:**
- `idx_parent_ea` on `parentEaId`
- `idx_child_ea` on `childEaId`
- `idx_operation_type` on `operationType`
- `idx_parent_child` on `(parentEaId, childEaId)`

---

## Updated EnumerationArea Entity

### New Fields

```typescript
export class EnumerationArea {
  // ... existing fields ...
  
  isActive: boolean;           // Default: true
  deactivatedAt?: Date;        // When EA was deactivated
  deactivatedReason?: string;  // Reason for deactivation
}
```

### Database Changes

**New Columns:**
- `isActive` (BOOLEAN, NOT NULL, DEFAULT true)
- `deactivatedAt` (DATE, NULLABLE)
- `deactivatedReason` (TEXT, NULLABLE)

**Important Notes:**
- All existing EAs default to `isActive = true`
- Inactive EAs are excluded from default GET/list operations
- Survey references can still access inactive EAs for historical data

---

## Split Operation

### Endpoint

```
POST /enumeration-area/:id/split
```

**Access:** Admin only  
**Authentication:** Required (JWT + Admin role)  
**Content-Type:** `multipart/form-data`

### Request Format

This endpoint accepts **formData** with the following fields:

- `eaData` (string, required): JSON string containing EA details
- `files` (File[], required): GeoJSON files (one per new EA, in same order as newEas array)
- `reason` (string, optional): Notes for the split operation

### eaData JSON Structure

```typescript
{
  newEas: [
    {
      name: string;                    // Required
      areaCode: string;                 // Required, must be unique
      description: string;               // Required
      subAdministrativeZoneIds: number[]; // Required, at least 1 SAZ
      // Note: geom is provided via GeoJSON file, not in JSON
    },
    // ... at least 2 new EAs required
  ],
  reason?: string;                      // Optional notes (can also be in formData)
}
```

### Request Example

**Using cURL:**
```bash
curl -X POST "https://api.example.com/enumeration-area/123/split" \
  -H "Authorization: Bearer <admin_token>" \
  -F "eaData={\"newEas\":[{\"name\":\"EA-01-A\",\"areaCode\":\"01A\",\"description\":\"Northern portion\",\"subAdministrativeZoneIds\":[1,2]},{\"name\":\"EA-01-B\",\"areaCode\":\"01B\",\"description\":\"Southern portion\",\"subAdministrativeZoneIds\":[1,3]}]}" \
  -F "files=@ea-01-a.geojson" \
  -F "files=@ea-01-b.geojson" \
  -F "reason=Household count increased beyond manageable size"
```

**Using JavaScript FormData:**
```javascript
const formData = new FormData();

// EA details as JSON string
const eaData = {
  newEas: [
    {
      name: "EA-01-A",
      areaCode: "01A",
      description: "Northern portion of EA-01",
      subAdministrativeZoneIds: [1, 2]
    },
    {
      name: "EA-01-B",
      areaCode: "01B",
      description: "Southern portion of EA-01",
      subAdministrativeZoneIds: [1, 3]
    }
  ]
};

formData.append('eaData', JSON.stringify(eaData));
formData.append('files', geojsonFile1); // First GeoJSON file
formData.append('files', geojsonFile2); // Second GeoJSON file
formData.append('reason', 'Household count increased beyond manageable size');

fetch('/enumeration-area/123/split', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Important Notes:**
- The number of GeoJSON files must match the number of EAs in `newEas` array
- Files must be in the same order as the `newEas` array
- Each file can be a Feature, FeatureCollection, or Geometry object
- File size limit: 50MB per file

### Response

**Status:** 200 OK

```json
[
  {
    "id": 124,
    "name": "EA-01-A",
    "areaCode": "01A",
    "description": "Northern portion of EA-01",
    "isActive": true,
    "subAdministrativeZones": [
      {
        "id": 1,
        "name": "SAZ-1",
        "areaCode": "S01"
      },
      {
        "id": 2,
        "name": "SAZ-2",
        "areaCode": "S02"
      }
    ]
  },
  {
    "id": 125,
    "name": "EA-01-B",
    "areaCode": "01B",
    "description": "Southern portion of EA-01",
    "isActive": true,
    "subAdministrativeZones": [
      {
        "id": 1,
        "name": "SAZ-1",
        "areaCode": "S01"
      },
      {
        "id": 3,
        "name": "SAZ-3",
        "areaCode": "S03"
      }
    ]
  }
]
```

### What Happens

1. Source EA (ID: 123) is marked as `isActive = false`
2. `deactivatedAt` is set to current timestamp
3. `deactivatedReason` is set to provided reason or default message
4. New EAs are created with `isActive = true`
5. Lineage records are created linking source EA to each new EA
6. All operations are wrapped in a database transaction

### Validation Rules

- Source EA must exist and be active
- At least 2 new EAs must be provided
- All new areaCodes must be unique
- All new EAs must have at least 1 Sub-Administrative Zone
- Geometry must be valid GeoJSON

### Error Responses

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Cannot split inactive enumeration area with ID 123"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Enumeration area with ID 123 not found"
}
```

---

## Merge Operation

### Endpoint

```
POST /enumeration-area/merge
```

**Access:** Admin only  
**Authentication:** Required (JWT + Admin role)  
**Content-Type:** `multipart/form-data`

### Request Format

This endpoint accepts **formData** with the following fields:

- `mergeData` (string, required): JSON string containing merge details
- `file` (File, required): Single GeoJSON file for the merged EA
- `reason` (string, optional): Notes for the merge operation

### mergeData JSON Structure

```typescript
{
  sourceEaIds: number[];        // Required, at least 2 EA IDs
  mergedEa: {
    name: string;                // Required
    areaCode: string;            // Required, must be unique
    description: string;         // Required
    subAdministrativeZoneIds: number[]; // Required, at least 1 SAZ
    // Note: geom is provided via GeoJSON file, not in JSON
  },
  reason?: string;              // Optional notes (can also be in formData)
}
```

### Request Example

**Using cURL:**
```bash
curl -X POST "https://api.example.com/enumeration-area/merge" \
  -H "Authorization: Bearer <admin_token>" \
  -F "mergeData={\"sourceEaIds\":[124,125],\"mergedEa\":{\"name\":\"EA-01-Merged\",\"areaCode\":\"01M\",\"description\":\"Merged EA from EA-01-A and EA-01-B\",\"subAdministrativeZoneIds\":[1,2,3]}}" \
  -F "file=@merged-ea.geojson" \
  -F "reason=Household count decreased, can be managed by single enumerator"
```

**Using JavaScript FormData:**
```javascript
const formData = new FormData();

// Merge details as JSON string
const mergeData = {
  sourceEaIds: [124, 125],
  mergedEa: {
    name: "EA-01-Merged",
    areaCode: "01M",
    description: "Merged EA from EA-01-A and EA-01-B",
    subAdministrativeZoneIds: [1, 2, 3]
  }
};

formData.append('mergeData', JSON.stringify(mergeData));
formData.append('file', geojsonFile); // Single GeoJSON file for merged EA
formData.append('reason', 'Household count decreased, can be managed by single enumerator');

fetch('/enumeration-area/merge', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Important Notes:**
- Only one GeoJSON file is required for the merged EA
- File can be a Feature, FeatureCollection, or Geometry object
- File size limit: 50MB

### Response

**Status:** 200 OK

```json
{
  "id": 126,
  "name": "EA-01-Merged",
  "areaCode": "01M",
  "description": "Merged EA from EA-01-A and EA-01-B",
  "isActive": true,
  "subAdministrativeZones": [
    {
      "id": 1,
      "name": "SAZ-1",
      "areaCode": "S01"
    },
    {
      "id": 2,
      "name": "SAZ-2",
      "areaCode": "S02"
    },
    {
      "id": 3,
      "name": "SAZ-3",
      "areaCode": "S03"
    }
  ]
}
```

### What Happens

1. All source EAs (IDs: 124, 125) are marked as `isActive = false`
2. `deactivatedAt` is set to current timestamp for all source EAs
3. `deactivatedReason` is set to provided reason or default message
4. New merged EA is created with `isActive = true`
5. Lineage records are created linking each source EA to the merged EA
6. All operations are wrapped in a database transaction

### Validation Rules

- All source EAs must exist and be active
- At least 2 source EAs must be provided
- New areaCode must be unique
- Merged EA must have at least 1 Sub-Administrative Zone
- Geometry must be valid GeoJSON

### Error Responses

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Cannot merge inactive enumeration areas: 124, 125"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Enumeration areas not found: 124"
}
```

---

## Lineage Queries

### Get EA Lineage

#### Endpoint

```
GET /enumeration-area/:id/lineage?direction=both
```

**Access:** Public  
**Authentication:** Not required

#### Query Parameters

- `direction` (optional): `'ancestors' | 'descendants' | 'both'` (default: `'both'`)

#### Response Example

```json
GET /enumeration-area/126/lineage?direction=both

{
  "ea": {
    "id": 126,
    "name": "EA-01-Merged",
    "areaCode": "01M",
    "isActive": true
  },
  "ancestors": [
    {
      "ea": {
        "id": 124,
        "name": "EA-01-A",
        "areaCode": "01A",
        "isActive": false
      },
      "operation": {
        "type": "MERGE",
        "date": "2024-01-15T10:30:00Z",
        "reason": "Household count decreased",
        "parentEaId": 124,
        "childEaId": 126
      },
      "parents": [
        {
          "ea": {
            "id": 123,
            "name": "EA-01",
            "areaCode": "01",
            "isActive": false
          },
          "operation": {
            "type": "SPLIT",
            "date": "2024-01-10T09:00:00Z",
            "reason": "Household count increased",
            "parentEaId": 123,
            "childEaId": 124
          },
          "parents": [],
          "children": []
        }
      ],
      "children": []
    },
    {
      "ea": {
        "id": 125,
        "name": "EA-01-B",
        "areaCode": "01B",
        "isActive": false
      },
      "operation": {
        "type": "MERGE",
        "date": "2024-01-15T10:30:00Z",
        "reason": "Household count decreased",
        "parentEaId": 125,
        "childEaId": 126
      },
      "parents": [
        {
          "ea": {
            "id": 123,
            "name": "EA-01",
            "areaCode": "01",
            "isActive": false
          },
          "operation": {
            "type": "SPLIT",
            "date": "2024-01-10T09:00:00Z",
            "reason": "Household count increased",
            "parentEaId": 123,
            "childEaId": 125
          },
          "parents": [],
          "children": []
        }
      ],
      "children": []
    }
  ],
  "descendants": [],
  "operations": [
    {
      "type": "MERGE",
      "date": "2024-01-15T10:30:00Z",
      "reason": "Household count decreased",
      "parentEaId": 124,
      "childEaId": 126
    },
    {
      "type": "MERGE",
      "date": "2024-01-15T10:30:00Z",
      "reason": "Household count decreased",
      "parentEaId": 125,
      "childEaId": 126
    },
    {
      "type": "SPLIT",
      "date": "2024-01-10T09:00:00Z",
      "reason": "Household count increased",
      "parentEaId": 123,
      "childEaId": 124
    },
    {
      "type": "SPLIT",
      "date": "2024-01-10T09:00:00Z",
      "reason": "Household count increased",
      "parentEaId": 123,
      "childEaId": 125
    }
  ]
}
```

#### Direction Options

**Ancestors Only:**
```
GET /enumeration-area/126/lineage?direction=ancestors
```
Returns only the parent chain (where this EA came from).

**Descendants Only:**
```
GET /enumeration-area/123/lineage?direction=descendants
```
Returns only the child chain (what this EA became/split into).

**Both (Default):**
```
GET /enumeration-area/126/lineage?direction=both
GET /enumeration-area/126/lineage
```
Returns both ancestors and descendants.

---

## History Queries

### Get Complete EA History

#### Endpoint

```
GET /enumeration-area/:id/history
```

**Access:** Public  
**Authentication:** Not required

#### Response Example

```json
GET /enumeration-area/126/history

{
  "currentEa": {
    "id": 126,
    "name": "EA-01-Merged",
    "areaCode": "01M",
    "description": "Merged EA from EA-01-A and EA-01-B",
    "isActive": true
  },
  "history": {
    "ancestors": [
      {
        "ea": {
          "id": 124,
          "name": "EA-01-A",
          "areaCode": "01A",
          "isActive": false
        },
        "operation": {
          "type": "MERGE",
          "date": "2024-01-15T10:30:00Z",
          "reason": "Household count decreased"
        },
        "children": [],
        "parents": [
          {
            "ea": {
              "id": 123,
              "name": "EA-01",
              "areaCode": "01",
              "isActive": false
            },
            "operation": {
              "type": "SPLIT",
              "date": "2024-01-10T09:00:00Z",
              "reason": "Household count increased"
            },
            "children": [
              {
                "ea": {
                  "id": 125,
                  "name": "EA-01-B",
                  "areaCode": "01B",
                  "isActive": false
                },
                "operation": {
                  "type": "SPLIT",
                  "date": "2024-01-10T09:00:00Z",
                  "reason": "Household count increased"
                },
                "children": [],
                "parents": []
              }
            ],
            "parents": []
          }
        ]
      },
      {
        "ea": {
          "id": 125,
          "name": "EA-01-B",
          "areaCode": "01B",
          "isActive": false
        },
        "operation": {
          "type": "MERGE",
          "date": "2024-01-15T10:30:00Z",
          "reason": "Household count decreased"
        },
        "children": [],
        "parents": [
          {
            "ea": {
              "id": 123,
              "name": "EA-01",
              "areaCode": "01",
              "isActive": false
            },
            "operation": {
              "type": "SPLIT",
              "date": "2024-01-10T09:00:00Z",
              "reason": "Household count increased"
            },
            "children": [
              {
                "ea": {
                  "id": 124,
                  "name": "EA-01-A",
                  "areaCode": "01A",
                  "isActive": false
                },
                "operation": {
                  "type": "SPLIT",
                  "date": "2024-01-10T09:00:00Z",
                  "reason": "Household count increased"
                },
                "children": [],
                "parents": []
              }
            ],
            "parents": []
          }
        ]
      }
    ],
    "descendants": []
  }
}
```

#### Use Case

This endpoint is optimized for frontend visualization. It returns a complete tree structure showing:
- All ancestors (where the EA came from)
- All descendants (what the EA became)
- Operation details at each level
- Complete family tree relationships

---

## Active/Inactive EA Management

### Get All Active EAs

#### Endpoint

```
GET /enumeration-area/active?withGeom=false&includeSubAdminZone=false
```

**Access:** Public  
**Authentication:** Not required

#### Query Parameters

- `withGeom` (optional): Include geometry (default: `false`)
- `includeSubAdminZone` (optional): Include sub-administrative zones (default: `false`)

#### Response

Returns array of active enumeration areas (same format as `GET /enumeration-area`).

**Note:** `GET /enumeration-area` now defaults to active EAs only.

### Get All Inactive EAs

#### Endpoint

```
GET /enumeration-area/inactive?withGeom=false&includeSubAdminZone=false
```

**Access:** Public  
**Authentication:** Not required

#### Query Parameters

- `withGeom` (optional): Include geometry (default: `false`)
- `includeSubAdminZone` (optional): Include sub-administrative zones (default: `false`)

#### Response Example

```json
[
  {
    "id": 123,
    "name": "EA-01",
    "areaCode": "01",
    "description": "Original EA",
    "isActive": false,
    "deactivatedAt": "2024-01-10T09:00:00Z",
    "deactivatedReason": "Split into 2 new enumeration areas",
    "subAdministrativeZones": [...]
  },
  {
    "id": 124,
    "name": "EA-01-A",
    "areaCode": "01A",
    "description": "Northern portion",
    "isActive": false,
    "deactivatedAt": "2024-01-15T10:30:00Z",
    "deactivatedReason": "Merged into new enumeration area",
    "subAdministrativeZones": [...]
  }
]
```

---

## Paginated Split and Merge Lists

### Get All Split Enumeration Areas (Paginated)

#### Endpoint

```
GET /enumeration-area/split
```

**Access:** Public  
**Authentication:** Not required

#### Query Parameters

**Pagination Parameters:**
- `page` (optional): Page number (default: `1`)
- `limit` (optional): Items per page (default: `10`, max: `100`)
- `sortBy` (optional): Field to sort by (default: `operationDate`)
- `sortOrder` (optional): Sort order - `ASC` or `DESC` (default: `DESC`)

**Additional Parameters:**
- `withGeom` (optional): Include geometry (default: `false`)
- `includeSubAdminZone` (optional): Include sub-administrative zones (default: `false`)

#### Description

Returns a paginated list of all enumeration areas that were split (i.e., parent EAs in SPLIT operations). Results are ordered by the latest split operation date (most recent first).

#### Response Example

```json
GET /enumeration-area/split?page=1&limit=10

{
  "data": [
    {
      "id": 123,
      "name": "EA-01",
      "areaCode": "01",
      "description": "Original EA that was split",
      "isActive": false,
      "deactivatedAt": "2024-01-10T09:00:00Z",
      "deactivatedReason": "Split into 2 new enumeration areas",
      "subAdministrativeZones": [
        {
          "id": 1,
          "name": "SAZ-1",
          "areaCode": "S01"
        }
      ]
    },
    {
      "id": 200,
      "name": "EA-05",
      "areaCode": "05",
      "description": "Another EA that was split",
      "isActive": false,
      "deactivatedAt": "2024-01-08T14:30:00Z",
      "deactivatedReason": "Split into 3 new enumeration areas",
      "subAdministrativeZones": [
        {
          "id": 2,
          "name": "SAZ-2",
          "areaCode": "S02"
        }
      ]
    }
  ],
  "meta": {
    "currentPage": 1,
    "itemsPerPage": 10,
    "totalItems": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Request Examples

**Basic Request:**
```bash
curl "https://api.example.com/enumeration-area/split"
```

**With Pagination:**
```bash
curl "https://api.example.com/enumeration-area/split?page=2&limit=20"
```

**With Geometry and Sub-Administrative Zones:**
```bash
curl "https://api.example.com/enumeration-area/split?withGeom=true&includeSubAdminZone=true"
```

**JavaScript Example:**
```javascript
async function getSplitEAs(page = 1, limit = 10) {
  const response = await fetch(
    `/enumeration-area/split?page=${page}&limit=${limit}&includeSubAdminZone=true`
  );
  const data = await response.json();
  return data;
}

// Usage
const result = await getSplitEAs(1, 20);
console.log(`Found ${result.meta.totalItems} split EAs`);
console.log(`Page ${result.meta.currentPage} of ${result.meta.totalPages}`);
result.data.forEach(ea => {
  console.log(`${ea.name} (${ea.areaCode}) was split on ${ea.deactivatedAt}`);
});
```

#### Notes

- Only returns EAs that have been split (parent EAs in SPLIT operations)
- Results are automatically ordered by latest operation date (DESC)
- Split EAs are typically inactive (`isActive: false`)
- The `deactivatedAt` field indicates when the split occurred
- Empty result if no split operations have been performed

---

### Get All Merged Enumeration Areas (Paginated)

#### Endpoint

```
GET /enumeration-area/merge
```

**Access:** Public  
**Authentication:** Not required

#### Query Parameters

**Pagination Parameters:**
- `page` (optional): Page number (default: `1`)
- `limit` (optional): Items per page (default: `10`, max: `100`)
- `sortBy` (optional): Field to sort by (default: `operationDate`)
- `sortOrder` (optional): Sort order - `ASC` or `DESC` (default: `DESC`)

**Additional Parameters:**
- `withGeom` (optional): Include geometry (default: `false`)
- `includeSubAdminZone` (optional): Include sub-administrative zones (default: `false`)

#### Description

Returns a paginated list of all enumeration areas that were created through merge operations (i.e., child EAs in MERGE operations). Results are ordered by the latest merge operation date (most recent first).

#### Response Example

```json
GET /enumeration-area/merge?page=1&limit=10

{
  "data": [
    {
      "id": 126,
      "name": "EA-01-Merged",
      "areaCode": "01M",
      "description": "Merged EA from EA-01-A and EA-01-B",
      "isActive": true,
      "subAdministrativeZones": [
        {
          "id": 1,
          "name": "SAZ-1",
          "areaCode": "S01"
        },
        {
          "id": 2,
          "name": "SAZ-2",
          "areaCode": "S02"
        },
        {
          "id": 3,
          "name": "SAZ-3",
          "areaCode": "S03"
        }
      ]
    },
    {
      "id": 250,
      "name": "EA-10-Merged",
      "areaCode": "10M",
      "description": "Merged EA from multiple source EAs",
      "isActive": true,
      "subAdministrativeZones": [
        {
          "id": 5,
          "name": "SAZ-5",
          "areaCode": "S05"
        }
      ]
    }
  ],
  "meta": {
    "currentPage": 1,
    "itemsPerPage": 10,
    "totalItems": 15,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Request Examples

**Basic Request:**
```bash
curl "https://api.example.com/enumeration-area/merge"
```

**With Pagination:**
```bash
curl "https://api.example.com/enumeration-area/merge?page=1&limit=50"
```

**With Geometry:**
```bash
curl "https://api.example.com/enumeration-area/merge?withGeom=true"
```

**JavaScript Example:**
```javascript
async function getMergedEAs(page = 1, limit = 10) {
  const response = await fetch(
    `/enumeration-area/merge?page=${page}&limit=${limit}&includeSubAdminZone=true`
  );
  const data = await response.json();
  return data;
}

// Usage
const result = await getMergedEAs(1, 20);
console.log(`Found ${result.meta.totalItems} merged EAs`);
result.data.forEach(ea => {
  console.log(`${ea.name} (${ea.areaCode}) is a merged EA`);
  console.log(`Linked to ${ea.subAdministrativeZones.length} SAZs`);
});
```

#### Notes

- Only returns EAs that were created through merge operations (child EAs in MERGE operations)
- Results are automatically ordered by latest operation date (DESC)
- Merged EAs are typically active (`isActive: true`)
- To find when a merge occurred, check the lineage records using `/enumeration-area/:id/lineage`
- Empty result if no merge operations have been performed

---

### Use Cases

#### Dashboard Statistics

```javascript
async function getEaOperationStats() {
  const [splitResult, mergeResult] = await Promise.all([
    fetch('/enumeration-area/split?limit=1').then(r => r.json()),
    fetch('/enumeration-area/merge?limit=1').then(r => r.json())
  ]);

  return {
    totalSplits: splitResult.meta.totalItems,
    totalMerges: mergeResult.meta.totalItems,
    latestSplit: splitResult.data[0],
    latestMerge: mergeResult.data[0]
  };
}
```

#### Audit Trail

```javascript
async function getRecentOperations(limit = 50) {
  const [splits, merges] = await Promise.all([
    fetch(`/enumeration-area/split?limit=${limit}`).then(r => r.json()),
    fetch(`/enumeration-area/merge?limit=${limit}`).then(r => r.json())
  ]);

  // Combine and sort by date
  const allOperations = [
    ...splits.data.map(ea => ({
      type: 'SPLIT',
      ea,
      date: ea.deactivatedAt
    })),
    ...merges.data.map(ea => ({
      type: 'MERGE',
      ea,
      date: null // Would need to fetch from lineage
    }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return allOperations;
}
```

#### Pagination Navigation

```javascript
async function getAllSplitEAs() {
  let allEAs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await fetch(
      `/enumeration-area/split?page=${page}&limit=100`
    ).then(r => r.json());

    allEAs = [...allEAs, ...result.data];
    hasMore = result.meta.hasNextPage;
    page++;
  }

  return allEAs;
}
```

---

## Complex Scenarios Examples

### Scenario 1: Simple Split

**Initial State:**
- EA1 (active)

**Operation:**
```json
POST /enumeration-area/1/split
{
  "newEas": [
    { "name": "EA2", "areaCode": "02", ... },
    { "name": "EA3", "areaCode": "03", ... }
  ],
  "reason": "Household growth"
}
```

**Result:**
- EA1 (inactive) → EA2 (active), EA3 (active)
- Lineage: EA1 → EA2 (SPLIT), EA1 → EA3 (SPLIT)

### Scenario 2: Split Then Merge

**Operations:**
1. Split EA1 into EA2, EA3, EA4
2. Merge EA2 and EA3 into EA5

**Lineage Tree:**
```
EA1 (inactive)
├─ SPLIT → EA2 (inactive)
│         └─ MERGE → EA5 (active)
├─ SPLIT → EA3 (inactive)
│         └─ MERGE → EA5 (active)
└─ SPLIT → EA4 (active)
```

**Query History:**
```json
GET /enumeration-area/5/history
```
Returns complete tree showing EA1 → EA2/EA3 → EA5

### Scenario 3: Multiple Splits Over Time

**Operations:**
1. EA1 splits into EA2, EA3, EA4
2. EA2 splits into EA5, EA6
3. EA3 splits into EA7, EA8

**Lineage Tree:**
```
EA1 (inactive)
├─ SPLIT → EA2 (inactive)
│         ├─ SPLIT → EA5 (active)
│         └─ SPLIT → EA6 (active)
├─ SPLIT → EA3 (inactive)
│         ├─ SPLIT → EA7 (active)
│         └─ SPLIT → EA8 (active)
└─ SPLIT → EA4 (active)
```

### Scenario 4: Merge Then Split

**Operations:**
1. Merge EA1, EA2, EA3, EA4 into EA5
2. Split EA5 into EA6, EA7

**Lineage Tree:**
```
EA1 (inactive) ──┐
EA2 (inactive) ──┤
EA3 (inactive) ──┼─ MERGE → EA5 (inactive)
EA4 (inactive) ──┘         ├─ SPLIT → EA6 (active)
                            └─ SPLIT → EA7 (active)
```

### Scenario 5: Complex Multi-Level Operations

**Operations:**
1. EA1 splits into EA2, EA3, EA4, EA5
2. EA2 splits into EA6, EA7
3. EA3 splits into EA8, EA9
4. Merge EA6 and EA8 into EA10
5. EA10 splits into EA11, EA12

**Lineage Tree:**
```
EA1 (inactive)
├─ SPLIT → EA2 (inactive)
│         ├─ SPLIT → EA6 (inactive) ──┐
│         │                           ├─ MERGE → EA10 (inactive)
│         └─ SPLIT → EA7 (active)     │         ├─ SPLIT → EA11 (active)
├─ SPLIT → EA3 (inactive)            │         └─ SPLIT → EA12 (active)
│         ├─ SPLIT → EA8 (inactive) ──┘
│         └─ SPLIT → EA9 (active)
├─ SPLIT → EA4 (active)
└─ SPLIT → EA5 (active)
```

---

## Frontend Integration Guide

### Visualizing EA History Tree

The history endpoint returns a tree structure perfect for visualization:

```typescript
interface EaHistoryNode {
  ea: EnumerationArea;
  operation?: {
    type: 'SPLIT' | 'MERGE';
    date: Date;
    reason?: string;
  };
  children: EaHistoryNode[];
  parents: EaHistoryNode[];
}
```

### Example React Component Structure

```typescript
function EaHistoryTree({ eaId }: { eaId: number }) {
  const { data } = useQuery(['eaHistory', eaId], () =>
    fetch(`/enumeration-area/${eaId}/history`).then(r => r.json())
  );

  return (
    <div>
      <EaNode ea={data.currentEa} />
      <div className="ancestors">
        <h3>Ancestors (Where it came from)</h3>
        {data.history.ancestors.map(node => (
          <EaNodeTree key={node.ea.id} node={node} />
        ))}
      </div>
      <div className="descendants">
        <h3>Descendants (What it became)</h3>
        {data.history.descendants.map(node => (
          <EaNodeTree key={node.ea.id} node={node} />
        ))}
      </div>
    </div>
  );
}
```

### Form Examples

#### Split EA Form

```typescript
interface SplitEaFormData {
  sourceEaId: number;
  newEas: Array<{
    name: string;
    areaCode: string;
    description: string;
    geojsonFile: File; // GeoJSON file for this EA
    subAdministrativeZoneIds: number[];
  }>;
  reason?: string;
}

async function splitEa(data: SplitEaFormData) {
  const formData = new FormData();
  
  // Prepare EA data without geometry (geometry comes from files)
  const eaData = {
    newEas: data.newEas.map(ea => ({
      name: ea.name,
      areaCode: ea.areaCode,
      description: ea.description,
      subAdministrativeZoneIds: ea.subAdministrativeZoneIds
    }))
  };
  
  formData.append('eaData', JSON.stringify(eaData));
  
  // Append GeoJSON files in the same order as newEas
  data.newEas.forEach(ea => {
    formData.append('files', ea.geojsonFile);
  });
  
  if (data.reason) {
    formData.append('reason', data.reason);
  }
  
  const response = await fetch(`/enumeration-area/${data.sourceEaId}/split`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Note: Don't set Content-Type header, browser will set it with boundary
    },
    body: formData
  });
  return response.json();
}
```

#### Merge EA Form

```typescript
interface MergeEaFormData {
  sourceEaIds: number[];
  mergedEa: {
    name: string;
    areaCode: string;
    description: string;
    geojsonFile: File; // GeoJSON file for merged EA
    subAdministrativeZoneIds: number[];
  };
  reason?: string;
}

async function mergeEas(data: MergeEaFormData) {
  const formData = new FormData();
  
  // Prepare merge data without geometry (geometry comes from file)
  const mergeData = {
    sourceEaIds: data.sourceEaIds,
    mergedEa: {
      name: data.mergedEa.name,
      areaCode: data.mergedEa.areaCode,
      description: data.mergedEa.description,
      subAdministrativeZoneIds: data.mergedEa.subAdministrativeZoneIds
    }
  };
  
  formData.append('mergeData', JSON.stringify(mergeData));
  formData.append('file', data.mergedEa.geojsonFile);
  
  if (data.reason) {
    formData.append('reason', data.reason);
  }
  
  const response = await fetch('/enumeration-area/merge', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Note: Don't set Content-Type header, browser will set it with boundary
    },
    body: formData
  });
  return response.json();
}
```

---

## Important Notes

### Survey Compatibility

- **Surveys continue to reference original EA IDs** even after split/merge
- Inactive EAs remain accessible for historical survey data
- Survey-linked EA queries do NOT filter by `isActive`
- All other GET/list operations default to active EAs only

### Transaction Safety

- All split/merge operations are wrapped in database transactions
- If any step fails, the entire operation is rolled back
- No partial updates occur

### Validation

- Cannot split/merge inactive EAs
- New areaCodes must be unique
- Geometry must be valid GeoJSON
- At least 2 EAs required for split/merge operations

### Performance

- Lineage queries use recursive database queries
- History queries build complete tree in memory
- Consider caching for frequently accessed EA histories
- Indexes are optimized for parent/child lookups

---

## Error Codes Reference

| Status Code | Error Message | Description |
|------------|---------------|-------------|
| 400 | Cannot split inactive enumeration area | Source EA is already inactive |
| 400 | Cannot merge inactive enumeration areas | One or more source EAs are inactive |
| 400 | Area codes already exist | New areaCode conflicts with existing EA |
| 400 | At least 2 new EAs are required for a split | Split requires minimum 2 new EAs |
| 400 | At least 2 EAs are required for a merge | Merge requires minimum 2 source EAs |
| 404 | Enumeration area with ID X not found | EA doesn't exist |
| 404 | Enumeration areas not found: X, Y | One or more source EAs don't exist |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User doesn't have admin role |

---

## Migration Notes

### Existing Data

- All existing EAs will have `isActive = true` by default
- No data loss occurs during migration
- Existing survey references remain intact

### Database Migration

Run the following SQL to add new columns (if not using migrations):

```sql
-- Add isActive column
ALTER TABLE "EnumerationAreas" 
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add deactivatedAt column
ALTER TABLE "EnumerationAreas" 
ADD COLUMN "deactivatedAt" DATE NULL;

-- Add deactivatedReason column
ALTER TABLE "EnumerationAreas" 
ADD COLUMN "deactivatedReason" TEXT NULL;

-- Create EnumerationAreaLineages table
CREATE TABLE "EnumerationAreaLineages" (
  "id" SERIAL PRIMARY KEY,
  "parentEaId" INTEGER NOT NULL REFERENCES "EnumerationAreas"("id"),
  "childEaId" INTEGER NOT NULL REFERENCES "EnumerationAreas"("id"),
  "operationType" VARCHAR(10) NOT NULL CHECK ("operationType" IN ('SPLIT', 'MERGE')),
  "operationDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "reason" TEXT NULL
);

-- Create indexes
CREATE INDEX "idx_parent_ea" ON "EnumerationAreaLineages"("parentEaId");
CREATE INDEX "idx_child_ea" ON "EnumerationAreaLineages"("childEaId");
CREATE INDEX "idx_operation_type" ON "EnumerationAreaLineages"("operationType");
CREATE INDEX "idx_parent_child" ON "EnumerationAreaLineages"("parentEaId", "childEaId");
```

---

## Support

For questions or issues, please contact the development team or refer to the main API documentation.

