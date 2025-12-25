# Merge Enumeration Areas API Documentation

## Overview

The merge operation combines multiple Enumeration Areas (EAs) into a single new EA. This endpoint automatically handles linking the merged EA to all Sub-Administrative Zones (SAZs) that the source EAs belonged to, ensuring no data loss.

**Key Feature**: When merging EAs from different SAZs, the system automatically collects all SAZ IDs from source EAs and links the merged EA to all of them via the junction table.

---

## Endpoint

```
POST /enumeration-area/merge
```

**Access**: Admin only (requires JWT authentication and ADMIN role)

**Content-Type**: `multipart/form-data`

---

## Request Format

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mergeData` | string (JSON) | Yes | JSON string containing merge configuration |
| `file` | File (GeoJSON) | Yes | GeoJSON file for the merged EA geometry |
| `reason` | string | No | Optional reason for the merge operation |

### mergeData Structure

The `mergeData` field must be a JSON string with the following structure:

```typescript
{
  sourceEaIds: number[];        // Array of EA IDs to merge (minimum 2)
  mergedEa: {
    name: string;                // Name of the merged EA
    areaCode: string;            // Unique area code for merged EA
    description: string;         // Description of merged EA
    subAdministrativeZoneIds?: number[];  // Optional: Additional SAZ IDs
  };
  reason?: string;               // Optional: Reason for merge
}
```

**Important Notes**:
- `subAdministrativeZoneIds` in `mergedEa` is **optional** - the system automatically collects all SAZ IDs from source EAs
- If provided, user-provided SAZ IDs will be merged with source EA SAZ IDs (union operation)
- The merged EA will be linked to **ALL** SAZs from source EAs, plus any additional SAZ IDs you provide

### File Requirements

- **Format**: GeoJSON (`.json` or `.geojson`)
- **Max Size**: 50MB
- **Accepted Types**:
  - `application/json`
  - `application/geo+json`
  - Files with `.json` or `.geojson` extension
- **Supported GeoJSON Types**:
  - `Feature` (with geometry property)
  - `FeatureCollection` (uses first feature's geometry)
  - Direct Geometry objects (`Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`, `MultiPolygon`, `GeometryCollection`)

---

## Automatic SAZ Collection

### How It Works

When you merge EAs from different SAZs, the system:

1. **Automatically loads** all SAZ relationships from source EAs
2. **Collects** all unique SAZ IDs from all source EAs
3. **Merges** collected SAZ IDs with any user-provided SAZ IDs (union operation)
4. **Creates junction table entries** linking the merged EA to all collected SAZ IDs

### Example Scenario

**Before Merge**:
- EA1 (ID: 101) → Linked to SAZ A (ID: 1)
- EA2 (ID: 102) → Linked to SAZ B (ID: 2)

**Merge Request**:
```json
{
  "sourceEaIds": [101, 102],
  "mergedEa": {
    "name": "Merged EA",
    "areaCode": "EA-MERGED-001",
    "description": "Merged from EA1 and EA2"
    // Note: subAdministrativeZoneIds is optional
  }
}
```

**After Merge**:
- Merged EA (ID: 201) → Linked to **both** SAZ A (ID: 1) and SAZ B (ID: 2)
- Junction table entries:
  - `EA_201 -> SAZ_1` ✓
  - `EA_201 -> SAZ_2` ✓

**Result**: All SAZ relationships are preserved automatically!

---

## Request Examples

### Example 1: Basic Merge (Same SAZ)

```javascript
const formData = new FormData();

const mergeData = {
  sourceEaIds: [101, 102],
  mergedEa: {
    name: "Merged Central Area",
    areaCode: "EA-MERGED-001",
    description: "Merged from EA101 and EA102"
  },
  reason: "Administrative consolidation"
};

formData.append('mergeData', JSON.stringify(mergeData));
formData.append('file', geoJsonFile); // Your GeoJSON file
formData.append('reason', 'Administrative consolidation');

