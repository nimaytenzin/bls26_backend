# Frontend API Guide: Create Multiple SAZs with EA

## Overview

This guide explains how to use the endpoint that creates multiple Sub-Administrative Zones (SAZs) from GeoJSON files and automatically creates a single Enumeration Area (EA) that links to all SAZs via the junction table. This endpoint supports 2-20 SAZs (N SAZs) merged into a single EA.

## Endpoint Details

**URL:** `POST /enumeration-area/create-multiple-sazs-with-ea`  
**Access:** Admin only (requires JWT authentication)  
**Content-Type:** `multipart/form-data`

## Request Format

### Form Data Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File[] | Yes | Array of 2-20 GeoJSON files (one per SAZ) |
| `sazDataArray` | string (JSON) | Yes | JSON string with array of SAZ metadata objects |
| `eaData` | string (JSON) | Yes | JSON string with EA metadata (name, areaCode, description?) |

### SAZ Data Array Structure

The `sazDataArray` should be a JSON string containing an array of SAZ data objects:

```typescript
[
  {
    name: string;                    // SAZ name
    areaCode: string;                // Unique area code within administrative zone
    type: 'chiwog' | 'lap';          // SAZ type
    administrativeZoneId: number;     // Administrative Zone ID (must be same for all SAZs)
  },
  // ... more SAZ objects (2-20 total)
]
```

### EA Data Structure

The `eaData` should be a JSON string containing:

```typescript
{
  name: string;                      // EA name (required)
  areaCode: string;                  // EA area code (required, must be unique within each SAZ)
  description?: string;               // EA description (optional)
}
```

### GeoJSON File Format

