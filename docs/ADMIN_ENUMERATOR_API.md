# Admin Enumerator Management API

This document describes the API endpoints available for administrators to manage enumerators and their survey assignments.

**Base URL:** `/survey-enumerator`

**Authentication:** All endpoints require JWT authentication with `ADMIN` role.

---

## Table of Contents

1. [Get All Enumerators for Survey](#1-get-all-enumerators-for-survey)
2. [Create Single Enumerator](#2-create-single-enumerator)
3. [Soft Delete Enumerator](#3-soft-delete-enumerator)
4. [Restore Enumerator](#4-restore-enumerator)
5. [Bulk Upload Enumerator](#5-bulk-upload-enumerator)
6. [Edit Enumerator with Dzongkhag Assignment](#6-edit-enumerator-with-dzongkhag-assignment)

---

## 1. Get All Enumerators for Survey

Retrieve all enumerator assignments for a specific survey. Returns all enumerators assigned to the survey with their dzongkhag assignments.

### Endpoint

```
GET /survey-enumerator/by-survey/:surveyId
```

### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| surveyId | number | Path | Yes | The ID of the survey |

### Response

Returns an array of `SurveyEnumerator` objects, each containing:

```json
[
  {
    "userId": 1,
    "surveyId": 1,
    "dzongkhagId": 5,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": 1,
      "name": "Nima Yoezer",
      "emailAddress": "nima@example.com",
      "cid": "12345678901",
      "phoneNumber": "17123456",
      "role": "ENUMERATOR"
    },
    "dzongkhag": {
      "id": 5,
      "name": "Thimphu",
      "areaCode": "01"
    }
  }
]
```

### Example Request

```bash
curl -X GET \
  'http://localhost:3000/survey-enumerator/by-survey/1' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### Example Response

```json
[
  {
    "userId": 1,
    "surveyId": 1,
    "dzongkhagId": 5,
    "isActive": true,
    "user": {
      "id": 1,
      "name": "Nima Yoezer",
      "emailAddress": "nima@example.com",
      "cid": "12345678901",
      "phoneNumber": "17123456",
      "role": "ENUMERATOR"
    },
    "dzongkhag": {
      "id": 5,
      "name": "Thimphu",
      "areaCode": "01"
    }
  }
]
```

---

## 2. Create Single Enumerator

Create a single enumerator with dzongkhag assignments. If the user doesn't exist, they will be created automatically. If they exist, their details will be updated.

### Endpoint

```
POST /survey-enumerator/single
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Enumerator's full name |
| cid | string | Yes | Citizen ID (unique identifier) |
| emailAddress | string | No | Email address (defaults to `{cid}@nsb.gov.bt` if not provided) |
| phoneNumber | string | No | Phone number |
| password | string | No | Password (defaults to CID if not provided) |
| surveyId | number | Yes | Survey ID to assign the enumerator to |
| dzongkhagIds | number[] | Yes | Array of dzongkhag IDs (at least one required) |

### Response

Returns an object containing:

```json
{
  "user": {
    "id": 1,
    "name": "Nima Yoezer",
    "emailAddress": "nima@example.com",
    "cid": "12345678901",
    "phoneNumber": "17123456",
    "role": "ENUMERATOR"
  },
  "created": true,
  "assignments": [
    {
      "userId": 1,
      "surveyId": 1,
      "dzongkhagId": 5,
      "isActive": true
    },
    {
      "userId": 1,
      "surveyId": 1,
      "dzongkhagId": 6,
      "isActive": true
    }
  ]
}
```

### Example Request

```bash
curl -X POST \
  'http://localhost:3000/survey-enumerator/single' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Nima Yoezer",
    "cid": "12345678901",
    "emailAddress": "nima@example.com",
    "phoneNumber": "17123456",
    "password": "Bhutan123",
    "surveyId": 1,
    "dzongkhagIds": [5, 6, 7]
  }'
```

### Example Response

```json
{
  "user": {
    "id": 1,
    "name": "Nima Yoezer",
    "emailAddress": "nima@example.com",
    "cid": "12345678901",
    "phoneNumber": "17123456",
    "role": "ENUMERATOR"
  },
  "created": true,
  "assignments": [
    {
      "userId": 1,
      "surveyId": 1,
      "dzongkhagId": 5,
      "isActive": true
    },
    {
      "userId": 1,
      "surveyId": 1,
      "dzongkhagId": 6,
      "isActive": true
    },
    {
      "userId": 1,
      "surveyId": 1,
      "dzongkhagId": 7,
      "isActive": true
    }
  ]
}
```

### Notes

- If a user with the same CID already exists, their details will be updated and new assignments will be created
- The `created` field indicates whether a new user was created (`true`) or an existing user was updated (`false`)
- Multiple dzongkhag assignments can be created in a single request

---

## 3. Soft Delete Enumerator

Soft delete enumerator assignments by setting `isActive` to `false`. This preserves the data but marks it as inactive.

### 3.1. Soft Delete Specific Assignment

Soft delete a specific enumerator assignment for a user-survey-dzongkhag combination.

#### Endpoint

```
DELETE /survey-enumerator/:userId/:surveyId/:dzongkhagId/soft
```

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| userId | number | Path | Yes | User ID of the enumerator |
| surveyId | number | Path | Yes | Survey ID |
| dzongkhagId | number | Path | Yes | Dzongkhag ID |

#### Response

```json
{
  "message": "Enumerator assignment soft deleted successfully"
}
```

#### Example Request

```bash
curl -X DELETE \
  'http://localhost:3000/survey-enumerator/1/1/5/soft' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 3.2. Soft Delete All Assignments for User-Survey

Soft delete all enumerator assignments for a user-survey combination.

#### Endpoint

```
DELETE /survey-enumerator/:userId/:surveyId/soft
```

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| userId | number | Path | Yes | User ID of the enumerator |
| surveyId | number | Path | Yes | Survey ID |

#### Response

```json
{
  "message": "All enumerator assignments soft deleted successfully",
  "deletedCount": 3
}
```

#### Example Request

```bash
curl -X DELETE \
  'http://localhost:3000/survey-enumerator/1/1/soft' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## 4. Restore Enumerator

Restore soft-deleted enumerator assignments by setting `isActive` back to `true`.

### 4.1. Restore Specific Assignment

Restore a specific soft-deleted enumerator assignment.

#### Endpoint

```
POST /survey-enumerator/:userId/:surveyId/:dzongkhagId/restore
```

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| userId | number | Path | Yes | User ID of the enumerator |
| surveyId | number | Path | Yes | Survey ID |
| dzongkhagId | number | Path | Yes | Dzongkhag ID |

#### Response

```json
{
  "message": "Enumerator assignment restored successfully"
}
```

#### Example Request

```bash
curl -X POST \
  'http://localhost:3000/survey-enumerator/1/1/5/restore' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 4.2. Restore All Assignments for User-Survey

Restore all soft-deleted enumerator assignments for a user-survey combination.

#### Endpoint

```
POST /survey-enumerator/:userId/:surveyId/restore
```

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| userId | number | Path | Yes | User ID of the enumerator |
| surveyId | number | Path | Yes | Survey ID |

#### Response

```json
{
  "message": "All enumerator assignments restored successfully",
  "restoredCount": 3
}
```

#### Example Request

```bash
curl -X POST \
  'http://localhost:3000/survey-enumerator/1/1/restore' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## 5. Bulk Upload Enumerator

Bulk upload enumerators from a CSV file. Creates users if they don't exist and assigns them to the survey with dzongkhag assignments. Supports comma-separated dzongkhag codes for multiple assignments per enumerator.

### Endpoint

```
POST /survey-enumerator/bulk-assign-csv
```

### Request

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | CSV file (max 10MB) |
| surveyId | string | Yes | Survey ID (as form field) |

### CSV Format

**Required Headers:**
- `Name` - Enumerator's full name
- `CID` - Citizen ID (unique identifier)
- `Dzongkhag Codes` - Comma-separated dzongkhag codes (e.g., "01,02,03")

**Optional Headers:**
- `Email Address` - Email address (defaults to `{cid}@nsb.gov.bt` if not provided)
- `Phone Number` - Phone number
- `Password` - Password (defaults to CID if not provided)

### CSV Example

```csv
Name,CID,Email Address,Phone Number,Password,Dzongkhag Codes
Nima Yoezer,12345678901,nima@example.com,17123456,,01,02
Tenzin Dorji,23456789012,tenzin@example.com,17234567,Bhutan123,03
```

### Response

Returns an object with processing results:

```json
{
  "success": 2,
  "failed": 0,
  "created": 2,
  "existing": 0,
  "assignments": [
    {
      "userId": 1,
      "surveyId": 1,
      "dzongkhagId": 5,
      "isActive": true
    },
    {
      "userId": 1,
      "surveyId": 1,
      "dzongkhagId": 6,
      "isActive": true
    }
  ],
  "errors": []
}
```

### Example Request

```bash
curl -X POST \
  'http://localhost:3000/survey-enumerator/bulk-assign-csv' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -F 'file=@enumerators.csv' \
  -F 'surveyId=1'
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| success | number | Number of successfully processed enumerators |
| failed | number | Number of failed enumerators |
| created | number | Number of newly created users |
| existing | number | Number of existing users that were updated |
| assignments | array | Array of created SurveyEnumerator objects |
| errors | array | Array of error objects for failed entries |

### Error Response Example

```json
{
  "success": 1,
  "failed": 1,
  "created": 1,
  "existing": 0,
  "assignments": [...],
  "errors": [
    {
      "enumerator": {
        "name": "Test User",
        "cid": "99999999999",
        "dzongkhagCodes": "99"
      },
      "error": "Dzongkhag with code \"99\" not found"
    }
  ]
}
```

### CSV Template

You can download a CSV template using:

```
GET /survey-enumerator/template/csv
```

This returns a CSV file with example data that you can use as a template.

### Notes

- CSV file size limit: 10MB
- Only CSV files are accepted (`.csv` extension or `text/csv` MIME type)
- Dzongkhag codes can be numeric (e.g., "1", "2") or formatted (e.g., "01", "02")
- Multiple dzongkhag codes should be comma-separated in the `Dzongkhag Codes` column
- If a user with the same CID already exists, their details will be updated and new assignments will be created
- Duplicate assignments (same user-survey-dzongkhag) will be skipped

---

## 6. Edit Enumerator with Dzongkhag Assignment

Update enumerator details and/or their dzongkhag assignments. Can update user information (name, email, phone) and/or replace all dzongkhag assignments for a specific survey.

### Endpoint

```
PATCH /survey-enumerator/:userId
```

### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| userId | number | Path | Yes | User ID of the enumerator |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Enumerator's full name |
| emailAddress | string | No | Email address |
| phoneNumber | string | No | Phone number |
| surveyId | number | Conditional | Required when updating assignments (must be provided with `dzongkhagIds`) |
| dzongkhagIds | number[] | Conditional | Required when updating assignments (must be provided with `surveyId`). Replaces all existing assignments for the user-survey combination |

### Response

If assignments are updated:

```json
{
  "message": "Enumerator updated successfully",
  "user": {
    "id": 1,
    "name": "Nima Yoezer Updated",
    "emailAddress": "nima.updated@example.com",
    "cid": "12345678901",
    "phoneNumber": "17123456",
    "role": "ENUMERATOR"
  },
  "assignments": [
    {
      "userId": 1,
      "surveyId": 1,
      "dzongkhagId": 5,
      "isActive": true
    },
    {
      "userId": 1,
      "surveyId": 1,
      "dzongkhagId": 8,
      "isActive": true
    }
  ]
}
```

If only user details are updated:

```json
{
  "message": "Enumerator updated successfully",
  "user": {
    "id": 1,
    "name": "Nima Yoezer Updated",
    "emailAddress": "nima.updated@example.com",
    "cid": "12345678901",
    "phoneNumber": "17123456",
    "role": "ENUMERATOR"
  }
}
```

### Example Request 1: Update User Details Only

```bash
curl -X PATCH \
  'http://localhost:3000/survey-enumerator/1' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Nima Yoezer Updated",
    "emailAddress": "nima.updated@example.com",
    "phoneNumber": "17123456"
  }'
```

### Example Request 2: Update Assignments Only

```bash
curl -X PATCH \
  'http://localhost:3000/survey-enumerator/1' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "surveyId": 1,
    "dzongkhagIds": [5, 8, 9]
  }'
```

### Example Request 3: Update Both User Details and Assignments

```bash
curl -X PATCH \
  'http://localhost:3000/survey-enumerator/1' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Nima Yoezer Updated",
    "emailAddress": "nima.updated@example.com",
    "phoneNumber": "17123456",
    "surveyId": 1,
    "dzongkhagIds": [5, 8, 9]
  }'
```

### Notes

- When `surveyId` and `dzongkhagIds` are provided together, **all existing assignments** for that user-survey combination are **hard deleted** and replaced with the new assignments
- If `dzongkhagIds` is an empty array `[]`, all assignments for the user-survey combination will be removed
- User details can be updated independently without affecting assignments
- Assignments can be updated independently without affecting user details
- Only provided fields will be updated (partial updates are supported)

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Error details"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "This enumerator is already assigned to this survey and dzongkhag"
}
```

---

## Common Use Cases

### Use Case 1: Assign Multiple Enumerators to a Survey

1. Download CSV template: `GET /survey-enumerator/template/csv`
2. Fill in enumerator details with dzongkhag codes
3. Upload CSV: `POST /survey-enumerator/bulk-assign-csv`

### Use Case 2: Update Enumerator's Dzongkhag Assignments

1. Get current assignments: `GET /survey-enumerator/by-survey/:surveyId`
2. Update assignments: `PATCH /survey-enumerator/:userId` with new `dzongkhagIds`

### Use Case 3: Temporarily Deactivate an Enumerator

1. Soft delete: `DELETE /survey-enumerator/:userId/:surveyId/soft`
2. Later restore: `POST /survey-enumerator/:userId/:surveyId/restore`

---

## Notes

- All endpoints require `ADMIN` role (some endpoints also allow `SUPERVISOR` role)
- Soft delete operations preserve data but mark records as inactive (`isActive: false`)
- Hard delete operations permanently remove records from the database
- Dzongkhag codes can be provided as numeric strings (e.g., "1", "2") or formatted (e.g., "01", "02")
- Multiple dzongkhag assignments are supported for each enumerator-survey combination
- User creation is automatic if a user with the provided CID doesn't exist

