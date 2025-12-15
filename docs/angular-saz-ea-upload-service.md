# Angular Service & DTO Documentation: SAZ + EA Upload

## Overview

This document provides implementation guidance for Angular developers to integrate with the **Single SAZ + EA Upload** endpoint. The endpoint creates a Sub-Administrative Zone (SAZ) and its corresponding Enumeration Area (EA) in one operation using multipart form data.

## API Endpoint

```
POST /sub-administrative-zone/upload-saz-ea
```

**Authentication:** Required (JWT Bearer Token)  
**Authorization:** Admin role only  
**Content-Type:** `multipart/form-data`

---

## 1. DTO Interface

Create a TypeScript interface for the request payload:

```typescript
// src/app/models/saz-ea-upload.dto.ts

export interface SazEaUploadDto {
  administrativeZoneId: number;
  name: string;
  areaCode: string;
  type: 'chiwog' | 'lap';
  areaSqKm: number;
  file: File; // GeoJSON file
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `administrativeZoneId` | number | Yes | ID of the Administrative Zone this SAZ belongs to |
| `name` | string | Yes | Name of the Sub-Administrative Zone |
| `areaCode` | string | Yes | Area code for the Sub-Administrative Zone |
| `type` | 'chiwog' \| 'lap' | Yes | Type of SAZ: 'chiwog' (rural) or 'lap' (urban) |
| `areaSqKm` | number | Yes | Area of the SAZ in square kilometers |
| `file` | File | Yes | GeoJSON file containing geometry (used for both SAZ and EA) |

### Response Interface

```typescript
// src/app/models/saz-ea-upload-response.dto.ts

export interface SazEaUploadResponse {
  subAdministrativeZone: {
    id: number;
    administrativeZoneId: number;
    name: string;
    areaCode: string;
    type: 'chiwog' | 'lap';
    areaSqKm: number;
    createdAt: string;
    updatedAt: string;
  };
  enumerationArea: {
    id: number;
    subAdministrativeZoneId: number;
    name: string; // Always "EA1"
    areaCode: string; // Always "01"
    description: string;
    areaSqKm: number; // Always 22.22
    createdAt: string;
    updatedAt: string;
  };
}
```

---

## 2. Angular Service Implementation

Create a service to handle the upload:

```typescript
// src/app/services/sub-administrative-zone.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SazEaUploadDto, SazEaUploadResponse } from '../models/saz-ea-upload.dto';

@Injectable({
  providedIn: 'root'
})
export class SubAdministrativeZoneService {
  private apiUrl = `${environment.apiUrl}/sub-administrative-zone`;

  constructor(private http: HttpClient) {}

  /**
   * Upload a single SAZ with its corresponding EA (EA1)
   * 
   * Creates both Sub-Administrative Zone and Enumeration Area in one operation.
   * EA is automatically created with:
   * - name: "EA1"
   * - areaCode: "01"
   * - areaSqKm: 22.22
   * - Same geometry as SAZ
   * 
   * @param data - Upload data including form fields and GeoJSON file
   * @returns Observable with created SAZ and EA
   */
  uploadSazWithEa(data: SazEaUploadDto): Observable<SazEaUploadResponse> {
    // Create FormData for multipart/form-data
    const formData = new FormData();
    
    formData.append('administrativeZoneId', data.administrativeZoneId.toString());
    formData.append('name', data.name);
    formData.append('areaCode', data.areaCode);
    formData.append('type', data.type);
    formData.append('areaSqKm', data.areaSqKm.toString());
    formData.append('file', data.file, data.file.name);

    // Note: Don't set Content-Type header - let browser set it with boundary
    // HttpClient will automatically set multipart/form-data with boundary
    return this.http.post<SazEaUploadResponse>(
      `${this.apiUrl}/upload-saz-ea`,
      formData
    );
  }
}
```

---

## 3. Component Usage Example

Example component demonstrating how to use the service:

```typescript
// src/app/components/saz-ea-upload/saz-ea-upload.component.ts

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SubAdministrativeZoneService } from '../../services/sub-administrative-zone.service';
import { SazEaUploadResponse } from '../../models/saz-ea-upload.dto';

@Component({
  selector: 'app-saz-ea-upload',
  templateUrl: './saz-ea-upload.component.html',
  styleUrls: ['./saz-ea-upload.component.css']
})
export class SazEaUploadComponent {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  uploadResponse: SazEaUploadResponse | null = null;
  error: string | null = null;
  uploading = false;

  constructor(
    private fb: FormBuilder,
    private sazService: SubAdministrativeZoneService
  ) {
    this.uploadForm = this.fb.group({
      administrativeZoneId: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      name: ['', Validators.required],
      areaCode: ['', Validators.required],
      type: ['chiwog', Validators.required],
      areaSqKm: ['', [Validators.required, Validators.min(0)]]
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      
      // Validate file type
      const validTypes = ['application/json', 'application/geo+json'];
      const validExtensions = ['.json', '.geojson'];
      const fileExtension = this.selectedFile.name.toLowerCase().substring(
        this.selectedFile.name.lastIndexOf('.')
      );
      
      if (
        !validTypes.includes(this.selectedFile.type) &&
        !validExtensions.includes(fileExtension)
      ) {
        this.error = 'Invalid file type. Only JSON or GeoJSON files are allowed.';
        this.selectedFile = null;
        return;
      }
      
      this.error = null;
    }
  }

  onSubmit(): void {
    if (this.uploadForm.invalid || !this.selectedFile) {
      this.error = 'Please fill all required fields and select a GeoJSON file.';
      return;
    }

    this.uploading = true;
    this.error = null;
    this.uploadResponse = null;

    const uploadData = {
      ...this.uploadForm.value,
      administrativeZoneId: parseInt(this.uploadForm.value.administrativeZoneId, 10),
      areaSqKm: parseFloat(this.uploadForm.value.areaSqKm),
      file: this.selectedFile
    };

    this.sazService.uploadSazWithEa(uploadData).subscribe({
      next: (response) => {
        this.uploadResponse = response;
        this.uploading = false;
        this.uploadForm.reset();
        this.selectedFile = null;
        console.log('Upload successful:', response);
      },
      error: (err) => {
        this.uploading = false;
        this.error = err.error?.message || 'Upload failed. Please try again.';
        console.error('Upload error:', err);
      }
    });
  }
}
```

### Template Example

```html
<!-- src/app/components/saz-ea-upload/saz-ea-upload.component.html -->

<form [formGroup]="uploadForm" (ngSubmit)="onSubmit()">
  <div class="form-group">
    <label for="administrativeZoneId">Administrative Zone ID *</label>
    <input
      type="number"
      id="administrativeZoneId"
      formControlName="administrativeZoneId"
      class="form-control"
    />
    <div *ngIf="uploadForm.get('administrativeZoneId')?.hasError('required')" class="error">
      Administrative Zone ID is required
    </div>
  </div>

