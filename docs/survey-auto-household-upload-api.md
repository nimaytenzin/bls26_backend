# Survey Auto Household Upload API

## Endpoint

```
POST /survey/auto-household-upload
POST /survey/auto-household-upload/csv
```

## Description

Bulk upload household counts for multiple Enumeration Area (EA) and Survey combinations. Automatically creates `SurveyEnumerationArea` records if they don't exist and generates blank household listings based on the specified counts.

## Authentication

- **Required:** Yes (JWT Bearer Token)
- **Role:** Admin only

## Request

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
OR
multipart/form-data (for CSV)
```

### Body Schema

```typescript
{
  items: Array<{
    enumerationAreaId: number;  // Required: ID of the enumeration area
    surveyId: number;            // Required: ID of the survey
    householdCount: number;      // Required: Number of households (>= 0)
  }>
}
```

### CSV Upload (multipart/form-data)

- Route: `POST /survey/auto-household-upload/csv`
- Form field: `file` (CSV), max size 10MB
- Delimiter: comma or tab
- Required headers:
  - `dzongkhagCode`
  - `adminZoneCode`
  - `subAdminZoneCode`
  - `eaCode`
- Dynamic survey columns:
  - Any column starting with `surveyId` is treated as a survey ID
  - The cell value is the household count (must be > 0)
- EA resolution chain:
  - `dzongkhagCode` → `adminZoneCode` → `subAdminZoneCode` → `eaCode`
- Behavior:
  - If any EA cannot be resolved, the entire upload is rejected (no partial insert)
  - Counts ≤ 0 or non-numeric are ignored
  - Existing EA+survey data is replaced (not appended) and auto-published

#### CSV Example (headers + one row)

```
dzongkhag,dzongkhagCode,adminZone,adminZoneCode,subAdminZone,subAdminZoneCode,ea,eaCode,surveyId22,surveyId23
Bumthang,3,Choekhor,2,Dhur_Lusibee,1,EA 1,1,22,25
```

#### CSV Response

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

### Validation Rules

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `items` | Array | Yes | Must be an array |
| `enumerationAreaId` | number | Yes | Must exist in database |
| `surveyId` | number | Yes | Must exist in database |
| `householdCount` | number | Yes | Must be >= 0 (0 will be skipped) |

### Request Example

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

### cURL Example

```bash
curl -X POST https://nsfd-bsds.nsb.gov.bt/api/survey/auto-household-upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "enumerationAreaId": 1,
        "surveyId": 1,
        "householdCount": 25
      }
    ]
  }'
```

## Response

### Success Response (200 OK)

```typescript
{
  totalItems: number;              // Total items in request
  created: number;                  // SurveyEnumerationArea records created
  skipped: number;                  // Items skipped (householdCount = 0)
  householdListingsCreated: number; // Total household listings created
  errors: Array<{                   // Errors encountered
    enumerationAreaId: number;
    surveyId: number;
    householdCount: number;
    reason: string;
  }>;
}
```

### Success Example

```json
{
  "totalItems": 3,
  "created": 2,
  "skipped": 0,
  "householdListingsCreated": 70,
  "errors": []
}
```

### Error Example

```json
{
  "totalItems": 3,
  "created": 1,
  "skipped": 1,
  "householdListingsCreated": 25,
  "errors": [
    {
      "enumerationAreaId": 999,
      "surveyId": 1,
      "householdCount": 30,
      "reason": "Enumeration area with ID 999 not found"
    }
  ]
}
```

## Error Responses

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

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "items must be an array",
    "enumerationAreaId must be an integer"
  ],
  "error": "Bad Request"
}
```

## Behavior

1. **Validation**: Validates all enumeration area IDs and survey IDs exist
2. **SurveyEnumerationArea Creation**: Creates `SurveyEnumerationArea` if it doesn't exist for the EA-Survey combination
3. **Replacement Logic**: If data already exists for the same EA-Survey combination:
   - Deletes all existing household listings
   - Deletes all associated structures
   - Creates new household listings (replaces, not appends)
4. **Household Listing Creation**: Creates blank household listings with remark "Auto-uploaded household data"
5. **Auto-Publishing**: Automatically marks the `SurveyEnumerationArea` as published:
   - `isPublished = true`
   - `publishedBy = userId`
   - `publishedDate = current timestamp`
6. **Error Handling**: Continues processing even if individual items fail

## Important Notes

- ⚠️ **Replacement, Not Append**: If data already exists for the same EA-Survey combination, existing records are **deleted and replaced** (not appended)
- ✅ **Auto-Published**: All uploaded data is automatically marked as published (`isPublished = true`)
- ⚠️ **Zero Counts**: Items with `householdCount: 0` are automatically skipped
- ⚠️ **Partial Success**: All items are processed. Check `errors` array for failures
- ℹ️ **Household Listings**: Created listings are blank/dummy records that can be updated later

## Processing Flow

```
1. Validate enumeration areas exist
2. Validate surveys exist
3. For each item:
   - Skip if householdCount === 0
   - Create SurveyEnumerationArea if not exists
   - If existing data found for EA-Survey combination:
     * Delete all existing household listings
     * Delete all associated structures
   - Create householdCount number of blank household listings
   - Mark SurveyEnumerationArea as published (isPublished = true)
4. Return summary with created/skipped counts and errors
```

## Use Cases

### Initial Survey Setup
```json
{
  "items": [
    { "enumerationAreaId": 1, "surveyId": 5, "householdCount": 20 },
    { "enumerationAreaId": 2, "surveyId": 5, "householdCount": 25 }
  ]
}
```

### Adding EAs to Existing Survey
```json
{
  "items": [
    { "enumerationAreaId": 10, "surveyId": 3, "householdCount": 15 }
  ]
}
```

## Related Endpoints

- `GET /survey` - List all surveys
- `GET /survey/:id` - Get survey details
- `GET /survey/:id/enumeration-hierarchy` - Get EA hierarchy
- `POST /survey/:id/enumeration-areas` - Manually add enumeration areas