The GeoJSON files can be in any of these formats:
- **Feature**: Single feature with geometry
- **FeatureCollection**: Collection with at least one feature (first feature's geometry is used)
- **Geometry**: Direct geometry object (Point, Polygon, etc.)

**Important:** The number of files must match the number of SAZ objects in `sazDataArray`, and files should be in the same order as the SAZ data array.

## Response Format

### Success Response (200)

```typescript
{
  subAdministrativeZones: [
    {
      id: number;
      administrativeZoneId: number;
      name: string;
      areaCode: string;
      type: 'chiwog' | 'lap';
      geom: string;  // PostGIS geometry
    },
    // ... more SAZ objects
  ];
  enumerationArea: {
    id: number;
    name: string;              // Provided in request
    areaCode: string;          // Provided in request
    description: string;        // Provided in request or auto-generated
    geom: string;              // Combined geometry (ST_Union of all SAZs)
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
- `"At least 2 GeoJSON files are required"`
- `"Maximum 20 GeoJSON files are allowed"`
- `"Both sazDataArray and eaData are required"`
- `"sazDataArray must be an array"`
- `"Number of files (X) must match number of SAZs (Y)"`
- `"At least 2 SAZs are required"`
- `"EA data missing required fields: name, areaCode"`
- `"SAZ X data missing required fields: name, areaCode, type, administrativeZoneId"`
- `"All SAZs must belong to the same Administrative Zone"`
- `"SAZ X with areaCode 'XXX' already exists in Administrative Zone Y"`
- `"EA with areaCode 'XXX' already exists in one or more of the specified SAZs. EA areaCodes must be unique within each SAZ."`
- `"File X GeoJSON: Invalid format. Must be a Feature, FeatureCollection, or Geometry object."`

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

export interface SazData {
  name: string;
  areaCode: string;
  type: 'chiwog' | 'lap';
  administrativeZoneId: number;
}

export interface EaData {
  name: string;
  areaCode: string;
  description?: string;
}

export interface CreateMultipleSazsWithEaRequest {
  sazDataArray: SazData[];
  eaData: EaData;
}

export interface CreateMultipleSazsWithEaResponse {
  subAdministrativeZones: SubAdministrativeZone[];
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
   * Create multiple SAZs from GeoJSON files and a single EA that links to all of them
   * @param files - Array of GeoJSON files (one per SAZ, 2-20 files)
   * @param sazDataArray - Array of SAZ metadata objects
   * @param eaData - EA metadata object
   * @returns Observable with created SAZs and EA
   */
  createMultipleSazsWithEa(
    files: File[],
    sazDataArray: SazData[],
    eaData: EaData
  ): Observable<CreateMultipleSazsWithEaResponse> {
    const formData = new FormData();
    
    // Add files (order must match sazDataArray order)
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add JSON data as strings
    formData.append('sazDataArray', JSON.stringify(sazDataArray));
    formData.append('eaData', JSON.stringify(eaData));

    return this.http.post<CreateMultipleSazsWithEaResponse>(
      `${this.apiUrl}/create-multiple-sazs-with-ea`,
      formData
    );
  }
}
```

## Angular Component Implementation

### Component Example

```typescript
// create-multiple-sazs-ea.component.ts
import { Component } from '@angular/core';
import { EnumerationAreaService, SazData, EaData } from './enumeration-area.service';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-multiple-sazs-ea',
  templateUrl: './create-multiple-sazs-ea.component.html',
  styleUrls: ['./create-multiple-sazs-ea.component.css']
})
export class CreateMultipleSazsEaComponent {
  form: FormGroup;
  sazFiles: File[] = [];
  loading = false;
  error: string | null = null;
  success: CreateMultipleSazsWithEaResponse | null = null;
  minSazs = 2;
  maxSazs = 20;

  constructor(
    private fb: FormBuilder,
    private eaService: EnumerationAreaService
  ) {
    this.form = this.fb.group({
      sazArray: this.fb.array([]),
      eaName: ['', Validators.required],
      eaAreaCode: ['', Validators.required],
      eaDescription: ['']
    });
    
    // Initialize with 2 SAZs (minimum)
    this.addSaz();
    this.addSaz();
  }

  get sazArray(): FormArray {
    return this.form.get('sazArray') as FormArray;
  }

  addSaz(): void {
    if (this.sazArray.length >= this.maxSazs) {
      this.error = `Maximum ${this.maxSazs} SAZs allowed`;
      return;
    }

    const sazGroup = this.fb.group({
      name: ['', Validators.required],
      areaCode: ['', Validators.required],
      type: ['chiwog', Validators.required],
      file: [null, Validators.required]
    });

    this.sazArray.push(sazGroup);
  }

  removeSaz(index: number): void {
    if (this.sazArray.length > this.minSazs) {
      this.sazArray.removeAt(index);
      this.sazFiles.splice(index, 1);
    }
  }

  onFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.sazFiles[index] = input.files[0];
      this.sazArray.at(index).patchValue({ file: input.files[0] });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    if (this.sazFiles.length !== this.sazArray.length) {
      this.error = 'Please select a GeoJSON file for each SAZ';
      return;
    }

    // Validate all SAZs have same administrativeZoneId
    const adminZoneIds = this.sazArray.controls.map(
      control => control.get('administrativeZoneId')?.value
    );
    const firstAdminZoneId = adminZoneIds[0];
    if (!adminZoneIds.every(id => id === firstAdminZoneId)) {
      this.error = 'All SAZs must belong to the same Administrative Zone';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    // Prepare SAZ data array
    const sazDataArray: SazData[] = this.sazArray.controls.map((control, index) => ({
      name: control.get('name')?.value,
      areaCode: control.get('areaCode')?.value,
      type: control.get('type')?.value,
      administrativeZoneId: parseInt(control.get('administrativeZoneId')?.value, 10)
    }));

    // Prepare EA data
    const eaData: EaData = {
      name: this.form.get('eaName')?.value,
      areaCode: this.form.get('eaAreaCode')?.value,
      description: this.form.get('eaDescription')?.value || undefined
    };

    this.eaService.createMultipleSazsWithEa(
      this.sazFiles,
      sazDataArray,
      eaData
    ).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = response;
        console.log('Successfully created:', response);
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
      } else if (control instanceof FormArray) {
        control.controls.forEach(c => {
          if (c instanceof FormGroup) {
            this.markFormGroupTouched(c);
          }
        });
      }
    });
  }
}
```

### Template Example

```html
<!-- create-multiple-sazs-ea.component.html -->
<div class="container">
  <h2>Create Multiple SAZs with EA</h2>

  <form [formGroup]="form" (ngSubmit)="onSubmit()">
    <!-- SAZ Array Section -->
    <div class="section">
      <h3>Sub-Administrative Zones</h3>
      
      <div formArrayName="sazArray">
        <div 
          *ngFor="let saz of sazArray.controls; let i = index" 
          [formGroupName]="i"
          class="saz-item">
          
          <h4>SAZ {{ i + 1 }}</h4>
          
          <div class="form-group">
            <label [for]="'sazName' + i">Name *</label>
            <input 
              [id]="'sazName' + i" 
              type="text" 
              formControlName="name"
              [class.invalid]="saz.get('name')?.invalid && saz.get('name')?.touched">
            <div class="error" *ngIf="saz.get('name')?.invalid && saz.get('name')?.touched">
              Name is required
            </div>
          </div>

          <div class="form-group">
            <label [for]="'sazAreaCode' + i">Area Code *</label>
            <input 
              [id]="'sazAreaCode' + i" 
              type="text" 
              formControlName="areaCode"
              [class.invalid]="saz.get('areaCode')?.invalid && saz.get('areaCode')?.touched">
            <div class="error" *ngIf="saz.get('areaCode')?.invalid && saz.get('areaCode')?.touched">
              Area code is required
            </div>
          </div>

          <div class="form-group">
            <label [for]="'sazType' + i">Type *</label>
            <select [id]="'sazType' + i" formControlName="type">
              <option value="chiwog">Chiwog</option>
              <option value="lap">Lap</option>
            </select>
          </div>

          <div class="form-group">
            <label [for]="'sazFile' + i">GeoJSON File *</label>
            <input 
              [id]="'sazFile' + i" 
              type="file" 
              accept=".geojson,.json"
              (change)="onFileSelected($event, i)">
            <small *ngIf="sazFiles[i]">Selected: {{ sazFiles[i].name }}</small>
          </div>

          <button 
            type="button" 
            (click)="removeSaz(i)"
            [disabled]="sazArray.length <= minSazs"
            class="btn btn-danger btn-sm">
            Remove SAZ
          </button>
        </div>
      </div>

      <button 
        type="button" 
        (click)="addSaz()"
        [disabled]="sazArray.length >= maxSazs"
        class="btn btn-secondary">
        Add Another SAZ
      </button>
    </div>

    <!-- EA Section -->
    <div class="section">
      <h3>Enumeration Area</h3>
      
      <div class="form-group">
        <label for="eaName">EA Name *</label>
        <input 
          id="eaName" 
          type="text" 
          formControlName="eaName"
          [class.invalid]="form.get('eaName')?.invalid && form.get('eaName')?.touched">
        <div class="error" *ngIf="form.get('eaName')?.invalid && form.get('eaName')?.touched">
          EA name is required
        </div>
      </div>

      <div class="form-group">
        <label for="eaAreaCode">EA Area Code *</label>
        <input 
          id="eaAreaCode" 
          type="text" 
          formControlName="eaAreaCode"
          [class.invalid]="form.get('eaAreaCode')?.invalid && form.get('eaAreaCode')?.touched">
        <div class="error" *ngIf="form.get('eaAreaCode')?.invalid && form.get('eaAreaCode')?.touched">
          EA area code is required
        </div>
      </div>

      <div class="form-group">
        <label for="eaDescription">EA Description</label>
        <textarea 
          id="eaDescription" 
          formControlName="eaDescription"
          rows="3"></textarea>
        <small>Optional. If not provided, will be auto-generated.</small>
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
          [formControl]="getAdministrativeZoneControl()"
          [class.invalid]="getAdministrativeZoneControl()?.invalid && getAdministrativeZoneControl()?.touched">
        <div class="error" *ngIf="getAdministrativeZoneControl()?.invalid && getAdministrativeZoneControl()?.touched">
          Administrative Zone ID is required and must be a number
        </div>
        <small>All SAZs will be assigned to this Administrative Zone</small>
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
        <li *ngFor="let saz of success.subAdministrativeZones">
          SAZ: {{ saz.name }} (ID: {{ saz.id }}, Code: {{ saz.areaCode }})
        </li>
        <li>EA: {{ success.enumerationArea.name }} (ID: {{ success.enumerationArea.id }}, Code: {{ success.enumerationArea.areaCode }})</li>
      </ul>
    </div>

    <!-- Submit Button -->
    <button 
      type="submit" 
      [disabled]="form.invalid || sazFiles.length !== sazArray.length || loading"
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
import { EnumerationAreaService, SazData, EaData } from './enumeration-area.service';

@Component({
  selector: 'app-example',
  template: `
    <button (click)="createSazsAndEa()">Create Multiple SAZs with EA</button>
  `
})
export class ExampleComponent {
  constructor(private eaService: EnumerationAreaService) {}

  createSazsAndEa(): void {
    // Assume you have file inputs or file objects
    const files = [
      /* saz1.geojson file */,
      /* saz2.geojson file */,
      /* saz3.geojson file */
    ];

    const sazDataArray: SazData[] = [
      {
        name: 'Chiwog A',
        areaCode: '001',
        type: 'chiwog',
        administrativeZoneId: 1
      },
      {
        name: 'Chiwog B',
        areaCode: '002',
        type: 'chiwog',
        administrativeZoneId: 1  // Must be same for all
      },
      {
        name: 'Chiwog C',
        areaCode: '003',
        type: 'chiwog',
        administrativeZoneId: 1  // Must be same for all
      }
    ];

    const eaData: EaData = {
      name: 'EA 01',
      areaCode: '01',
      description: 'Merged EA for Chiwogs A, B, and C'
    };

    this.eaService.createMultipleSazsWithEa(
      files,
      sazDataArray,
      eaData
    ).subscribe({
      next: (response) => {
        console.log('Created SAZs:', response.subAdministrativeZones);
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
- All operations (SAZ creation, EA creation, junction table entries) are wrapped in a database transaction
- If any step fails, all changes are rolled back automatically
- No partial data will be created

### 2. **Validation Rules**
- All SAZs must have the same `administrativeZoneId`
- SAZ `areaCode` must be unique within the same `administrativeZoneId`
- EA `areaCode` must be unique within each SAZ (different SAZs can have EAs with the same areaCode)
- Minimum 2 SAZs required, maximum 20 SAZs allowed
- Number of files must exactly match number of SAZs in array
- Files must be in the same order as SAZ data array
- All files must be valid GeoJSON

### 3. **EA Creation**
- EA name and areaCode are provided in the request (not auto-generated)
- EA description is optional; if not provided, it will be auto-generated as: `"EA for [SAZ1 name], [SAZ2 name], ..."`
- EA geometry is the union (dissolved) of all SAZ geometries using PostGIS `ST_Union`
- EA is automatically linked to all created SAZs via the junction table

### 4. **File Handling**
- Files are sent as an array in the `files` field
- Files must be in the same order as the SAZ data array
- Maximum file size: 50MB per file
- Maximum 20 files allowed
- Accepted formats: `.geojson`, `.json`, or `application/json` / `application/geo+json` MIME types

### 5. **Authentication**
- This endpoint requires admin role
- Include JWT token in the `Authorization` header
- Angular HTTP interceptor should handle this automatically if configured

## Migration from Old Endpoint

If you were using the old `create-two-sazs-with-ea` endpoint, here's how to migrate:

### Old Endpoint (Deprecated)
```typescript
// OLD - Only supports 2 SAZs
POST /enumeration-area/create-two-sazs-with-ea
- files: [saz1File, saz2File]
- saz1Data: JSON string
- saz2Data: JSON string
// EA name and areaCode were hardcoded as "EA1" and "01"
```

### New Endpoint
```typescript
// NEW - Supports 2-20 SAZs
POST /enumeration-area/create-multiple-sazs-with-ea
- files: [saz1File, saz2File, ...] (2-20 files)
- sazDataArray: JSON string with array of SAZ data
- eaData: JSON string with { name, areaCode, description? }
```

### Migration Steps

1. **Update Service Method**
   - Change endpoint URL from `create-two-sazs-with-ea` to `create-multiple-sazs-with-ea`
   - Change method signature to accept array of files and SAZ data
   - Add `eaData` parameter

2. **Update Request Format**
   - Convert `saz1Data` and `saz2Data` to `sazDataArray` array
   - Add `eaData` with EA name and areaCode
   - Ensure files array matches SAZ data array order

3. **Update Response Handling**
   - Change from `subAdministrativeZone1` and `subAdministrativeZone2` to `subAdministrativeZones` array
   - EA name and areaCode are now from request, not hardcoded

## Testing Checklist

- [ ] Multiple SAZs (3-4) created successfully
- [ ] EA created with provided name and areaCode
- [ ] EA geometry is union of all SAZ geometries
- [ ] EA linked to all SAZs via junction table
- [ ] Transaction rollback works on error
- [ ] Validation errors are clear and helpful
- [ ] Duplicate SAZ detection works
- [ ] Duplicate EA detection works
- [ ] File validation works (wrong format, missing files, count mismatch)
- [ ] Minimum 2 SAZs validation works
- [ ] Maximum 20 SAZs validation works
- [ ] All SAZs must have same administrativeZoneId validation works

## Related Documentation

- [Enumeration Area API Changes](./location-api-changes-enumeration-area.md)
- [Sub-Administrative Zone API Changes](./location-api-changes-sub-administrative-zone.md)
- [Junction Table API Guide](./frontend-ea-saz-junction-table-api.md)
- [Old Two SAZs Endpoint (Deprecated)](./frontend-create-two-sazs-with-ea-api.md)

