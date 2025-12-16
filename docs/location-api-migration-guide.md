# Location API Migration Guide

## Overview

This guide helps you migrate from the old location API structure (using `subAdministrativeZoneId` as a direct foreign key) to the new structure (using `subAdministrativeZoneIds` array via junction table).

## Summary of Changes

| Component | Old Format | New Format |
|-----------|-----------|------------|
| **EnumerationArea DTO** | `subAdministrativeZoneId: number` | `subAdministrativeZoneIds: number[]` |
| **Relationship** | One-to-Many (EA → SAZ) | Many-to-Many (EA ↔ SAZ) |
| **Database** | Direct FK column | Junction table |
| **Response** | `subAdministrativeZone: SAZ` | `subAdministrativeZones: SAZ[]` |

## Step-by-Step Migration

### Step 1: Update DTOs

#### EnumerationArea DTOs

**Before:**
```typescript
interface CreateEnumerationAreaDto {
  name: string;
  description: string;
  areaCode: string;
  subAdministrativeZoneId: number;  // ❌ Singular
  areaSqKm?: number;
  geom: string;
}
```

**After:**
```typescript
interface CreateEnumerationAreaDto {
  name: string;
  description: string;
  areaCode: string;
  subAdministrativeZoneIds: number[];  // ✅ Array (min 1)
  areaSqKm?: number | null;
  geom: string;
}
```

### Step 2: Update Service Calls

#### Creating Enumeration Areas

**Before:**
```typescript
// Angular Service
createEA(data: {
  name: string;
  subAdministrativeZoneId: number;
}) {
  return this.http.post('/enumeration-area', {
    ...data,
    subAdministrativeZoneId: data.subAdministrativeZoneId
  });
}

// Usage
this.eaService.createEA({
  name: 'EA-1',
  subAdministrativeZoneId: 5
});
```

**After:**
```typescript
// Angular Service
createEA(data: {
  name: string;
  subAdministrativeZoneIds: number[];  // Array
}) {
  return this.http.post('/enumeration-area', {
    ...data,
    subAdministrativeZoneIds: data.subAdministrativeZoneIds
  });
}

// Usage - Single SAZ
this.eaService.createEA({
  name: 'EA-1',
  subAdministrativeZoneIds: [5]  // Array, even for single SAZ
});

// Usage - Multiple SAZs
this.eaService.createEA({
  name: 'EA-Combined',
  subAdministrativeZoneIds: [1, 2, 3]  // Multiple SAZs
});
```

#### Updating Enumeration Areas

**Before:**
```typescript
updateEA(id: number, subAdministrativeZoneId: number) {
  return this.http.patch(`/enumeration-area/${id}`, {
    subAdministrativeZoneId
  });
}
```

**After:**
```typescript
updateEA(id: number, subAdministrativeZoneIds: number[]) {
  return this.http.patch(`/enumeration-area/${id}`, {
    subAdministrativeZoneIds  // Array replaces all associations
  });
}
```

### Step 3: Update Response Handling

#### Reading Enumeration Area Data

**Before:**
```typescript
// Single SAZ relationship
const ea = response;
const sazId = ea.subAdministrativeZoneId;
const saz = ea.subAdministrativeZone;

// Usage
if (ea.subAdministrativeZone) {
  console.log(ea.subAdministrativeZone.name);
}
```

**After:**
```typescript
// Multiple SAZ relationship
const ea = response;
const sazIds = ea.subAdministrativeZoneIds;  // Array
const sazs = ea.subAdministrativeZones;  // Array

// Usage - Multiple SAZs
ea.subAdministrativeZones?.forEach(saz => {
  console.log(saz.name);
});

// Usage - Single SAZ (if you only need one)
const firstSaz = ea.subAdministrativeZones?.[0];
if (firstSaz) {
  console.log(firstSaz.name);
}
```

#### Reading from Hierarchy (Dzongkhag → AZ → SAZ → EA)

