# Survey Enumerator Bulk Assign API Documentation

This document describes the API endpoints for bulk assigning enumerators to surveys with dzongkhag scoping.

## Overview

The Survey Enumerator Bulk Assign endpoints allow administrators and supervisors to assign enumerators to surveys with dzongkhag assignments. This enables scoping where enumerators can only see and work with data from the dzongkhags they are assigned to.

## Key Features

- **Dzongkhag Scoping**: Enumerators are assigned to specific dzongkhags, allowing data access control
- **Bulk Assignment**: Assign multiple enumerators at once via CSV upload
- **Automatic User Creation**: Creates user accounts for enumerators if they don't exist
- **Code-based Assignment**: Uses dzongkhag codes (e.g., "01", "02") instead of IDs for easier CSV management

## Authentication

All endpoints require:
- **Authentication**: Bearer token (JWT) in the Authorization header
- **Role**: Admin or Supervisor

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Generate CSV Template

Downloads a CSV template file for bulk enumerator assignment.

**Endpoint:** `GET /survey-enumerator/template/csv`

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Accept: text/csv
```

**Response (200 OK):**

Returns a CSV file with headers and example row:

```csv
Name,CID,Email Address,Phone Number,Password,Dzongkhag Code
Nima Yoezer,12345678901,nima.yoezer@example.com,17123456,01
```

**CSV Columns:**

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| Name | Yes | Full name of the enumerator | "Nima Yoezer" |
| CID | Yes | Citizen ID number | "12345678901" |
| Email Address | No | Email address (auto-generated if not provided) | "nima.yoezer@example.com" |
| Phone Number | No | Phone number | "17123456" |
| Password | No | Password (uses CID if not provided) | "" (empty = use CID) |
| Dzongkhag Code | Yes | Two-character dzongkhag code | "01", "02", "10" |

**Note:** 
- Numeric dzongkhag codes will be automatically normalized to two-character strings (e.g., `1` → `"01"`, `10` → `"10"`)
- If email is not provided, it will be auto-generated as `{cid}@dummy.nsb.gov.bt`
- If password is not provided, the CID will be used as the password

---

### 2. Bulk Assign from CSV

Bulk assigns enumerators to a survey from CSV data. Creates users if they don't exist and assigns them with dzongkhag scoping.

**Endpoint:** `POST /survey-enumerator/bulk-assign-csv`

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
Accept: application/json
```

**Request Body:**

```typescript
{
  surveyId: number;        // Survey ID to assign enumerators to
  enumerators: Array<{     // Array of enumerator data from CSV
    name: string;          // Required - Full name
    cid: string;           // Required - Citizen ID
    emailAddress?: string; // Optional - Email address
    phoneNumber?: string;  // Optional - Phone number
    password?: string;     // Optional - Password (uses CID if not provided)
    role?: string;         // Optional - User role (auto-assigned as ENUMERATOR)
    dzongkhagCode: string; // Required - Dzongkhag code (e.g., "01", "02")
  }>;
}
```

**Example Request:**
```json
{
  "surveyId": 1,
  "enumerators": [
    {
      "name": "Nima Yoezer",
      "cid": "12345678901",
      "emailAddress": "nima.yoezer@example.com",
      "phoneNumber": "17123456",
      "dzongkhagCode": "01"
    },
    {
      "name": "Tenzin Dorji",
      "cid": "98765432109",
      "dzongkhagCode": "02"
    }
  ]
}
```

**Response (200 OK):**

```typescript
{
  success: number;           // Number of successful assignments
  failed: number;            // Number of failed assignments
  created: number;           // Number of new users created
  existing: number;          // Number of existing users assigned
  assignments: Array<{       // Array of created assignments
    userId: number;
    surveyId: number;
    dzongkhagId: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
  errors: Array<{            // Array of errors for failed assignments
    enumerator: {
      name: string;
      cid: string;
      // ... other fields
    };
    error: string;           // Error message
  }>;
}
```

