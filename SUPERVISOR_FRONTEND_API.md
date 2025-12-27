# Supervisor Routes - Frontend API Documentation

## Overview

This document provides frontend developers with comprehensive information on how to integrate with supervisor-specific API routes. All routes are prefixed with `/supervisor/` and require JWT authentication with `SUPERVISOR` role.

## Base Configuration

### Base URL
```typescript
const API_BASE_URL = 'http://localhost:3000'; // or your production URL
const SUPERVISOR_BASE = `${API_BASE_URL}/supervisor`;
```

### Authentication
All requests require a JWT token in the Authorization header:
```typescript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### Error Handling
All endpoints may return standard HTTP error codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (no access to resource)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## 1. Survey Routes

### 1.1 Get Single Survey

**Endpoint:** `GET /supervisor/survey/:surveyId`

**Description:** Get a single survey by ID. Only returns the survey if it has enumeration areas within the supervisor's assigned dzongkhags.

**TypeScript Interface:**
```typescript
interface Survey {
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

interface EnumerationArea {
  id: number;
  name: string;
  areaCode: string;
  SurveyEnumerationArea?: {
    id: number;
    surveyId: number;
    enumerationAreaId: number;
  };
}
```

**Example Usage:**
```typescript
async function getSurvey(surveyId: number): Promise<Survey> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey/${surveyId}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Survey not found or you do not have access to it');
    }
    throw new Error(`Failed to fetch survey: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const survey = await getSurvey(4);
console.log('Survey:', survey);
```

**React Hook Example:**
```typescript
function useSurvey(surveyId: number) {
  const [data, setData] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSurvey() {
      try {
        setLoading(true);
        const response = await fetch(
          `${SUPERVISOR_BASE}/survey/${surveyId}`,
          {
            headers: {
              'Authorization': `Bearer ${getToken()}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Survey not found or you do not have access to it');
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    if (surveyId) {
      fetchSurvey();
    }
  }, [surveyId]);

  return { data, loading, error };
}
```

---

### 1.2 Get Enumeration Hierarchy for Survey

**Endpoint:** `GET /supervisor/survey/:surveyId/enumeration-hierarchy`

**Description:** Get enumeration hierarchy for a survey, filtered to only include dzongkhags assigned to the supervisor.

**TypeScript Interface:**
```typescript
interface EnumerationAreaHierarchy {
  id: number;
  name: string;
  areaCode: string;
  surveyEnumerationAreaId: number;
  totalHouseholdCount: number;
  isEnumerated: boolean;
  enumeratedBy: number | null;
  enumerationDate: string | null;
  isSampled: boolean;
  sampledBy: number | null;
  sampledDate: string | null;
  isPublished: boolean;
  publishedBy: number | null;
  publishedDate: string | null;
}

interface SubAdministrativeZoneHierarchy {
  id: number;
  name: string;
  areaCode: string;
  type: 'chiwog' | 'lap';
  enumerationAreas: EnumerationAreaHierarchy[];
}

interface AdministrativeZoneHierarchy {
  id: number;
  name: string;
  areaCode: string;
  type: 'Gewog' | 'Thromde';
  subAdministrativeZones: SubAdministrativeZoneHierarchy[];
}

interface DzongkhagHierarchy {
  id: number;
  name: string;
  areaCode: string;
  administrativeZones: AdministrativeZoneHierarchy[];
}

interface SurveyEnumerationHierarchy {
  survey: {
    id: number;
    name: string;
    year: number;
    status: string;
  };
  summary: {
    totalDzongkhags: number;
    totalAdministrativeZones: number;
    totalSubAdministrativeZones: number;
    totalEnumerationAreas: number;
  };
  hierarchy: DzongkhagHierarchy[];
}
```

**Example Usage:**
```typescript
async function getSurveyEnumerationHierarchy(
  surveyId: number
): Promise<SurveyEnumerationHierarchy> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey/${surveyId}/enumeration-hierarchy`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch enumeration hierarchy: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const hierarchy = await getSurveyEnumerationHierarchy(4);
console.log('Hierarchy:', hierarchy);
```

