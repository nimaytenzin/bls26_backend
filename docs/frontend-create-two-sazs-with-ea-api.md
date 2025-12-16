# Frontend API Guide: Create Two SAZs with EA

## Overview

This guide explains how to use the endpoint that creates two Sub-Administrative Zones (SAZs) from GeoJSON files and automatically creates a single Enumeration Area (EA) that links to both SAZs via the junction table.

## Endpoint Details

**URL:** `POST /enumeration-area/create-two-sazs-with-ea`  
**Access:** Admin only (requires JWT authentication)  
**Content-Type:** `multipart/form-data`

## Request Format

### Form Data Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File[] | Yes | Array of exactly 2 GeoJSON files (SAZ1 and SAZ2) |
| `saz1Data` | string (JSON) | Yes | JSON string with SAZ1 metadata |
| `saz2Data` | string (JSON) | Yes | JSON string with SAZ2 metadata |

### SAZ Data Structure

Each SAZ data object should contain:

```typescript
{
  name: string;                    // SAZ name
  areaCode: string;                // Unique area code within administrative zone
  type: 'chiwog' | 'lap';          // SAZ type
  administrativeZoneId: number;     // Administrative Zone ID (must be same for both SAZs)
}
```

### GeoJSON File Format

The GeoJSON files can be in any of these formats:
- **Feature**: Single feature with geometry
- **FeatureCollection**: Collection with at least one feature (first feature's geometry is used)
- **Geometry**: Direct geometry object (Point, Polygon, etc.)

## Response Format

### Success Response (200)

```typescript
{
  subAdministrativeZone1: {
    id: number;
    administrativeZoneId: number;
    name: string;
    areaCode: string;
    type: 'chiwog' | 'lap';
    geom: string;  // PostGIS geometry
  };
  subAdministrativeZone2: {
    id: number;
    administrativeZoneId: number;
    name: string;
    areaCode: string;
    type: 'chiwog' | 'lap';
    geom: string;  // PostGIS geometry
  };
  enumerationArea: {
    id: number;
    name: string;              // Always "EA1"
    areaCode: string;          // Always "01"
    description: string;        // "EA for [SAZ1 name] and [SAZ2 name]"
    geom: string;              // Combined geometry (ST_Union of both SAZs)
    subAdministrativeZones: [  // Linked SAZs via junction table
      {
        id: number;
        name: string;
        areaCode: string;
        type: 'chiwog' | 'lap';
        administrativeZone: {
          id: number;
          name: string;
          // ... other admin zone fields
        };
      }
    ];
  };
}
```

### Error Responses

#### 400 Bad Request
```typescript
{
  statusCode: 400,
  message: "Error message describing the issue",
  error: "Bad Request"
}
```

Common error messages:
- `"Exactly 2 GeoJSON files are required"`
- `"Both saz1Data and saz2Data are required"`
- `"Both SAZs must belong to the same Administrative Zone"`
- `"SAZ1 with areaCode 'XXX' already exists in Administrative Zone Y"`
- `"SAZ2 with areaCode 'XXX' already exists in Administrative Zone Y"`
- `"EA with areaCode '01' already exists for SAZ combination (XXX, YYY)"`

#### 404 Not Found
```typescript
{
  statusCode: 404,
  message: "Administrative Zone with ID X not found",
  error: "Not Found"
}
```

## Angular Service Implementation

### Service Setup

```typescript
// enumeration-area.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateTwoSazsWithEaRequest {
  saz1Data: {
    name: string;
    areaCode: string;
    type: 'chiwog' | 'lap';
    administrativeZoneId: number;
  };
  saz2Data: {
    name: string;
    areaCode: string;
    type: 'chiwog' | 'lap';
    administrativeZoneId: number;
  };
}

export interface CreateTwoSazsWithEaResponse {
  subAdministrativeZone1: SubAdministrativeZone;
  subAdministrativeZone2: SubAdministrativeZone;
  enumerationArea: EnumerationArea;
}

export interface SubAdministrativeZone {
  id: number;
  administrativeZoneId: number;
  name: string;
  areaCode: string;
  type: 'chiwog' | 'lap';
  geom?: string;
}

export interface EnumerationArea {
  id: number;
  name: string;
  areaCode: string;
  description: string;
  geom?: string;
  subAdministrativeZones?: SubAdministrativeZone[];
}

@Injectable({
  providedIn: 'root'
})
export class EnumerationAreaService {
  private apiUrl = `${environment.apiUrl}/enumeration-area`;

  constructor(private http: HttpClient) {}

  /**
   * Create two SAZs from GeoJSON files and a single EA that links to both
   * @param saz1File - GeoJSON file for SAZ1
   * @param saz2File - GeoJSON file for SAZ2
   * @param saz1Data - SAZ1 metadata
   * @param saz2Data - SAZ2 metadata
   * @returns Observable with created SAZs and EA
   */
  createTwoSazsWithEa(
    saz1File: File,
    saz2File: File,
    saz1Data: CreateTwoSazsWithEaRequest['saz1Data'],
    saz2Data: CreateTwoSazsWithEaRequest['saz2Data']
  ): Observable<CreateTwoSazsWithEaResponse> {
    const formData = new FormData();
    
    // Add files (order matters - first file is SAZ1, second is SAZ2)
    formData.append('files', saz1File);
    formData.append('files', saz2File);
    
    // Add JSON data as strings
    formData.append('saz1Data', JSON.stringify(saz1Data));
    formData.append('saz2Data', JSON.stringify(saz2Data));

    return this.http.post<CreateTwoSazsWithEaResponse>(
      `${this.apiUrl}/create-two-sazs-with-ea`,
      formData
    );
  }
}
```

## Angular Component Implementation

### Component Example

```typescript
// create-two-sazs-ea.component.ts
import { Component } from '@angular/core';
import { EnumerationAreaService, CreateTwoSazsWithEaRequest } from './enumeration-area.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-two-sazs-ea',
  templateUrl: './create-two-sazs-ea.component.html',
  styleUrls: ['./create-two-sazs-ea.component.css']
})
export class CreateTwoSazsEaComponent {
  form: FormGroup;
  saz1File: File | null = null;
  saz2File: File | null = null;
  loading = false;
  error: string | null = null;
  success: CreateTwoSazsWithEaResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private eaService: EnumerationAreaService
  ) {
    this.form = this.fb.group({
      // SAZ1 fields
      saz1Name: ['', Validators.required],
      saz1AreaCode: ['', Validators.required],
      saz1Type: ['chiwog', Validators.required],
      
      // SAZ2 fields
      saz2Name: ['', Validators.required],
      saz2AreaCode: ['', Validators.required],
      saz2Type: ['chiwog', Validators.required],
      
      // Common field
      administrativeZoneId: [null, [Validators.required, Validators.pattern(/^\d+$/)]]
    });
  }

  onSaz1FileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.saz1File = input.files[0];
    }
  }

  onSaz2FileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.saz2File = input.files[0];
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    if (!this.saz1File || !this.saz2File) {
      this.error = 'Please select both GeoJSON files';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    const formValue = this.form.value;

    const saz1Data = {
      name: formValue.saz1Name,
      areaCode: formValue.saz1AreaCode,
      type: formValue.saz1Type,
      administrativeZoneId: parseInt(formValue.administrativeZoneId, 10)
    };

    const saz2Data = {
      name: formValue.saz2Name,
      areaCode: formValue.saz2AreaCode,
      type: formValue.saz2Type,
      administrativeZoneId: parseInt(formValue.administrativeZoneId, 10)
    };

    this.eaService.createTwoSazsWithEa(
      this.saz1File,
      this.saz2File,
      saz1Data,
      saz2Data
    ).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = response;
        console.log('Successfully created:', response);
        // Optionally reset form
        // this.form.reset();
        // this.saz1File = null;
        // this.saz2File = null;
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Failed to create SAZs and EA';
        console.error('Error:', error);
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
```

### Template Example

```html
<!-- create-two-sazs-ea.component.html -->
<div class="container">
  <h2>Create Two SAZs with EA</h2>

  <form [formGroup]="form" (ngSubmit)="onSubmit()">
    <!-- SAZ1 Section -->
    <div class="section">
      <h3>Sub-Administrative Zone 1</h3>
      
      <div class="form-group">
        <label for="saz1Name">Name *</label>
        <input 
          id="saz1Name" 
          type="text" 
          formControlName="saz1Name"
          [class.invalid]="form.get('saz1Name')?.invalid && form.get('saz1Name')?.touched">
        <div class="error" *ngIf="form.get('saz1Name')?.invalid && form.get('saz1Name')?.touched">
          Name is required
        </div>
      </div>

      <div class="form-group">
        <label for="saz1AreaCode">Area Code *</label>
        <input 
          id="saz1AreaCode" 
          type="text" 
          formControlName="saz1AreaCode"
          [class.invalid]="form.get('saz1AreaCode')?.invalid && form.get('saz1AreaCode')?.touched">
        <div class="error" *ngIf="form.get('saz1AreaCode')?.invalid && form.get('saz1AreaCode')?.touched">
          Area code is required
        </div>
      </div>

      <div class="form-group">
        <label for="saz1Type">Type *</label>
        <select id="saz1Type" formControlName="saz1Type">
          <option value="chiwog">Chiwog</option>
          <option value="lap">Lap</option>
        </select>
      </div>

      <div class="form-group">
        <label for="saz1File">GeoJSON File *</label>
        <input 
          id="saz1File" 
          type="file" 
          accept=".geojson,.json"
          (change)="onSaz1FileSelected($event)">
        <small *ngIf="saz1File">Selected: {{ saz1File.name }}</small>
      </div>
    </div>

    <!-- SAZ2 Section -->
    <div class="section">
      <h3>Sub-Administrative Zone 2</h3>
      
      <div class="form-group">
        <label for="saz2Name">Name *</label>
        <input 
          id="saz2Name" 
          type="text" 
          formControlName="saz2Name"
          [class.invalid]="form.get('saz2Name')?.invalid && form.get('saz2Name')?.touched">
        <div class="error" *ngIf="form.get('saz2Name')?.invalid && form.get('saz2Name')?.touched">
          Name is required
        </div>
      </div>

      <div class="form-group">
        <label for="saz2AreaCode">Area Code *</label>
        <input 
          id="saz2AreaCode" 
          type="text" 
          formControlName="saz2AreaCode"
          [class.invalid]="form.get('saz2AreaCode')?.invalid && form.get('saz2AreaCode')?.touched">
        <div class="error" *ngIf="form.get('saz2AreaCode')?.invalid && form.get('saz2AreaCode')?.touched">
          Area code is required
        </div>
      </div>

      <div class="form-group">
        <label for="saz2Type">Type *</label>
        <select id="saz2Type" formControlName="saz2Type">
          <option value="chiwog">Chiwog</option>
          <option value="lap">Lap</option>
        </select>
      </div>

      <div class="form-group">
        <label for="saz2File">GeoJSON File *</label>
        <input 
          id="saz2File" 
          type="file" 
          accept=".geojson,.json"
          (change)="onSaz2FileSelected($event)">
        <small *ngIf="saz2File">Selected: {{ saz2File.name }}</small>
      </div>
    </div>

    <!-- Common Section -->
    <div class="section">
      <h3>Common Settings</h3>
      
      <div class="form-group">
        <label for="administrativeZoneId">Administrative Zone ID *</label>
        <input 
          id="administrativeZoneId" 
          type="number" 
          formControlName="administrativeZoneId"
          [class.invalid]="form.get('administrativeZoneId')?.invalid && form.get('administrativeZoneId')?.touched">
        <div class="error" *ngIf="form.get('administrativeZoneId')?.invalid && form.get('administrativeZoneId')?.touched">
          Administrative Zone ID is required and must be a number
        </div>
        <small>Both SAZs will be assigned to this Administrative Zone</small>
      </div>
    </div>

    <!-- Error Message -->
    <div class="alert alert-error" *ngIf="error">
      <strong>Error:</strong> {{ error }}
    </div>

    <!-- Success Message -->
    <div class="alert alert-success" *ngIf="success">
      <strong>Success!</strong> Created:
      <ul>
        <li>SAZ1: {{ success.subAdministrativeZone1.name }} (ID: {{ success.subAdministrativeZone1.id }})</li>
        <li>SAZ2: {{ success.subAdministrativeZone2.name }} (ID: {{ success.subAdministrativeZone2.id }})</li>
        <li>EA: {{ success.enumerationArea.name }} (ID: {{ success.enumerationArea.id }})</li>
      </ul>
    </div>

    <!-- Submit Button -->
    <button 
      type="submit" 
      [disabled]="form.invalid || !saz1File || !saz2File || loading"
      class="btn btn-primary">
      <span *ngIf="loading">Creating...</span>
      <span *ngIf="!loading">Create SAZs and EA</span>
    </button>
  </form>
</div>
```

## Complete Example: Using the Service

```typescript
// example-usage.component.ts
import { Component } from '@angular/core';
import { EnumerationAreaService } from './enumeration-area.service';

@Component({
  selector: 'app-example',
  template: `
    <button (click)="createSazsAndEa()">Create Two SAZs with EA</button>
  `
})
export class ExampleComponent {
  constructor(private eaService: EnumerationAreaService) {}

  createSazsAndEa(): void {
    // Assume you have file inputs or file objects
    const saz1File = /* your file object */;
    const saz2File = /* your file object */;

    const saz1Data = {
      name: 'Chiwog A',
      areaCode: '001',
      type: 'chiwog' as const,
      administrativeZoneId: 1
    };

    const saz2Data = {
      name: 'Chiwog B',
      areaCode: '002',
      type: 'chiwog' as const,
      administrativeZoneId: 1  // Must be same as SAZ1
    };

    this.eaService.createTwoSazsWithEa(
      saz1File,
      saz2File,
      saz1Data,
      saz2Data
    ).subscribe({
      next: (response) => {
        console.log('Created SAZ1:', response.subAdministrativeZone1);
        console.log('Created SAZ2:', response.subAdministrativeZone2);
        console.log('Created EA:', response.enumerationArea);
        console.log('EA linked to SAZs:', response.enumerationArea.subAdministrativeZones);
      },
      error: (error) => {
        console.error('Error creating SAZs and EA:', error);
        alert(error.error?.message || 'Failed to create');
      }
    });
  }
}
```

## Important Notes

### 1. **Transaction Safety**
- All operations (SAZ1 creation, SAZ2 creation, EA creation, junction table entries) are wrapped in a database transaction
- If any step fails, all changes are rolled back automatically
- No partial data will be created

### 2. **Validation Rules**
- Both SAZs must have the same `administrativeZoneId`
- SAZ `areaCode` must be unique within the same `administrativeZoneId`
- EA with `areaCode: "01"` must not already exist for the same SAZ combination
- Both files must be valid GeoJSON

### 3. **EA Auto-Generation**
- EA name is always `"EA1"`
- EA areaCode is always `"01"`
- EA description is auto-generated: `"EA for [SAZ1 name] and [SAZ2 name]"`
- EA geometry is the union (dissolved) of both SAZ geometries using PostGIS `ST_Union`

### 4. **File Handling**
- Files are sent as an array in the `files` field
- First file in the array is treated as SAZ1, second as SAZ2
- Maximum file size: 50MB per file
- Accepted formats: `.geojson`, `.json`, or `application/json` / `application/geo+json` MIME types

### 5. **Authentication**
- This endpoint requires admin role
- Include JWT token in the `Authorization` header
- Angular HTTP interceptor should handle this automatically if configured

## Testing Checklist

- [ ] Both SAZs created successfully
- [ ] EA created with correct name and areaCode
- [ ] EA geometry is union of both SAZ geometries
- [ ] EA linked to both SAZs via junction table
- [ ] Transaction rollback works on error
- [ ] Validation errors are clear and helpful
- [ ] Duplicate SAZ detection works
- [ ] Duplicate EA detection works
- [ ] File validation works (wrong format, missing files, etc.)

## Related Documentation

- [Enumeration Area API Changes](./location-api-changes-enumeration-area.md)
- [Sub-Administrative Zone API Changes](./location-api-changes-sub-administrative-zone.md)
- [Junction Table API Guide](./frontend-ea-saz-junction-table-api.md)

