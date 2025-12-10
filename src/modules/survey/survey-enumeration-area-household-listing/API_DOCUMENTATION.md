# Survey Enumeration Area Household Listing API Documentation

## Overview
This module provides endpoints for managing household listings within survey enumeration areas. Household listings represent individual households within structures during survey enumeration.

## Base URL
```
/survey-enumeration-area-household-listing
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <accessToken>
```

## Endpoints

### Get Household Listings by Structure ID

Retrieves all household listings associated with a specific structure.

**Endpoint:** `GET /survey-enumeration-area-household-listing/by-structure/:structureId`

**Access:** Admin, Supervisor, Enumerator

**Path Parameters:**
- `structureId` (integer, required) - The ID of the structure

**Response:**
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`

**Response Body:**
```json
[
  {
    "id": 1,
    "surveyEnumerationAreaId": 5,
    "structureId": 10,
    "householdIdentification": "HH-0001",
    "householdSerialNumber": 1,
    "nameOfHOH": "John Doe",
    "totalMale": 2,
    "totalFemale": 3,
    "phoneNumber": "+97517123456",
    "remarks": "Sample household",
    "submittedBy": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "submitter": {
      "id": 1,
      "name": "Enumerator Name",
      "phoneNumber": "+97517123456",
      "cid": "123456789"
    },
    "structure": {
      "id": 10,
      "structureNumber": "STR-0001",
      "latitude": null,
      "longitude": null
    },
    "surveyEnumerationArea": {
      "id": 5,
      "surveyId": 2,
      "enumerationAreaId": 3
    }
  }
]
```

**Example Request:**
```bash
curl -X GET \
  'https://api.example.com/survey-enumeration-area-household-listing/by-structure/10' \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json'
```

**Example Response:**
```json
[
  {
    "id": 1,
    "surveyEnumerationAreaId": 5,
    "structureId": 10,
    "householdIdentification": "HH-0001",
    "householdSerialNumber": 1,
    "nameOfHOH": "John Doe",
    "totalMale": 2,
    "totalFemale": 3,
    "phoneNumber": "+97517123456",
    "remarks": "Sample household",
    "submittedBy": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "submitter": {
      "id": 1,
      "name": "Enumerator Name",
      "phoneNumber": "+97517123456",
      "cid": "123456789"
    },
    "structure": {
      "id": 10,
      "structureNumber": "STR-0001",
      "latitude": null,
      "longitude": null
    },
    "surveyEnumerationArea": {
      "id": 5,
      "surveyId": 2,
      "enumerationAreaId": 3
    }
  }
]
```

**Error Responses:**

**404 Not Found** - Structure not found or no households associated
```json
{
  "statusCode": 404,
  "message": "No household listings found for structure ID 10",
  "error": "Not Found"
}
```

**401 Unauthorized** - Missing or invalid authentication token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden** - User doesn't have required role
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

**Notes:**
- Results are ordered by `householdSerialNumber` in ascending order
- The response includes related data:
  - `submitter`: User who submitted the household listing
  - `structure`: Structure details (number, coordinates)
  - `surveyEnumerationArea`: Survey enumeration area information
- If no households are found for the structure, an empty array `[]` is returned
- Multiple households can be associated with a single structure

**Use Cases:**
- View all households within a specific structure
- Validate structure-household relationships
- Generate reports for structures with multiple households
- Track household data by structure location

---

### Get Current Structures for Enumeration Area

Retrieves all structures from the latest published survey for a specific enumeration area.

**Endpoint:** `GET /survey-enumeration-area-household-listing/current/enumeration-area/:enumerationAreaId/structures`

**Access:** Admin, Supervisor, Enumerator

**Path Parameters:**
- `enumerationAreaId` (integer, required) - The ID of the enumeration area

**Response:**
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`

**Response Body:**
```json
[
  {
    "id": 10,
    "surveyEnumerationAreaId": 5,
    "structureNumber": "STR-0001",
    "latitude": null,
    "longitude": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": 11,
    "surveyEnumerationAreaId": 5,
    "structureNumber": "STR-0002",
    "latitude": 27.4725,
    "longitude": 89.6390,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

**Example Request:**
```bash
curl -X GET \
  'https://api.example.com/survey-enumeration-area-household-listing/current/enumeration-area/3/structures' \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json'
```

**Example Response:**
```json
[
  {
    "id": 10,
    "surveyEnumerationAreaId": 5,
    "structureNumber": "STR-0001",
    "latitude": null,
    "longitude": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

**Error Responses:**

**401 Unauthorized** - Missing or invalid authentication token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden** - User doesn't have required role
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

**Notes:**
- Returns structures from the **latest published survey** for the enumeration area
- Results are ordered by `structureNumber` in ascending order
- If no published survey exists for the enumeration area, returns an empty array `[]`
- Only returns structures, no household data or other related information
- Structures may have null latitude/longitude if geolocation was not captured

**Use Cases:**
- Get all structures in an enumeration area from the most recent survey
- Display structure locations on a map
- Validate structure data for an enumeration area
- Generate structure reports

---

## Related Endpoints

### Get Household Listings by Survey Enumeration Area
- **Endpoint:** `GET /survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId`
- **Description:** Get all household listings for a survey enumeration area

### Get Current Household Listings
- **Endpoint:** `GET /survey-enumeration-area-household-listing/current/enumeration-area/:enumerationAreaId`
- **Description:** Get current household listings from the latest published survey

### Get Single Household Listing
- **Endpoint:** `GET /survey-enumeration-area-household-listing/:id`
- **Description:** Get a specific household listing by ID

### Create Household Listing
- **Endpoint:** `POST /survey-enumeration-area-household-listing`
- **Description:** Create a new household listing

### Update Household Listing
- **Endpoint:** `PATCH /survey-enumeration-area-household-listing/:id`
- **Description:** Update an existing household listing

---

## Data Models

### Household Listing Entity
```typescript
{
  id: number;
  surveyEnumerationAreaId: number;
  structureId: number;
  householdIdentification: string;
  householdSerialNumber: number;
  nameOfHOH: string;
  totalMale: number;
  totalFemale: number;
  phoneNumber?: string;
  remarks?: string;
  submittedBy: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Structure Entity (included in response)
```typescript
{
  id: number;
  structureNumber: string;
  latitude?: number;
  longitude?: number;
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial endpoint implementation |