**Before:**
```typescript
dzongkhag.administrativeZones.forEach(az => {
  az.subAdministrativeZones.forEach(saz => {
    // EAs were not included in hierarchy
    // Had to query separately
  });
});
```

**After:**
```typescript
dzongkhag.administrativeZones.forEach(az => {
  az.subAdministrativeZones.forEach(saz => {
    // EAs are now included via junction table
    const eas = saz.enumerationAreas;  // Array, always present
    eas.forEach(ea => {
      console.log(ea.name);
    });
    
    // Check if SAZ has EAs
    if (saz.enumerationAreas?.length > 0) {
      // Has EAs
    }
  });
});
```

### Step 4: Update GeoJSON Handling

#### Creating from GeoJSON

**Before:**
```json
{
  "type": "Feature",
  "properties": {
    "name": "EA-1",
    "subAdministrativeZoneId": 5
  },
  "geometry": {...}
}
```

**After:**
```json
{
  "type": "Feature",
  "properties": {
    "name": "EA-1",
    "subAdministrativeZoneIds": [5]  // Array
  },
  "geometry": {...}
}
```

#### Bulk Upload GeoJSON

**Before:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "properties": {
        "subAdministrativeZoneId": 5
      }
    }
  ]
}
```

**After:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "properties": {
        "subAdministrativeZoneIds": [5]  // Array
      }
    }
  ]
}
```

### Step 5: Update Forms and UI Components

#### Form Input

**Before:**
```html
<!-- Single select -->
<select [(ngModel)]="formData.subAdministrativeZoneId">
  <option *ngFor="let saz of sazs" [value]="saz.id">
    {{ saz.name }}
  </option>
</select>
```

**After:**
```html
<!-- Multi-select -->
<select multiple [(ngModel)]="formData.subAdministrativeZoneIds">
  <option *ngFor="let saz of sazs" [value]="saz.id">
    {{ saz.name }}
  </option>
</select>

<!-- Or use checkbox group -->
<div *ngFor="let saz of sazs">
  <input 
    type="checkbox" 
    [value]="saz.id"
    (change)="toggleSAZ(saz.id)"
    [checked]="isSelected(saz.id)">
  <label>{{ saz.name }}</label>
</div>
```

#### Display Enumeration Areas

**Before:**
```html
<div *ngIf="ea.subAdministrativeZone">
  <p>SAZ: {{ ea.subAdministrativeZone.name }}</p>
</div>
```

**After:**
```html
<div *ngIf="ea.subAdministrativeZones?.length > 0">
  <p>Linked SAZs:</p>
  <ul>
    <li *ngFor="let saz of ea.subAdministrativeZones">
      {{ saz.name }}
    </li>
  </ul>
</div>
```