**React Hook Example:**
```typescript
function useSurveyEnumerationHierarchy(surveyId: number) {
  const [data, setData] = useState<SurveyEnumerationHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchHierarchy() {
      try {
        setLoading(true);
        const response = await fetch(
          `${SUPERVISOR_BASE}/survey/${surveyId}/enumeration-hierarchy`,
          {
            headers: {
              'Authorization': `Bearer ${getToken()}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    if (surveyId) {
      fetchHierarchy();
    }
  }, [surveyId]);

  return { data, loading, error };
}
```

---

## 2. Enumeration Area Routes

### 2.1 Get EAs by Survey

**Endpoint:** `GET /supervisor/survey-enumeration-area/by-survey/:surveyId`

**Description:** Fetch all enumeration areas for a survey, filtered by supervisor's dzongkhags.

**TypeScript Interface:**
```typescript
interface SurveyEnumerationArea {
  id: number;
  surveyId: number;
  enumerationAreaId: number;
  isEnumerated: boolean;
  isSampled: boolean;
  isPublished: boolean;
  enumerator?: User;
  sampler?: User;
  publisher?: User;
}

interface EnumerationArea {
  id: number;
  name: string;
  areaCode: string;
  subAdministrativeZoneIds: number[];
  surveyEnumerationAreas: SurveyEnumerationArea[];
}

interface SubAdministrativeZone {
  id: number;
  name: string;
  areaCode: string;
  type: 'chiwog' | 'lap';
  enumerationAreas: EnumerationArea[];
}

interface AdministrativeZone {
  id: number;
  name: string;
  areaCode: string;
  type: 'Gewog' | 'Thromde';
  subAdministrativeZones: SubAdministrativeZone[];
}

interface Dzongkhag {
  id: number;
  name: string;
  areaCode: string;
  administrativeZones: AdministrativeZone[];
}

