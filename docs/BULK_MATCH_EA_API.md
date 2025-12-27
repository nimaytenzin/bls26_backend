# Bulk Match Enumeration Areas API Documentation

This document describes the API endpoint for bulk matching enumeration areas from CSV files during the survey creation workflow.

## Overview

The Bulk Match Enumeration Areas endpoint validates and matches enumeration areas from a CSV file **without requiring a survey ID**. This is designed for use during the survey creation workflow, where you need to validate enumeration areas before the survey is created. Unlike the bulk upload endpoint, this endpoint does not create survey enumeration area assignments - it only matches and returns the enumeration areas that were found.

## Use Case

This endpoint is useful when:
- Creating a new survey and you want to validate enumeration areas beforehand
- Previewing which enumeration areas will be included in a survey
- Validating CSV data before actual survey creation
- Getting enumeration area IDs to use when creating a survey with `enumerationAreaIds` field

## Authentication

This endpoint requires:
- **Authentication**: Bearer token (JWT) in the Authorization header
- **Role**: Admin only

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoint

### Bulk Match Enumeration Areas from CSV

Validates and matches enumeration areas from a CSV file. Returns matched enumeration areas with full hierarchy information.

**Endpoint:** `POST /survey-enumeration-area/bulk-match`

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
Accept: application/json
```

**Request Body (Form Data):**
- **file**: CSV file (multipart/form-data)
  - Maximum file size: 10MB
  - Allowed file types: `.csv`, `text/csv`, `application/vnd.ms-excel`

**CSV Format:**

The CSV file must contain the following headers (case-insensitive):

1. **Dzongkhag Code** (Required)
   - Accepts: `"Dzongkhag Code"`, `"dzongkhag code"`, `"DzongkhagCode"`, or any header containing `"dzongkhag"`

2. **Admin Zone Code** / **Gewog/Thromde Code** (Required)
   - Accepts: `"Admin Zone Code"`, `"admin zone code"`, `"AdminZoneCode"`, `"Administrative Zone Code"`, `"Gewog/Thromde Code"`, `"gewog/thromde code"`, or any header containing `"admin zone"` (without "sub"), `"gewog"`, or `"thromde"`

3. **Sub Admin Zone Code** / **Chiwog/Lap Code** (Required)
   - Accepts: `"Sub Admin Zone Code"`, `"sub admin zone code"`, `"SubAdminZoneCode"`, `"Sub Administrative Zone Code"`, `"Chiwog/Lap Code"`, `"chiwog/lap code"`, or any header containing `"sub admin zone"`, `"chiwog"`, or `"lap"`

4. **Enumeration Code** (Required)
   - Accepts: `"Enumeration Code"`, `"enumeration code"`, `"EnumerationCode"`, `"Enumeration Area Code"`, or any header containing `"enumeration"`

**Example CSV Content:**
```csv
Dzongkhag Code,Gewog/Thromde Code,Chiwog/Lap Code,Enumeration Code
01,01,01,01
01,01,02,01
02,03,01,02
```

**Note:** Numeric codes will be automatically normalized to two-character strings:
- `1` → `"01"`
- `10` → `"10"` (unchanged)
- `2` → `"02"`

---

## Response

**Response (200 OK):**

The response returns a `BulkMatchEaResponseDto` object containing:
- Match statistics (total rows, matched, failed)
- Array of successfully matched enumeration areas with full hierarchy details
- Array of errors for rows that failed to match
- Array of unique enumeration area IDs (useful for survey creation)

**Response Structure:**

```typescript
{
  success: boolean;                    // Whether all rows matched successfully
  totalRows: number;                   // Total number of data rows processed
  matched: number;                     // Number of rows that successfully matched
  failed: number;                      // Number of rows that failed to match
  errors: Array<{                      // Array of errors for failed rows
    row: number;                       // Row number in CSV (1-indexed, including header)
    dzongkhagCode: string;             // Dzongkhag code from CSV
    gewogThromdeCode: string;          // Gewog/Thromde (Admin Zone) code from CSV
    chiwogLapCode: string;             // Chiwog/Lap (Sub Admin Zone) code from CSV
    eaCode: string;                    // Enumeration Area code from CSV
    error: string;                     // Error message
  }>;
  matches: Array<{                     // Array of successfully matched enumeration areas
    row: number;                       // Row number in CSV (1-indexed, including header)
    enumerationAreaId: number;         // Enumeration Area ID
    enumerationAreaName: string;       // Enumeration Area name
    enumerationAreaCode: string;       // Enumeration Area code
    subAdminZoneName: string;          // Sub Administrative Zone name
    adminZoneName: string;             // Administrative Zone name
    dzongkhagName: string;             // Dzongkhag name
    codes: {                           // Codes used for matching
      dzongkhagCode: string;
      adminZoneCode: string;
      subAdminZoneCode: string;
      enumerationCode: string;
    };
  }>;
  matchedEnumerationAreaIds: number[]; // Array of unique enumeration area IDs
}
```

**Example Success Response:**
```json
{
  "success": true,
  "totalRows": 3,
  "matched": 3,
  "failed": 0,
  "errors": [],
  "matches": [
    {
      "row": 2,
      "enumerationAreaId": 1,
      "enumerationAreaName": "Enumeration Area 1",
      "enumerationAreaCode": "01",
      "subAdminZoneName": "Chiwog 1",
      "adminZoneName": "Gewog 1",
      "dzongkhagName": "Thimphu",
      "codes": {
        "dzongkhagCode": "01",
        "adminZoneCode": "01",
        "subAdminZoneCode": "01",
        "enumerationCode": "01"
      }
    },
    {
      "row": 3,
      "enumerationAreaId": 2,
      "enumerationAreaName": "Enumeration Area 2",
      "enumerationAreaCode": "01",
      "subAdminZoneName": "Chiwog 2",
      "adminZoneName": "Gewog 1",
      "dzongkhagName": "Thimphu",
      "codes": {
        "dzongkhagCode": "01",
        "adminZoneCode": "01",
        "subAdminZoneCode": "02",
        "enumerationCode": "01"
      }
    },
    {
      "row": 4,
      "enumerationAreaId": 15,
      "enumerationAreaName": "Enumeration Area 15",
      "enumerationAreaCode": "02",
      "subAdminZoneName": "Chiwog 10",
      "adminZoneName": "Gewog 5",
      "dzongkhagName": "Paro",
      "codes": {
        "dzongkhagCode": "02",
        "adminZoneCode": "03",
        "subAdminZoneCode": "01",
        "enumerationCode": "02"
      }
    }
  ],
  "matchedEnumerationAreaIds": [1, 2, 15]
}
```

**Example Response with Errors:**
```json
{
  "success": false,
  "totalRows": 4,
  "matched": 2,
  "failed": 2,
  "errors": [
    {
      "row": 3,
      "dzongkhagCode": "01",
      "gewogThromdeCode": "01",
      "chiwogLapCode": "",
      "eaCode": "01",
      "error": "Missing required codes"
    },
    {
      "row": 5,
      "dzongkhagCode": "99",
      "gewogThromdeCode": "99",
      "chiwogLapCode": "99",
      "eaCode": "99",
      "error": "Enumeration area not found with these codes"
    }
  ],
  "matches": [
    {
      "row": 2,
      "enumerationAreaId": 1,
      "enumerationAreaName": "Enumeration Area 1",
      "enumerationAreaCode": "01",
      "subAdminZoneName": "Chiwog 1",
      "adminZoneName": "Gewog 1",
      "dzongkhagName": "Thimphu",
      "codes": {
        "dzongkhagCode": "01",
        "adminZoneCode": "01",
        "subAdminZoneCode": "01",
        "enumerationCode": "01"
      }
    },
    {
      "row": 4,
      "enumerationAreaId": 2,
      "enumerationAreaName": "Enumeration Area 2",
      "enumerationAreaCode": "01",
      "subAdminZoneName": "Chiwog 2",
      "adminZoneName": "Gewog 1",
      "dzongkhagName": "Thimphu",
      "codes": {
        "dzongkhagCode": "01",
        "adminZoneCode": "01",
        "subAdminZoneCode": "02",
        "enumerationCode": "01"
      }
    }
  ],
  "matchedEnumerationAreaIds": [1, 2]
}
```

---

## Error Responses

**400 Bad Request - No file uploaded:**
```json
{
  "statusCode": 400,
  "message": "No file uploaded",
  "error": "Bad Request"
}
```

**400 Bad Request - Invalid file type:**
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only .csv files are allowed.",
  "error": "Bad Request"
}
```