## Complete Example: Angular Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnumerationAreaService {
  private apiUrl = 'http://localhost:3000/enumeration-area';

  constructor(private http: HttpClient) {}

  /**
   * Create enumeration area
   * @param data - EA data with subAdministrativeZoneIds array
   */
  create(data: {
    name: string;
    description: string;
    areaCode: string;
    subAdministrativeZoneIds: number[];  // Array
    areaSqKm?: number | null;
    geom: string;
  }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  /**
   * Get enumeration area by ID
   * @param id - EA ID
   * @param includeSubAdminZone - Include linked SAZs
   */
  findOne(id: number, includeSubAdminZone = false): Observable<any> {
    const params = new HttpParams()
      .set('includeSubAdminZone', includeSubAdminZone.toString());
    return this.http.get(`${this.apiUrl}/${id}`, { params });
  }

  /**
   * Update enumeration area
   * @param id - EA ID
   * @param data - Update data (all fields optional)
   */
  update(id: number, data: {
    name?: string;
    subAdministrativeZoneIds?: number[];  // Array
    areaSqKm?: number | null;
  }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Create from GeoJSON
   * @param geoJson - GeoJSON Feature with subAdministrativeZoneIds in properties
   */
  createFromGeoJson(geoJson: {
    type: string;
    properties: {
      name: string;
      description: string;
      areaCode: string;
      subAdministrativeZoneIds: number[];  // Array
      areaSqKm?: number;
    };
    geometry: any;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/geojson`, geoJson);
  }
}
```

## Complete Example: Angular Component

```typescript
import { Component } from '@angular/core';
import { EnumerationAreaService } from './enumeration-area.service';

@Component({
  selector: 'app-ea-form',
  template: `
    <form (ngSubmit)="onSubmit()">
      <input [(ngModel)]="formData.name" placeholder="Name" required>
      <input [(ngModel)]="formData.description" placeholder="Description" required>
      <input [(ngModel)]="formData.areaCode" placeholder="Area Code" required>
      
      <!-- Multi-select for SAZs -->
      <select multiple [(ngModel)]="formData.subAdministrativeZoneIds" required>
        <option *ngFor="let saz of availableSAZs" [value]="saz.id">
          {{ saz.name }}
        </option>
      </select>
      
      <input type="number" [(ngModel)]="formData.areaSqKm" placeholder="Area (sq km)">
      
      <button type="submit">Create EA</button>
    </form>
  `
})
export class EAFormComponent {
  formData = {
    name: '',
    description: '',
    areaCode: '',
    subAdministrativeZoneIds: [] as number[],  // Array
    areaSqKm: null as number | null,
    geom: ''
  };
  
  availableSAZs: any[] = [];

  constructor(private eaService: EnumerationAreaService) {}

  onSubmit() {
    // Validate at least one SAZ selected
    if (this.formData.subAdministrativeZoneIds.length === 0) {
      alert('Please select at least one Sub-Administrative Zone');
      return;
    }

    this.eaService.create(this.formData).subscribe({
      next: (response) => {
        console.log('EA created:', response);
        // Response includes subAdministrativeZones array
        console.log('Linked SAZs:', response.subAdministrativeZones);
      },
      error: (error) => {
        console.error('Error creating EA:', error);
      }
    });
  }
}
```

## Database Migration

⚠️ **Important:** Before using the new API, ensure the database has been migrated:

```sql
-- Option 1: Make column nullable (if keeping for reference)
ALTER TABLE "EnumerationAreas" 
ALTER COLUMN "subAdministrativeZoneId" DROP NOT NULL;

-- Option 2: Drop column entirely (recommended)
ALTER TABLE "EnumerationAreas" 
DROP COLUMN "subAdministrativeZoneId";
```

## Testing Checklist

- [ ] Update all DTOs to use `subAdministrativeZoneIds` array
- [ ] Update all service calls to send arrays
- [ ] Update all response handling to work with arrays
- [ ] Update forms to support multi-select
- [ ] Update UI components to display multiple SAZs
- [ ] Test creating EA with single SAZ
- [ ] Test creating EA with multiple SAZs
- [ ] Test updating EA SAZ associations
- [ ] Test hierarchy queries (Dzongkhag → EA)
- [ ] Test GeoJSON uploads
- [ ] Verify database migration completed

## Common Pitfalls

1. **Forgetting to convert single ID to array:**
   ```typescript
   // ❌ Wrong
   subAdministrativeZoneIds: 5
   
   // ✅ Correct
   subAdministrativeZoneIds: [5]
   ```

2. **Not handling empty arrays:**
   ```typescript
   // ❌ Wrong
   if (saz.enumerationAreas) { ... }
   
   // ✅ Correct
   if (saz.enumerationAreas?.length > 0) { ... }
   ```

3. **Assuming single SAZ relationship:**
   ```typescript
   // ❌ Wrong
   const saz = ea.subAdministrativeZone;
   
   // ✅ Correct
   const sazs = ea.subAdministrativeZones;
   const firstSaz = ea.subAdministrativeZones?.[0];
   ```

## Support

For questions or issues during migration, refer to:
- [Enumeration Area API Changes](./location-api-changes-enumeration-area.md)
- [Sub-Administrative Zone API Changes](./location-api-changes-sub-administrative-zone.md)
- [Dzongkhag API Changes](./location-api-changes-dzongkhag.md)

