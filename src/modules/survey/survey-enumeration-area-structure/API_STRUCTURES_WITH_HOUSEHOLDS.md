# API Documentation: Get Structures with Household Listings

## Endpoint

**GET** `/survey-enumeration-area-structure/survey-ea/structures/:seaId`

## Description

Retrieves all structures for a specific survey enumeration area with their associated household listings. The response is grouped by structure, making it perfect for displaying household listings organized by structure in the UI.

## Authentication

Requires JWT authentication and one of the following roles:
- `ADMIN`
- `SUPERVISOR`
- `ENUMERATOR`

## URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `seaId` | integer | Yes | Survey Enumeration Area ID |

## Request Example

```bash
GET /survey-enumeration-area-structure/survey-ea/structures/1
Authorization: Bearer <your-jwt-token>
```

```javascript
// Using fetch
fetch('http://localhost:3000/survey-enumeration-area-structure/survey-ea/structures/1', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer <your-jwt-token>',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

## Response Structure

### Success Response (200 OK)

Returns an array of structures, each containing:
- Structure details (id, structureNumber, coordinates)
- Array of household listings associated with the structure
- Submitter information for each household
- Survey enumeration area reference

```json
[
  {
    "id": 1,
    "surveyEnumerationAreaId": 1,
    "structureNumber": "STR-0001",
    "latitude": "27.12345678",
    "longitude": "89.56789012",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "householdListings": [
      {
        "id": 1,
        "householdIdentification": "HH-0001",
        "householdSerialNumber": 1,
        "nameOfHOH": "Tshewang Dorji",
        "totalMale": 2,
        "totalFemale": 3,
        "phoneNumber": "+975-17123456",
        "remarks": "Residential building",
        "submittedBy": 5,
        "createdAt": "2025-01-15T11:00:00.000Z",
        "updatedAt": "2025-01-15T11:00:00.000Z",
        "submitter": {
          "id": 5,
          "name": "Nima Yoezer",
          "cid": "12345678901",
          "emailAddress": "nima.yoezer@example.com",
          "phoneNumber": "+975-17111111"
        }
      },
      {
        "id": 2,
        "householdIdentification": "HH-0002",
        "householdSerialNumber": 2,
        "nameOfHOH": "Pema Wangmo",
        "totalMale": 1,
        "totalFemale": 2,
        "phoneNumber": "+975-17234567",
        "remarks": null,
        "submittedBy": 5,
        "createdAt": "2025-01-15T11:15:00.000Z",
        "updatedAt": "2025-01-15T11:15:00.000Z",
        "submitter": {
          "id": 5,
          "name": "Nima Yoezer",
          "cid": "12345678901",
          "emailAddress": "nima.yoezer@example.com",
          "phoneNumber": "+975-17111111"
        }
      }
    ],
    "surveyEnumerationArea": {
      "id": 1,
      "surveyId": 1,
      "enumerationAreaId": 5
    }
  },
  {
    "id": 2,
    "surveyEnumerationAreaId": 1,
    "structureNumber": "STR-0002",
    "latitude": "27.12378901",
    "longitude": "89.56812345",
    "createdAt": "2025-01-15T10:35:00.000Z",
    "updatedAt": "2025-01-15T10:35:00.000Z",
    "householdListings": [
      {
        "id": 3,
        "householdIdentification": "HH-0003",
        "householdSerialNumber": 3,
        "nameOfHOH": "Karma Tenzin",
        "totalMale": 3,
        "totalFemale": 4,
        "phoneNumber": "+975-17345678",
        "remarks": "Multi-family dwelling",
        "submittedBy": 5,
        "createdAt": "2025-01-15T11:30:00.000Z",
        "updatedAt": "2025-01-15T11:30:00.000Z",
        "submitter": {
          "id": 5,
          "name": "Nima Yoezer",
          "cid": "12345678901",
          "emailAddress": "nima.yoezer@example.com",
          "phoneNumber": "+975-17111111"
        }
      }
    ],
    "surveyEnumerationArea": {
      "id": 1,
      "surveyId": 1,
      "enumerationAreaId": 5
    }
  }
]
```

### Error Responses

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Survey enumeration area with ID 999 not found",
  "error": "Not Found"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

## Response Fields

### Structure Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique structure identifier |
| `surveyEnumerationAreaId` | integer | Reference to survey enumeration area |
| `structureNumber` | string | Structure identifier (e.g., "STR-0001") |
| `latitude` | decimal(10,8) | Latitude coordinate (nullable) |
| `longitude` | decimal(11,8) | Longitude coordinate (nullable) |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |
| `householdListings` | array | Array of household listings for this structure |
| `surveyEnumerationArea` | object | Survey enumeration area reference |

### Household Listing Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique household listing identifier |
| `householdIdentification` | string | Household ID (e.g., "HH-0001") |
| `householdSerialNumber` | integer | Sequential number within survey-EA |
| `nameOfHOH` | string | Name of Head of Household |
| `totalMale` | integer | Total male population |
| `totalFemale` | integer | Total female population |
| `phoneNumber` | string | Contact phone number (nullable) |
| `remarks` | string | Additional notes (nullable) |
| `submittedBy` | integer | User ID who submitted the listing |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |
| `submitter` | object | User who submitted this household listing |

### Submitter Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | User ID |
| `name` | string | User's full name |
| `cid` | string | Citizen ID number |
| `emailAddress` | string | Email address |
| `phoneNumber` | string | Phone number |

## Use Cases

### 1. Display Household Listings Grouped by Structure

Perfect for UI components that need to show structures and their households:

```javascript
// Frontend usage example
const structures = await fetchStructuresWithHouseholds(seaId);

