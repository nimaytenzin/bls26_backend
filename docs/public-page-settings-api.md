# Public Page Settings API

## Overview

This document describes the API endpoints for managing public page settings. These settings control the configuration of the public data viewer, including map visualization modes, basemap selection, color scales, and content displayed on the national data viewer page.

**Base URL:** `/api/public-page-settings`

**Authentication:** 
- Public endpoints (GET) require no authentication
- Admin endpoints (GET/PUT/POST) require JWT authentication with ADMIN role

**Singleton Pattern:** The settings use a singleton pattern - there is only one settings record (id=1) in the database. If no settings exist, default values are automatically created on first access.

---

## 1. Get Public Page Settings (Public)

Get the current public page settings. This endpoint is publicly accessible and does not require authentication.

### Endpoint

```
GET /api/public-page-settings
```

### Request Headers

```
Content-Type: application/json
```

### Response

**Success (200 OK):**
```json
{
  "id": 1,
  "mapVisualizationMode": "households",
  "selectedBasemapId": "positron",
  "colorScale": "blue",
  "nationalDataViewerTitle": "National Sampling Frame",
  "nationalDataViewerDescription": "Current statistics on households and enumeration areas",
  "nationalDataViewerInfoBoxContent": "A sampling frame is a population from which a sample can be drawn, ensuring survey samples are representative and reliable.",
  "nationalDataViewerInfoBoxStats": "3,310 EAs total (1,464 urban, 1,846 rural)",
  "createdBy": 1,
  "updatedBy": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**

- `500 Internal Server Error` - Database error

### Notes

- If no settings exist in the database, default values are automatically created and returned
- This endpoint is used by the public data viewer pages
- No authentication required

---

## 2. Get Public Page Settings (Admin)

Get the current public page settings. This endpoint requires admin authentication but returns the same data as the public endpoint.

### Endpoint

```
GET /api/public-page-settings/admin
```

### Request Headers

```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Response

**Success (200 OK):**
```json
{
  "id": 1,
  "mapVisualizationMode": "households",
  "selectedBasemapId": "positron",
  "colorScale": "blue",
  "nationalDataViewerTitle": "National Sampling Frame",
  "nationalDataViewerDescription": "Current statistics on households and enumeration areas",
  "nationalDataViewerInfoBoxContent": "A sampling frame is a population from which a sample can be drawn, ensuring survey samples are representative and reliable.",
  "nationalDataViewerInfoBoxStats": "3,310 EAs total (1,464 urban, 1,846 rural)",
  "createdBy": 1,
  "updatedBy": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not have ADMIN role
- `500 Internal Server Error` - Database error

---

## 3. Update Public Page Settings

Update the public page settings. Only admins can update these settings.

### Endpoint

```
PUT /api/public-page-settings/admin
```

### Request Headers

```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Request Body (DTO)

All fields are optional. Only include fields you want to update.

```typescript
{
  mapVisualizationMode?: 'households' | 'enumerationAreas';  // Optional - Map visualization mode
  selectedBasemapId?: string;                                 // Optional - Basemap ID (max 100 chars)
  colorScale?: string;                                        // Optional - Color scale name
  nationalDataViewerTitle?: string;                          // Optional - Page title (max 255 chars)
  nationalDataViewerDescription?: string;                   // Optional - Page description
  nationalDataViewerInfoBoxContent?: string;                // Optional - Info box content
  nationalDataViewerInfoBoxStats?: string;                   // Optional - Info box statistics (max 255 chars)
}
```

### Example Request

```json
{
  "mapVisualizationMode": "enumerationAreas",
  "selectedBasemapId": "dark-matter",
  "colorScale": "viridis",
  "nationalDataViewerTitle": "National Data Viewer",
  "nationalDataViewerDescription": "Explore national statistics and data visualizations",
  "nationalDataViewerInfoBoxContent": "This viewer provides comprehensive statistics on enumeration areas and households across the nation.",
  "nationalDataViewerInfoBoxStats": "3,500 EAs total (1,500 urban, 2,000 rural)"
}
```

### Response

