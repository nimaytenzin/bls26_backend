# Save Survey API Documentation

This document describes the API endpoint for saving (creating or updating) surveys.

## Overview

The Save Survey endpoint provides a unified way to create or update surveys. If an `id` is provided and the survey exists, it will be updated. If no `id` is provided or the survey doesn't exist, a new survey will be created.

## Authentication

This endpoint requires:
- **Authentication**: Bearer token (JWT) in the Authorization header
- **Role**: Admin only

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoint

### Save Survey (Create or Update)

Saves a survey by either creating a new one or updating an existing one.

**Endpoint:** `POST /survey/save`

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
Accept: application/json
```

**Request Body:**

The request body uses the `SaveSurveyDto` structure. The `id` field is optional:
- If `id` is provided and the survey exists → **Update** the survey
- If `id` is not provided or doesn't exist → **Create** a new survey

**DTO Structure:**

```typescript
{
  id?: number;                    // Optional - If provided, updates existing survey
  name: string;                   // Required - Survey name
  description: string;            // Required - Survey description
  startDate: string;              // Required - Start date (ISO date string: YYYY-MM-DD)
  endDate: string;                // Required - End date (ISO date string: YYYY-MM-DD)
  year: number;                   // Required - Survey year
  status?: 'ACTIVE' | 'ENDED';    // Optional - Survey status (default: 'ACTIVE')
  isSubmitted?: boolean;          // Optional - Whether survey is submitted
  isVerified?: boolean;           // Optional - Whether survey is verified
  enumerationAreaIds?: number[];  // Optional - Array of enumeration area IDs to associate
}
```

**Create New Survey - Request:**
```json
{
  "name": "2024 National Survey",
  "description": "Annual national household survey for 2024",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "year": 2024,
  "status": "ACTIVE",
  "enumerationAreaIds": [1, 2, 3, 4, 5]
}
```

**Update Existing Survey - Request:**
```json
{
  "id": 1,
  "name": "2024 National Survey (Updated)",
  "description": "Updated description for annual national household survey",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "year": 2024,
  "status": "ACTIVE",
  "enumerationAreaIds": [1, 2, 3, 4, 5, 6, 7]
}
```

**Response (200 OK):**

The response returns the saved survey with enumeration areas included:

```json
{
  "id": 1,
  "name": "2024 National Survey",
  "description": "Annual national household survey for 2024",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "year": 2024,
  "status": "ACTIVE",
  "isFullyValidated": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "enumerationAreas": [
    {
      "id": 1,
      "name": "Enumeration Area 1",
      "areaCode": "EA001",
      "isActive": true
    },
    {
      "id": 2,
      "name": "Enumeration Area 2",
      "areaCode": "EA002",
      "isActive": true
    }
  ]
}
```

**Error Responses:**

- **400 Bad Request** - Validation error
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "startDate must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request"
}
```

- **401 Unauthorized** - Missing or invalid token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

- **403 Forbidden** - User is not an admin
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

**Example Requests (cURL):**

Create New Survey:
```bash
curl -X POST \
  http://localhost:3000/survey/save \
  -H 'Authorization: Bearer <your-jwt-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "2024 National Survey",
    "description": "Annual national household survey for 2024",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "year": 2024,
    "status": "ACTIVE",
    "enumerationAreaIds": [1, 2, 3]
  }'
```

Update Existing Survey:
```bash
curl -X POST \
  http://localhost:3000/survey/save \
  -H 'Authorization: Bearer <your-jwt-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": 1,
    "name": "2024 National Survey (Updated)",
    "description": "Updated description",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "year": 2024,
    "status": "ACTIVE",
    "enumerationAreaIds": [1, 2, 3, 4]
  }'
```

**Example Requests (JavaScript/Fetch):**

Create New Survey:
```javascript
const surveyData = {
  name: "2024 National Survey",
  description: "Annual national household survey for 2024",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  year: 2024,
  status: "ACTIVE",
  enumerationAreaIds: [1, 2, 3]
};

const response = await fetch('http://localhost:3000/survey/save', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(surveyData)
});

const savedSurvey = await response.json();
console.log(savedSurvey);
```

Update Existing Survey:
```javascript
const surveyData = {
  id: 1,
  name: "2024 National Survey (Updated)",
  description: "Updated description",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  year: 2024,
  status: "ACTIVE",
  enumerationAreaIds: [1, 2, 3, 4]
};

const response = await fetch('http://localhost:3000/survey/save', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(surveyData)
});

const updatedSurvey = await response.json();
console.log(updatedSurvey);
```

