# Workflow: Adding Structure and Household Listing

This document describes the complete workflow for adding structures and household listings to a survey enumeration area.

## Overview

The workflow follows this sequence:
2. **Add Structure(s)** to the enumeration area
3. **Add Household Listing(s)** linked to structures
4. **Complete Enumeration** when all data is collected

## Step 2: Add Structure(s)

**Endpoint**: `POST /survey-enumeration-area-structure`

**Request Body**:
```json
{
  "surveyEnumerationAreaId": 1,
  "structureNumber": "STR-001",
  "latitude": 27.4722,
  "longitude": 89.6390,
  "submittedBy": 5
}
```

**Validation Rules**:
- `surveyEnumerationAreaId`: Must exist and not be enumerated
- `structureNumber`: Must be unique within the enumeration area
- `latitude`: Optional, must be between -90 and 90
- `longitude`: Optional, must be between -180 and 180

**Response**: `SurveyEnumerationAreaStructureResponseDto`

**Notes**:
- Multiple structures can be added to the same enumeration area
- Structure number must be unique per enumeration area
- Geolocation (lat/lng) is optional but recommended for map navigation
- Structure can be added before or after household listings

**Example: Adding Multiple Structures**:
```json
[
  {
    "surveyEnumerationAreaId": 1,
    "structureNumber": "STR-001",
    "latitude": 27.4722,
    "longitude": 89.6390
  },
  {
    "surveyEnumerationAreaId": 1,
    "structureNumber": "STR-002",
    "latitude": 27.4723,
    "longitude": 89.6391
  }
]
```

---

## Step 3: Add Household Listing(s)

**Endpoint**: `POST /survey-enumeration-area-household-listing`

**Request Body**:
```json
{
  "surveyEnumerationAreaId": 1,
  "structureId": 5,
  "householdIdentification": "HH-001",
  "householdSerialNumber": 1,
  "nameOfHOH": "John Doe",
  "totalMale": 2,
  "totalFemale": 3,
  "phoneNumber": "+975-1234567",
  "remarks": "Additional notes"
}
```

**Validation Rules**:
- `surveyEnumerationAreaId`: Must exist and not be enumerated
- `structureId`: Must exist and belong to the same enumeration area
- `householdIdentification`: Required, unique identifier for the household
- `householdSerialNumber`: Required, must be unique within the enumeration area, minimum 1
- `nameOfHOH`: Required, name of head of household
- `totalMale`: Required, minimum 0
- `totalFemale`: Required, minimum 0
- `phoneNumber`: Optional
- `remarks`: Optional

**Response**: `SurveyEnumerationAreaHouseholdListingResponseDto`

**Notes**:
- Household must be linked to a structure (`structureId`)
- Multiple households can belong to the same structure
- Household serial number must be unique within the enumeration area
- At least one household listing is required before completing enumeration

**Example: Adding Multiple Households**:
```json
[
  {
    "surveyEnumerationAreaId": 1,
    "structureId": 5,
    "householdIdentification": "HH-001",
    "householdSerialNumber": 1,
    "nameOfHOH": "John Doe",
    "totalMale": 2,
    "totalFemale": 3
  },
  {
    "surveyEnumerationAreaId": 1,
    "structureId": 5,
    "householdIdentification": "HH-002",
    "householdSerialNumber": 2,
    "nameOfHOH": "Jane Smith",
    "totalMale": 1,
    "totalFemale": 2
  }
]
```

---

## Step 4: Complete Enumeration

**Endpoint**: `POST /survey-enumeration-area/:id/complete-enumeration`

**Request Body**:
```json
{
  "enumeratedBy": 5
}
```

**Validation Rules**:
- Enumeration area must have at least one household listing
- Enumeration area must not already be enumerated
- User must have `ENUMERATOR` role
- User must be assigned to the survey

**Response**: `SurveyEnumerationAreaResponseDto`

**Action**:
- Sets `isEnumerated = true`
- Sets `enumeratedBy = userId`
- Sets `enumerationDate = current timestamp`
- Makes data read-only for enumerator (cannot modify after completion)

**Notes**:
- After completion, enumerator cannot modify structures or households
- Supervisor can then perform sampling on enumerated areas
- This is a one-way operation (cannot undo)

---

## Workflow State Machine

```
┌─────────────────────┐
│  Not Enumerated     │
│  (Initial State)    │
└──────────┬──────────┘
           │
           │ Add Structures & Households
           ▼
┌─────────────────────┐
│  Data Collection    │
│  - Can add/modify   │
│  - Can delete       │
└──────────┬──────────┘
           │
           │ Complete Enumeration
           │ (requires ≥1 household)
           ▼
┌─────────────────────┐
│  Enumerated         │
│  - Read-only        │
│  - Ready for        │
│    sampling         │
└─────────────────────┘
```

---

## Error Scenarios