type SurveyEAsResponse = Dzongkhag[];
```

**Example Usage:**
```typescript
async function getEAsBySurvey(surveyId: number): Promise<Dzongkhag[]> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area/by-survey/${surveyId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch EAs: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const eas = await getEAsBySurvey(1);
console.log('Enumeration Areas:', eas);
```

**React Hook Example:**
```typescript
import { useState, useEffect } from 'react';

function useSurveyEAs(surveyId: number) {
  const [data, setData] = useState<Dzongkhag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchEAs() {
      try {
        setLoading(true);
        const response = await fetch(
          `${SUPERVISOR_BASE}/survey-enumeration-area/by-survey/${surveyId}`,
          {
            headers: {
              'Authorization': `Bearer ${getToken()}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    if (surveyId) {
      fetchEAs();
    }
  }, [surveyId]);

  return { data, loading, error };
}
```

---

### 1.2 Get Single Survey Enumeration Area

**Endpoint:** `GET /supervisor/survey-enumeration-area/:id`

**Example Usage:**
```typescript
async function getSurveyEA(id: number): Promise<SurveyEnumerationArea> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area/${id}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You do not have access to this enumeration area');
    }
    throw new Error(`Failed to fetch EA: ${response.statusText}`);
  }

  return response.json();
}
```

---

## 2. Household Listing Routes

### 2.1 Get Households by EA

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId`

**TypeScript Interface:**
```typescript
interface HouseholdListing {
  id: number;
  surveyEnumerationAreaId: number;
  structureId: number;
  householdIdentification: string;
  householdSerialNumber: number;
  nameOfHOH: string;
  totalMale: number;
  totalFemale: number;
  phoneNumber: string | null;
  remarks: string | null;
  submittedBy: number;
  submitter?: User;
  structure?: {
    id: number;
    structureNumber: string;
    latitude: number | null;
    longitude: number | null;
  };
  createdAt: string;
  updatedAt: string;
}
```

**Example Usage:**
```typescript
async function getHouseholdsByEA(
  surveyEnumerationAreaId: number
): Promise<HouseholdListing[]> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area-household-listing/by-survey-ea/${surveyEnumerationAreaId}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch households: ${response.statusText}`);
  }

  return response.json();
}
```

---

### 2.2 Get Sampled Households

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId/sampled`

**Example Usage:**
```typescript
async function getSampledHouseholds(
  surveyEnumerationAreaId: number
): Promise<HouseholdListing[]> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area-household-listing/by-survey-ea/${surveyEnumerationAreaId}/sampled`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch sampled households: ${response.statusText}`);
  }

  return response.json();
}
```

---

### 2.3 Update Household Listing

**Endpoint:** `PATCH /supervisor/survey-enumeration-area-household-listing/:id`

**Request Body:**
```typescript
interface UpdateHouseholdDto {
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

**Example Usage:**
```typescript
async function updateHousehold(
  id: number,
  data: UpdateHouseholdDto
): Promise<HouseholdListing> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area-household-listing/${id}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update household');
  }

  return response.json();
}

// Usage
await updateHousehold(1, {
  nameOfHOH: 'Updated Name',
  totalMale: 3,
  totalFemale: 4,
  phoneNumber: '17234567',
});
```

---

### 2.4 Create Blank Household Listings

**Endpoint:** `POST /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId/create-blank`

**Request Body:**
```typescript
interface CreateBlankHouseholdListingsDto {
  count: number;        // 1-10000
  remarks?: string;
}
```

**Response:**
```typescript
interface CreateBlankResponse {
  success: boolean;
  message: string;
  created: number;
  listings: HouseholdListing[];
}
```

**Example Usage:**
```typescript
async function createBlankHouseholds(
  surveyEnumerationAreaId: number,
  count: number,
  remarks?: string
): Promise<CreateBlankResponse> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area-household-listing/by-survey-ea/${surveyEnumerationAreaId}/create-blank`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ count, remarks }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create blank households');
  }

  return response.json();
}
```

---

### 2.5 Bulk Upload Households from CSV

**Endpoint:** `POST /supervisor/survey-enumeration-area-household-listing/bulk-upload`

**Content-Type:** `multipart/form-data`

**Example Usage:**
```typescript
async function bulkUploadHouseholds(
  surveyEnumerationAreaId: number,
  file: File
): Promise<{
  success: number;
  failed: number;
  created: HouseholdListing[];
  errors: Array<{ listing: any; error: string }>;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('surveyEnumerationAreaId', surveyEnumerationAreaId.toString());

  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area-household-listing/bulk-upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        // Don't set Content-Type - browser will set it with boundary
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload households');
  }

  return response.json();
}

// React Component Example
function HouseholdBulkUpload({ surveyEnumerationAreaId }: { surveyEnumerationAreaId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const response = await bulkUploadHouseholds(surveyEnumerationAreaId, file);
      setResult(response);
      alert(`Success: ${response.success}, Failed: ${response.failed}`);
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload CSV'}
      </button>
      {result && (
        <div>
          <p>Success: {result.success}</p>
          <p>Failed: {result.failed}</p>
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((err: any, idx: number) => (
                <li key={idx}>{err.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### 2.6 Download CSV Template

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/template/csv/:surveyEnumerationAreaId`

**Example Usage:**
```typescript
async function downloadHouseholdTemplate(surveyEnumerationAreaId: number): Promise<void> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area-household-listing/template/csv/${surveyEnumerationAreaId}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download template');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `household_listing_template_${surveyEnumerationAreaId}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

---

### 2.7 Download Household Listings ZIP

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId/export/zip`

**Example Usage:**
```typescript
async function downloadHouseholdListingsZip(
  surveyEnumerationAreaId: number
): Promise<void> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area-household-listing/by-survey-ea/${surveyEnumerationAreaId}/export/zip`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download ZIP');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `household_listings_ea_${surveyEnumerationAreaId}_${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

---

### 2.8 Get Household Count by EA

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId/export/count`

**Response:**
```typescript
interface HouseholdCount {
  surveyEnumerationAreaId: number;
  totalHouseholds: number;
  totalMale: number;
  totalFemale: number;
  totalPopulation: number;
  averageHouseholdSize: number;
}
```

**Example Usage:**
```typescript
async function getHouseholdCount(
  surveyEnumerationAreaId: number
): Promise<HouseholdCount> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area-household-listing/by-survey-ea/${surveyEnumerationAreaId}/export/count`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch household count');
  }

  return response.json();
}
```

---

### 2.9 Get Household Count by Dzongkhag

**Endpoint:** `GET /supervisor/survey-enumeration-area-household-listing/by-dzongkhag/:dzongkhagId/export/count`

**Response:**
```typescript
interface DzongkhagHouseholdCount {
  dzongkhagId: number;
  summary: {
    totalHouseholds: number;
    totalMale: number;
    totalFemale: number;
    totalPopulation: number;
  };
  administrativeZones: Array<{
    id: number;
    name: string;
    areaCode: string;
    type: 'Gewog' | 'Thromde';
    subAdministrativeZones: Array<{
      id: number;
      name: string;
      areaCode: string;
      type: 'chiwog' | 'lap';
      enumerationAreas: Array<{
        id: number;
        name: string;
        areaCode: string;
        totalHouseholds: number;
        totalMale: number;
        totalFemale: number;
        totalPopulation: number;
      }>;
    }>;
  }>;
}
```

**Example Usage:**
```typescript
async function getDzongkhagHouseholdCount(
  dzongkhagId: number
): Promise<DzongkhagHouseholdCount> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumeration-area-household-listing/by-dzongkhag/${dzongkhagId}/export/count`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch dzongkhag household count');
  }

  return response.json();
}
```

---

## 3. Enumerator Management Routes

### 3.1 Get Enumerators by Survey

**Endpoint:** `GET /supervisor/survey-enumerator/by-survey/:surveyId`

**TypeScript Interface:**
```typescript
interface SurveyEnumerator {
  userId: number;
  surveyId: number;
  dzongkhagId: number | null;
  user: {
    id: number;
    name: string;
    emailAddress: string;
    cid: string;
    phoneNumber: string | null;
    role: 'ENUMERATOR';
  };
  survey: {
    id: number;
    name: string;
    year: number;
    status: string;
  };
  dzongkhag?: {
    id: number;
    name: string;
    areaCode: string;
  };
}
```

**Example Usage:**
```typescript
async function getEnumeratorsBySurvey(
  surveyId: number
): Promise<SurveyEnumerator[]> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumerator/by-survey/${surveyId}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch enumerators');
  }

  return response.json();
}
```

---

### 3.2 Bulk Upload Enumerators from CSV

**Endpoint:** `POST /supervisor/survey-enumerator/bulk-assign-csv`

**Content-Type:** `multipart/form-data`

**Response:**
```typescript
interface BulkAssignResponse {
  success: number;
  failed: number;
  created: number;      // New users created
  existing: number;     // Existing users assigned
  assignments: Array<{
    userId: number;
    surveyId: number;
    dzongkhagId: number | null;
  }>;
  errors: Array<{
    enumerator: EnumeratorCsvRow;
    error: string;
  }>;
}
```

**Example Usage:**
```typescript
async function bulkUploadEnumerators(
  surveyId: number,
  file: File
): Promise<BulkAssignResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('surveyId', surveyId.toString());

  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumerator/bulk-assign-csv`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload enumerators');
  }

  return response.json();
}
```

---

### 3.3 Download Enumerator CSV Template

**Endpoint:** `GET /supervisor/survey-enumerator/template/csv`

**Example Usage:**
```typescript
async function downloadEnumeratorTemplate(): Promise<void> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumerator/template/csv`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download template');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'enumerator_upload_template.csv';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

---

### 3.4 Reset Enumerator Password

**Endpoint:** `POST /supervisor/survey-enumerator/:userId/reset-password`

**Request Body:**
```typescript
interface ResetPasswordDto {
  newPassword: string;  // Min 6 characters
}
```

**Example Usage:**
```typescript
async function resetEnumeratorPassword(
  userId: number,
  newPassword: string
): Promise<{ message: string; user: User }> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumerator/${userId}/reset-password`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to reset password');
  }

  return response.json();
}
```

---

### 3.5 Update Enumerator

**Endpoint:** `PATCH /supervisor/survey-enumerator/:userId`

**Request Body:**
```typescript
interface UpdateEnumeratorDto {
  name?: string;
  emailAddress?: string;
  phoneNumber?: string;
  surveyId?: number;
  dzongkhagId?: number;
}
```

**Example Usage:**
```typescript
async function updateEnumerator(
  userId: number,
  data: UpdateEnumeratorDto
): Promise<{ message: string; user: User }> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumerator/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update enumerator');
  }

  return response.json();
}
```

---

### 3.6 Delete Enumerator

**Endpoint:** `DELETE /supervisor/survey-enumerator/:userId/:surveyId`

**Example Usage:**
```typescript
async function deleteEnumerator(
  userId: number,
  surveyId: number
): Promise<{ deleted: boolean }> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/survey-enumerator/${userId}/${surveyId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete enumerator');
  }

  return response.json();
}
```

---

## 4. Sampling Routes

### 4.1 Run Sampling for EA

**Endpoint:** `POST /supervisor/sampling/surveys/:surveyId/enumeration-areas/:seaId/run`

**Request Body:**
```typescript
interface RunSamplingDto {
  method?: 'CSS' | 'SRS';
  sampleSize?: number;
  randomStart?: number;
  overwriteExisting?: boolean;
}
```

**Response:**
```typescript
interface RunSamplingResponse {
  success: boolean;
  message: string;
  data: {
    samplingId: number;
    surveyEnumerationAreaId: number;
    method: 'CSS' | 'SRS';
    sampleSize: number;
    populationSize: number;
    isFullSelection: boolean;
    executedAt: string;
  };
}
```

**Example Usage:**
```typescript
async function runSampling(
  surveyId: number,
  seaId: number,
  options: RunSamplingDto
): Promise<RunSamplingResponse> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/sampling/surveys/${surveyId}/enumeration-areas/${seaId}/run`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to run sampling');
  }

  return response.json();
}

// Usage
await runSampling(1, 1, {
  method: 'CSS',
  sampleSize: 10,
  randomStart: 3,
  overwriteExisting: false,
});
```