**Success (200 OK):**
```json
{
  "id": 1,
  "mapVisualizationMode": "enumerationAreas",
  "selectedBasemapId": "dark-matter",
  "colorScale": "viridis",
  "nationalDataViewerTitle": "National Data Viewer",
  "nationalDataViewerDescription": "Explore national statistics and data visualizations",
  "nationalDataViewerInfoBoxContent": "This viewer provides comprehensive statistics on enumeration areas and households across the nation.",
  "nationalDataViewerInfoBoxStats": "3,500 EAs total (1,500 urban, 2,000 rural)",
  "createdBy": 1,
  "updatedBy": 2,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not have ADMIN role
- `400 Bad Request` - Validation errors
- `500 Internal Server Error` - Database error

### Validation Rules

- `mapVisualizationMode`: Optional, must be one of: `'households'` or `'enumerationAreas'`
- `selectedBasemapId`: Optional, string, maximum 100 characters
- `colorScale`: Optional, must be one of: `'blue'`, `'green'`, `'red'`, `'purple'`, `'orange'`, `'gray'`, `'yellow'`, `'viridis'`, `'plasma'`
- `nationalDataViewerTitle`: Optional, string, maximum 255 characters
- `nationalDataViewerDescription`: Optional, string (text field)
- `nationalDataViewerInfoBoxContent`: Optional, string (text field)
- `nationalDataViewerInfoBoxStats`: Optional, string, maximum 255 characters

### Notes

- If settings don't exist, they will be created with default values for fields not provided
- The `updatedBy` field is automatically set to the authenticated user's ID
- Only provided fields are updated; other fields remain unchanged

---

## 4. Reset Public Page Settings to Defaults

Reset all public page settings to their default values. Only admins can perform this operation.

### Endpoint

```
POST /api/public-page-settings/admin/reset
```

### Request Headers

```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Request Body

No request body required.

### Response

**Success (200 OK):**
```json
{
  "id": 1,
  "mapVisualizationMode": "households",
  "selectedBasemapId": "positron",
  "colorScale": "blue",
  "nationalDataViewerTitle": "National Sampling Frame",
  "nationalDataViewerDescription": "Current statistics on households and enumeration areas",
  "nationalDataViewerInfoBoxContent": "A sampling frame is a population from which a sample can be drawn, ensuring survey samples are representative and reliable.",
  "nationalDataViewerInfoBoxStats": "3,310 EAs total (1,464 urban, 1,846 rural)",
  "createdBy": 1,
  "updatedBy": 2,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-20T15:00:00.000Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not have ADMIN role
- `500 Internal Server Error` - Database error

### Default Values

When reset, all fields are restored to these default values:

- `mapVisualizationMode`: `"households"`
- `selectedBasemapId`: `"positron"`
- `colorScale`: `"blue"`
- `nationalDataViewerTitle`: `"National Sampling Frame"`
- `nationalDataViewerDescription`: `"Current statistics on households and enumeration areas"`
- `nationalDataViewerInfoBoxContent`: `"A sampling frame is a population from which a sample can be drawn, ensuring survey samples are representative and reliable."`
- `nationalDataViewerInfoBoxStats`: `"3,310 EAs total (1,464 urban, 1,846 rural)"`

### Notes

- If settings don't exist, they will be created with default values
- The `updatedBy` field is automatically set to the authenticated user's ID
- All fields are reset to defaults, regardless of current values

---

## TypeScript Interfaces

For frontend TypeScript projects, use these interfaces:

```typescript
// Update Public Page Settings DTO
interface UpdatePublicPageSettingsDto {
  mapVisualizationMode?: 'households' | 'enumerationAreas';
  selectedBasemapId?: string;
  colorScale?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray' | 'yellow' | 'viridis' | 'plasma';
  nationalDataViewerTitle?: string;
  nationalDataViewerDescription?: string;
  nationalDataViewerInfoBoxContent?: string;
  nationalDataViewerInfoBoxStats?: string;
}