**400 Bad Request - CSV parsing error:**
```json
{
  "statusCode": 400,
  "message": "CSV file must contain at least a header and one data row",
  "error": "Bad Request"
}
```

**400 Bad Request - Missing required columns:**
```json
{
  "statusCode": 400,
  "message": "CSV must contain columns: Dzongkhag Code, Admin Zone Code, Sub Admin Zone Code, Enumeration Code. Found headers: ...",
  "error": "Bad Request"
}
```

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## Usage Examples

### Example 1: Using curl

```bash
curl -X POST \
  http://localhost:3000/survey-enumeration-area/bulk-match \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@enumeration_areas.csv"
```

### Example 2: Using the matched IDs in survey creation

After getting the match result, you can use the `matchedEnumerationAreaIds` array when creating a survey:

```javascript
// Step 1: Bulk match enumeration areas
const matchResponse = await fetch('/survey-enumeration-area/bulk-match', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
const matchResult = await matchResponse.json();

// Step 2: Create survey using matched enumeration area IDs
const surveyResponse = await fetch('/survey/save', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "2024 National Survey",
    description: "Annual national household survey",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    year: 2024,
    enumerationAreaIds: matchResult.matchedEnumerationAreaIds  // Use matched IDs
  })
});
```

### Example 3: JavaScript/TypeScript with FormData