**Example Requests (TypeScript/Axios):**

```typescript
import axios from 'axios';

interface SaveSurveyDto {
  id?: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  year: number;
  status?: 'ACTIVE' | 'ENDED';
  isSubmitted?: boolean;
  isVerified?: boolean;
  enumerationAreaIds?: number[];
}

// Create new survey
const createSurvey = async (token: string) => {
  const surveyData: SaveSurveyDto = {
    name: "2024 National Survey",
    description: "Annual national household survey for 2024",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    year: 2024,
    status: "ACTIVE",
    enumerationAreaIds: [1, 2, 3]
  };

  const response = await axios.post(
    'http://localhost:3000/survey/save',
    surveyData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

// Update existing survey
const updateSurvey = async (token: string, surveyId: number) => {
  const surveyData: SaveSurveyDto = {
    id: surveyId,
    name: "2024 National Survey (Updated)",
    description: "Updated description",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    year: 2024,
    status: "ACTIVE",
    enumerationAreaIds: [1, 2, 3, 4]
  };

  const response = await axios.post(
    'http://localhost:3000/survey/save',
    surveyData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};
```

---

## Behavior Details

### Create vs Update Logic

1. **If `id` is provided:**
   - System checks if a survey with that ID exists
   - If exists → Updates the survey with new data
   - If doesn't exist → Creates a new survey (ignores the provided id)

2. **If `id` is NOT provided:**
   - Always creates a new survey
   - New survey ID is auto-generated

### Enumeration Areas Handling

- If `enumerationAreaIds` is provided:
  - **On Create:** Creates associations with the specified enumeration areas
  - **On Update:** Replaces all existing enumeration area associations with the new ones
  
- If `enumerationAreaIds` is NOT provided:
  - **On Create:** Survey is created without enumeration area associations
  - **On Update:** Existing enumeration area associations remain unchanged

### Validation Rules

- `name`: Required, must be a non-empty string
- `description`: Required, must be a non-empty string
- `startDate`: Required, must be a valid ISO 8601 date string (YYYY-MM-DD)
- `endDate`: Required, must be a valid ISO 8601 date string (YYYY-MM-DD)
- `year`: Required, must be a number
- `status`: Optional, must be either 'ACTIVE' or 'ENDED'
- `enumerationAreaIds`: Optional, must be an array of integers (if provided)

---

## Frontend Integration Guide

### TypeScript DTO Interface

```typescript
export interface SaveSurveyDto {
  id?: number;
  name: string;
  description: string;
  startDate: string; // ISO date string: YYYY-MM-DD
  endDate: string;   // ISO date string: YYYY-MM-DD
  year: number;
  status?: 'ACTIVE' | 'ENDED';
  isSubmitted?: boolean;
  isVerified?: boolean;
  enumerationAreaIds?: number[];
}

export interface Survey {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  year: number;
  status: 'ACTIVE' | 'ENDED';
  isFullyValidated: boolean;
  createdAt: string;
  updatedAt: string;
  enumerationAreas?: EnumerationArea[];
}
```

### React Example Hook

```typescript
import { useState } from 'react';
import axios from 'axios';

export const useSaveSurvey = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveSurvey = async (surveyData: SaveSurveyDto, token: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/survey/save`,
        surveyData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setLoading(false);
      return response.data;
    } catch (err: any) {
      setLoading(false);
      const errorMessage = err.response?.data?.message || 'Failed to save survey';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return { saveSurvey, loading, error };
};
```

### Usage in React Component

```typescript
import { useSaveSurvey } from './hooks/useSaveSurvey';

const SurveyForm = () => {
  const { saveSurvey, loading, error } = useSaveSurvey();
  const [formData, setFormData] = useState<SaveSurveyDto>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    year: new Date().getFullYear(),
    status: 'ACTIVE',
    enumerationAreaIds: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const savedSurvey = await saveSurvey(formData, token);
      console.log('Survey saved:', savedSurvey);
      // Handle success (e.g., redirect, show success message)
    } catch (err) {
      console.error('Error saving survey:', err);
      // Handle error (e.g., show error message)
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Survey'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};
```

---

## Related Endpoints

- `POST /survey` - Create survey (only creates, doesn't update)
- `PATCH /survey/:id` - Update survey (only updates existing survey)
- `GET /survey` - Get all surveys
- `GET /survey/:id` - Get survey by ID
- `DELETE /survey/:id` - Delete survey

