# Survey Management API Manual

## Overview

This manual documents the Survey Management API endpoints for the NSB Survey Data Collection System. The API supports survey lifecycle management, enumeration area assignments, enumerator assignments, workflow tracking (enumeration → sampling → publishing), bulk operations, and comprehensive reporting.

## Base URL

All endpoints are prefixed with `/survey` or `/survey-enumeration-area` or `/survey-enumerator` depending on the resource.

## Authentication

Most endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Roles

- **ADMIN**: Full survey management access
- **SUPERVISOR**: Can view surveys, manage enumerators, perform sampling
- **ENUMERATOR**: Can view assigned surveys and complete enumeration

---

## Table of Contents

1. [Survey Management](#1-survey-management)
2. [Survey Enumeration Area Management](#2-survey-enumeration-area-management)
3. [Survey Enumerator Assignment](#3-survey-enumerator-assignment)
4. [Survey Workflow](#4-survey-workflow)
5. [Bulk Operations](#5-bulk-operations)
6. [Statistics and Reporting](#6-statistics-and-reporting)
7. [CSV Templates and Uploads](#7-csv-templates-and-uploads)

---

## 1. Survey Management

### 1.1 Create Survey

**Endpoint:** `POST /survey`  
**Access:** Admin only  
**Description:** Creates a new survey

**Request Body:**
```json
{
  "name": "Annual Household Survey 2024",
  "description": "Comprehensive household survey for 2024",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "year": 2024,
  "status": "ACTIVE"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Annual Household Survey 2024",
  "description": "Comprehensive household survey for 2024",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "year": 2024,
  "status": "ACTIVE",
  "isFullyValidated": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Validation Rules:**
- `name`: Required, string
- `description`: Required, string
- `startDate`: Required, date (YYYY-MM-DD)
- `endDate`: Required, date (YYYY-MM-DD), must be after startDate
- `year`: Required, integer
- `status`: Optional, enum ('ACTIVE' | 'ENDED'), defaults to 'ACTIVE'

---

### 1.2 Get All Surveys

**Endpoint:** `GET /survey`  
**Access:** Public  
**Description:** Retrieves all surveys

**Response:**
```json
[
  {
    "id": 1,
    "name": "Annual Household Survey 2024",
    "description": "Comprehensive household survey for 2024",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "year": 2024,
    "status": "ACTIVE",
    "isFullyValidated": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 1.3 Get Active Surveys

**Endpoint:** `GET /survey/active`  
**Access:** Public  
**Description:** Retrieves all surveys with status ACTIVE

**Response:** Same format as Get All Surveys (filtered by status = ACTIVE)

---

### 1.4 Get Paginated Surveys

**Endpoint:** `GET /survey/paginated`  
**Access:** Public  
**Description:** Retrieves paginated surveys with sorting and filtering

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sortBy` (optional): Field to sort by (default: 'startDate')
- `sortOrder` (optional): Sort order - 'ASC' or 'DESC' (default: 'DESC')

**Example:**
```
GET /survey/paginated?page=2&limit=20&sortBy=name&sortOrder=ASC
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Annual Household Survey 2024",
      "status": "ACTIVE",
      ...
    }
  ],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 1.5 Get Survey by ID

**Endpoint:** `GET /survey/:id`  
**Access:** Public  
**Description:** Retrieves a specific survey by ID

**Response:**
```json
{
  "id": 1,
  "name": "Annual Household Survey 2024",
  "description": "Comprehensive household survey for 2024",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "year": 2024,
  "status": "ACTIVE",
  "isFullyValidated": false,
  "enumerationAreas": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 1.6 Update Survey

**Endpoint:** `PATCH /survey/:id`  
**Access:** Admin only  
**Description:** Updates survey details

**Request Body:**
```json
{
  "name": "Updated Survey Name",
  "description": "Updated description",
  "endDate": "2024-12-31"
}
```

**Response:** Same format as Get Survey by ID

**Note:** Cannot update status through this endpoint. Use the status update endpoint instead.

---

### 1.7 Delete Survey

**Endpoint:** `DELETE /survey/:id`  
**Access:** Admin only  
**Description:** Deletes a survey

**Response:**
- Status: `204 No Content`

**Warning:** This will also delete all related survey enumeration areas and assignments.

---

### 1.8 Update Survey Status

**Endpoint:** `PATCH /survey/:id/status`  
**Access:** Admin only  
**Description:** Updates survey status (ACTIVE/ENDED)

**Request Body:**
```json
{
  "status": "ENDED"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Annual Household Survey 2024",
  "status": "ENDED",
  ...
}
```

**Note:** 
- Cannot set status to ENDED if survey is not fully validated (unless using cron job)
- Surveys are automatically marked as ENDED by cron job when endDate passes

---

### 1.9 Add Enumeration Areas to Survey

**Endpoint:** `POST /survey/:id/enumeration-areas`  
**Access:** Admin only  
**Description:** Assigns enumeration areas to a survey

**Request Body:**
```json
{
  "enumerationAreaIds": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "message": "Successfully added 5 enumeration area(s) to survey",
  "added": 5,
  "skipped": 0
}
```

---

### 1.10 Remove Enumeration Areas from Survey

**Endpoint:** `DELETE /survey/:id/enumeration-areas`  
**Access:** Admin only  
**Description:** Removes enumeration areas from a survey

**Request Body:**
```json
{
  "enumerationAreaIds": [2, 3]
}
```

**Response:**
```json
{
  "message": "Successfully removed 2 enumeration area(s) from survey",
  "removed": 2
}
```

---

### 1.11 Get Supervisors for Survey

**Endpoint:** `GET /survey/:id/supervisors`  
**Access:** Admin, Supervisor  
**Description:** Retrieves all supervisors assigned to dzongkhags that contain enumeration areas in this survey

**Response:**
```json
[
  {
    "id": 2,
    "name": "Supervisor Name",
    "cid": "23456789012",
    "emailAddress": "supervisor@nsb.gov.bt",
    "phoneNumber": "+975-23456789",
    "role": "SUPERVISOR",
    "dzongkhags": [
      {
        "id": 1,
        "name": "Thimphu",
        "areaCode": "TH"
      }
    ]
  }
]
```

---

### 1.12 Get Active Surveys for Supervisor

**Endpoint:** `GET /survey/supervisor/:supervisorId/active`  
**Access:** Admin, Supervisor  
**Description:** Retrieves active surveys for a supervisor based on their assigned dzongkhags

**Response:**
```json
[
  {
    "id": 1,
    "name": "Annual Household Survey 2024",
    "status": "ACTIVE",
    "year": 2024,
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
]
```

---

### 1.13 Mark Expired Surveys as ENDED (Manual Trigger)

**Endpoint:** `POST /survey/mark-expired-as-ended`  
**Access:** Admin only  
**Description:** Manually triggers the cron job to mark expired surveys as ENDED

**Response:**
```json
{
  "message": "Successfully marked 2 survey(s) as ENDED",
  "surveysUpdated": 2,
  "surveyIds": [3, 4]
}
```

**Note:** This cron job runs automatically daily at midnight. This endpoint is for manual testing/execution.

---

## 2. Survey Enumeration Area Management

### 2.1 Create Survey Enumeration Area

**Endpoint:** `POST /survey-enumeration-area`  
**Access:** Admin only  
**Description:** Creates a new survey enumeration area assignment

**Request Body:**
```json
{
  "surveyId": 1,
  "enumerationAreaId": 5
}
```

**Response:**
```json
{
  "id": 1,
  "surveyId": 1,
  "enumerationAreaId": 5,
  "isEnumerated": false,
  "isSampled": false,
  "isPublished": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 2.2 Get All Survey Enumeration Areas

**Endpoint:** `GET /survey-enumeration-area`  
**Access:** Admin, Supervisor  
**Description:** Retrieves all survey enumeration area assignments with optional filters

**Query Parameters:**
- `surveyId` (optional): Filter by survey ID
- `enumerationAreaId` (optional): Filter by enumeration area ID
- `isEnumerated` (optional): Filter by enumeration status (true/false)
- `isSampled` (optional): Filter by sampling status (true/false)
- `isPublished` (optional): Filter by publishing status (true/false)

**Example:**
```
GET /survey-enumeration-area?surveyId=1&isEnumerated=true
```

**Response:**
```json
[
  {
    "id": 1,
    "surveyId": 1,
    "enumerationAreaId": 5,
    "isEnumerated": true,
    "isSampled": false,
    "isPublished": false,
    "enumeratedBy": 3,
    "enumerationDate": "2024-01-15T10:30:00.000Z",
    "survey": {
      "id": 1,
      "name": "Annual Household Survey 2024"
    },
    "enumerationArea": {
      "id": 5,
      "name": "EA-001",
      "areaCode": "01"
    }
  }
]
```

---

### 2.3 Get Survey Enumeration Areas by Survey

**Endpoint:** `GET /survey-enumeration-area/by-survey/:surveyId`  
**Access:** Public  
**Description:** Retrieves all enumeration areas for a survey with hierarchical structure

**Response:**
```json
[
  {
    "dzongkhag": {
      "id": 1,
      "name": "Thimphu",
      "areaCode": "TH",
      "administrativeZones": [
        {
          "id": 1,
          "name": "Gewog 1",
          "areaCode": "01",
          "subAdministrativeZones": [
            {
              "id": 1,
              "name": "Chiwog 1",
              "areaCode": "01",
              "enumerationAreas": [
                {
                  "id": 5,
                  "name": "EA-001",
                  "areaCode": "01",
                  "surveyData": {
                    "id": 1,
                    "isEnumerated": true,
                    "isSampled": false,
                    "isPublished": false
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  }
]
```

---

### 2.4 Get Survey Enumeration Area by ID

**Endpoint:** `GET /survey-enumeration-area/:id`  
**Access:** Admin, Supervisor  
**Description:** Retrieves a specific survey enumeration area by ID

**Response:**
```json
{
  "id": 1,
  "surveyId": 1,
  "enumerationAreaId": 5,
  "isEnumerated": true,
  "isSampled": false,
  "isPublished": false,
  "enumeratedBy": 3,
  "enumerationDate": "2024-01-15T10:30:00.000Z",
  "survey": {
    "id": 1,
    "name": "Annual Household Survey 2024"
  },
  "enumerationArea": {
    "id": 5,
    "name": "EA-001",
    "areaCode": "01"
  },
  "enumerator": {
    "id": 3,
    "name": "Enumerator Name"
  }
}
```

---

### 2.5 Update Survey Enumeration Area

**Endpoint:** `PATCH /survey-enumeration-area/:id`  
**Access:** Admin only  
**Description:** Updates survey enumeration area details

**Request Body:**
```json
{
  "comments": "Additional notes about this enumeration area"
}
```

**Response:** Same format as Get Survey Enumeration Area by ID

---

### 2.6 Delete Survey Enumeration Area

**Endpoint:** `DELETE /survey-enumeration-area/:id`  
**Access:** Admin only  
**Description:** Removes a survey enumeration area assignment

**Response:**
- Status: `204 No Content`

---

## 3. Survey Enumerator Assignment

### 3.1 Assign Enumerator to Survey

**Endpoint:** `POST /survey-enumerator`  
**Access:** Admin, Supervisor  
**Description:** Assigns an enumerator to a survey

**Request Body:**
```json
{
  "userId": 3,
  "surveyId": 1
}
```

**Response:**
```json
{
  "userId": 3,
  "surveyId": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 3.2 Get All Enumerator-Survey Assignments

**Endpoint:** `GET /survey-enumerator`  
**Access:** Admin, Supervisor  
**Description:** Retrieves all enumerator-survey assignments

**Response:**
```json
[
  {
    "userId": 3,
    "surveyId": 1,
    "user": {
      "id": 3,
      "name": "Enumerator Name",
      "cid": "34567890123",
      "emailAddress": "enumerator@nsb.gov.bt",
      "role": "ENUMERATOR"
    },
    "survey": {
      "id": 1,
      "name": "Annual Household Survey 2024",
      "status": "ACTIVE"
    }
  }
]
```

---

### 3.3 Get Enumerators by Survey

**Endpoint:** `GET /survey-enumerator/by-survey/:surveyId`  
**Access:** Admin, Supervisor  
**Description:** Retrieves all enumerators assigned to a specific survey

**Response:**
```json
[
  {
    "userId": 3,
    "surveyId": 1,
    "user": {
      "id": 3,
      "name": "Enumerator Name",
      "cid": "34567890123",
      "emailAddress": "enumerator@nsb.gov.bt",
      "role": "ENUMERATOR"
    }
  }
]
```

---

### 3.4 Get Surveys by Enumerator

**Endpoint:** `GET /survey-enumerator/by-enumerator/:userId`  
**Access:** Admin, Supervisor, Enumerator  
**Description:** Retrieves all surveys assigned to a specific enumerator

**Response:**
```json
[
  {
    "userId": 3,
    "surveyId": 1,
    "survey": {
      "id": 1,
      "name": "Annual Household Survey 2024",
      "description": "Comprehensive household survey for 2024",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "year": 2024,
      "status": "ACTIVE",
      "isFullyValidated": false
    }
  }
]
```

---

### 3.5 Get Specific Enumerator-Survey Assignment

**Endpoint:** `GET /survey-enumerator/:userId/:surveyId`  
**Access:** Admin, Supervisor, Enumerator  
**Description:** Retrieves a specific enumerator-survey assignment

**Response:**
```json
{
  "userId": 3,
  "surveyId": 1,
  "user": {
    "id": 3,
    "name": "Enumerator Name",
    "role": "ENUMERATOR"
  },
  "survey": {
    "id": 1,
    "name": "Annual Household Survey 2024",
    "status": "ACTIVE"
  }
}
```

---

### 3.6 Remove Enumerator from Survey

**Endpoint:** `DELETE /survey-enumerator/:userId/:surveyId`  
**Access:** Admin, Supervisor  
**Description:** Removes an enumerator assignment from a survey

**Response:**
```json
{
  "message": "Enumerator removed from survey successfully"
}
```

---

### 3.7 Bulk Assign Enumerators to Survey

**Endpoint:** `POST /survey-enumerator/bulk-assign`  
**Access:** Admin, Supervisor  
**Description:** Assigns multiple enumerators to a survey at once

**Request Body:**
```json
{
  "surveyId": 1,
  "userIds": [3, 4, 5, 6]
}
```

**Response:**
```json
{
  "message": "Successfully assigned 4 enumerator(s) to survey",
  "assignments": [
    {
      "userId": 3,
      "surveyId": 1
    },
    {
      "userId": 4,
      "surveyId": 1
    },
    {
      "userId": 5,
      "surveyId": 1
    },
    {
      "userId": 6,
      "surveyId": 1
    }
  ]
}
```

---

### 3.8 Bulk Remove Enumerators from Survey

**Endpoint:** `DELETE /survey-enumerator/bulk-remove/:surveyId`  
**Access:** Admin, Supervisor  
**Description:** Removes multiple enumerators from a survey at once

**Request Body:**
```json
{
  "userIds": [3, 4, 5]
}
```

**Response:**
```json
{
  "message": "Removed 3 enumerator(s) from survey",
  "removedCount": 3
}
```

---

## 4. Survey Workflow

The survey workflow consists of three stages:
1. **Enumeration** - Enumerator completes data collection
2. **Sampling** - Supervisor performs sampling
3. **Publishing** - Admin publishes the data

### 4.1 Complete Enumeration

**Endpoint:** `POST /survey-enumeration-area/:id/complete-enumeration`  
**Access:** Enumerator only  
**Description:** Marks enumeration as complete for a survey enumeration area

**Request Body:**
```json
{
  "comments": "Enumeration completed successfully"
}
```

**Response:**
```json
{
  "id": 1,
  "surveyId": 1,
  "enumerationAreaId": 5,
  "isEnumerated": true,
  "enumeratedBy": 3,
  "enumerationDate": "2024-01-15T10:30:00.000Z",
  "comments": "Enumeration completed successfully",
  ...
}
```

**Note:** 
- Only enumerators assigned to the survey can complete enumeration
- Sets `isEnumerated = true` and records enumerator and timestamp

---

### 4.2 Get Enumerated Areas Ready for Sampling

**Endpoint:** `GET /survey-enumeration-area/by-survey/:surveyId/enumerated-for-sampling`  
**Access:** Supervisor only  
**Description:** Retrieves enumeration areas that are enumerated and ready for sampling

**Response:**
```json
[
  {
    "id": 1,
    "surveyId": 1,
    "enumerationAreaId": 5,
    "isEnumerated": true,
    "isSampled": false,
    "enumerationArea": {
      "id": 5,
      "name": "EA-001",
      "areaCode": "01"
    },
    "enumerator": {
      "id": 3,
      "name": "Enumerator Name"
    }
  }
]
```

---

### 4.3 Get Sampling Status

**Endpoint:** `GET /survey-enumeration-area/by-survey/:surveyId/sampling-status`  
**Access:** Admin, Supervisor  
**Description:** Retrieves sampling status and progress for a survey

**Response:**
```json
{
  "total": 100,
  "enumerated": 80,
  "sampled": 60,
  "published": 50,
  "pendingEnumeration": 20,
  "pendingSampling": 20,
  "pendingPublishing": 10,
  "progress": {
    "enumeration": 80,
    "sampling": 75,
    "publishing": 83.33
  }
}
```

---

### 4.4 Get Areas Ready for Publishing

**Endpoint:** `GET /survey-enumeration-area/by-survey/:surveyId/ready-for-publishing`  
**Access:** Admin only  
**Description:** Retrieves enumeration areas that are sampled and ready for publishing

**Response:**
```json
[
  {
    "id": 1,
    "surveyId": 1,
    "enumerationAreaId": 5,
    "isEnumerated": true,
    "isSampled": true,
    "isPublished": false,
    "enumerationArea": {
      "id": 5,
      "name": "EA-001"
    },
    "sampler": {
      "id": 2,
      "name": "Supervisor Name"
    }
  }
]
```

---

### 4.5 Publish Data

**Endpoint:** `POST /survey-enumeration-area/:id/publish`  
**Access:** Admin only  
**Description:** Publishes sampled data for a survey enumeration area

**Request Body:**
```json
{
  "comments": "Data published and validated"
}
```

**Response:**
```json
{
  "id": 1,
  "surveyId": 1,
  "enumerationAreaId": 5,
  "isEnumerated": true,
  "isSampled": true,
  "isPublished": true,
  "publishedBy": 1,
  "publishedDate": "2024-01-20T14:00:00.000Z",
  "comments": "Data published and validated",
  ...
}
```

**Note:** 
- Only areas that are sampled (`isSampled = true`) can be published
- Sets `isPublished = true` and records admin and timestamp

---

### 4.6 Bulk Publish

**Endpoint:** `POST /survey-enumeration-area/bulk-publish`  
**Access:** Admin only  
**Description:** Publishes multiple enumeration areas at once

**Request Body:**
```json
{
  "surveyEnumerationAreaIds": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "message": "Successfully published 5 enumeration area(s)",
  "published": 5,
  "failed": 0,
  "errors": []
}
```

---

## 5. Bulk Operations

### 5.1 Bulk Upload Enumeration Areas (CSV)

**Endpoint:** `POST /survey-enumeration-area/bulk-upload/:surveyId`  
**Access:** Admin only  
**Description:** Bulk uploads enumeration areas to a survey from CSV file

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Form field: `file` (CSV file, max 10MB)

**CSV Format:**
```csv
Dzongkhag Code,Gewog/Thromde Code,Chiwog/Lap Code,Enumeration Code
01,01,01,01
01,01,02,01
02,01,01,01
```

**CSV Headers (accepted variations):**
- `Dzongkhag Code` or `dzongkhagCode` or `DzongkhagCode`
- `Gewog/Thromde Code` or `Admin Zone Code` or `adminZoneCode` or `AdminZoneCode`
- `Chiwog/Lap Code` or `Sub Admin Zone Code` or `subAdminZoneCode` or `SubAdminZoneCode`
- `Enumeration Code` or `enumerationCode` or `EnumerationCode` or `Enumeration Area Code`

**Note:** 
- Codes are automatically normalized (e.g., `1` → `01`, `2` → `02`)
- EA is resolved by codes chain: dzongkhagCode → adminZoneCode → subAdminZoneCode → enumerationCode

**Response:**
```json
{
  "success": true,
  "totalRows": 3,
  "successful": 3,
  "failed": 0,
  "errors": [],
  "created": 3,
  "skipped": 0
}
```

---

### 5.2 Download CSV Template for Enumeration Areas

**Endpoint:** `GET /survey-enumeration-area/template/csv`  
**Access:** Admin only  
**Description:** Downloads a CSV template for bulk enumeration area upload

**Response:**
- Content-Type: `text/csv`
- File: `enumeration_area_upload_template.csv`

**CSV Template:**
```csv
Dzongkhag Code,Gewog/Thromde Code,Chiwog/Lap Code,Enumeration Code
01,01,01,01
```

---

### 5.3 Bulk Upload Household Counts

**Endpoint:** `POST /survey/auto-household-upload`  
**Access:** Admin only  
**Description:** Bulk uploads household counts for multiple EA-Survey combinations. Automatically creates SurveyEnumerationArea records and generates blank household listings.

**Request Body:**
```json
{
  "items": [
    {
      "enumerationAreaId": 1,
      "surveyId": 1,
      "householdCount": 25
    },
    {
      "enumerationAreaId": 2,
      "surveyId": 1,
      "householdCount": 30
    }
  ]
}
```

**Response:**
```json
{
  "totalItems": 2,
  "created": 2,
  "skipped": 0,
  "householdListingsCreated": 55,
  "errors": []
}
```

**Important Behavior:**
- If data already exists for the same EA-Survey combination, existing household listings and structures are **deleted and replaced** (not appended)
- All uploaded data is automatically **published** (`isPublished = true`)
- Items with `householdCount: 0` are automatically skipped

---

### 5.4 Bulk Upload Household Counts (CSV)

**Endpoint:** `POST /survey/auto-household-upload/csv`  
**Access:** Admin only  
**Description:** Bulk uploads household counts from CSV file

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Form field: `file` (CSV file, max 10MB)

**CSV Format:**
```csv
dzongkhag,dzongkhagCode,adminZone,adminZoneCode,subAdminZone,subAdminZoneCode,ea,eaCode,surveyId1,surveyId2
Bumthang,3,Choekhor,2,Dhur_Lusibee,1,EA 1,1,22,25
```

**CSV Headers:**
- Required: `dzongkhagCode`, `adminZoneCode`, `subAdminZoneCode`, `eaCode`
- Dynamic: Any column starting with `surveyId` is treated as a survey ID; cell value is the household count

**Response:**
```json
{
  "parseErrors": [],
  "bulkResult": {
    "totalItems": 2,
    "created": 1,
    "skipped": 0,
    "householdListingsCreated": 47,
    "errors": []
  }
}
```

---

### 5.5 Bulk Assign Enumerators from CSV

**Endpoint:** `POST /survey-enumerator/bulk-assign-csv`  
**Access:** Admin, Supervisor  
**Description:** Bulk assigns enumerators to a survey from CSV data. Creates users if they don't exist.

**Request Body:**
```json
{
  "surveyId": 1,
  "enumerators": [
    {
      "name": "Enumerator One",
      "cid": "34567890123",
      "emailAddress": "enumerator1@nsb.gov.bt",
      "phoneNumber": "+975-34567890",
      "password": "password123"
    },
    {
      "name": "Enumerator Two",
      "cid": "45678901234",
      "emailAddress": "enumerator2@nsb.gov.bt",
      "phoneNumber": "+975-45678901",
      "password": "password123"
    }
  ]
}
```

**Response:**
```json
{
  "success": 2,
  "failed": 0,
  "created": 2,
  "existing": 0,
  "assignments": [
    {
      "userId": 3,
      "surveyId": 1
    },
    {
      "userId": 4,
      "surveyId": 1
    }
  ],
  "errors": []
}
```

**Note:** 
- If a user with the same CID exists, they will be assigned to the survey
- If a user doesn't exist, they will be created with ENUMERATOR role
- Email defaults to `{cid}@dummy.nsb.gov.bt` if not provided
- Password defaults to CID if not provided

---

### 5.6 Download CSV Template for Enumerators

**Endpoint:** `GET /survey-enumerator/template/csv`  
**Access:** Admin, Supervisor  
**Description:** Downloads a CSV template for bulk enumerator upload

**Response:**
- Content-Type: `text/csv`
- File: `enumerator_upload_template.csv`

**CSV Format:**
```csv
Name,CID,Email Address,Phone Number,Password
Enumerator One,34567890123,enumerator1@nsb.gov.bt,+975-34567890,password123
Enumerator Two,45678901234,enumerator2@nsb.gov.bt,+975-45678901,password123
```

---

## 6. Statistics and Reporting

### 6.1 Get Survey Statistics

**Endpoint:** `GET /survey/:id/statistics`  
**Access:** Admin, Supervisor  
**Description:** Retrieves comprehensive statistics for a survey

**Response:**
```json
{
  "surveyId": 1,
  "surveyName": "Annual Household Survey 2024",
  "totalEnumerationAreas": 100,
  "enumerated": 80,
  "sampled": 60,
  "published": 50,
  "pendingEnumeration": 20,
  "pendingSampling": 20,
  "pendingPublishing": 10,
  "enumerationProgress": 80,
  "samplingProgress": 75,
  "publishingProgress": 83.33,
  "totalHouseholds": 2500,
  "totalStructures": 1800
}
```

---

### 6.2 Get Survey Enumeration Hierarchy

**Endpoint:** `GET /survey/:id/enumeration-hierarchy`  
**Access:** Public  
**Description:** Retrieves hierarchical structure of enumeration areas for a survey

**Response:**
```json
{
  "surveyId": 1,
  "surveyName": "Annual Household Survey 2024",
  "hierarchy": [
    {
      "dzongkhag": {
        "id": 1,
        "name": "Thimphu",
        "areaCode": "TH",
        "administrativeZones": [
          {
            "id": 1,
            "name": "Gewog 1",
            "areaCode": "01",
            "subAdministrativeZones": [
              {
                "id": 1,
                "name": "Chiwog 1",
                "areaCode": "01",
                "enumerationAreas": [
                  {
                    "id": 5,
                    "name": "EA-001",
                    "areaCode": "01",
                    "workflowStatus": {
                      "isEnumerated": true,
                      "isSampled": false,
                      "isPublished": false
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

---

### 6.3 Get Submission Statistics

**Endpoint:** `GET /survey-enumeration-area/by-survey/:surveyId/statistics`  
**Access:** Admin, Supervisor  
**Description:** Retrieves submission statistics for a survey (backward compatibility endpoint)

**Response:**
```json
{
  "total": 100,
  "enumerated": 80,
  "sampled": 60,
  "published": 50,
  "pending": 20
}
```

---

## 7. CSV Templates and Uploads

### 7.1 CSV Template Headers

#### Enumeration Area Upload Template
**Headers:**
- `Dzongkhag Code` (required)
- `Gewog/Thromde Code` (required) - Also accepts: `Admin Zone Code`
- `Chiwog/Lap Code` (required) - Also accepts: `Sub Admin Zone Code`
- `Enumeration Code` (required) - Also accepts: `Enumeration Area Code`

**Code Normalization:**
- Single-digit codes are automatically padded to 2 digits
- Example: `1` → `01`, `2` → `02`, `9` → `09`

#### Enumerator Upload Template
**Headers:**
- `Name` (required)
- `CID` (required, unique)
- `Email Address` (optional, defaults to `{cid}@dummy.nsb.gov.bt`)
- `Phone Number` (optional)
- `Password` (optional, defaults to CID)

#### Household Count Upload Template (CSV)
**Headers:**
- `dzongkhagCode` (required)
- `adminZoneCode` (required)
- `subAdminZoneCode` (required)
- `eaCode` (required)
- `surveyId{N}` (dynamic) - Any column starting with `surveyId` where N is the survey ID

---

## 8. Common Error Responses

### 8.1 Authentication Errors

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 8.2 Authorization Errors

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### 8.3 Validation Errors

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "endDate must be after startDate"
  ]
}
```

### 8.4 Not Found Errors

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Survey not found"
}
```

---

## 9. Access Control Summary

| Operation | Admin | Supervisor | Enumerator |
|-----------|-------|------------|------------|
| Create Survey | ✅ | ❌ | ❌ |
| Update Survey | ✅ | ❌ | ❌ |
| Delete Survey | ✅ | ❌ | ❌ |
| View Surveys | ✅ | ✅ | ✅ (assigned only) |
| Assign Enumeration Areas | ✅ | ❌ | ❌ |
| Assign Enumerators | ✅ | ✅ | ❌ |
| Complete Enumeration | ❌ | ❌ | ✅ (assigned only) |
| Perform Sampling | ❌ | ✅ | ❌ |
| Publish Data | ✅ | ❌ | ❌ |
| View Statistics | ✅ | ✅ | ❌ |
| Bulk Upload | ✅ | ❌ | ❌ |

---

## 10. Best Practices

1. **Survey Creation:**
   - Set realistic start and end dates
   - Use descriptive names and descriptions
   - Set appropriate year for reporting

2. **Enumeration Area Assignment:**
   - Use bulk CSV upload for large assignments
   - Verify enumeration areas exist before assignment
   - Check for duplicates before bulk operations

3. **Enumerator Assignment:**
   - Assign enumerators before survey starts
   - Use bulk operations for efficiency
   - Verify enumerators have correct role

4. **Workflow Management:**
   - Follow the workflow: Enumeration → Sampling → Publishing
   - Monitor progress using statistics endpoints
   - Use bulk operations for efficiency

5. **CSV Uploads:**
   - Always download and use the template
   - Verify codes are correct before upload
   - Check for duplicates in CSV files
   - Review error responses after upload

6. **Error Handling:**
   - Always check response status codes
   - Review error arrays in bulk operations
   - Handle partial failures appropriately
   - Log errors for debugging

---

## 11. Example Workflows

### 11.1 Creating a New Survey

```bash
# 1. Create survey
POST /survey
{
  "name": "Annual Household Survey 2024",
  "description": "Comprehensive household survey",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "year": 2024
}

# 2. Assign enumeration areas (bulk CSV upload)
POST /survey-enumeration-area/bulk-upload/1
File: enumeration_areas.csv

# 3. Assign enumerators
POST /survey-enumerator/bulk-assign
{
  "surveyId": 1,
  "userIds": [3, 4, 5, 6]
}

# 4. Verify assignment
GET /survey/1/enumeration-hierarchy
GET /survey-enumerator/by-survey/1
```

### 11.2 Enumeration Workflow

```bash
# 1. Enumerator views assigned surveys
GET /survey-enumerator/by-enumerator/3

# 2. Enumerator completes enumeration
POST /survey-enumeration-area/1/complete-enumeration
{
  "comments": "Enumeration completed"
}

# 3. Supervisor views areas ready for sampling
GET /survey-enumeration-area/by-survey/1/enumerated-for-sampling

# 4. Supervisor performs sampling (via sampling module)
# (Sampling is handled by separate sampling module)

# 5. Admin views areas ready for publishing
GET /survey-enumeration-area/by-survey/1/ready-for-publishing

# 6. Admin publishes data
POST /survey-enumeration-area/1/publish
{
  "comments": "Data validated and published"
}
```

### 11.3 Bulk Household Upload

```bash
# 1. Prepare CSV file with household counts
# Format: dzongkhagCode, adminZoneCode, subAdminZoneCode, eaCode, surveyId1, surveyId2

# 2. Upload CSV
POST /survey/auto-household-upload/csv
File: household_counts.csv

# 3. Verify upload
GET /survey/1/statistics
```

---

## 12. Notes

- All timestamps are in ISO 8601 format (UTC)
- Survey status is automatically updated by cron job daily at midnight
- CSV files must be UTF-8 encoded
- Maximum CSV file size: 10MB
- Codes in CSV are automatically normalized (1 → 01, 2 → 02, etc.)
- Bulk operations continue processing even if some items fail
- Existing data is replaced (not appended) in bulk household uploads
- All household uploads are automatically published

---

## 13. Related Documentation

- [User Management API](./user-management-api.md) - For managing enumerators and supervisors
- [Survey Auto Household Upload API](./survey-auto-household-upload-api.md) - Detailed household upload guide
- [Location API Changes](./location-api-changes-index.md) - For enumeration area management

---

## Revision History

- **Version 1.0** (2024-01-01): Initial comprehensive survey management API documentation

