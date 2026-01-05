# Enumeration Area Bulk Upload by Sub-Administrative Zone API

## Overview

This API endpoint allows users to bulk upload enumeration areas (EAs) from a GeoJSON file, automatically assigning them to a specified Sub-Administrative Zone (SAZ). The system automatically handles the SAZ assignment - no need to include `subAdministrativeZoneIds` in the GeoJSON properties.

## Endpoint

```
POST /enumeration-area/by-sub-administrative-zone/:subAdministrativeZoneId/bulk-upload-geojson
```

## Access Level

**Public** - No authentication required

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subAdministrativeZoneId` | integer | Yes | The ID of the Sub-Administrative Zone to assign to all uploaded EAs |

## Request Format

**Content-Type:** `multipart/form-data`

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | GeoJSON FeatureCollection file (.json or .geojson) |

### File Requirements

- **File Size:** Maximum 50MB
- **File Format:** Must be a valid GeoJSON FeatureCollection
- **File Extensions:** `.json` or `.geojson`
- **MIME Types:** `application/json` or `application/geo+json`

### GeoJSON Structure

The uploaded file must be a **FeatureCollection** with the following structure:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lon1, lat1], [lon2, lat2], ...]]
      },
      "properties": {
        "name": "EA Name",
        "description": "EA Description",
        "areaCode": "EA001"
      }
    },
    ...
  ]
}
```

### Feature Properties (Required)

Each Feature in the FeatureCollection **must** include the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Name of the enumeration area |
| `description` | string | Yes | Description of the enumeration area |
| `areaCode` | string | Yes | Unique area code for the enumeration area |

**Note:** The `subAdministrativeZoneId` is **NOT** required in the properties. The system automatically assigns the SAZ ID from the URL parameter to all EAs.

### Geometry Types Supported

The following GeoJSON geometry types are supported:
- `Point`
- `LineString`
- `Polygon`
- `MultiPoint`
- `MultiLineString`
- `MultiPolygon`
- `GeometryCollection`

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": 5,
  "skipped": 2,
  "created": [
    {
      "id": 101,
      "name": "EA Name 1",
      "description": "EA Description 1",
      "areaCode": "EA001",
      "isActive": true,
      "subAdministrativeZoneId": 1
    },
    ...
  ],
  "skippedItems": [
    {
      "areaCode": "EA002",
      "subAdministrativeZoneIds": [1],
      "reason": "Enumeration Area with this areaCode and SubAdministrativeZoneId combination already exists"
    },
    ...
  ],
  "errors": []
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | integer | Number of enumeration areas successfully created |
| `skipped` | integer | Number of enumeration areas skipped (duplicates) |
| `created` | array | Array of successfully created enumeration area objects |
| `skippedItems` | array | Array of skipped items with reason |
| `errors` | array | Array of errors encountered during processing |

### Error Responses

#### 400 Bad Request - No File Uploaded

```json
{
  "statusCode": 400,
  "message": "No file uploaded",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Invalid File Type

```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only .json or .geojson files are allowed.",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Invalid GeoJSON Format

```json
{
  "statusCode": 400,
  "message": "Invalid GeoJSON format. Must be a FeatureCollection.",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Empty FeatureCollection

```json
{
  "statusCode": 400,
  "message": "FeatureCollection contains no features.",
  "error": "Bad Request"
}
```

#### 404 Not Found - Sub-Administrative Zone Not Found

```json
{
  "statusCode": 404,
  "message": "Sub-Administrative Zone with ID 999 not found",
  "error": "Not Found"
}
```

#### 400 Bad Request - Processing Error

```json
{
  "statusCode": 400,
  "message": "Failed to process GeoJSON file: [error details]",
  "error": "Bad Request"
}
```

## Behavior

### Automatic SAZ Assignment

- The `subAdministrativeZoneId` from the URL path is **automatically assigned** to all enumeration areas created from the uploaded GeoJSON file
- No need to include `subAdministrativeZoneIds` in the GeoJSON feature properties
- The system validates that the SAZ exists before processing

### Duplicate Detection

- The system checks if an EA with the same `areaCode` already exists for the specified `subAdministrativeZoneId`
- Duplicate EAs are **skipped** (not created) and included in the `skippedItems` array
- The original EA remains unchanged

### Validation

- Each feature is validated individually
- Features with missing required properties (`name`, `description`, `areaCode`) are added to the `errors` array
- Invalid geometries are caught and added to the `errors` array
- Processing continues even if some features fail validation

### Transaction Handling

- Each EA is created independently
- If one EA fails, others continue to be processed
- Failed items are reported in the `errors` array

## Example Usage

### cURL Example

```bash
curl -X POST \
  http://localhost:3000/enumeration-area/by-sub-administrative-zone/1/bulk-upload-geojson \
  -F "file=@enumeration_areas.geojson"
```

### JavaScript/Fetch Example

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(
  '/enumeration-area/by-sub-administrative-zone/1/bulk-upload-geojson',
  {
    method: 'POST',
    body: formData,
  }
);

const result = await response.json();
console.log(`Created: ${result.success}, Skipped: ${result.skipped}`);
```

### Python Example

```python
import requests

url = "http://localhost:3000/enumeration-area/by-sub-administrative-zone/1/bulk-upload-geojson"

with open('enumeration_areas.geojson', 'rb') as f:
    files = {'file': f}
    response = requests.post(url, files=files)
    result = response.json()
    print(f"Created: {result['success']}, Skipped: {result['skipped']}")
```

## Sample GeoJSON File

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [89.5, 27.3],
          [89.6, 27.3],
          [89.6, 27.4],
          [89.5, 27.4],
          [89.5, 27.3]
        ]]
      },
      "properties": {
        "name": "Thimphu Central EA",
        "description": "Central enumeration area in Thimphu",
        "areaCode": "THM-CENT-001"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [89.6, 27.3],
          [89.7, 27.3],
          [89.7, 27.4],
          [89.6, 27.4],
          [89.6, 27.3]
        ]]
      },
      "properties": {
        "name": "Thimphu North EA",
        "description": "Northern enumeration area in Thimphu",
        "areaCode": "THM-NORTH-001"
      }
    }
  ]
}
```

## Notes

1. **SAZ Validation:** The system validates that the specified `subAdministrativeZoneId` exists before processing any features. If the SAZ doesn't exist, the entire request fails with a 404 error.

2. **Area Code Uniqueness:** Area codes must be unique within the same Sub-Administrative Zone. If an EA with the same `areaCode` already exists for the specified SAZ, it will be skipped.

3. **Partial Success:** The endpoint supports partial success - some EAs may be created while others are skipped or fail. Check the response to see which items succeeded, which were skipped, and which had errors.

4. **File Size Limit:** The maximum file size is 50MB. For larger datasets, consider splitting the file into multiple uploads.

5. **Geometry Validation:** The system validates GeoJSON geometries but does not perform spatial validation (e.g., checking if polygons are valid or if coordinates are within expected bounds).

6. **Active Status:** All created enumeration areas are set to `isActive: true` by default.

## Related Endpoints

- `POST /enumeration-area/bulk-upload-geojson` - Bulk upload with SAZ IDs in GeoJSON properties
- `GET /enumeration-area/by-sub-administrative-zone/:subAdministrativeZoneId` - Get all EAs for a SAZ
- `GET /enumeration-area/:id` - Get a single EA by ID

