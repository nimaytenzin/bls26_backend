# Enumeration Areas by Dzongkhag Route Documentation

## Overview
This endpoint provides enumeration area management functionality by dzongkhag, following the complete administrative hierarchy: **Dzongkhag → Administrative Zone → Sub-Administrative Zone → Enumeration Area**.

## Route Details

### Endpoint
```
GET /dzongkhag/:id/enumeration-areas
```

### Access Level
- **Public** (Read-only)
- No authentication required

### Parameters

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Dzongkhag ID |

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `withGeom` | boolean | `false` | Include geometry for enumeration areas |
| `includeHierarchy` | boolean | `true` | Include full administrative hierarchy |

### Response Formats

#### 1. Hierarchical Response (Default)
When `includeHierarchy=true` (default), returns complete administrative hierarchy:

```json
{
  "id": 1,
  "name": "Thimphu",
  "dzongkhagCode": "THU",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "administrativeZones": [
    {
      "id": 1,
      "name": "Thimphu Throm",
      "zoneCode": "TT",
      "dzongkhagId": 1,
      "subAdministrativeZones": [
        {
          "id": 1,
          "name": "Changzamtok",
          "subZoneCode": "CZ",
          "administrativeZoneId": 1,
          "enumerationAreas": [
            {
              "id": 1,
              "name": "Pamtsho-I",
              "areaCode": "01",
              "description": "Pamtsho -I",
              "areaSqKm": 0.20154,
              "subAdministrativeZoneId": 1
            },
            {
              "id": 2,
              "name": "Pamtsho-II",
              "areaCode": "02",
              "description": "Pamtsho -2",
              "areaSqKm": 0.06802,
              "subAdministrativeZoneId": 1
            }
          ]
        }
      ]
    }
  ]
}
```

#### 2. Flat List Response
When `includeHierarchy=false`, returns flattened enumeration areas list:

```json
{
  "dzongkhagId": 1,
  "totalCount": 125,
  "enumerationAreas": [
    {
      "id": 1,
      "name": "Pamtsho-I",
      "areaCode": "01",
      "description": "Pamtsho -I",
      "areaSqKm": 0.20154,
      "subAdministrativeZoneId": 1
    },
    {
      "id": 2,
      "name": "Pamtsho-II",
      "areaCode": "02",
      "description": "Pamtsho -2",
      "areaSqKm": 0.06802,
      "subAdministrativeZoneId": 1
    }
  ]
}
```

### Usage Examples

#### 1. Basic Usage - Get All Enumeration Areas for Thimphu with Hierarchy
```bash
GET /dzongkhag/1/enumeration-areas
```

#### 2. Include Geometry Data
```bash
GET /dzongkhag/1/enumeration-areas?withGeom=true
```

#### 3. Flat List (Performance Optimized)
```bash
GET /dzongkhag/1/enumeration-areas?includeHierarchy=false
```

#### 4. Flat List with Geometry
```bash
GET /dzongkhag/1/enumeration-areas?includeHierarchy=false&withGeom=true
```

### Use Cases

#### 1. **Enumeration Area Management Dashboard**
```javascript
// Get complete hierarchy for tree view
const response = await fetch('/dzongkhag/1/enumeration-areas');
const dzongkhag = await response.json();

// Build hierarchical tree structure
dzongkhag.administrativeZones.forEach(adminZone => {
  adminZone.subAdministrativeZones.forEach(subAdminZone => {
    console.log(`${subAdminZone.name}: ${subAdminZone.enumerationAreas.length} EAs`);
  });
});
```

#### 2. **Census Data Collection Interface**
```javascript
// Get flat list for dropdown selection
const response = await fetch('/dzongkhag/1/enumeration-areas?includeHierarchy=false');
const data = await response.json();

// Populate dropdown with all enumeration areas
const dropdown = data.enumerationAreas.map(ea => ({
  value: ea.id,
  label: `${ea.areaCode} - ${ea.name}`
}));
```

#### 3. **Map Visualization**
```javascript
// Get enumeration areas with geometry for mapping
const response = await fetch('/dzongkhag/1/enumeration-areas?withGeom=true&includeHierarchy=false');
const data = await response.json();

// Add to map
data.enumerationAreas.forEach(ea => {
  if (ea.geom) {
    addToMap(ea.geom, ea.name);
  }
});
```

#### 4. **Statistical Reports**
```javascript
// Get hierarchical data for statistical analysis
const response = await fetch('/dzongkhag/1/enumeration-areas');
const dzongkhag = await response.json();

// Calculate statistics by administrative zones
const stats = dzongkhag.administrativeZones.map(adminZone => ({
  zoneName: adminZone.name,
  subZoneCount: adminZone.subAdministrativeZones.length,
  totalEAs: adminZone.subAdministrativeZones.reduce((total, subZone) => 
    total + subZone.enumerationAreas.length, 0
  ),
  totalArea: adminZone.subAdministrativeZones.reduce((total, subZone) => 
    total + subZone.enumerationAreas.reduce((subTotal, ea) => 
      subTotal + (ea.areaSqKm || 0), 0
    ), 0
  )
}));
```

### Performance Considerations

#### 1. **Use Hierarchy Mode For:**
- Management dashboards
- Tree view components
- Administrative reporting
- Complete data analysis

#### 2. **Use Flat Mode For:**
- Dropdown lists
- Search interfaces
- Large dataset processing
- API integrations

#### 3. **Geometry Inclusion:**
- Only include geometry when needed for mapping
- Geometry significantly increases response size
- Consider pagination for large datasets with geometry

### Error Responses

#### 404 - Dzongkhag Not Found
```json
{
  "statusCode": 404,
  "message": "Dzongkhag with ID 999 not found",
  "error": "Not Found"
}
```

#### 400 - Invalid Parameters
```json
{
  "statusCode": 400,
  "message": "Invalid dzongkhag ID",
  "error": "Bad Request"
}
```

### Related Endpoints

#### Complete Hierarchy Endpoints
```bash
# Get dzongkhag with all nested associations
GET /dzongkhag/1?includeAdminZones=true&includeSubAdminZones=true&includeEAs=true

# Get administrative zones by dzongkhag
GET /administrative-zone?dzongkhagId=1

# Get sub-administrative zones by administrative zone
GET /sub-administrative-zone?administrativeZoneId=1

# Get enumeration areas by sub-administrative zone
GET /enumeration-area?subAdministrativeZoneId=1
```

#### Alternative Routes for Enumeration Area Management
```bash
# Direct enumeration area operations
GET /enumeration-area                    # All enumeration areas
GET /enumeration-area/:id               # Single enumeration area
POST /enumeration-area                  # Create enumeration area
PUT /enumeration-area/:id              # Update enumeration area
DELETE /enumeration-area/:id           # Delete enumeration area

# Bulk operations
POST /enumeration-area/bulk-upload-geojson  # Bulk upload from GeoJSON
```

### Data Integrity Notes

1. **Referential Integrity**: All enumeration areas belong to a sub-administrative zone, which belongs to an administrative zone, which belongs to a dzongkhag.

2. **Cascade Operations**: Deleting a dzongkhag will cascade to all child entities.

3. **Validation**: Area codes must be unique within their parent sub-administrative zone.

4. **Geometry**: Enumeration areas should be within the bounds of their parent sub-administrative zone.

This endpoint provides the most efficient way to manage enumeration areas within the context of their administrative hierarchy, making it ideal for census management, administrative reporting, and geographic data analysis.