---

### 4.2 Get Sampling Results

**Endpoint:** `GET /supervisor/sampling/surveys/:surveyId/enumeration-areas/:seaId/results`

**Response:**
```typescript
interface SamplingResults {
  success: boolean;
  message: string;
  data: {
    sampling: {
      id: number;
      method: 'CSS' | 'SRS';
      sampleSize: number;
      populationSize: number;
      samplingInterval: number | null;
      randomStart: number | null;
      wrapAroundCount: number;
      isFullSelection: boolean;
      selectedIndices: number[];
      metadata: Record<string, any>;
      executedAt: string;
      executedBy: number | null;
    };
    surveyEnumerationArea: {
      id: number;
      surveyId: number;
      enumerationAreaId: number;
      isEnumerated: boolean;
      isSampled: boolean;
      isPublished: boolean;
    };
    enumerationArea: {
      id: number;
      name: string;
      areaCode: string;
      subAdminZone: {
        name: string;
        areaCode: string;
        type: 'chiwog' | 'lap';
      } | null;
      adminZone: {
        name: string;
        areaCode: string;
        type: 'Gewog' | 'Thromde';
      } | null;
    };
    selectedHouseholds: Array<{
      selectionOrder: number;
      isReplacement: boolean;
      household: HouseholdListing;
    }>;
  };
}
```