**Example Success Response:**
```json
{
  "success": 2,
  "failed": 0,
  "created": 1,
  "existing": 1,
  "assignments": [
    {
      "userId": 10,
      "surveyId": 1,
      "dzongkhagId": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "userId": 15,
      "surveyId": 1,
      "dzongkhagId": 2,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "errors": []
}
```

**Example Response with Errors:**
```json
{
  "success": 1,
  "failed": 1,
  "created": 1,
  "existing": 0,
  "assignments": [
    {
      "userId": 10,
      "surveyId": 1,
      "dzongkhagId": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "errors": [
    {
      "enumerator": {
        "name": "Invalid User",
        "cid": "99999999999",
        "dzongkhagCode": "99"
      },
      "error": "Dzongkhag with code \"99\" not found"
    }
  ]
}
```

---

### 3. Bulk Assign (Simple)

Bulk assigns existing users to a survey by user IDs (without dzongkhag assignment).

**Endpoint:** `POST /survey-enumerator/bulk-assign`

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "surveyId": 1,
  "userIds": [10, 15, 20]
}
```

**Response (200 OK):**
Returns an array of created survey enumerator assignments.

---

## Error Responses

**400 Bad Request - Invalid dzongkhag code:**
```json
{
  "statusCode": 400,
  "message": "Dzongkhag with code \"99\" not found",
  "error": "Bad Request"
}
```

**400 Bad Request - Duplicate assignment:**
```json
{
  "statusCode": 400,
  "message": "User already assigned to this survey or duplicate CID",
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

### Example 1: Download CSV Template using curl

```bash
curl -X GET \
  http://localhost:3000/survey-enumerator/template/csv \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o enumerator_template.csv
```

### Example 2: Bulk Assign from CSV Data

```javascript
const csvData = `Name,CID,Email Address,Phone Number,Password,Dzongkhag Code
Nima Yoezer,12345678901,nima.yoezer@example.com,17123456,01
Tenzin Dorji,98765432109,tenzin.dorji@example.com,17234567,02`;

// Parse CSV (using a CSV parser library)
const rows = parseCSV(csvData);
const enumerators = rows.map(row => ({
  name: row['Name'],
  cid: row['CID'],
  emailAddress: row['Email Address'] || undefined,
  phoneNumber: row['Phone Number'] || undefined,
  password: row['Password'] || undefined,
  dzongkhagCode: row['Dzongkhag Code']
}));

const response = await fetch('/survey-enumerator/bulk-assign-csv', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    surveyId: 1,
    enumerators
  })
});

const result = await response.json();
console.log(`Successfully assigned ${result.success} enumerators`);
console.log(`Created ${result.created} new users`);
if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

### Example 3: TypeScript/JavaScript with FormData (CSV File Upload)

```typescript
async function bulkAssignEnumeratorsFromCSV(
  surveyId: number,
  csvFile: File,
  token: string
) {
  // First, parse the CSV file
  const csvContent = await csvFile.text();
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Find column indices
  const nameIndex = headers.findIndex(h => 
    h.toLowerCase().includes('name')
  );
  const cidIndex = headers.findIndex(h => 
    h.toLowerCase() === 'cid'
  );
  const emailIndex = headers.findIndex(h => 
    h.toLowerCase().includes('email')
  );
  const phoneIndex = headers.findIndex(h => 
    h.toLowerCase().includes('phone')
  );
  const passwordIndex = headers.findIndex(h => 
    h.toLowerCase().includes('password')
  );
  const dzongkhagCodeIndex = headers.findIndex(h => 
    h.toLowerCase().includes('dzongkhag') && h.toLowerCase().includes('code')
  );

  // Parse rows
  const enumerators = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < 2) continue; // Skip empty rows
    
    enumerators.push({
      name: values[nameIndex],
      cid: values[cidIndex],
      emailAddress: emailIndex >= 0 ? values[emailIndex] : undefined,
      phoneNumber: phoneIndex >= 0 ? values[phoneIndex] : undefined,
      password: passwordIndex >= 0 ? values[passwordIndex] : undefined,
      dzongkhagCode: values[dzongkhagCodeIndex]
    });
  }

  // Make API call
  const response = await fetch('/survey-enumerator/bulk-assign-csv', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      surveyId,
      enumerators
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
const csvFile = document.getElementById('csvFileInput').files[0];
const token = 'your-jwt-token';

bulkAssignEnumeratorsFromCSV(1, csvFile, token)
  .then(result => {
    console.log(`Successfully assigned ${result.success} enumerators`);
    console.log(`Created ${result.created} new users`);
    console.log(`Existing users: ${result.existing}`);
    
    if (result.errors.length > 0) {
      console.error('Errors:', result.errors);
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

---

## Dzongkhag Code Normalization

The system automatically normalizes dzongkhag codes to ensure consistency:

- Single-digit numbers are padded with leading zeros: `1` → `"01"`, `2` → `"02"`
- Two-digit numbers remain unchanged: `10` → `"10"`, `20` → `"20"`
- String codes are used as-is: `"01"` → `"01"`, `"TH"` → `"TH"`

This ensures that both numeric and string inputs are handled correctly.

---

## Data Access Scoping

When an enumerator is assigned with a `dzongkhagId`:

1. **Data Visibility**: The enumerator can only see and work with enumeration areas, households, and structures from the assigned dzongkhag(s)
2. **Assignment Scope**: Each enumerator assignment includes a `dzongkhagId` that links them to a specific dzongkhag
3. **Multiple Assignments**: An enumerator can be assigned to the same survey multiple times with different dzongkhags
4. **Filtering**: API endpoints should filter results based on the enumerator's assigned dzongkhags

---

## Related Endpoints

- **Create Single Assignment**: `POST /survey-enumerator` - Create a single enumerator assignment (supports `dzongkhagId` in DTO)
- **List by Survey**: `GET /survey-enumerator/by-survey/:surveyId` - Get all enumerators assigned to a survey
- **List by Enumerator**: `GET /survey-enumerator/by-enumerator/:userId` - Get all surveys an enumerator is assigned to
- **Bulk Remove**: `DELETE /survey-enumerator/bulk-remove/:surveyId` - Remove multiple enumerators from a survey

---

## Notes

1. **Automatic User Creation**: If an enumerator with the given CID doesn't exist, a new user account is automatically created with the ENUMERATOR role.

2. **Password Handling**: If no password is provided, the CID is used as the default password. Users should change their password after first login.

3. **Email Generation**: If no email is provided, the system generates a dummy email in the format: `{cid}@dummy.nsb.gov.bt`

4. **Duplicate Prevention**: The system prevents duplicate assignments (same user + same survey) using a unique constraint.

5. **Dzongkhag Validation**: Invalid dzongkhag codes will cause the assignment to fail for that specific enumerator, but other enumerators in the batch will still be processed.

6. **Transaction Handling**: Each enumerator assignment is processed independently. If one fails, others will continue to be processed.

---

## Database Schema

The `survey_enumerators` table structure:

```sql
CREATE TABLE survey_enumerators (
  userId INTEGER NOT NULL,
  surveyId INTEGER NOT NULL,
  dzongkhagId INTEGER NULL,  -- New field for dzongkhag scoping
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  PRIMARY KEY (userId, surveyId),
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (surveyId) REFERENCES surveys(id),
  FOREIGN KEY (dzongkhagId) REFERENCES dzongkhags(id),
  UNIQUE (userId, surveyId)
);
```

**Key Points:**
- Composite primary key: `(userId, surveyId)`
- `dzongkhagId` is nullable (allows assignments without dzongkhag scoping)
- Unique constraint ensures one assignment per user-survey combination