// Using fetch
const response = await fetch('/enumeration-area/merge', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Example 2: Merge EAs from Different SAZs

```javascript
const formData = new FormData();

const mergeData = {
  sourceEaIds: [101, 102, 103],
  mergedEa: {
    name: "Cross-SAZ Merged Area",
    areaCode: "EA-MERGED-002",
    description: "Merged from multiple SAZs",
    // Optional: You can still provide additional SAZ IDs if needed
    // The system will merge these with source EA SAZ IDs
    subAdministrativeZoneIds: [5] // Additional SAZ (optional)
  }
};

formData.append('mergeData', JSON.stringify(mergeData));
formData.append('file', geoJsonFile);

const response = await fetch('/enumeration-area/merge', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**What Happens**:
- System collects SAZ IDs from EA 101, 102, and 103
- Merges with SAZ ID 5 (if provided)
- Creates junction entries for all collected SAZ IDs

### Example 3: Using Axios

```javascript
import axios from 'axios';

const mergeEAs = async (sourceEaIds, mergedEaData, geoJsonFile, reason) => {
  const formData = new FormData();
  
  const mergeData = {
    sourceEaIds,
    mergedEa: mergedEaData,
    reason
  };
  
  formData.append('mergeData', JSON.stringify(mergeData));
  formData.append('file', geoJsonFile);
  if (reason) {
    formData.append('reason', reason);
  }
  
  try {
    const response = await axios.post('/enumeration-area/merge', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Merge failed:', error.response?.data || error.message);
    throw error;
  }
};

// Usage
const result = await mergeEAs(
  [101, 102],
  {
    name: "Merged Area",
    areaCode: "EA-MERGED-001",
    description: "Description here"
    // subAdministrativeZoneIds is optional - auto-collected from source EAs
  },
  geoJsonFile,
  "Administrative consolidation"
);
```

---

## Response Format

### Success Response (200 OK)

```typescript
{
  id: number;                    // ID of the newly created merged EA
  name: string;
  areaCode: string;
  description: string;
  geom: string;                  // Geometry in PostGIS format
  isActive: boolean;             // Always true for new merged EA
  subAdministrativeZones: [      // Array of linked SAZs
    {
      id: number;
      name: string;
      areaCode: string;
      type: "chiwog" | "lap";
      administrativeZoneId: number;
      // ... other SAZ properties
    }
  ]
}
```

### Example Response

```json
{
  "id": 201,
  "name": "Merged Central Area",
  "areaCode": "EA-MERGED-001",
  "description": "Merged from EA101 and EA102",
  "isActive": true,
  "subAdministrativeZones": [
    {
      "id": 1,
      "name": "SAZ A",
      "areaCode": "SAZ-001",
      "type": "chiwog",
      "administrativeZoneId": 10
    },
    {
      "id": 2,
      "name": "SAZ B",
      "areaCode": "SAZ-002",
      "type": "lap",
      "administrativeZoneId": 11
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request

**Missing mergeData**:
```json
{
  "statusCode": 400,
  "message": "mergeData is required"
}
```

**Missing file**:
```json
{
  "statusCode": 400,
  "message": "GeoJSON file is required"
}
```

**Invalid sourceEaIds**:
```json
{
  "statusCode": 400,
  "message": "At least 2 source EAs are required for a merge"
}
```

**Invalid file type**:
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only .json or .geojson files are allowed."
}
```

**Invalid GeoJSON format**:
```json
{
  "statusCode": 400,
  "message": "Invalid GeoJSON format. Must be a Feature, FeatureCollection, or Geometry object."
}
```

**Duplicate area code**:
```json
{
  "statusCode": 400,
  "message": "Area code \"EA-MERGED-001\" already exists on an active enumeration area"
}
```

### 404 Not Found

**Source EA not found**:
```json
{
  "statusCode": 404,
  "message": "Enumeration areas not found: 999, 1000"
}
```

### 401 Unauthorized / 403 Forbidden

**Missing or invalid token**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Insufficient permissions**:
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

## Important Notes

### 1. Automatic SAZ Collection

✅ **You don't need to manually collect SAZ IDs** from source EAs - the system does this automatically.

✅ **All source EA SAZ relationships are preserved** in the merged EA.

✅ **You can still provide additional SAZ IDs** if the merged EA should link to additional SAZs beyond those from source EAs.

### 2. Source EA Status

- Source EAs are automatically marked as **inactive** after merge
- `deactivatedAt` timestamp is set
- `deactivatedReason` is set to the provided reason or default message

### 3. Area Code Validation

- The merged EA must have a unique `areaCode`
- You can reuse the area code from one of the source EAs (that EA will be deactivated)
- Cannot use an area code that exists on another active EA

### 4. Lineage Tracking

- Lineage records are created linking each source EA to the merged EA
- Operation type: `MERGE`
- Operation date and reason are recorded

### 5. Transaction Safety

- The entire merge operation runs in a database transaction
- If any step fails, all changes are rolled back
- No partial merges are possible

---

## Frontend Implementation Tips

### 1. Preparing GeoJSON File

```javascript
// Create a GeoJSON Feature for the merged EA
const mergedGeoJson = {
  type: "Feature",
  properties: {
    name: "Merged Area",
    areaCode: "EA-MERGED-001"
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      // Your coordinates here
    ]
  }
};

// Convert to Blob for FormData
const geoJsonBlob = new Blob([JSON.stringify(mergedGeoJson)], {
  type: 'application/json'
});
const geoJsonFile = new File([geoJsonBlob], 'merged-ea.geojson', {
  type: 'application/geo+json'
});
```

### 2. Validating Before Submit

```javascript
const validateMergeRequest = (sourceEaIds, mergedEaData, file) => {
  const errors = [];
  
  // Validate source EAs
  if (!sourceEaIds || sourceEaIds.length < 2) {
    errors.push('At least 2 source EAs are required');
  }
  
  // Validate merged EA data
  if (!mergedEaData.name) {
    errors.push('Merged EA name is required');
  }
  if (!mergedEaData.areaCode) {
    errors.push('Merged EA area code is required');
  }
  if (!mergedEaData.description) {
    errors.push('Merged EA description is required');
  }
  
  // Validate file
  if (!file) {
    errors.push('GeoJSON file is required');
  } else if (!file.name.endsWith('.json') && !file.name.endsWith('.geojson')) {
    errors.push('File must be a .json or .geojson file');
  } else if (file.size > 50 * 1024 * 1024) {
    errors.push('File size must be less than 50MB');
  }
  
  return errors;
};
```

### 3. Handling Response

```javascript
const handleMergeSuccess = (response) => {
  const mergedEA = response.data;
  
  console.log(`Merged EA created with ID: ${mergedEA.id}`);
  console.log(`Linked to ${mergedEA.subAdministrativeZones.length} SAZs:`);
  mergedEA.subAdministrativeZones.forEach(saz => {
    console.log(`  - ${saz.name} (ID: ${saz.id})`);
  });
  
  // Update UI, show success message, etc.
};
```

### 4. Error Handling

```javascript
const handleMergeError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        // Bad request - show validation errors
        alert(`Validation Error: ${data.message}`);
        break;
      case 401:
        // Unauthorized - redirect to login
        window.location.href = '/login';
        break;
      case 403:
        // Forbidden - show permission error
        alert('You do not have permission to merge EAs');
        break;
      case 404:
        // Not found - show not found error
        alert(`Error: ${data.message}`);
        break;
      default:
        alert(`An error occurred: ${data.message || 'Unknown error'}`);
    }
  } else {
    alert('Network error. Please check your connection.');
  }
};
```

---

## Testing Checklist

Before deploying to production, test:

- [ ] Merge 2 EAs from the same SAZ
- [ ] Merge 2 EAs from different SAZs
- [ ] Merge 3+ EAs from multiple SAZs
- [ ] Verify all SAZ linkages are created correctly
- [ ] Test with optional `subAdministrativeZoneIds` provided
- [ ] Test without `subAdministrativeZoneIds` (should auto-collect)
- [ ] Verify source EAs are marked inactive
- [ ] Test error cases (invalid file, missing data, etc.)
- [ ] Verify area code uniqueness validation
- [ ] Test with different GeoJSON formats (Feature, FeatureCollection, Geometry)

---

## Support

For questions or issues, contact the backend team or refer to the main API documentation.