### 1. Adding Structure to Enumerated Area
**Error**: `400 Bad Request`
**Message**: "Cannot add structure. Enumeration area is already completed."

### 2. Adding Household Without Structure
**Error**: `400 Bad Request`
**Message**: "Structure ID is required and must exist."

### 3. Duplicate Structure Number
**Error**: `400 Bad Request`
**Message**: "Structure number already exists in this enumeration area."

### 4. Duplicate Household Serial Number
**Error**: `400 Bad Request`
**Message**: "Household serial number already exists in this enumeration area."

### 5. Completing Enumeration Without Households
**Error**: `400 Bad Request`
**Message**: "Cannot complete enumeration. At least one household listing is required."

### 6. Completing Enumeration Twice
**Error**: `400 Bad Request`
**Message**: "Enumeration area is already completed."

---

## API Endpoints Summary

### Structure Endpoints
- `POST /survey-enumeration-area-structure` - Create structure
- `GET /survey-enumeration-area-structure/:id` - Get structure
- `PUT /survey-enumeration-area-structure/:id` - Update structure
- `DELETE /survey-enumeration-area-structure/:id` - Delete structure
- `GET /survey-enumeration-area/:seaId/structures` - Get all structures for EA

### Household Listing Endpoints
- `POST /survey-enumeration-area-household-listing` - Create household
- `GET /survey-enumeration-area-household-listing/:id` - Get household
- `PUT /survey-enumeration-area-household-listing/:id` - Update household
- `DELETE /survey-enumeration-area-household-listing/:id` - Delete household
- `GET /survey-enumeration-area/:seaId/household-listings` - Get all households for EA

### Enumeration Area Endpoints
- `POST /survey-enumeration-area/:id/complete-enumeration` - Complete enumeration
- `GET /survey-enumeration-area/:id` - Get enumeration area with full details

---

## Example: Complete Workflow

### 1. Create Survey Enumeration Area
```bash
POST /survey-enumeration-area
{
  "surveyId": 1,
  "enumerationAreaId": 123
}
```

### 2. Add Structure
```bash
POST /survey-enumeration-area-structure
{
  "surveyEnumerationAreaId": 1,
  "structureNumber": "STR-001",
  "latitude": 27.4722,
  "longitude": 89.6390
}
```

### 3. Add Household Listing
```bash
POST /survey-enumeration-area-household-listing
{
  "surveyEnumerationAreaId": 1,
  "structureId": 5,
  "householdIdentification": "HH-001",
  "householdSerialNumber": 1,
  "nameOfHOH": "John Doe",
  "totalMale": 2,
  "totalFemale": 3,
  "phoneNumber": "+975-1234567"
}
```

### 4. Complete Enumeration
```bash
POST /survey-enumeration-area/1/complete-enumeration
{
  "enumeratedBy": 5
}
```

---

## Bulk Operations

### Bulk Upload Structures
**Endpoint**: `POST /survey-enumeration-area-structure/bulk`

**Request Body**:
```json
{
  "surveyEnumerationAreaId": 1,
  "structures": [
    {
      "structureNumber": "STR-001",
      "latitude": 27.4722,
      "longitude": 89.6390
    },
    {
      "structureNumber": "STR-002",
      "latitude": 27.4723,
      "longitude": 89.6391
    }
  ]
}
```

### Bulk Upload Household Listings
**Endpoint**: `POST /survey-enumeration-area-household-listing/bulk`

**Request Body**:
```json
{
  "surveyEnumerationAreaId": 1,
  "householdListings": [
    {
      "structureId": 5,
      "householdIdentification": "HH-001",
      "householdSerialNumber": 1,
      "nameOfHOH": "John Doe",
      "totalMale": 2,
      "totalFemale": 3
    },
    {
      "structureId": 5,
      "householdIdentification": "HH-002",
      "householdSerialNumber": 2,
      "nameOfHOH": "Jane Smith",
      "totalMale": 1,
      "totalFemale": 2
    }
  ]
}
```

---

## Data Validation Checklist

Before completing enumeration, ensure:
- [ ] At least one structure exists
- [ ] At least one household listing exists
- [ ] All households are linked to valid structures
- [ ] All structure numbers are unique within the EA
- [ ] All household serial numbers are unique within the EA
- [ ] All required fields are filled (nameOfHOH, totalMale, totalFemale)
- [ ] Geolocation data is provided (recommended for structures)

---

## Best Practices

1. **Add structures first** - Makes it easier to link households
2. **Use consistent naming** - Structure numbers and household IDs should follow a pattern
3. **Include geolocation** - Helps with map navigation and verification
4. **Validate before completion** - Check all data is correct before completing enumeration
5. **Use bulk operations** - More efficient for adding multiple records
6. **Keep backups** - Export data before completing enumeration

---

**Last Updated**: December 2024
**Version**: 1.0