```typescript
async function bulkMatchEnumerationAreas(csvFile: File, token: string) {
  const formData = new FormData();
  formData.append('file', csvFile);

  const response = await fetch('/survey-enumeration-area/bulk-match', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}

// Usage
const csvFile = document.getElementById('csvFileInput').files[0];
const token = 'your-jwt-token';

bulkMatchEnumerationAreas(csvFile, token)
  .then(result => {
    console.log(`Matched ${result.matched} out of ${result.totalRows} rows`);
    console.log('Matched enumeration area IDs:', result.matchedEnumerationAreaIds);
    
    if (result.errors.length > 0) {
      console.error('Errors:', result.errors);
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

---

## Differences from Bulk Upload

| Feature | Bulk Match | Bulk Upload |
|---------|------------|-------------|
| **Endpoint** | `POST /survey-enumeration-area/bulk-match` | `POST /survey-enumeration-area/bulk-upload/:surveyId` |
| **Requires Survey ID** | ❌ No | ✅ Yes |
| **Creates Survey Enumeration Area Assignments** | ❌ No | ✅ Yes |
| **Use Case** | Validation before survey creation | Assigning EAs to existing survey |
| **Returns** | Matched EAs with hierarchy details | Upload statistics (created, skipped, errors) |
| **Workflow Stage** | Before survey creation | After survey creation |

---

## Notes

1. **Code Normalization**: Numeric codes are automatically normalized to two-character strings (e.g., `1` → `"01"`, `10` → `"10"`).

2. **Header Flexibility**: The CSV parser is flexible with header names - it supports case-insensitive matching and partial matching for common variations.

3. **Duplicate Handling**: If the same enumeration area appears multiple times in the CSV, it will appear multiple times in the `matches` array, but only once in `matchedEnumerationAreaIds`.

4. **No Database Changes**: This endpoint does not create, update, or delete any database records. It is read-only for validation purposes.

5. **File Size Limit**: Maximum file size is 10MB.

6. **Row Numbering**: Row numbers in responses are 1-indexed and include the header row (header = row 1, first data row = row 2).

---

## Related Endpoints

- **Get CSV Template**: `GET /survey-enumeration-area/template/csv` - Download a CSV template with example data
- **Bulk Upload**: `POST /survey-enumeration-area/bulk-upload/:surveyId` - Upload enumeration areas to an existing survey
- **Create Survey**: `POST /survey/save` - Create a new survey (can use `enumerationAreaIds` from bulk match result)