**Example Usage:**
```typescript
async function getSamplingResults(
  surveyId: number,
  seaId: number
): Promise<SamplingResults> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/sampling/surveys/${surveyId}/enumeration-areas/${seaId}/results`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch sampling results');
  }

  return response.json();
}
```

---

### 4.3 Bulk Run Sampling

**Endpoint:** `POST /supervisor/sampling/surveys/:surveyId/bulk-run`

**Request Body:**
```typescript
interface BulkRunSamplingDto {
  surveyEnumerationAreaIds: number[];
  method?: 'CSS' | 'SRS';
  sampleSize?: number;
  randomStart?: number;
}
```

**Response:**
```typescript
interface BulkRunSamplingResponse {
  success: number;
  failed: number;
  results: Array<{
    surveyEnumerationAreaId: number;
    result: RunSamplingResponse;
  }>;
  errors: Array<{
    surveyEnumerationAreaId: number;
    error: string;
  }>;
}
```

**Example Usage:**
```typescript
async function bulkRunSampling(
  surveyId: number,
  seaIds: number[],
  options: Omit<BulkRunSamplingDto, 'surveyEnumerationAreaIds'>
): Promise<BulkRunSamplingResponse> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/sampling/surveys/${surveyId}/bulk-run`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        surveyEnumerationAreaIds: seaIds,
        ...options,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to run bulk sampling');
  }

  return response.json();
}
```

