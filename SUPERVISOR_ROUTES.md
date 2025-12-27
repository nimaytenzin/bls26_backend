# Supervisor Routes Documentation

## Overview

This document describes all supervisor-specific API routes. Supervisors can only access and manage data (Enumeration Areas, enumerators, household listings) within their assigned dzongkhags. All routes are prefixed with `/supervisor/` and require `SUPERVISOR` role authentication.

## Authentication

All supervisor routes require:
- JWT authentication via `JwtAuthGuard`
- Role-based authorization via `RolesGuard` with `UserRole.SUPERVISOR`
- User ID extracted from JWT token (`req.user?.id`)

## Base URL

All routes are prefixed with `/supervisor/`

---

## 0. Survey Routes

### 0.1 Get Single Survey

**Endpoint:** `GET /supervisor/survey/:surveyId`

**Description:** Get a single survey by ID. Only returns the survey if it has enumeration areas within the supervisor's assigned dzongkhags. Returns 404 if the survey doesn't exist or the supervisor doesn't have access to it.

**Parameters:**
- `surveyId` (path, required): Survey ID

**Response:**
```json
{
  "id": 4,
  "name": "2024 Household Survey",
  "description": "Annual household survey for 2024",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "year": 2024,
  "status": "ACTIVE",
  "isFullyValidated": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "enumerationAreas": [
    {
      "id": 1,
      "name": "EA-001",
      "areaCode": "01010101",
      "SurveyEnumerationArea": {
        "id": 1,
        "surveyId": 4,
        "enumerationAreaId": 1
      }
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor
- `404 Not Found`: Survey not found or supervisor doesn't have access to it

---

### 0.2 Get Enumeration Hierarchy for Survey

**Endpoint:** `GET /supervisor/survey/:surveyId/enumeration-hierarchy`

**Description:** Get enumeration hierarchy for a survey, filtered to only include dzongkhags assigned to the supervisor. Returns hierarchical structure: Dzongkhag → Administrative Zone → Sub-Administrative Zone → Enumeration Areas with workflow status and household counts.

**Parameters:**
- `surveyId` (path, required): Survey ID

**Response:**
```json
{
  "survey": {
    "id": 4,
    "name": "2024 Household Survey",
    "year": 2024,
    "status": "ACTIVE"
  },
  "summary": {
    "totalDzongkhags": 2,
    "totalAdministrativeZones": 5,
    "totalSubAdministrativeZones": 12,
    "totalEnumerationAreas": 25
  },
  "hierarchy": [
    {
      "id": 1,
      "name": "Bumthang",
      "areaCode": "01",
      "administrativeZones": [
        {
          "id": 1,
          "name": "Chhoekhor Gewog",
          "areaCode": "0101",
          "type": "Gewog",
          "subAdministrativeZones": [
            {
              "id": 1,
              "name": "Chhoekhor Chiwog",
              "areaCode": "010101",
              "type": "chiwog",
              "enumerationAreas": [
                {
                  "id": 1,
                  "name": "EA-001",
                  "areaCode": "01010101",
                  "surveyEnumerationAreaId": 1,
                  "totalHouseholdCount": 25,
                  "isEnumerated": true,
                  "enumeratedBy": 5,
                  "enumerationDate": "2024-01-15T10:00:00Z",
                  "isSampled": false,
                  "sampledBy": null,
                  "sampledDate": null,
                  "isPublished": false,
                  "publishedBy": null,
                  "publishedDate": null
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor
- `404 Not Found`: Survey not found

---

## 1. Enumeration Area Routes

### 1.1 Get EAs by Survey (Scoped to Supervisor's Dzongkhags)

**Endpoint:** `GET /supervisor/survey-enumeration-area/by-survey/:surveyId`

**Description:** Get all enumeration areas for a specific survey, filtered to only include EAs within the supervisor's assigned dzongkhags. Returns hierarchical structure: Dzongkhag -> Administrative Zone -> Sub-Administrative Zone -> Enumeration Areas.

**Parameters:**
- `surveyId` (path, required): Survey ID

**Response:**
```json
[
  {
    "id": 1,
    "name": "Bumthang",
    "areaCode": "01",
    "administrativeZones": [
      {
        "id": 1,
        "name": "Chhoekhor Gewog",
        "areaCode": "0101",
        "type": "Gewog",
        "subAdministrativeZones": [
          {
            "id": 1,
            "name": "Chhoekhor Chiwog",
            "areaCode": "010101",
            "type": "chiwog",
            "enumerationAreas": [
              {
                "id": 1,
                "name": "EA-001",
                "areaCode": "01010101",
                "surveyEnumerationAreas": [
                  {
                    "id": 1,
                    "surveyId": 1,
                    "enumerationAreaId": 1,
                    "isEnumerated": true,
                    "isSampled": false,
                    "isPublished": false
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor
- `404 Not Found`: Survey not found

---

### 1.2 Get Single Survey Enumeration Area

**Endpoint:** `GET /supervisor/survey-enumeration-area/:id`

**Description:** Get a single survey enumeration area by ID, with access verification to ensure it belongs to supervisor's dzongkhags.

**Parameters:**
- `id` (path, required): Survey Enumeration Area ID

**Response:**
```json
{
  "id": 1,
  "surveyId": 1,
  "enumerationAreaId": 1,
  "isEnumerated": true,
  "isSampled": false,
  "isPublished": false,
  "survey": {
    "id": 1,
    "name": "2024 Household Survey",
    "year": 2024,
    "status": "ACTIVE"
  },
  "enumerationArea": {
    "id": 1,
    "name": "EA-001",
    "areaCode": "01010101"
  },
  "enumerator": {
    "id": 5,
    "name": "John Doe",
    "role": "ENUMERATOR"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Survey enumeration area not found

---

## 2. Household Listing Routes

### 2.1 View Households by EA

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId`

**Description:** Get all household listings for a specific survey enumeration area, with access verification.

**Parameters:**
- `surveyEnumerationAreaId` (path, required): Survey Enumeration Area ID

**Response:**
```json
[
  {
    "id": 1,
    "surveyEnumerationAreaId": 1,
    "structureId": 1,
    "householdIdentification": "HH-0001-01",
    "householdSerialNumber": 1,
    "nameOfHOH": "Tenzin Dorji",
    "totalMale": 2,
    "totalFemale": 3,
    "phoneNumber": "17123456",
    "remarks": null,
    "submitter": {
      "id": 5,
      "name": "John Doe"
    },
    "structure": {
      "id": 1,
      "structureNumber": "STR-0001",
      "latitude": 27.5,
      "longitude": 90.5
    }
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Survey enumeration area not found

---

### 2.2 View Sampled Households by EA

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId/sampled`

**Description:** Get all sampled household listings for a specific survey enumeration area (households selected during sampling process).

**Parameters:**
- `surveyEnumerationAreaId` (path, required): Survey Enumeration Area ID

**Response:**
```json
[
  {
    "id": 1,
    "surveyEnumerationAreaId": 1,
    "structureId": 1,
    "householdIdentification": "HH-0001-01",
    "householdSerialNumber": 1,
    "nameOfHOH": "Tenzin Dorji",
    "totalMale": 2,
    "totalFemale": 3,
    "phoneNumber": "17123456",
    "remarks": null,
    "submitter": {
      "id": 5,
      "name": "John Doe"
    },
    "structure": {
      "id": 1,
      "structureNumber": "STR-0001",
      "latitude": 27.5,
      "longitude": 90.5
    }
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Survey enumeration area not found or no sampling exists

---

### 2.3 Edit Household Listing

**Endpoint:** `PATCH /supervisor/survey-enumeration-area-household-listing/:id`

**Description:** Update a household listing. Verifies supervisor has access to the enumeration area before allowing update.

**Parameters:**
- `id` (path, required): Household Listing ID

**Request Body (DTO):**
```typescript
{
  structureId?: number;
  householdIdentification?: string;
  householdSerialNumber?: number;
  nameOfHOH?: string;
  totalMale?: number;
  totalFemale?: number;
  phoneNumber?: string;
  remarks?: string;
}
```

**Example Request:**
```json
{
  "nameOfHOH": "Updated Name",
  "totalMale": 3,
  "totalFemale": 4,
  "phoneNumber": "17234567"
}
```

**Response:**
```json
{
  "id": 1,
  "surveyEnumerationAreaId": 1,
  "structureId": 1,
  "householdIdentification": "HH-0001-01",
  "householdSerialNumber": 1,
  "nameOfHOH": "Updated Name",
  "totalMale": 3,
  "totalFemale": 4,
  "phoneNumber": "17234567",
  "remarks": null
}
```

**Error Responses:**
- `400 Bad Request`: Invalid data or constraint violation
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Household listing not found
- `409 Conflict`: Unique constraint violation (e.g., duplicate household serial number)

---

### 2.4 Create Blank Household Listings

**Endpoint:** `POST /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId/create-blank`

**Description:** Create blank household listing entries for historical surveys. Creates placeholder entries with sequential serial numbers, each linked to a new structure.

**Parameters:**
- `surveyEnumerationAreaId` (path, required): Survey Enumeration Area ID

**Request Body (DTO):**
```typescript
{
  count: number;          // Number of blank entries to create
  remarks?: string;       // Optional remarks (default: "No data available - Historical survey entry")
}
```

**Example Request:**
```json
{
  "count": 10,
  "remarks": "Historical data entry"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully created 10 blank household listing entries",
  "created": 10,
  "listings": [
    {
      "id": 1,
      "surveyEnumerationAreaId": 1,
      "structureId": 1,
      "householdIdentification": "HH-STR-0001-01",
      "householdSerialNumber": 1,
      "nameOfHOH": "Not Available",
      "totalMale": 0,
      "totalFemale": 0,
      "phoneNumber": null,
      "remarks": "Historical data entry"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Invalid count or survey enumeration area not found
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA

---

### 2.5 Bulk Upload Households from CSV

**Endpoint:** `POST /supervisor/survey-enumeration-area-household-listing/bulk-upload`

**Description:** Bulk upload household listings from a CSV file. Verifies supervisor has access to the enumeration area before processing.

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file` (file, required): CSV file containing household data
- `surveyEnumerationAreaId` (form field, required): Survey Enumeration Area ID

**CSV Format:**
```csv
Structure ID,Household Identification,Household Serial Number,Name of HOH,Total Male,Total Female,Phone Number,Remarks
1,HH-0001-01,1,Tenzin Dorji,2,3,17123456,
2,HH-0001-02,2,Sonam Wangmo,1,2,17234567,
```

**CSV Columns (flexible matching):**
- Structure ID / structureId
- Household Identification / householdIdentification
- Household Serial Number / householdSerialNumber (optional - auto-generated if not provided)
- Name of HOH / nameOfHOH / Head of Household
- Total Male / totalMale
- Total Female / totalFemale
- Phone Number / phoneNumber (optional)
- Remarks / remarks (optional)

**Response:**
```json
{
  "success": 8,
  "failed": 2,
  "created": [
    {
      "id": 1,
      "surveyEnumerationAreaId": 1,
      "structureId": 1,
      "householdIdentification": "HH-0001-01",
      "householdSerialNumber": 1,
      "nameOfHOH": "Tenzin Dorji",
      "totalMale": 2,
      "totalFemale": 3
    }
  ],
  "errors": [
    {
      "listing": { "householdIdentification": "HH-0001-03" },
      "error": "Household with serial number 3 already exists for structure 1"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: No file uploaded, invalid file type, or invalid CSV format
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA

---

### 2.6 Get CSV Template for Household Upload

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/template/csv/:surveyEnumerationAreaId`

**Description:** Download a CSV template file for bulk household upload, pre-populated with the survey enumeration area ID.

**Parameters:**
- `surveyEnumerationAreaId` (path, required): Survey Enumeration Area ID

**Response:**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="household_listing_template.csv"`

**CSV Content:**
```csv
Survey Enumeration Area ID,Structure ID,Household Identification,Household Serial Number,Name of HOH,Total Male,Total Female,Phone Number,Remarks
1,,,,,,,,
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Survey enumeration area not found

---

### 2.7 Download All Household Listings by EA (ZIP)

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId/export/zip`

**Description:** Download all household listings for an enumeration area as a ZIP file containing CSV and metadata TXT files.

**Parameters:**
- `surveyEnumerationAreaId` (path, required): Survey Enumeration Area ID

**Response:**
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="household_listings_ea_{id}_{timestamp}.zip"`

**ZIP Contents:**
- `household_listings_ea_{id}.csv`: All household listings in CSV format
- `metadata_ea_{id}.txt`: Metadata including export date, total households, etc.

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Survey enumeration area not found

---

### 2.8 Download Household Count by EA

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId/export/count`

**Description:** Get household count statistics for a specific enumeration area.

**Parameters:**
- `surveyEnumerationAreaId` (path, required): Survey Enumeration Area ID

**Response:**
```json
{
  "surveyEnumerationAreaId": 1,
  "totalHouseholds": 25,
  "totalMale": 45,
  "totalFemale": 52,
  "totalPopulation": 97,
  "averageHouseholdSize": 3.88
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Survey enumeration area not found

---

### 2.9 Download Household Count by Dzongkhag (Aggregated)

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-dzongkhag/:dzongkhagId/export/count`

**Description:** Get aggregated household count statistics by EA, Gewog/Thromde, Chiwog/LAP, and Dzongkhag for supervisor's dzongkhag.

**Parameters:**
- `dzongkhagId` (path, required): Dzongkhag ID

**Response:**
```json
{
  "dzongkhagId": 1,
  "summary": {
    "totalHouseholds": 250,
    "totalMale": 450,
    "totalFemale": 520,
    "totalPopulation": 970
  },
  "administrativeZones": [
    {
      "id": 1,
      "name": "Chhoekhor Gewog",
      "areaCode": "0101",
      "type": "Gewog",
      "subAdministrativeZones": [
        {
          "id": 1,
          "name": "Chhoekhor Chiwog",
          "areaCode": "010101",
          "type": "chiwog",
          "enumerationAreas": [
            {
              "id": 1,
              "name": "EA-001",
              "areaCode": "01010101",
              "totalHouseholds": 25,
              "totalMale": 45,
              "totalFemale": 52,
              "totalPopulation": 97
            }
          ]
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this dzongkhag
- `404 Not Found`: Dzongkhag not found

---

## 3. Enumerator Management Routes

### 3.1 Get Enumerators by Survey

**Endpoint:** `GET /supervisor/survey-enumerator/by-survey/:surveyId`

**Description:** Get all enumerators assigned to a survey, filtered to only include enumerators in supervisor's dzongkhags.

**Parameters:**
- `surveyId` (path, required): Survey ID

**Response:**
```json
[
  {
    "userId": 5,
    "surveyId": 1,
    "dzongkhagId": 1,
    "user": {
      "id": 5,
      "name": "John Doe",
      "emailAddress": "john.doe@example.com",
      "cid": "12345678901",
      "phoneNumber": "17123456",
      "role": "ENUMERATOR"
    },
    "survey": {
      "id": 1,
      "name": "2024 Household Survey",
      "year": 2024,
      "status": "ACTIVE"
    },
    "dzongkhag": {
      "id": 1,
      "name": "Bumthang",
      "areaCode": "01"
    }
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor
- `404 Not Found`: Survey not found

---

### 3.2 Bulk Upload Enumerators from CSV

**Endpoint:** `POST /supervisor/survey-enumerator/bulk-assign-csv`

**Description:** Bulk upload enumerators from a CSV file. Creates users if they don't exist and assigns them to the survey with dzongkhag assignment. Verifies all dzongkhags in CSV belong to supervisor.

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file` (file, required): CSV file containing enumerator data
- `surveyId` (form field, required): Survey ID

**CSV Format:**
```csv
Name,CID,Email Address,Phone Number,Password,Dzongkhag Code
Nima Yoezer,12345678901,nima.yoezer@example.com,17123456,,01
Sonam Wangmo,23456789012,sonam.wangmo@example.com,17234567,,02
```

**CSV Columns (flexible matching):**
- Name / name
- CID / cid (required)
- Email Address / emailAddress / Email (optional - auto-generated if not provided)
- Phone Number / phoneNumber / Phone (optional)
- Password / password (optional - uses CID if not provided)
- Dzongkhag Code / dzongkhagCode (required)

**Response:**
```json
{
  "success": 8,
  "failed": 2,
  "created": 5,
  "existing": 3,
  "assignments": [
    {
      "userId": 5,
      "surveyId": 1,
      "dzongkhagId": 1
    }
  ],
  "errors": [
    {
      "enumerator": {
        "name": "Test User",
        "cid": "12345678901",
        "dzongkhagCode": "99"
      },
      "error": "You do not have access to dzongkhag 99"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: No file uploaded, invalid file type, or invalid CSV format
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to dzongkhag(s) in CSV
- `404 Not Found`: Survey not found

---

### 3.3 Get CSV Template for Enumerator Upload

**Endpoint:** `GET /supervisor/survey-enumerator/template/csv`

**Description:** Download a CSV template file for bulk enumerator upload.

**Response:**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="enumerator_upload_template.csv"`

**CSV Content:**
```csv
Name,CID,Email Address,Phone Number,Password,Dzongkhag Code
Nima Yoezer,12345678901,nima.yoezer@example.com,17123456,,01
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor

---

### 3.4 Reset Enumerator Password

**Endpoint:** `POST /supervisor/survey-enumerator/:userId/reset-password`

**Description:** Reset password for an enumerator. Verifies enumerator belongs to supervisor's dzongkhags.

**Parameters:**
- `userId` (path, required): User ID of the enumerator

**Request Body:**
```json
{
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully",
  "user": {
    "id": 5,
    "name": "John Doe",
    "emailAddress": "john.doe@example.com",
    "role": "ENUMERATOR"
  }
}
```

**Error Responses:**
- `400 Bad Request`: newPassword is required
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this enumerator
- `404 Not Found`: User not found

---

### 3.5 Edit Enumerator Details

**Endpoint:** `PATCH /supervisor/survey-enumerator/:userId`

**Description:** Update enumerator details (name, email, phone) or assignment (surveyId, dzongkhagId). Verifies enumerator belongs to supervisor's dzongkhags.

**Parameters:**
- `userId` (path, required): User ID of the enumerator

**Request Body:**
```json
{
  "name": "Updated Name",
  "emailAddress": "updated.email@example.com",
  "phoneNumber": "17345678",
  "surveyId": 1,
  "dzongkhagId": 2
}
```

**Response:**
```json
{
  "message": "Enumerator updated successfully",
  "user": {
    "id": 5,
    "name": "Updated Name",
    "emailAddress": "updated.email@example.com",
    "phoneNumber": "17345678",
    "role": "ENUMERATOR"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor, does not have access to this enumerator, or does not have access to the new dzongkhag
- `404 Not Found`: User not found

---

### 3.6 Delete Enumerator

**Endpoint:** `DELETE /supervisor/survey-enumerator/:userId/:surveyId`

**Description:** Remove an enumerator assignment from a survey. Verifies enumerator belongs to supervisor's dzongkhags.

**Parameters:**
- `userId` (path, required): User ID of the enumerator
- `surveyId` (path, required): Survey ID

**Response:**
```json
{
  "deleted": true
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this enumerator
- `404 Not Found`: Enumerator assignment not found

---

## 4. Sampling Routes

### 4.1 Run Sampling for EA

**Endpoint:** `POST /supervisor/sampling/surveys/:surveyId/enumeration-areas/:seaId/run`

**Description:** Run sampling for a specific enumeration area. Verifies supervisor has access to the EA and that enumeration is completed.

**Parameters:**
- `surveyId` (path, required): Survey ID
- `seaId` (path, required): Survey Enumeration Area ID

**Request Body (DTO):**
```typescript
{
  method?: SamplingMethod;      // 'CSS' | 'SRS' (optional - uses config default)
  sampleSize?: number;           // Override sample size (optional)
  randomStart?: number;          // Random start for CSS method (optional)
  overwriteExisting?: boolean;   // Overwrite existing sampling (default: false)
}
```

**Example Request:**
```json
{
  "method": "CSS",
  "sampleSize": 10,
  "randomStart": 3,
  "overwriteExisting": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sampling completed successfully for enumeration area 1",
  "data": {
    "samplingId": 1,
    "surveyEnumerationAreaId": 1,
    "method": "CSS",
    "sampleSize": 10,
    "populationSize": 25,
    "isFullSelection": false,
    "executedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Enumeration not completed, no households found, or sampling already exists (if overwriteExisting is false)
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Survey or survey enumeration area not found

---

### 4.2 View Sampling Results

**Endpoint:** `GET /supervisor/sampling/surveys/:surveyId/enumeration-areas/:seaId/results`

**Description:** Get detailed sampling results including all selected households for an enumeration area.

**Parameters:**
- `surveyId` (path, required): Survey ID
- `seaId` (path, required): Survey Enumeration Area ID

**Response:**
```json
{
  "success": true,
  "message": "Sampling results retrieved successfully",
  "data": {
    "sampling": {
      "id": 1,
      "method": "CSS",
      "sampleSize": 10,
      "populationSize": 25,
      "samplingInterval": 2,
      "randomStart": 3,
      "wrapAroundCount": 0,
      "isFullSelection": false,
      "selectedIndices": [3, 5, 7, 9, 11, 13, 15, 17, 19, 21],
      "metadata": {
        "isFullSelection": false
      },
      "executedAt": "2024-01-15T10:30:00Z",
      "executedBy": 2
    },
    "surveyEnumerationArea": {
      "id": 1,
      "surveyId": 1,
      "enumerationAreaId": 1,
      "isEnumerated": true,
      "isSampled": true,
      "isPublished": false
    },
    "enumerationArea": {
      "id": 1,
      "name": "EA-001",
      "areaCode": "01010101",
      "subAdminZone": {
        "name": "Chhoekhor Chiwog",
        "areaCode": "010101",
        "type": "chiwog"
      },
      "adminZone": {
        "name": "Chhoekhor Gewog",
        "areaCode": "0101",
        "type": "Gewog"
      }
    },
    "selectedHouseholds": [
      {
        "selectionOrder": 1,
        "isReplacement": false,
        "household": {
          "id": 1,
          "householdIdentification": "HH-0001-01",
          "householdSerialNumber": 1,
          "nameOfHOH": "Tenzin Dorji",
          "totalMale": 2,
          "totalFemale": 3,
          "totalPopulation": 5,
          "phoneNumber": "17123456",
          "structure": {
            "id": 1,
            "structureNumber": "STR-0001",
            "latitude": 27.5,
            "longitude": 90.5
          }
        }
      }
    ]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Sampling results not found

---

### 4.3 Run Bulk Sampling

**Endpoint:** `POST /supervisor/sampling/surveys/:surveyId/bulk-run`

**Description:** Run sampling for multiple enumeration areas in bulk. Verifies supervisor has access to all EAs before processing.

**Parameters:**
- `surveyId` (path, required): Survey ID

**Request Body:**
```json
{
  "surveyEnumerationAreaIds": [1, 2, 3, 4, 5],
  "method": "CSS",
  "sampleSize": 10,
  "randomStart": 3
}
```

**Response:**
```json
{
  "success": 4,
  "failed": 1,
  "results": [
    {
      "surveyEnumerationAreaId": 1,
      "result": {
        "success": true,
        "message": "Sampling completed successfully for enumeration area 1",
        "data": {
          "samplingId": 1,
          "surveyEnumerationAreaId": 1,
          "method": "CSS",
          "sampleSize": 10,
          "populationSize": 25
        }
      }
    }
  ],
  "errors": [
    {
      "surveyEnumerationAreaId": 5,
      "error": "Enumeration area must be enumerated before sampling can be performed"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: surveyEnumerationAreaIds array is required or invalid
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to one or more EAs

---

### 4.4 Re-sample EA

**Endpoint:** `POST /supervisor/sampling/surveys/:surveyId/enumeration-areas/:seaId/resample`

**Description:** Re-run sampling for an enumeration area, overwriting existing sampling results. Automatically sets `overwriteExisting: true`.

**Parameters:**
- `surveyId` (path, required): Survey ID
- `seaId` (path, required): Survey Enumeration Area ID

**Request Body (DTO):**
```typescript
{
  method?: SamplingMethod;      // 'CSS' | 'SRS' (optional - uses config default)
  sampleSize?: number;           // Override sample size (optional)
  randomStart?: number;          // Random start for CSS method (optional)
}
```

**Example Request:**
```json
{
  "method": "SRS",
  "sampleSize": 15
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sampling completed successfully for enumeration area 1",
  "data": {
    "samplingId": 2,
    "surveyEnumerationAreaId": 1,
    "method": "SRS",
    "sampleSize": 15,
    "populationSize": 25,
    "isFullSelection": false,
    "executedAt": "2024-01-16T14:20:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Enumeration not completed or no households found
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a supervisor or does not have access to this EA
- `404 Not Found`: Survey or survey enumeration area not found

---

## DTOs (Data Transfer Objects)

### CreateBlankHouseholdListingsDto

```typescript
export class CreateBlankHouseholdListingsDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  count: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}
```

### UpdateSurveyEnumerationAreaHouseholdListingDto

```typescript
export class UpdateSurveyEnumerationAreaHouseholdListingDto {
  @IsInt()
  @IsOptional()
  structureId?: number;

  @IsString()
  @IsOptional()
  householdIdentification?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  householdSerialNumber?: number;

  @IsString()
  @IsOptional()
  nameOfHOH?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalMale?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalFemale?: number;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
```

### RunEnumerationAreaSamplingDto

```typescript
export class RunEnumerationAreaSamplingDto {
  @IsOptional()
  @IsEnum(SamplingMethod)
  method?: SamplingMethod;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sampleSize?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  randomStart?: number;

  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;
}
```

### EnumeratorCsvRowDto

```typescript
export class EnumeratorCsvRowDto {
  name: string;
  cid: string;
  emailAddress?: string;
  phoneNumber?: string;
  password?: string;
  role?: string;
  dzongkhagCode: string; // Dzongkhag code (e.g., "01", "02")
}
```

### BulkAssignFromCsvDto

```typescript
export class BulkAssignFromCsvDto {
  @IsInt()
  @IsNotEmpty()
  surveyId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnumeratorCsvRowDto)
  enumerators: EnumeratorCsvRowDto[];
}
```

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input data or business rule violation |
| 401 | Unauthorized - Missing or invalid JWT token |
| 403 | Forbidden - User does not have access to the resource |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Unique constraint violation |
| 500 | Internal Server Error |

---

## Notes

1. All routes require JWT authentication and SUPERVISOR role
2. All data access is automatically scoped to supervisor's assigned dzongkhags
3. CSV uploads support flexible column name matching (case-insensitive, partial matches)
4. Household serial numbers are auto-generated per structure if not provided
5. Sampling requires enumeration to be completed first
6. Bulk operations return detailed success/error reports
7. All timestamps are in ISO 8601 format (UTC)

---

## Example Usage

### Using cURL

```bash
# Get EAs by survey
curl -X GET "http://localhost:3000/supervisor/survey-enumeration-area/by-survey/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Bulk upload enumerators
curl -X POST "http://localhost:3000/supervisor/survey-enumerator/bulk-assign-csv" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@enumerators.csv" \
  -F "surveyId=1"

# Run sampling
curl -X POST "http://localhost:3000/supervisor/sampling/surveys/1/enumeration-areas/1/run" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "CSS",
    "sampleSize": 10,
    "randomStart": 3
  }'
```

---

## Support

For issues or questions, please contact the development team.

