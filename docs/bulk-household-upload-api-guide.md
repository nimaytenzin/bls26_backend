# Bulk Household Upload API Documentation Guide

## Overview

The Bulk Household Upload endpoint allows administrators to automatically create household listings for multiple Enumeration Area (EA) and Survey combinations in a single request. This endpoint streamlines the process of setting up survey enumeration areas and generating placeholder household listings.

## Endpoint Details

**URL:** `POST /survey/auto-household-upload`

**Authentication:** Required (JWT Bearer Token)

**Authorization:** Admin role only

**Content-Type:** `application/json`

---

## Request

### Headers

```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### Request Body

The request body must contain an array of items, where each item specifies:
- An enumeration area ID
- A survey ID  
- The number of households to create

#### Request Body Schema

```typescript
{
  items: Array<{
    enumerationAreaId: number;  // Required: ID of the enumeration area
    surveyId: number;            // Required: ID of the survey
    householdCount: number;      // Required: Number of households to create (must be >= 0)
  }>
}
```

#### Validation Rules

- `enumerationAreaId`: Must be a valid integer, must exist in the database
- `surveyId`: Must be a valid integer, must exist in the database
- `householdCount`: Must be a non-negative integer (>= 0)
- Items with `householdCount: 0` will be skipped (not processed)

### Example Request

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
    },
    {
      "enumerationAreaId": 1,
      "surveyId": 2,
      "householdCount": 15
    }
  ]
}
```

### cURL Example

```bash
curl -X POST http://localhost:3000/survey/auto-household-upload \
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

---

## Response

### Success Response (200 OK)

The endpoint returns a summary object containing:
- Total number of items processed
- Number of SurveyEnumerationArea records created
- Number of items skipped
- Total household listings created
- Array of any errors encountered

#### Response Schema

```typescript
{
  totalItems: number;              // Total number of items in the request
  created: number;                  // Number of SurveyEnumerationArea records created
  skipped: number;                  // Number of items skipped (householdCount = 0)
  householdListingsCreated: number; // Total number of household listings created
  errors: Array<{                   // Array of errors encountered during processing
    enumerationAreaId: number;
    surveyId: number;
    householdCount: number;
    reason: string;                 // Error message explaining why this item failed
  }>;
}
```

#### Example Success Response

```json
{
  "totalItems": 3,
  "created": 2,
  "skipped": 0,
  "householdListingsCreated": 70,
  "errors": []
}
```

#### Example Response with Errors

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

### Error Responses

#### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Cause:** Missing or invalid JWT token

#### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

**Cause:** User does not have Admin role

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "items must be an array",
    "enumerationAreaId must be an integer",
    "householdCount must not be less than 0"
  ],
  "error": "Bad Request"
}
```

**Cause:** Request body validation failed

#### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "User ID not found in request"
}
```

**Cause:** User ID missing from authenticated request (should not occur in normal operation)

---

## Behavior and Processing Logic

### What This Endpoint Does

1. **Validates Input**: Checks that all enumeration areas and surveys exist in the database
2. **Creates SurveyEnumerationArea Records**: For each valid item, creates a `SurveyEnumerationArea` record if it doesn't already exist
3. **Generates Household Listings**: Creates blank/dummy household listings for each SurveyEnumerationArea based on the specified `householdCount`
4. **Tracks Results**: Returns a comprehensive summary of what was created, skipped, or failed

### Processing Flow

1. **Validation Phase**:
   - Validates all enumeration area IDs exist
   - Validates all survey IDs exist
   - Items with invalid IDs are added to the errors array

2. **Processing Phase** (for each valid item):
   - If `householdCount === 0`: Item is skipped (increments `skipped` counter)
   - Checks if `SurveyEnumerationArea` exists for the EA-Survey combination
   - If not exists: Creates new `SurveyEnumerationArea` record (increments `created` counter)
   - Creates `householdCount` number of blank household listings
   - Adds to `householdListingsCreated` counter

3. **Error Handling**:
   - Invalid enumeration area IDs → Added to errors
   - Invalid survey IDs → Added to errors
   - Failed SurveyEnumerationArea creation → Added to errors
   - Failed household listing creation → Added to errors
   - Processing continues even if individual items fail

### Important Notes

- **Idempotency**: If a `SurveyEnumerationArea` already exists for an EA-Survey combination, it will not be recreated. The endpoint will proceed to create household listings.
- **Zero Counts**: Items with `householdCount: 0` are automatically skipped and do not create any records.
- **Partial Success**: The endpoint processes all items even if some fail. Check the `errors` array to identify which items failed and why.
- **Household Listings**: Created household listings are blank/dummy records with the remark "Auto-uploaded household data". They can be updated later with actual household information.

---

## Use Cases

### Use Case 1: Initial Survey Setup

When setting up a new survey, you need to create household listings for multiple enumeration areas:

```json
{
  "items": [
    { "enumerationAreaId": 1, "surveyId": 5, "householdCount": 20 },
    { "enumerationAreaId": 2, "surveyId": 5, "householdCount": 25 },
    { "enumerationAreaId": 3, "surveyId": 5, "householdCount": 30 }
  ]
}
```

### Use Case 2: Adding Enumeration Areas to Existing Survey

Add new enumeration areas to an already active survey:

```json
{
  "items": [
    { "enumerationAreaId": 10, "surveyId": 3, "householdCount": 15 },
    { "enumerationAreaId": 11, "surveyId": 3, "householdCount": 18 }
  ]
}
```

### Use Case 3: Bulk Update Across Multiple Surveys

Create household listings for the same enumeration area across different surveys:

```json
{
  "items": [
    { "enumerationAreaId": 5, "surveyId": 1, "householdCount": 22 },
    { "enumerationAreaId": 5, "surveyId": 2, "householdCount": 22 },
    { "enumerationAreaId": 5, "surveyId": 3, "householdCount": 22 }
  ]
}
```

---

## Best Practices

1. **Batch Size**: While there's no hard limit, consider processing in batches of 50-100 items for better performance and easier error tracking.

2. **Error Handling**: Always check the `errors` array in the response. Even if some items fail, others may have succeeded.

3. **Validation**: Validate enumeration area IDs and survey IDs exist before making the request to minimize errors.

4. **Idempotency**: The endpoint is safe to call multiple times. Existing `SurveyEnumerationArea` records won't be duplicated, but household listings will be created each time.

5. **Monitoring**: Track the `householdListingsCreated` count to ensure the expected number of households were created.

---

## Troubleshooting

### Common Issues

#### Issue: "Enumeration area with ID X not found"
**Solution**: Verify the enumeration area ID exists in the database before including it in the request.

#### Issue: "Survey with ID X not found"
**Solution**: Verify the survey ID exists and is accessible.

#### Issue: "Failed to create SurveyEnumerationArea"
**Solution**: This may indicate a database constraint violation or duplicate key. Check if the EA-Survey combination already exists.

#### Issue: "Failed to create household listings"
**Solution**: This may indicate a database issue or missing required fields. Check server logs for detailed error messages.

### Debugging Tips

1. **Start Small**: Test with a single item first before processing large batches
2. **Check Response**: Always review the full response object, especially the `errors` array
3. **Verify IDs**: Ensure all enumeration area and survey IDs are valid before submission
4. **Review Logs**: Check server-side logs for detailed error information

---

## Related Endpoints

- `GET /survey` - List all surveys
- `GET /survey/:id` - Get survey details
- `GET /survey/:id/enumeration-hierarchy` - Get enumeration area hierarchy for a survey
- `POST /survey/:id/enumeration-areas` - Manually add enumeration areas to a survey

---

## API Version

This documentation applies to the current version of the API. For version-specific information, refer to the API changelog.

---

## Support

For additional support or questions about this endpoint, please contact the development team or refer to the main API documentation.