structures.forEach(structure => {
  console.log(`Structure: ${structure.structureNumber}`);
  console.log(`Households: ${structure.householdListings.length}`);
  
  structure.householdListings.forEach(household => {
    console.log(`  - ${household.householdIdentification}: ${household.nameOfHOH}`);
  });
});
```

### 2. Calculate Statistics per Structure

```javascript
const structures = await fetchStructuresWithHouseholds(seaId);

const statistics = structures.map(structure => ({
  structureNumber: structure.structureNumber,
  householdCount: structure.householdListings.length,
  totalPopulation: structure.householdListings.reduce((sum, h) => 
    sum + h.totalMale + h.totalFemale, 0
  ),
  totalMale: structure.householdListings.reduce((sum, h) => 
    sum + h.totalMale, 0
  ),
  totalFemale: structure.householdListings.reduce((sum, h) => 
    sum + h.totalFemale, 0
  )
}));
```

### 3. Map Visualization

Use structure coordinates and household count for mapping:

```javascript
const structures = await fetchStructuresWithHouseholds(seaId);

const mapMarkers = structures
  .filter(s => s.latitude && s.longitude)
  .map(structure => ({
    position: {
      lat: parseFloat(structure.latitude),
      lng: parseFloat(structure.longitude)
    },
    structureNumber: structure.structureNumber,
    householdCount: structure.householdListings.length,
    households: structure.householdListings
  }));
```

## Sorting

- Structures are sorted by `structureNumber` in ascending order (A-Z, 1-9)
- Household listings within each structure are sorted by `householdSerialNumber` in ascending order

## Performance Considerations

- This endpoint performs eager loading of all related data
- For large datasets, consider pagination or filtering
- Structures without household listings will have an empty `householdListings` array

## Related Endpoints

- `GET /survey-enumeration-area-structure/:id` - Get single structure
- `GET /survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId` - Get all households (flat list)
- `POST /survey-enumeration-area-structure/:structureId/add-household` - Add household to structure

## Notes

- Structures are always returned, even if they have no household listings (empty array)
- Household listings include submitter information for audit trail
- All timestamps are in ISO 8601 format (UTC)

