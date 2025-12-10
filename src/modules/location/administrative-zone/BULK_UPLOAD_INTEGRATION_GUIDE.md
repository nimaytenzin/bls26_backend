# Administrative Zone Bulk Upload Integration Guide

## Overview
This guide provides instructions for integrating the Administrative Zone bulk upload feature with your frontend application. The endpoint allows uploading multiple administrative zones (Gewogs/Thromdes) via GeoJSON file for a specific Dzongkhag.

## Table of Contents
1. [API Endpoint](#api-endpoint)
2. [Data Service Implementation](#data-service-implementation)
3. [Frontend Integration](#frontend-integration)
4. [GeoJSON Format Requirements](#geojson-format-requirements)
5. [Error Handling](#error-handling)
6. [Example Implementation](#example-implementation)
7. [Best Practices](#best-practices)

---

## API Endpoint

### Endpoint Details
- **URL:** `POST /administrative-zone/bulk-upload-geojson/by-dzongkhag/:dzongkhagId`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Authentication:** Required (JWT Bearer Token)
- **Authorization:** Admin role only

### Path Parameters
- `dzongkhagId` (integer, required) - The ID of the Dzongkhag to assign administrative zones to

### Request Body
- **Field Name:** `file`
- **Type:** File upload
- **Accepted Formats:** `.json`, `.geojson`
- **Max File Size:** 50MB
- **Content:** GeoJSON FeatureCollection

### Response Format
```typescript
{
  success: number;           // Number of successfully created zones
  skipped: number;           // Number of skipped zones (duplicates)
  created: AdministrativeZone[];  // Array of created zones
  skippedItems: Array<{
    areaCode: string;
    dzongkhagId: number;
    reason: string;
  }>;
  errors: Array<{
    feature: any;
    error: string;
  }>;
}
```

### Response Example
```json
{
  "success": 15,
  "skipped": 3,
  "created": [
    {
      "id": 101,
      "dzongkhagId": 1,
      "name": "Paro Gewog",
      "areaCode": "01",
      "type": "Gewog",
      "areaSqKm": 125.5,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "skippedItems": [
    {
      "areaCode": "02",
      "dzongkhagId": 1,
      "reason": "Administrative Zone already exists"
    }
  ],
  "errors": []
}
```

---

## Data Service Implementation

### TypeScript/Angular Service Example

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface BulkUploadResponse {
  success: number;
  skipped: number;
  created: AdministrativeZone[];
  skippedItems: Array<{
    areaCode: string;
    dzongkhagId: number;
    reason: string;
  }>;
  errors: Array<{
    feature: any;
    error: string;
  }>;
}

export interface AdministrativeZone {
  id: number;
  dzongkhagId: number;
  name: string;
  areaCode: string;
  type: 'Gewog' | 'Thromde';
  areaSqKm: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdministrativeZoneService {
  private apiUrl = 'http://your-api-url/api'; // Replace with your API base URL

  constructor(private http: HttpClient) {}

  /**
   * Bulk upload administrative zones by dzongkhag
   * @param dzongkhagId - The ID of the dzongkhag
   * @param file - GeoJSON file to upload
   * @param onProgress - Optional progress callback
   * @returns Observable of upload response
   */
  bulkUploadByDzongkhag(
    dzongkhagId: number,
    file: File,
    onProgress?: (progress: number) => void
  ): Observable<BulkUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders({
      // Authorization will be handled by interceptor
      // 'Authorization': `Bearer ${token}`
    });

    return this.http.post<BulkUploadResponse>(
      `${this.apiUrl}/administrative-zone/bulk-upload-geojson/by-dzongkhag/${dzongkhagId}`,
      formData,
      {
        headers,
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map((event: HttpEvent<BulkUploadResponse>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = Math.round((100 * event.loaded) / (event.total || 1));
          if (onProgress) {
            onProgress(progress);
          }
          // Return null during progress to filter it out
          return null as any;
        } else if (event.type === HttpEventType.Response) {
          return event.body!;
        }
        return null as any;
      })
    ).pipe(
      map(response => {
        if (response === null) {
          throw new Error('Upload in progress');
        }
        return response;
      })
    );
  }

  /**
   * Get all administrative zones by dzongkhag
   * @param dzongkhagId - The ID of the dzongkhag
   * @returns Observable of administrative zones array
   */
  getByDzongkhag(dzongkhagId: number): Observable<AdministrativeZone[]> {
    return this.http.get<AdministrativeZone[]>(
      `${this.apiUrl}/administrative-zone/by-dzongkhag/${dzongkhagId}`
    );
  }
}
```

### React/JavaScript Service Example

```javascript
// administrativeZoneService.js
import axios from 'axios';

const API_BASE_URL = 'http://your-api-url/api'; // Replace with your API base URL

/**
 * Configure axios instance with authentication
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // Adjust based on your auth storage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Bulk upload administrative zones by dzongkhag
 * @param {number} dzongkhagId - The ID of the dzongkhag
 * @param {File} file - GeoJSON file to upload
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Upload response
 */
export const bulkUploadByDzongkhag = async (dzongkhagId, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post(
      `/administrative-zone/bulk-upload-geojson/by-dzongkhag/${dzongkhagId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      }
    );

    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Get all administrative zones by dzongkhag
 * @param {number} dzongkhagId - The ID of the dzongkhag
 * @returns {Promise<Array>} Array of administrative zones
 */
export const getByDzongkhag = async (dzongkhagId) => {
  try {
    const response = await apiClient.get(
      `/administrative-zone/by-dzongkhag/${dzongkhagId}`
    );
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Error handler
 */
const handleError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || 'An error occurred',
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      message: 'No response from server',
      status: 0,
    };
  } else {
    // Error setting up request
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
    };
  }
};
```

---

## Frontend Integration

### Angular Component Example

```typescript
import { Component } from '@angular/core';
import { AdministrativeZoneService, BulkUploadResponse } from './administrative-zone.service';

@Component({
  selector: 'app-admin-zone-upload',
  templateUrl: './admin-zone-upload.component.html',
  styleUrls: ['./admin-zone-upload.component.css']
})
export class AdminZoneUploadComponent {
  selectedFile: File | null = null;
  dzongkhagId: number | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  uploadResult: BulkUploadResponse | null = null;
  error: string | null = null;

  constructor(private adminZoneService: AdministrativeZoneService) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.json') && !file.name.endsWith('.geojson')) {
        this.error = 'Invalid file type. Please upload a .json or .geojson file.';
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        this.error = 'File size exceeds 50MB limit.';
        return;
      }

      this.selectedFile = file;
      this.error = null;
    }
  }

  async uploadFile(): Promise<void> {
    if (!this.selectedFile || !this.dzongkhagId) {
      this.error = 'Please select a file and enter Dzongkhag ID.';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.error = null;
    this.uploadResult = null;

    try {
      const result = await this.adminZoneService
        .bulkUploadByDzongkhag(
          this.dzongkhagId,
          this.selectedFile,
          (progress) => {
            this.uploadProgress = progress;
          }
        )
        .toPromise();

      this.uploadResult = result!;
      
      // Refresh the administrative zone list
      await this.refreshZoneList();
    } catch (error: any) {
      this.error = error.message || 'Upload failed. Please try again.';
      console.error('Upload error:', error);
    } finally {
      this.isUploading = false;
    }
  }

  async refreshZoneList(): Promise<void> {
    if (this.dzongkhagId) {
      try {
        const zones = await this.adminZoneService
          .getByDzongkhag(this.dzongkhagId)
          .toPromise();
        // Update your zone list component/service
        console.log('Zones loaded:', zones);
      } catch (error) {
        console.error('Failed to refresh zone list:', error);
      }
    }
  }

  resetForm(): void {
    this.selectedFile = null;
    this.dzongkhagId = null;
    this.uploadProgress = 0;
    this.uploadResult = null;
    this.error = null;
  }
}
```

### React Component Example

```jsx
import React, { useState } from 'react';
import { bulkUploadByDzongkhag, getByDzongkhag } from './services/administrativeZoneService';

const AdminZoneUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dzongkhagId, setDzongkhagId] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.json') && !file.name.endsWith('.geojson')) {
        setError('Invalid file type. Please upload a .json or .geojson file.');
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit.');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !dzongkhagId) {
      setError('Please select a file and enter Dzongkhag ID.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setUploadResult(null);

    try {
      const result = await bulkUploadByDzongkhag(
        parseInt(dzongkhagId),
        selectedFile,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setUploadResult(result);
      
      // Refresh the administrative zone list
      await refreshZoneList();
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const refreshZoneList = async () => {
    if (dzongkhagId) {
      try {
        const zones = await getByDzongkhag(parseInt(dzongkhagId));
        // Update your zone list component/state
        console.log('Zones loaded:', zones);
      } catch (err) {
        console.error('Failed to refresh zone list:', err);
      }
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDzongkhagId('');
    setUploadProgress(0);
    setUploadResult(null);
    setError(null);
  };

  return (
    <div className="admin-zone-upload">
      <h2>Bulk Upload Administrative Zones</h2>
      
      <div className="form-group">
        <label htmlFor="dzongkhagId">Dzongkhag ID:</label>
        <input
          type="number"
          id="dzongkhagId"
          value={dzongkhagId}
          onChange={(e) => setDzongkhagId(e.target.value)}
          disabled={isUploading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="file">GeoJSON File:</label>
        <input
          type="file"
          id="file"
          accept=".json,.geojson"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      {error && <div className="error">{error}</div>}

      {isUploading && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${uploadProgress}%` }}>
            {uploadProgress}%
          </div>
        </div>
      )}

      {uploadResult && (
        <div className="upload-result">
          <h3>Upload Results</h3>
          <p>Successfully created: {uploadResult.success}</p>
          <p>Skipped (duplicates): {uploadResult.skipped}</p>
          {uploadResult.errors.length > 0 && (
            <div className="errors">
              <h4>Errors:</h4>
              <ul>
                {uploadResult.errors.map((err, index) => (
                  <li key={index}>{err.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="actions">
        <button onClick={handleUpload} disabled={isUploading || !selectedFile}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
        <button onClick={resetForm} disabled={isUploading}>
          Reset
        </button>
      </div>
    </div>
  );
};

export default AdminZoneUpload;
```

---

## GeoJSON Format Requirements

### FeatureCollection Structure
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Paro Gewog",
        "areaCode": "01",
        "type": "Gewog",
        "areaSqKm": 125.5,
        "dzongkhagId": 1
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [89.5, 27.4],
              [89.6, 27.4],
              [89.6, 27.5],
              [89.5, 27.5],
              [89.5, 27.4]
            ]
          ]
        ]
      }
    }
  ]
}
```

### Required Properties
- `name` (string, required) - Name of the administrative zone
- `areaCode` (string, required) - Unique area code within dzongkhag
- `type` (string, optional) - "Gewog" or "Thromde" (defaults to "Gewog")
- `areaSqKm` (number, optional) - Area in square kilometers (defaults to 0)
- `dzongkhagId` (number, optional) - Dzongkhag ID (can be provided in URL or properties)

### Geometry Requirements
- **Type:** Must be `MultiPolygon` or `Polygon`
- **CRS:** WGS84 (EPSG:4326)
- **Coordinates:** Array of coordinate pairs `[longitude, latitude]`

### Example GeoJSON File
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Paro Gewog",
        "areaCode": "01",
        "type": "Gewog",
        "areaSqKm": 125.5
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [89.4167, 27.4333],
              [89.5000, 27.4333],
              [89.5000, 27.5000],
              [89.4167, 27.5000],
              [89.4167, 27.4333]
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Thimphu Thromde",
        "areaCode": "01",
        "type": "Thromde",
        "areaSqKm": 26.1
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [89.6167, 27.4667],
              [89.7000, 27.4667],
              [89.7000, 27.5333],
              [89.6167, 27.5333],
              [89.6167, 27.4667]
            ]
          ]
        ]
      }
    }
  ]
}
```

---

## Error Handling

### Common Errors

#### 1. File Type Error
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only .json or .geojson files are allowed."
}
```

#### 2. File Size Error
```json
{
  "statusCode": 400,
  "message": "File size exceeds 50MB limit."
}
```

#### 3. Invalid GeoJSON Format
```json
{
  "statusCode": 400,
  "message": "Invalid GeoJSON format. Must be a FeatureCollection."
}
```

#### 4. Missing Required Properties
```json
{
  "statusCode": 400,
  "message": "Failed to process GeoJSON file: Missing required properties: dzongkhagId, name, or areaCode"
}
```

#### 5. Authentication Error
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 6. Authorization Error
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### Error Handling Best Practices

```typescript
try {
  const result = await bulkUploadByDzongkhag(dzongkhagId, file);
  
  // Check for errors in the response
  if (result.errors && result.errors.length > 0) {
    console.warn('Some features failed to upload:', result.errors);
    // Display errors to user
  }
  
  // Check for skipped items
  if (result.skipped > 0) {
    console.info('Skipped duplicate items:', result.skippedItems);
    // Inform user about duplicates
  }
  
} catch (error) {
  if (error.response) {
    // Server responded with error
    switch (error.response.status) {
      case 400:
        // Bad request - show validation errors
        break;
      case 401:
        // Unauthorized - redirect to login
        break;
      case 403:
        // Forbidden - show access denied message
        break;
      case 500:
        // Server error - show generic error message
        break;
    }
  } else if (error.request) {
    // Network error
    console.error('Network error:', error.request);
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

---

## Example Implementation

### Complete Integration Example

```typescript
// Complete example with table integration
import { Component, OnInit } from '@angular/core';
import { AdministrativeZoneService } from './administrative-zone.service';

@Component({
  selector: 'app-admin-zone-management',
  template: `
    <div class="admin-zone-management">
      <!-- Upload Section -->
      <div class="upload-section">
        <h2>Bulk Upload Administrative Zones</h2>
        <input type="number" [(ngModel)]="dzongkhagId" placeholder="Dzongkhag ID">
        <input type="file" (change)="onFileSelected($event)" accept=".json,.geojson">
        <button (click)="uploadFile()" [disabled]="isUploading">
          {{ isUploading ? 'Uploading...' : 'Upload' }}
        </button>
        <div *ngIf="uploadProgress > 0" class="progress">
          <div [style.width.%]="uploadProgress">{{ uploadProgress }}%</div>
        </div>
      </div>

      <!-- Results Section -->
      <div *ngIf="uploadResult" class="results">
        <h3>Upload Results</h3>
        <p>Success: {{ uploadResult.success }}</p>
        <p>Skipped: {{ uploadResult.skipped }}</p>
        <p>Errors: {{ uploadResult.errors.length }}</p>
      </div>

      <!-- Administrative Zones Table -->
      <div class="zones-table">
        <h2>Administrative Zones (Dzongkhag {{ dzongkhagId }})</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Area Code</th>
              <th>Type</th>
              <th>Area (km²)</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let zone of zones">
              <td>{{ zone.id }}</td>
              <td>{{ zone.name }}</td>
              <td>{{ zone.areaCode }}</td>
              <td>{{ zone.type }}</td>
              <td>{{ zone.areaSqKm }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AdminZoneManagementComponent implements OnInit {
  dzongkhagId: number | null = null;
  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  uploadResult: any = null;
  zones: any[] = [];

  constructor(private adminZoneService: AdministrativeZoneService) {}

  ngOnInit() {
    // Load initial data if dzongkhagId is available
    if (this.dzongkhagId) {
      this.loadZones();
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  async uploadFile() {
    if (!this.selectedFile || !this.dzongkhagId) return;

    this.isUploading = true;
    this.uploadProgress = 0;

    try {
      this.uploadResult = await this.adminZoneService
        .bulkUploadByDzongkhag(
          this.dzongkhagId!,
          this.selectedFile!,
          (progress) => {
            this.uploadProgress = progress;
          }
        )
        .toPromise();

      // Refresh the table after successful upload
      await this.loadZones();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      this.isUploading = false;
    }
  }

  async loadZones() {
    if (!this.dzongkhagId) return;

    try {
      this.zones = await this.adminZoneService
        .getByDzongkhag(this.dzongkhagId!)
        .toPromise() || [];
    } catch (error) {
      console.error('Failed to load zones:', error);
    }
  }
}
```

---

## Best Practices

### 1. File Validation
- Always validate file type and size on the client side before upload
- Provide clear error messages for invalid files
- Show file size and type information to users

### 2. Progress Indication
- Implement progress bars for large file uploads
- Show estimated time remaining if possible
- Disable form during upload to prevent duplicate submissions

### 3. Error Handling
- Display user-friendly error messages
- Log detailed errors for debugging
- Handle network errors gracefully
- Provide retry functionality for failed uploads

### 4. User Feedback
- Show success/error messages clearly
- Display summary of upload results (created, skipped, errors)
- Provide details about skipped items (duplicates)
- List specific errors for failed features

### 5. Data Refresh
- Automatically refresh the administrative zone list after successful upload
- Update table/UI to reflect new data
- Clear form after successful upload

### 6. Security
- Always include authentication tokens in requests
- Validate user permissions before allowing upload
- Sanitize file names and content
- Implement rate limiting on the client side

### 7. Performance
- Use chunked uploads for very large files (if supported)
- Implement file compression if needed
- Optimize GeoJSON files before upload (remove unnecessary properties)
- Consider pagination for large result sets

### 8. Testing
- Test with various file sizes
- Test with invalid GeoJSON formats
- Test with duplicate data
- Test error scenarios (network failures, server errors)
- Test with different dzongkhag IDs

---

## Troubleshooting

### Issue: Upload fails with 400 error
**Solution:** Check that:
- File is valid GeoJSON FeatureCollection
- All features have required properties (name, areaCode)
- Geometry is valid and in WGS84 (EPSG:4326)

### Issue: Some features are skipped
**Solution:** This is expected behavior for duplicates. Check the `skippedItems` array in the response to see which items already exist.

### Issue: Upload progress not updating
**Solution:** Ensure you're handling the progress events correctly in your service implementation.

### Issue: Authentication errors
**Solution:** Verify that:
- JWT token is valid and not expired
- Token is included in request headers
- User has Admin role

---

## Additional Resources

- [GeoJSON Specification](https://geojson.org/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)

---

## Support

For issues or questions, please contact the development team or refer to the main API documentation.