// Public Page Settings Response
interface PublicPageSettingsDto {
  id: number;
  mapVisualizationMode: 'households' | 'enumerationAreas';
  selectedBasemapId: string;
  colorScale: string;
  nationalDataViewerTitle: string;
  nationalDataViewerDescription: string;
  nationalDataViewerInfoBoxContent: string;
  nationalDataViewerInfoBoxStats: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## Example Frontend Usage

### React/TypeScript Example

```typescript
// Get Public Settings (No Auth Required)
const getPublicSettings = async () => {
  const response = await fetch('/api/public-page-settings', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch public page settings');
  }

  return response.json() as Promise<PublicPageSettingsDto>;
};

// Get Settings (Admin)
const getAdminSettings = async (token: string) => {
  const response = await fetch('/api/public-page-settings/admin', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }

  return response.json() as Promise<PublicPageSettingsDto>;
};

// Update Settings (Admin)
const updateSettings = async (
  token: string,
  settings: UpdatePublicPageSettingsDto
) => {
  const response = await fetch('/api/public-page-settings/admin', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update settings');
  }

  return response.json() as Promise<PublicPageSettingsDto>;
};

// Reset Settings to Defaults (Admin)
const resetSettings = async (token: string) => {
  const response = await fetch('/api/public-page-settings/admin/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to reset settings');
  }

  return response.json() as Promise<PublicPageSettingsDto>;
};
```

### Angular Example

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PublicPageSettingsService {
  private apiUrl = '/api/public-page-settings';

  constructor(private http: HttpClient) {}

  // Get public settings (no auth)
  getPublicSettings(): Observable<PublicPageSettingsDto> {
    return this.http.get<PublicPageSettingsDto>(this.apiUrl);
  }

  // Get settings (admin)
  getAdminSettings(): Observable<PublicPageSettingsDto> {
    return this.http.get<PublicPageSettingsDto>(`${this.apiUrl}/admin`);
  }

  // Update settings (admin)
  updateSettings(settings: UpdatePublicPageSettingsDto): Observable<PublicPageSettingsDto> {
    return this.http.put<PublicPageSettingsDto>(
      `${this.apiUrl}/admin`,
      settings
    );
  }

  // Reset settings (admin)
  resetSettings(): Observable<PublicPageSettingsDto> {
    return this.http.post<PublicPageSettingsDto>(
      `${this.apiUrl}/admin/reset`,
      {}
    );
  }
}
```

---

## Error Handling

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "mapVisualizationMode must be one of the following values: households, enumerationAreas",
    "colorScale must be one of the following values: blue, green, red, purple, orange, gray, yellow, viridis, plasma"
  ],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Field Descriptions

### mapVisualizationMode
Controls which data is visualized on the map:
- `"households"` - Display household-level statistics
- `"enumerationAreas"` - Display enumeration area-level statistics

### selectedBasemapId
The basemap style identifier (e.g., `"positron"`, `"dark-matter"`, `"streets"`). This should match the basemap provider's identifier.

### colorScale
The color scale used for data visualization:
- `"blue"` - Blue color scale
- `"green"` - Green color scale
- `"red"` - Red color scale
- `"purple"` - Purple color scale
- `"orange"` - Orange color scale
- `"gray"` - Gray color scale
- `"yellow"` - Yellow color scale
- `"viridis"` - Viridis color scale (perceptually uniform)
- `"plasma"` - Plasma color scale (perceptually uniform)

### nationalDataViewerTitle
The main title displayed on the national data viewer page.

### nationalDataViewerDescription
A description or subtitle displayed on the national data viewer page.

### nationalDataViewerInfoBoxContent
The main content text displayed in the information box on the national data viewer page.

### nationalDataViewerInfoBoxStats
Statistics or summary information displayed in the information box (e.g., total EAs, urban/rural breakdown).

---

## Database Schema

The settings are stored in the `public_page_settings` table with the following structure:

- **Singleton Pattern**: Only one record exists (id=1)
- **Auto-creation**: If no record exists, default values are created automatically
- **Audit Trail**: Tracks `createdBy` and `updatedBy` user IDs
- **Timestamps**: Automatically managed `createdAt` and `updatedAt` fields

---

## Summary

| Endpoint | Method | Description | Auth Required | Role Required |
|----------|--------|-------------|---------------|---------------|
| `/api/public-page-settings` | GET | Get public page settings | No | - |
| `/api/public-page-settings/admin` | GET | Get settings (admin) | Yes | ADMIN |
| `/api/public-page-settings/admin` | PUT | Update settings | Yes | ADMIN |
| `/api/public-page-settings/admin/reset` | POST | Reset to defaults | Yes | ADMIN |

---

## Migration Notes

This API replaces the previous localStorage-based implementation. The frontend should:

1. **Remove localStorage code** - Settings are now stored in the database
2. **Use public endpoint** - For public data viewer pages (no auth required)
3. **Use admin endpoints** - For admin settings panel (requires authentication)
4. **Handle async operations** - All operations are now asynchronous
5. **Implement loading states** - Show loading indicators while fetching/updating
6. **Handle errors** - Implement proper error handling for network failures

For detailed migration instructions, refer to the migration guide documentation.

