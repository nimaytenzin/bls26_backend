# Frontend API Documentation: EA-SAZ Junction Table Implementation

## Overview

The Enumeration Area (EA) and Sub-Administrative Zone (SAZ) relationship now uses a **junction table** to support many-to-many relationships. This allows:
- Multiple SAZs to be combined into one EA
- One SAZ to be part of multiple EAs
- Better tracking of EA merges and splits

**Important:** The legacy `subAdministrativeZoneId` field is kept for backward compatibility but is **not used** in new operations. All new code should use the junction table approach.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Creating Enumeration Areas](#creating-enumeration-areas)
3. [Querying Enumeration Areas](#querying-enumeration-areas)
4. [Querying Sub-Administrative Zones](#querying-sub-administrative-zones)
5. [Migration Endpoint](#migration-endpoint)
6. [Angular Service Implementation](#angular-service-implementation)
7. [DTOs and Interfaces](#dtos-and-interfaces)
8. [Examples](#examples)

---

## Architecture Overview

### Relationship Model

```
EnumerationArea
├── subAdministrativeZoneId (LEGACY - kept for backward compatibility)
├── subAdministrativeZone (LEGACY - BelongsTo relationship)
└── subAdministrativeZones (PRIMARY - BelongsToMany via junction table)

SubAdministrativeZone
├── enumerationAreas (LEGACY - HasMany relationship)
└── enumerationAreasViaJunction (PRIMARY - BelongsToMany via junction table)

EnumerationAreaSubAdministrativeZones (Junction Table)
├── enumerationAreaId (FK, PK)
└── subAdministrativeZoneId (FK, PK)
```

### Key Concepts

- **Junction Table is PRIMARY**: All new operations use the junction table
- **Legacy Fields Preserved**: Old `subAdministrativeZoneId` field remains but is not used
- **Many-to-Many Support**: One EA can have multiple SAZs, one SAZ can be in multiple EAs
- **Migration Required**: Existing data needs to be migrated using the migration endpoint

---

## Creating Enumeration Areas

### Endpoint

```
POST /enumeration-area
Authorization: Bearer <token>
Role: ADMIN
Content-Type: application/json
```

### Request Body

**Note:** The DTO structure needs to be updated to accept `subAdministrativeZoneIds` array instead of single `subAdministrativeZoneId`.

```typescript
interface CreateEnumerationAreaDto {
  subAdministrativeZoneIds: number[];  // Array of SAZ IDs (REQUIRED - at least 1)
  name: string;                         // EA name (REQUIRED)
  description: string;                  // EA description (REQUIRED)
  areaCode: string;                     // EA area code (REQUIRED)
  areaSqKm?: number | null;            // Area in sq km (OPTIONAL)
  geom: string;                         // GeoJSON geometry string (REQUIRED)
}
```

### Example Request

```json
{
  "subAdministrativeZoneIds": [1, 2],
  "name": "Combined EA",
  "description": "EA combining SAZ 1 and SAZ 2",
  "areaCode": "EA001",
  "areaSqKm": 15.5,
  "geom": "MULTIPOLYGON(...)"
}
```

### Response

```json
{
  "id": 123,
  "name": "Combined EA",
  "description": "EA combining SAZ 1 and SAZ 2",
  "areaCode": "EA001",
  "areaSqKm": 15.5,
  "subAdministrativeZoneId": null,  // Legacy field (may be null)
  "subAdministrativeZones": [
    {
      "id": 1,
      "name": "SAZ 1",
      "areaCode": "SAZ001",
      "type": "chiwog",
      "administrativeZoneId": 10,
      "areaSqKm": 8.2
    },
    {
      "id": 2,
      "name": "SAZ 2",
      "areaCode": "SAZ002",
      "type": "chiwog",
      "administrativeZoneId": 10,
      "areaSqKm": 7.3
    }
  ]
}
```

---

## Querying Enumeration Areas

### Get Single EA with SAZs

```
GET /enumeration-area/:id?includeSubAdminZones=true
```

**Query Parameters:**
- `includeSubAdminZones` (boolean): Include SAZs via junction table (default: false)
- `withGeom` (boolean): Include geometry (default: false)

**Example:**
```typescript
GET /enumeration-area/123?includeSubAdminZones=true
```

**Response:**
```json
{
  "id": 123,
  "name": "Combined EA",
  "areaCode": "EA001",
  "subAdministrativeZones": [
    { "id": 1, "name": "SAZ 1", ... },
    { "id": 2, "name": "SAZ 2", ... }
  ]
}
```

### Get All EAs for a SAZ

```
GET /enumeration-area?subAdministrativeZoneId=2&includeSubAdminZones=true
```

**Note:** This query uses the junction table to find all EAs where the SAZ is linked (either as primary or additional).

**Response:**
```json
[
  {
    "id": 100,
    "name": "EA 100",
    "subAdministrativeZones": [{ "id": 2, ... }]
  },
  {
    "id": 123,
    "name": "Combined EA",
    "subAdministrativeZones": [
      { "id": 1, ... },
      { "id": 2, ... }  // SAZ 2 is part of this EA
    ]
  }
]
```

---

## Querying Sub-Administrative Zones

### Get All EAs for a SAZ (via Junction Table)

**From SAZ perspective:**
```typescript
// When querying SubAdministrativeZone with enumerationAreasViaJunction
GET /sub-administrative-zone/:id?includeEnumerationAreas=true
```

**Response:**
```json
{
  "id": 2,
  "name": "SAZ 2",
  "areaCode": "SAZ002",
  "enumerationAreasViaJunction": [
    {
      "id": 100,
      "name": "EA 100",
      "areaCode": "EA100"
    },
    {
      "id": 123,
      "name": "Combined EA",
      "areaCode": "EA001"
    }
  ]
}
```

---

## Migration Endpoint

### Migrate Existing Data to Junction Table

Before using the new junction table features, you need to migrate existing `subAdministrativeZoneId` relationships to the junction table.

```
POST /enumeration-area/migrate-to-junction-table
Authorization: Bearer <admin-token>
Role: ADMIN
```

**Response:**
```json
{
  "message": "Migration completed successfully",
  "totalEAs": 100,
  "migrated": 95,
  "skipped": 3,
  "alreadyExists": 2
}
```

**Response Fields:**
- `totalEAs`: Total EAs with non-null `subAdministrativeZoneId`
- `migrated`: Number of new records created in junction table
- `skipped`: Number of EAs skipped (null `subAdministrativeZoneId`)
- `alreadyExists`: Number of records that already existed in junction table

**Important:**
- This operation is **idempotent** - safe to run multiple times
- Duplicate records are automatically skipped
- Run this once after deployment to migrate existing data

---

## Angular Service Implementation

### Service Setup

```typescript
// enumeration-area.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateEnumerationAreaDto {
  subAdministrativeZoneIds: number[];  // Array of SAZ IDs
  name: string;
  description: string;
  areaCode: string;
  areaSqKm?: number | null;
  geom: string;
}

export interface EnumerationArea {
  id: number;
  name: string;
  description: string;
  areaCode: string;
  areaSqKm?: number | null;
  subAdministrativeZoneId?: number | null;  // Legacy field
  subAdministrativeZones?: SubAdministrativeZone[];  // Via junction table
}

export interface SubAdministrativeZone {
  id: number;
  name: string;
  areaCode: string;
  type: 'chiwog' | 'lap';
  administrativeZoneId: number;
  areaSqKm: number;
  enumerationAreasViaJunction?: EnumerationArea[];  // Via junction table
}

export interface MigrationResult {
  message: string;
  totalEAs: number;
  migrated: number;
  skipped: number;
  alreadyExists: number;
}

@Injectable({
  providedIn: 'root'
})
export class EnumerationAreaService {
  private apiUrl = `${environment.apiUrl}/enumeration-area`;

  constructor(private http: HttpClient) {}

  /**
   * Create EA with multiple SAZs (via junction table)
   */
  create(data: CreateEnumerationAreaDto): Observable<EnumerationArea> {
    return this.http.post<EnumerationArea>(this.apiUrl, data);
  }

  /**
   * Get single EA with SAZs
   */
  findOne(
    id: number,
    includeSubAdminZones: boolean = false,
    withGeom: boolean = false
  ): Observable<EnumerationArea> {
    const params = new HttpParams()
      .set('includeSubAdminZones', includeSubAdminZones.toString())
      .set('withGeom', withGeom.toString());
    
    return this.http.get<EnumerationArea>(`${this.apiUrl}/${id}`, { params });
  }

  /**
   * Get all EAs for a SAZ (via junction table)
   */
  findBySubAdministrativeZone(
    sazId: number,
    includeSubAdminZones: boolean = true
  ): Observable<EnumerationArea[]> {
    const params = new HttpParams()
      .set('subAdministrativeZoneId', sazId.toString())
      .set('includeSubAdminZones', includeSubAdminZones.toString());
    
    return this.http.get<EnumerationArea[]>(this.apiUrl, { params });
  }

  /**
   * Migrate existing data to junction table
   */
  migrateToJunctionTable(): Observable<MigrationResult> {
    return this.http.post<MigrationResult>(
      `${this.apiUrl}/migrate-to-junction-table`,
      {}
    );
  }
}
```

---

## DTOs and Interfaces

### Create Enumeration Area DTO

```typescript
export interface CreateEnumerationAreaDto {
  subAdministrativeZoneIds: number[];  // REQUIRED: At least 1 SAZ ID
  name: string;                         // REQUIRED
  description: string;                  // REQUIRED
  areaCode: string;                    // REQUIRED
  areaSqKm?: number | null;            // OPTIONAL
  geom: string;                        // REQUIRED: GeoJSON geometry
}
```

### Update Enumeration Area DTO

```typescript
export interface UpdateEnumerationAreaDto {
  subAdministrativeZoneIds?: number[];  // OPTIONAL: Update SAZ associations
  name?: string;
  description?: string;
  areaCode?: string;
  areaSqKm?: number | null;
  geom?: string;
}
```

### Enumeration Area Response

```typescript
export interface EnumerationArea {
  id: number;
  name: string;
  description: string;
  areaCode: string;
  areaSqKm?: number | null;
  subAdministrativeZoneId?: number | null;  // Legacy field (may be null)
  subAdministrativeZones?: SubAdministrativeZone[];  // PRIMARY: Via junction table
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Examples

### Example 1: Create EA with Single SAZ

```typescript
const createEA = {
  subAdministrativeZoneIds: [1],  // Single SAZ
  name: "EA Name",
  description: "EA Description",
  areaCode: "EA001",
  areaSqKm: 10.5,
  geom: geometryString
};

this.eaService.create(createEA).subscribe({
  next: (ea) => {
    console.log('EA created:', ea);
    console.log('Linked SAZs:', ea.subAdministrativeZones);
  },
  error: (err) => console.error('Error:', err)
});
```

### Example 2: Create EA with Multiple SAZs (Combined)

```typescript
const createCombinedEA = {
  subAdministrativeZoneIds: [1, 2, 3],  // Multiple SAZs
  name: "Combined EA",
  description: "EA combining SAZ 1, 2, and 3",
  areaCode: "EA002",
  areaSqKm: 25.0,
  geom: mergedGeometryString  // Combined geometry from all SAZs
};

this.eaService.create(createCombinedEA).subscribe({
  next: (ea) => {
    console.log('Combined EA created with', ea.subAdministrativeZones?.length, 'SAZs');
  }
});
```

### Example 3: Get EA with All SAZs

```typescript
this.eaService.findOne(123, true).subscribe({
  next: (ea) => {
    console.log('EA:', ea.name);
    console.log('SAZs:', ea.subAdministrativeZones);
    // Output: [{ id: 1, name: "SAZ 1" }, { id: 2, name: "SAZ 2" }]
  }
});
```

### Example 4: Get All EAs for a SAZ

```typescript
this.eaService.findBySubAdministrativeZone(2, true).subscribe({
  next: (eas) => {
    console.log('EAs containing SAZ 2:', eas.length);
    eas.forEach(ea => {
      console.log(`- ${ea.name} (${ea.areaCode})`);
    });
  }
});
```

### Example 5: Run Migration

```typescript
this.eaService.migrateToJunctionTable().subscribe({
  next: (result) => {
    console.log('Migration completed:');
    console.log(`- Total EAs: ${result.totalEAs}`);
    console.log(`- Migrated: ${result.migrated}`);
    console.log(`- Skipped: ${result.skipped}`);
    console.log(`- Already exists: ${result.alreadyExists}`);
  },
  error: (err) => {
    console.error('Migration failed:', err);
  }
});
```

### Example 6: Component Form for Creating EA

```typescript
// create-ea.component.ts
export class CreateEAComponent {
  eaForm: FormGroup;
  availableSAZs: SubAdministrativeZone[] = [];

  constructor(
    private fb: FormBuilder,
    private eaService: EnumerationAreaService,
    private sazService: SubAdministrativeZoneService
  ) {
    this.eaForm = this.fb.group({
      subAdministrativeZoneIds: [[], [Validators.required, this.atLeastOneValidator]],
      name: ['', Validators.required],
      description: ['', Validators.required],
      areaCode: ['', Validators.required],
      areaSqKm: [null],
      geom: ['', Validators.required]
    });
  }

  atLeastOneValidator(control: FormControl) {
    const value = control.value;
    if (!value || !Array.isArray(value) || value.length === 0) {
      return { atLeastOne: true };
    }
    return null;
  }

  onSubmit() {
    if (this.eaForm.valid) {
      this.eaService.create(this.eaForm.value).subscribe({
        next: (ea) => {
          console.log('EA created successfully:', ea);
          this.eaForm.reset();
        },
        error: (err) => {
          console.error('Error creating EA:', err);
        }
      });
    }
  }
}
```

```html
<!-- create-ea.component.html -->
<form [formGroup]="eaForm" (ngSubmit)="onSubmit()">
  <!-- Multi-select for SAZs -->
  <div class="form-group">
    <label>Sub-Administrative Zones *</label>
    <select 
      formControlName="subAdministrativeZoneIds" 
      multiple
      class="form-control"
      size="5"
    >
      <option *ngFor="let saz of availableSAZs" [value]="saz.id">
        {{ saz.name }} ({{ saz.areaCode }})
      </option>
    </select>
    <small class="form-text text-muted">
      Hold Ctrl/Cmd to select multiple SAZs. At least one SAZ is required.
    </small>
    <div *ngIf="eaForm.get('subAdministrativeZoneIds')?.hasError('atLeastOne')" 
         class="error">
      At least one Sub-Administrative Zone is required
    </div>
  </div>

  <!-- Other fields -->
  <div class="form-group">
    <label>EA Name *</label>
    <input type="text" formControlName="name" class="form-control" />
  </div>

  <div class="form-group">
    <label>Description *</label>
    <textarea formControlName="description" class="form-control"></textarea>
  </div>

  <div class="form-group">
    <label>Area Code *</label>
    <input type="text" formControlName="areaCode" class="form-control" />
  </div>

  <div class="form-group">
    <label>Area (sq km)</label>
    <input type="number" formControlName="areaSqKm" step="0.01" class="form-control" />
  </div>

  <div class="form-group">
    <label>Geometry (GeoJSON) *</label>
    <textarea formControlName="geom" rows="5" class="form-control"></textarea>
  </div>

  <button type="submit" [disabled]="eaForm.invalid" class="btn btn-primary">
    Create Enumeration Area
  </button>
</form>
```

---

## Migration Checklist

1. **Run Migration Endpoint**
   ```typescript
   // One-time migration after deployment
   this.eaService.migrateToJunctionTable().subscribe(...);
   ```

2. **Update DTOs**
   - Change `subAdministrativeZoneId: number` to `subAdministrativeZoneIds: number[]`
   - Update form validators to require at least one SAZ

3. **Update Components**
   - Change single select to multi-select for SAZ selection
   - Update display logic to show multiple SAZs

4. **Update Queries**
   - Use `includeSubAdminZones=true` to get SAZs via junction table
   - Update any code that relies on `subAdministrativeZoneId` field

---

## Important Notes

1. **Legacy Field**: `subAdministrativeZoneId` may be `null` for new EAs created via junction table
2. **Always Use Junction Table**: For all new operations, use `subAdministrativeZones` array
3. **Migration is Idempotent**: Safe to run migration endpoint multiple times
4. **Backward Compatibility**: Old code using `subAdministrativeZoneId` will still work, but new code should use junction table
5. **Query Performance**: Junction table queries are optimized with indexes

---

## Error Handling

### Common Errors

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": ["subAdministrativeZoneIds must be an array", "At least one Sub-Administrative Zone is required"],
  "error": "Bad Request"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Enumeration Area with ID 123 not found",
  "error": "Not Found"
}
```

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Summary

- **Use `subAdministrativeZoneIds` array** for creating EAs
- **Use `subAdministrativeZones` array** for reading SAZ relationships
- **Run migration endpoint** once after deployment
- **Legacy fields preserved** for backward compatibility
- **Junction table is PRIMARY** method for all new operations