---

### 4.4 Re-sample EA

**Endpoint:** `POST /supervisor/sampling/surveys/:surveyId/enumeration-areas/:seaId/resample`

**Request Body:** Same as `RunSamplingDto` (overwriteExisting is automatically set to true)

**Example Usage:**
```typescript
async function resampleEA(
  surveyId: number,
  seaId: number,
  options: Omit<RunSamplingDto, 'overwriteExisting'>
): Promise<RunSamplingResponse> {
  const response = await fetch(
    `${SUPERVISOR_BASE}/sampling/surveys/${surveyId}/enumeration-areas/${seaId}/resample`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to resample');
  }

  return response.json();
}
```

---

## Complete API Client Example

Here's a complete TypeScript API client class you can use:

```typescript
class SupervisorAPI {
  private baseUrl: string;
  private getToken: () => string;

  constructor(baseUrl: string, getToken: () => string) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Survey
  async getSurveyEnumerationHierarchy(
    surveyId: number
  ): Promise<SurveyEnumerationHierarchy> {
    return this.request(`/survey/${surveyId}/enumeration-hierarchy`);
  }

  // Enumeration Areas
  async getEAsBySurvey(surveyId: number): Promise<Dzongkhag[]> {
    return this.request(`/survey-enumeration-area/by-survey/${surveyId}`);
  }

  async getSurveyEA(id: number): Promise<SurveyEnumerationArea> {
    return this.request(`/survey-enumeration-area/${id}`);
  }

  // Household Listings
  async getHouseholdsByEA(
    surveyEnumerationAreaId: number
  ): Promise<HouseholdListing[]> {
    return this.request(
      `/survey-enumeration-area-household-listing/by-survey-ea/${surveyEnumerationAreaId}`
    );
  }

  async getSampledHouseholds(
    surveyEnumerationAreaId: number
  ): Promise<HouseholdListing[]> {
    return this.request(
      `/survey-enumeration-area-household-listing/by-survey-ea/${surveyEnumerationAreaId}/sampled`
    );
  }

  async updateHousehold(
    id: number,
    data: UpdateHouseholdDto
  ): Promise<HouseholdListing> {
    return this.request(`/survey-enumeration-area-household-listing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createBlankHouseholds(
    surveyEnumerationAreaId: number,
    count: number,
    remarks?: string
  ): Promise<CreateBlankResponse> {
    return this.request(
      `/survey-enumeration-area-household-listing/by-survey-ea/${surveyEnumerationAreaId}/create-blank`,
      {
        method: 'POST',
        body: JSON.stringify({ count, remarks }),
      }
    );
  }

  async bulkUploadHouseholds(
    surveyEnumerationAreaId: number,
    file: File
  ): Promise<BulkUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('surveyEnumerationAreaId', surveyEnumerationAreaId.toString());

    return this.request('/survey-enumeration-area-household-listing/bulk-upload', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type with boundary
      body: formData,
    });
  }

  async downloadHouseholdTemplate(surveyEnumerationAreaId: number): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/survey-enumeration-area-household-listing/template/csv/${surveyEnumerationAreaId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      }
    );

    if (!response.ok) throw new Error('Failed to download template');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `household_template_${surveyEnumerationAreaId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Enumerators
  async getEnumeratorsBySurvey(surveyId: number): Promise<SurveyEnumerator[]> {
    return this.request(`/survey-enumerator/by-survey/${surveyId}`);
  }

  async bulkUploadEnumerators(
    surveyId: number,
    file: File
  ): Promise<BulkAssignResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('surveyId', surveyId.toString());

    return this.request('/survey-enumerator/bulk-assign-csv', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async resetEnumeratorPassword(
    userId: number,
    newPassword: string
  ): Promise<{ message: string; user: User }> {
    return this.request(`/survey-enumerator/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  async updateEnumerator(
    userId: number,
    data: UpdateEnumeratorDto
  ): Promise<{ message: string; user: User }> {
    return this.request(`/survey-enumerator/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEnumerator(
    userId: number,
    surveyId: number
  ): Promise<{ deleted: boolean }> {
    return this.request(`/survey-enumerator/${userId}/${surveyId}`, {
      method: 'DELETE',
    });
  }

  // Sampling
  async runSampling(
    surveyId: number,
    seaId: number,
    options: RunSamplingDto
  ): Promise<RunSamplingResponse> {
    return this.request(
      `/sampling/surveys/${surveyId}/enumeration-areas/${seaId}/run`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }

  async getSamplingResults(
    surveyId: number,
    seaId: number
  ): Promise<SamplingResults> {
    return this.request(
      `/sampling/surveys/${surveyId}/enumeration-areas/${seaId}/results`
    );
  }

  async bulkRunSampling(
    surveyId: number,
    seaIds: number[],
    options: Omit<BulkRunSamplingDto, 'surveyEnumerationAreaIds'>
  ): Promise<BulkRunSamplingResponse> {
    return this.request(`/sampling/surveys/${surveyId}/bulk-run`, {
      method: 'POST',
      body: JSON.stringify({
        surveyEnumerationAreaIds: seaIds,
        ...options,
      }),
    });
  }

  async resampleEA(
    surveyId: number,
    seaId: number,
    options: Omit<RunSamplingDto, 'overwriteExisting'>
  ): Promise<RunSamplingResponse> {
    return this.request(
      `/sampling/surveys/${surveyId}/enumeration-areas/${seaId}/resample`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }
}

// Usage
const api = new SupervisorAPI(
  'http://localhost:3000/supervisor',
  () => localStorage.getItem('token') || ''
);

// Example
const eas = await api.getEAsBySurvey(1);
const households = await api.getHouseholdsByEA(1);
```

---

## Error Handling Best Practices

```typescript
async function handleAPIError(error: any): Promise<string> {
  if (error.response) {
    // HTTP error response
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return data.message || 'Invalid request data';
      case 401:
        return 'Please log in again';
      case 403:
        return data.message || 'You do not have access to this resource';
      case 404:
        return 'Resource not found';
      case 409:
        return data.message || 'Conflict: This data already exists';
      default:
        return data.message || `Error ${status}`;
    }
  } else if (error.request) {
    // Request made but no response
    return 'Network error: Please check your connection';
  } else {
    // Error in request setup
    return error.message || 'An unexpected error occurred';
  }
}

// Usage in try-catch
try {
  const result = await api.getEAsBySurvey(1);
} catch (error) {
  const message = await handleAPIError(error);
  showErrorToast(message);
}
```

---

## React Query Example

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query hook
function useSurveyEAs(surveyId: number) {
  return useQuery({
    queryKey: ['supervisor', 'survey-eas', surveyId],
    queryFn: () => api.getEAsBySurvey(surveyId),
    enabled: !!surveyId,
  });
}

// Mutation hook
function useUpdateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateHouseholdDto }) =>
      api.updateHousehold(id, data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['supervisor', 'households'],
      });
    },
  });
}

// Component usage
function HouseholdList({ surveyEnumerationAreaId }: { surveyEnumerationAreaId: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['households', surveyEnumerationAreaId],
    queryFn: () => api.getHouseholdsByEA(surveyEnumerationAreaId),
  });

  const updateMutation = useUpdateHousehold();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.map((household) => (
        <div key={household.id}>
          <p>{household.nameOfHOH}</p>
          <button
            onClick={() =>
              updateMutation.mutate({
                id: household.id,
                data: { nameOfHOH: 'Updated Name' },
              })
            }
          >
            Update
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Notes

1. **Authentication**: Always include the JWT token in the Authorization header
2. **Error Handling**: Always handle errors appropriately and show user-friendly messages
3. **File Uploads**: Use FormData for CSV uploads, don't set Content-Type header (browser sets it)
4. **File Downloads**: Create temporary anchor elements for file downloads
5. **TypeScript**: Use the provided interfaces for type safety
6. **Loading States**: Show loading indicators during API calls
7. **Validation**: Validate data on the frontend before sending to API
8. **Pagination**: Some endpoints may need pagination (check response structure)

---

## Support

For questions or issues, refer to the backend API documentation or contact the development team.

