# Dzongkhag API - Granular Association Control

## Overview
The Dzongkhag endpoints now support granular control over which associations to include in responses, allowing you to fetch exactly the data you need.

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `withGeom` | boolean | `false` | Include geometry data (large field) |
| `includeAdminZones` | boolean | `false` | Include Administrative Zones (Gewogs/Thromdes) |
| `includeSubAdminZones` | boolean | `false` | Include Sub-Administrative Zones (Chiwogs/Laps) - requires `includeAdminZones=true` |
| `includeEAs` | boolean | `false` | Include Enumeration Areas - requires `includeSubAdminZones=true` |

## Endpoints

### GET /dzongkhag

Get all dzongkhags with optional associations.

#### Examples:

**Basic list (lightweight)**
```http
GET /dzongkhag
```
Response: Only dzongkhag basic fields (id, name, areaCode, areaSqKm)

**With Administrative Zones**
```http
GET /dzongkhag?includeAdminZones=true
```
Response: Dzongkhag + Administrative Zones

**With Sub-Administrative Zones**
```http
GET /dzongkhag?includeAdminZones=true&includeSubAdminZones=true
```
Response: Dzongkhag → Administrative Zones → Sub-Administrative Zones

**Complete Hierarchy**
```http
GET /dzongkhag?includeAdminZones=true&includeSubAdminZones=true&includeEAs=true
```
Response: Dzongkhag → Administrative Zones → Sub-Administrative Zones → Enumeration Areas

**With Geometry (all levels)**
```http
GET /dzongkhag?withGeom=true&includeAdminZones=true&includeSubAdminZones=true&includeEAs=true
```
Response: Complete hierarchy with all geometry fields

---

### GET /dzongkhag/:id

Get single dzongkhag by ID with optional associations.

#### Examples:

**Basic info**
```http
GET /dzongkhag/1
```

**With Administrative Zones**
```http
GET /dzongkhag/1?includeAdminZones=true
```

**Complete Hierarchy**
```http
GET /dzongkhag/1?includeAdminZones=true&includeSubAdminZones=true&includeEAs=true
```

**For Editing (with geometry)**
```http
GET /dzongkhag/1?withGeom=true&includeAdminZones=true
```

---

## Use Cases

### 1. Dropdown Selection
**Need**: Just dzongkhag names for dropdown
```http
GET /dzongkhag
```
**Response Size**: ~2-5 KB (minimal)

### 2. Table/List View
**Need**: Dzongkhag list with administrative zone count
```http
GET /dzongkhag?includeAdminZones=true
```
**Response Size**: ~10-20 KB (lightweight)

### 3. Dashboard Statistics
**Need**: Complete counts at all levels
```http
GET /dzongkhag?includeAdminZones=true&includeSubAdminZones=true&includeEAs=true
```
**Response Size**: ~50-100 KB (moderate)

### 4. Map Visualization
**Need**: All geometry for map display
```http
GET /dzongkhag?withGeom=true
```
**Response Size**: ~500 KB - 2 MB (heavy)

### 5. Detail Page
**Need**: Single dzongkhag with immediate children
```http
GET /dzongkhag/1?includeAdminZones=true
```
**Response Size**: ~5-10 KB (lightweight)

### 6. Data Export/Report
**Need**: Complete data with all nested relationships
```http
GET /dzongkhag/1?includeAdminZones=true&includeSubAdminZones=true&includeEAs=true
```
**Response Size**: ~20-50 KB per dzongkhag (moderate)

### 7. GIS Analysis
**Need**: Complete geometry at all levels
```http
GET /dzongkhag?withGeom=true&includeAdminZones=true&includeSubAdminZones=true
```
**Response Size**: ~2-5 MB (very heavy)

---

## Response Structure Examples

### Basic (No Associations)
```json
[
  {
    "id": 1,
    "name": "Thimphu",
    "areaCode": "14",
    "areaSqKm": 2708.5,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### With Administrative Zones
```json
[
  {
    "id": 1,
    "name": "Thimphu",
    "areaCode": "14",
    "areaSqKm": 2708.5,
    "administrativeZones": [
      {
        "id": 1,
        "dzongkhagId": 1,
        "name": "Thimphu Thromde",
        "areaCode": "1401",
        "type": "Thromde",
        "areaSqKm": 26.0
      },
      {
        "id": 2,
        "dzongkhagId": 1,
        "name": "Mewang Gewog",
        "areaCode": "1402",
        "type": "Gewog",
        "areaSqKm": 85.4
      }
    ]
  }
]
```

### Complete Hierarchy
```json
[
  {
    "id": 1,
    "name": "Thimphu",
    "areaCode": "14",
    "areaSqKm": 2708.5,
    "administrativeZones": [
      {
        "id": 1,
        "name": "Thimphu Thromde",
        "areaCode": "1401",
        "subAdministrativeZones": [
          {
            "id": 1,
            "name": "Motithang",
            "areaCode": "140101",
            "enumerationAreas": [
              {
                "id": 1,
                "name": "EA-001",
                "areaCode": "14010101",
                "description": "Motithang EA 1"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

---

## Performance Tips

1. **Only request what you need**: Each level of association increases response size and query time
2. **Avoid geometry when possible**: Geometry fields can be 10-100x larger than regular data
3. **Use pagination** (future): For large datasets, consider implementing pagination
4. **Cache results**: For frequently accessed data like dropdown lists, cache on frontend
5. **Hierarchical loading**: Load parent first, then children on demand (lazy loading)

---

## Frontend Integration Examples

### React/Angular - Dropdown
```typescript
// Lightweight - just names
const dzongkhags = await fetch('/dzongkhag').then(r => r.json());
```

### React/Angular - Detail View
```typescript
// Single record with children
const dzongkhag = await fetch(`/dzongkhag/${id}?includeAdminZones=true`).then(r => r.json());
```

### React/Angular - Map Display
```typescript
// Use GeoJSON endpoint instead
const geojson = await fetch('/dzongkhag/geojson/all').then(r => r.json());
```

### React/Angular - Statistics Dashboard
```typescript
// Complete hierarchy for counting
const data = await fetch('/dzongkhag?includeAdminZones=true&includeSubAdminZones=true&includeEAs=true').then(r => r.json());

const stats = data.map(dz => ({
  dzongkhag: dz.name,
  adminZones: dz.administrativeZones?.length || 0,
  subAdminZones: dz.administrativeZones?.reduce((sum, az) => sum + (az.subAdministrativeZones?.length || 0), 0) || 0,
  eas: dz.administrativeZones?.reduce((sum, az) => 
    sum + (az.subAdministrativeZones?.reduce((s, saz) => 
      s + (saz.enumerationAreas?.length || 0), 0) || 0), 0) || 0
}));
```

---

## Notes

- Sub-administrative zones will only be included if `includeAdminZones=true`
- Enumeration areas will only be included if both `includeAdminZones=true` and `includeSubAdminZones=true`
- Geometry is excluded by default for performance reasons
- All associations respect the `withGeom` parameter at their level

---

## Future Enhancements

- [ ] Add pagination support (`page`, `limit` query params)
- [ ] Add sorting options (`sortBy`, `order` query params)
- [ ] Add filtering by area (`minArea`, `maxArea` query params)
- [ ] Add search functionality (`search` query param)
- [ ] Add field selection (`fields` query param for specific fields only)
- [ ] Add statistics endpoint (`/dzongkhag/:id/stats`)