  <div class="form-group">
    <label for="name">SAZ Name *</label>
    <input
      type="text"
      id="name"
      formControlName="name"
      class="form-control"
    />
    <div *ngIf="uploadForm.get('name')?.hasError('required')" class="error">
      Name is required
    </div>
  </div>

  <div class="form-group">
    <label for="areaCode">Area Code *</label>
    <input
      type="text"
      id="areaCode"
      formControlName="areaCode"
      class="form-control"
    />
    <div *ngIf="uploadForm.get('areaCode')?.hasError('required')" class="error">
      Area Code is required
    </div>
  </div>

  <div class="form-group">
    <label for="type">Type *</label>
    <select id="type" formControlName="type" class="form-control">
      <option value="chiwog">Chiwog (Rural)</option>
      <option value="lap">Lap (Urban)</option>
    </select>
  </div>

  <div class="form-group">
    <label for="areaSqKm">Area (sq km) *</label>
    <input
      type="number"
      id="areaSqKm"
      formControlName="areaSqKm"
      step="0.01"
      min="0"
      class="form-control"
    />
    <div *ngIf="uploadForm.get('areaSqKm')?.hasError('required')" class="error">
      Area is required
    </div>
  </div>

  <div class="form-group">
    <label for="file">GeoJSON File *</label>
    <input
      type="file"
      id="file"
      accept=".json,.geojson"
      (change)="onFileSelected($event)"
      class="form-control"
    />
    <small class="form-text text-muted">
      Select a GeoJSON file (Feature, FeatureCollection, or Geometry object)
    </small>
  </div>

  <div *ngIf="error" class="alert alert-danger">
    {{ error }}
  </div>

  <button
    type="submit"
    [disabled]="uploadForm.invalid || !selectedFile || uploading"
    class="btn btn-primary"
  >
    <span *ngIf="uploading">Uploading...</span>
    <span *ngIf="!uploading">Upload SAZ + EA</span>
  </button>
</form>

<div *ngIf="uploadResponse" class="alert alert-success mt-3">
  <h5>Upload Successful!</h5>
  <p><strong>SAZ ID:</strong> {{ uploadResponse.subAdministrativeZone.id }}</p>
  <p><strong>SAZ Name:</strong> {{ uploadResponse.subAdministrativeZone.name }}</p>
  <p><strong>EA ID:</strong> {{ uploadResponse.enumerationArea.id }}</p>
  <p><strong>EA Name:</strong> {{ uploadResponse.enumerationArea.name }} ({{ uploadResponse.enumerationArea.areaCode }})</p>
</div>
```

---

## 4. Important Notes

### EA Auto-Creation
- The EA is automatically created with hardcoded values:
  - **name**: "EA1"
  - **areaCode**: "01"
  - **areaSqKm**: 22.22
  - **geometry**: Same as the SAZ (from uploaded GeoJSON file)

### GeoJSON File Format
The endpoint accepts GeoJSON in three formats:
1. **Feature**: `{ "type": "Feature", "geometry": {...} }`
2. **FeatureCollection**: `{ "type": "FeatureCollection", "features": [...] }` (uses first feature's geometry)
3. **Geometry**: Direct geometry object (Point, Polygon, etc.)

### Error Handling
Common error scenarios:
- **400 Bad Request**: Missing required fields, invalid file type, invalid type value
- **404 Not Found**: Administrative Zone ID doesn't exist
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: User doesn't have Admin role

### File Size Limit
Maximum file size: **50MB**

---

## 5. Environment Configuration

Ensure your `environment.ts` includes the API base URL:

```typescript
// src/environments/environment.ts

export const environment = {
  production: false,
  apiUrl: 'https://nsfd-bsds.nsb.gov.bt/api' // or your API URL
};
```

---

## 6. HTTP Interceptor (Optional)

If you're using an HTTP interceptor for authentication, ensure it doesn't modify `multipart/form-data` requests:

```typescript
// src/app/interceptors/auth.interceptor.ts

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // Don't modify multipart/form-data requests
    if (req.body instanceof FormData) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${this.getToken()}`
        }
      });
      return next.handle(authReq);
    }
    
    // Handle other requests...
  }
}
```

---

## Summary

1. **Create DTO interfaces** for request and response
2. **Implement service method** using `FormData` and `HttpClient`
3. **Build form component** with validation
4. **Handle file selection** and validation
5. **Display success/error messages** appropriately

The service method automatically handles multipart/form-data encoding, so you only need to append fields to `FormData` and send the request.

