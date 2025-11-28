# Sampling Frontend Implementation Guide

This guide provides complete details for implementing the sampling feature in the Angular frontend using PrimeNG and Tailwind CSS.

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Frontend Workflow](#frontend-workflow)
4. [DTOs and Data Models](#dtos-and-data-models)
5. [Implementation Steps](#implementation-steps)
6. [Error Handling](#error-handling)
7. [UI/UX Recommendations](#uiux-recommendations)

---

## Overview

The sampling feature allows users to:
- Configure default sampling parameters at the survey level
- Run sampling for individual enumeration areas (one by one)
- View sampling results (selected households) for each enumeration area
- Overwrite existing sampling if needed

**Key Points:**
- Sampling is processed **one enumeration area at a time** (no bulk processing)
- Each EA requires a separate API call
- Frontend handles the sequential processing and user feedback
- Users can view detailed results after sampling is complete

---

## API Endpoints

### Base URL
All endpoints are prefixed with `/sampling`

### Authentication
All endpoints require JWT authentication and appropriate role permissions.

---

### 1. Get Survey Sampling Configuration

**Endpoint:** `GET /sampling/surveys/:surveyId/config`

**Purpose:** Retrieve default sampling configuration for a survey

**Roles:** ADMIN, SUPERVISOR

**Response:**
```typescript
{
  id: number;
  surveyId: number;
  defaultMethod: 'CSS' | 'SRS';
  urbanSampleSize: number | null;
  ruralSampleSize: number | null;
  defaultSampleSize: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
} | null
```

**Usage:**
- Load when entering the sampling page for a survey
- Use to populate default values in the sampling form
- If `null`, no configuration exists (user must set sample size manually)

---

### 2. Create/Update Survey Sampling Configuration

**Endpoint:** `POST /sampling/surveys/:surveyId/config`

**Purpose:** Set or update default sampling parameters for a survey

**Roles:** ADMIN only

**Request Body:**
```typescript
{
  defaultMethod?: 'CSS' | 'SRS';
  urbanSampleSize?: number;
  ruralSampleSize?: number;
  defaultSampleSize?: number;
}
```

**Response:**
```typescript
{
  id: number;
  surveyId: number;
  defaultMethod: 'CSS' | 'SRS';
  urbanSampleSize: number | null;
  ruralSampleSize: number | null;
  defaultSampleSize: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Usage:**
- Admin sets default sampling parameters before running sampling
- These defaults are used when running sampling for EAs (can be overridden)

---

### 3. Check if Sampling Exists

**Endpoint:** `GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/check`

**Purpose:** Check if sampling already exists for an enumeration area (before running)

**Roles:** ADMIN, SUPERVISOR

**Response:**
```typescript
// If sampling exists:
{
  exists: true;
  message: "Sampling already exists for this enumeration area";
  data: {
    samplingId: number;
    surveyEnumerationAreaId: number;
    method: 'CSS' | 'SRS';
    sampleSize: number;
    populationSize: number;
    isFullSelection: boolean;
    executedAt: Date;
    executedBy: number | null;
  };
}

// If sampling doesn't exist:
{
  exists: false;
  message: "No sampling found for this enumeration area";
  data: null;
}
```

**Usage:**
- Call before running sampling for each EA
- If `exists: true`, show confirmation dialog to user
- If user confirms, proceed with `overwriteExisting: true`

---

### 4. Run Sampling for Enumeration Area

**Endpoint:** `POST /sampling/surveys/:surveyId/enumeration-areas/:seaId/run`

**Purpose:** Execute sampling for a single enumeration area

**Roles:** ADMIN, SUPERVISOR

**Request Body:**
```typescript
{
  method?: 'CSS' | 'SRS';           // Optional: defaults to survey config or CSS
  sampleSize?: number;              // Optional: uses survey config if not provided
  randomStart?: number;             // Optional: for CSS method only (1 to populationSize)
  overwriteExisting?: boolean;     // Required: true to overwrite, false to throw error if exists
}
```

**Response (Success):**
```typescript
{
  success: true;
  message: "Sampling completed successfully for enumeration area {seaId}";
  data: {
    samplingId: number;
    surveyEnumerationAreaId: number;
    method: 'CSS' | 'SRS';
    sampleSize: number;
    populationSize: number;
    isFullSelection: boolean;
    executedAt: Date;
  };
}
```

**Response (Error - Sampling Exists):**
```typescript
{
  statusCode: 400;
  message: "Sampling already exists for this enumeration area. Set overwriteExisting to true to re-run.";
  error: "Bad Request";
}
```

**Response (Error - No Households):**
```typescript
{
  statusCode: 400;
  message: "No household listings found for this enumeration area";
  error: "Bad Request";
}
```

**Usage:**
- Called once per enumeration area
- Frontend should handle this sequentially (one at a time)
- Show loading indicator during processing
- Display success message after completion
- Handle errors gracefully

---

### 5. Get Sampling Results

**Endpoint:** `GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/results`

**Purpose:** Retrieve detailed sampling results including all selected households

**Roles:** ADMIN, SUPERVISOR

**Response:**
```typescript
{
  success: true;
  message: "Sampling results retrieved successfully";
  data: {
    sampling: {
      id: number;
      method: 'CSS' | 'SRS';
      sampleSize: number;
      populationSize: number;
      samplingInterval: number | null;      // CSS only
      randomStart: number | null;          // CSS only
      wrapAroundCount: number;              // CSS only
      isFullSelection: boolean;
      selectedIndices: number[];            // Array of selected household positions (1-indexed)
      metadata: Record<string, any>;
      executedAt: Date;
      executedBy: number | null;
    };
    enumerationArea: {
      id: number;
      name: string;
      areaCode: string;
      subAdminZone: {
        name: string;
        areaCode: string;
        type: string;
      };
      adminZone: {
        name: string;
        areaCode: string;
        type: string;
      };
    };
    selectedHouseholds: Array<{
      selectionOrder: number;              // Order in which household was selected (1, 2, 3...)
      isReplacement: boolean;
      household: {
        id: number;
        structureNumber: string;
        householdIdentification: string;
        householdSerialNumber: number;
        nameOfHOH: string;
        totalMale: number;
        totalFemale: number;
        totalPopulation: number;
        phoneNumber: string | null;
        remarks: string | null;
        createdAt: Date;
      };
    }>;
  };
}
```

**Response (Error - No Sampling):**
```typescript
{
  statusCode: 404;
  message: "No sampling results found for this enumeration area";
  error: "Not Found";
}
```

**Usage:**
- Called when user clicks "View Results" for an enumeration area
- Display in a modal or detail page
- Show sampling metadata and all selected households in a table
- Allow export to CSV if needed

---

## Frontend Workflow

### Step 1: Load Survey Configuration

When user navigates to the sampling page for a survey:

```typescript
// 1. Load survey sampling config
GET /sampling/surveys/:surveyId/config

// If config exists, use it to populate defaults
// If null, user must provide sample size manually
```

### Step 2: User Selects Enumeration Areas

- Display list of enumeration areas for the survey
- Allow multi-select (checkboxes)
- Show status indicators:
  - ✅ **Sampled** - Has sampling results
  - ⏳ **Not Sampled** - No sampling yet
  - ⚠️ **Pending** - Currently being processed

### Step 3: Process Each Enumeration Area (Sequential)

For each selected enumeration area:

```typescript
// 3a. Check if sampling exists
GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/check

if (response.exists) {
  // Show confirmation dialog
  // "Sampling already exists for this EA. Overwrite?"
  // If user confirms, proceed with overwriteExisting: true
  // If user cancels, skip this EA
}

// 3b. Run sampling
POST /sampling/surveys/:surveyId/enumeration-areas/:seaId/run
Body: {
  method: 'CSS' | 'SRS',              // From config or user input
  sampleSize: number,                 // From config or user input
  randomStart: number | undefined,    // Optional, for CSS
  overwriteExisting: boolean          // true if confirmed overwrite, false otherwise
}

// 3c. Handle response
if (success) {
  // Show success message/toast
  // Update EA status to "Sampled"
  // Move to next EA
} else {
  // Show error message
  // Allow user to retry or skip
}
```

### Step 4: View Results

When user clicks "View Results" for an enumeration area:

```typescript
GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/results

// Display in modal or detail page:
// - Sampling metadata (method, sample size, etc.)
// - Enumeration area details
// - Table of selected households with all details
```

---

## DTOs and Data Models

### TypeScript Interfaces

```typescript
// Survey Sampling Config
interface SurveySamplingConfig {
  id: number;
  surveyId: number;
  defaultMethod: 'CSS' | 'SRS';
  urbanSampleSize: number | null;
  ruralSampleSize: number | null;
  defaultSampleSize: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Run Sampling Request
interface RunSamplingRequest {
  method?: 'CSS' | 'SRS';
  sampleSize?: number;
  randomStart?: number;
  overwriteExisting?: boolean;
}

// Run Sampling Response
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
    executedAt: Date;
  };
}

// Check Sampling Response
interface CheckSamplingResponse {
  exists: boolean;
  message: string;
  data: {
    samplingId: number;
    surveyEnumerationAreaId: number;
    method: 'CSS' | 'SRS';
    sampleSize: number;
    populationSize: number;
    isFullSelection: boolean;
    executedAt: Date;
    executedBy: number | null;
  } | null;
}

// Sampling Results Response
interface SamplingResultsResponse {
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
      executedAt: Date;
      executedBy: number | null;
    };
    enumerationArea: {
      id: number;
      name: string;
      areaCode: string;
      subAdminZone: {
        name: string;
        areaCode: string;
        type: string;
      };
      adminZone: {
        name: string;
        areaCode: string;
        type: string;
      };
    };
    selectedHouseholds: Array<{
      selectionOrder: number;
      isReplacement: boolean;
      household: {
        id: number;
        structureNumber: string;
        householdIdentification: string;
        householdSerialNumber: number;
        nameOfHOH: string;
        totalMale: number;
        totalFemale: number;
        totalPopulation: number;
        phoneNumber: string | null;
        remarks: string | null;
        createdAt: Date;
      };
    }>;
  };
}
```

---

## Implementation Steps

### 1. Create Data Service

```typescript
// sampling.service.ts
@Injectable({ providedIn: 'root' })
export class SamplingService {
  private apiUrl = '/sampling';

  constructor(private http: HttpClient) {}

  getSurveyConfig(surveyId: number): Observable<SurveySamplingConfig | null> {
    return this.http.get<SurveySamplingConfig | null>(
      `${this.apiUrl}/surveys/${surveyId}/config`
    );
  }

  upsertSurveyConfig(
    surveyId: number,
    config: Partial<SurveySamplingConfig>
  ): Observable<SurveySamplingConfig> {
    return this.http.post<SurveySamplingConfig>(
      `${this.apiUrl}/surveys/${surveyId}/config`,
      config
    );
  }

  checkSamplingExists(
    surveyId: number,
    seaId: number
  ): Observable<CheckSamplingResponse> {
    return this.http.get<CheckSamplingResponse>(
      `${this.apiUrl}/surveys/${surveyId}/enumeration-areas/${seaId}/check`
    );
  }

  runSampling(
    surveyId: number,
    seaId: number,
    request: RunSamplingRequest
  ): Observable<RunSamplingResponse> {
    return this.http.post<RunSamplingResponse>(
      `${this.apiUrl}/surveys/${surveyId}/enumeration-areas/${seaId}/run`,
      request
    );
  }

  getSamplingResults(
    surveyId: number,
    seaId: number
  ): Observable<SamplingResultsResponse> {
    return this.http.get<SamplingResultsResponse>(
      `${this.apiUrl}/surveys/${surveyId}/enumeration-areas/${seaId}/results`
    );
  }
}
```

### 2. Create Component for Sampling Management

```typescript
// sampling.component.ts
export class SamplingComponent implements OnInit {
  surveyId: number;
  config: SurveySamplingConfig | null = null;
  selectedEAs: number[] = [];
  processingEAs: Set<number> = new Set();
  completedEAs: Set<number> = new Set();
  failedEAs: Map<number, string> = new Map();

  constructor(
    private samplingService: SamplingService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadConfig();
  }

  async loadConfig() {
    this.config = await this.samplingService
      .getSurveyConfig(this.surveyId)
      .toPromise();
  }

  async processSelectedEAs() {
    for (const seaId of this.selectedEAs) {
      await this.processEnumerationArea(seaId);
    }
  }

  async processEnumerationArea(seaId: number) {
    this.processingEAs.add(seaId);

    try {
      // Check if sampling exists
      const checkResult = await this.samplingService
        .checkSamplingExists(this.surveyId, seaId)
        .toPromise();

      if (checkResult.exists) {
        const confirmed = await this.showOverwriteDialog(seaId);
        if (!confirmed) {
          this.processingEAs.delete(seaId);
          return;
        }
      }

      // Run sampling
      const request: RunSamplingRequest = {
        method: this.config?.defaultMethod || 'CSS',
        sampleSize: this.config?.defaultSampleSize || undefined,
        overwriteExisting: checkResult.exists,
      };

      const result = await this.samplingService
        .runSampling(this.surveyId, seaId, request)
        .toPromise();

      if (result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: result.message,
        });
        this.completedEAs.add(seaId);
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'Failed to process sampling',
      });
      this.failedEAs.set(seaId, error.error?.message || 'Unknown error');
    } finally {
      this.processingEAs.delete(seaId);
    }
  }

  async showOverwriteDialog(seaId: number): Promise<boolean> {
    // Use PrimeNG ConfirmationService or Dialog
    return new Promise((resolve) => {
      // Show confirmation dialog
      // resolve(true) if confirmed, resolve(false) if cancelled
    });
  }

  async viewResults(seaId: number) {
    try {
      const results = await this.samplingService
        .getSamplingResults(this.surveyId, seaId)
        .toPromise();

      // Open modal/dialog to display results
      this.showResultsDialog(results.data);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'Failed to load results',
      });
    }
  }
}
```

### 3. Template Example (PrimeNG + Tailwind)

```html
<!-- sampling.component.html -->
<div class="container mx-auto p-6">
  <!-- Config Section -->
  <p-card header="Sampling Configuration" class="mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-2">Default Method</label>
        <p-dropdown
          [(ngModel)]="config.defaultMethod"
          [options]="methods"
          optionLabel="label"
          optionValue="value"
        ></p-dropdown>
      </div>
      <div>
        <label class="block text-sm font-medium mb-2">Urban Sample Size</label>
        <p-inputNumber
          [(ngModel)]="config.urbanSampleSize"
          [showButtons]="true"
        ></p-inputNumber>
      </div>
      <!-- More config fields -->
    </div>
  </p-card>

  <!-- Enumeration Areas List -->
  <p-card header="Enumeration Areas">
    <p-table
      [value]="enumerationAreas"
      [(selection)]="selectedEAs"
      [loading]="loading"
    >
      <ng-template pTemplate="header">
        <tr>
          <th style="width: 3rem">
            <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
          </th>
          <th>EA Name</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-ea>
        <tr>
          <td>
            <p-tableCheckbox [value]="ea.id"></p-tableCheckbox>
          </td>
          <td>{{ ea.name }}</td>
          <td>
            <p-tag
              [value]="getStatus(ea.id)"
              [severity]="getStatusSeverity(ea.id)"
            ></p-tag>
          </td>
          <td>
            <button
              pButton
              label="View Results"
              icon="pi pi-eye"
              (click)="viewResults(ea.id)"
              [disabled]="!isSampled(ea.id)"
              class="p-button-sm"
            ></button>
          </td>
        </tr>
      </ng-template>
    </p-table>

    <div class="mt-4">
      <button
        pButton
        label="Process Selected EAs"
        icon="pi pi-play"
        (click)="processSelectedEAs()"
        [disabled]="selectedEAs.length === 0"
        class="p-button-primary"
      ></button>
    </div>
  </p-card>
</div>
```

---

## Error Handling

### Common Error Scenarios

1. **Sampling Already Exists**
   - Status: 400 Bad Request
   - Message: "Sampling already exists for this enumeration area..."
   - Action: Show confirmation dialog, allow user to overwrite

2. **No Household Listings**
   - Status: 400 Bad Request
   - Message: "No household listings found for this enumeration area"
   - Action: Inform user that household listings must be uploaded first

3. **Invalid Sample Size**
   - Status: 400 Bad Request
   - Message: "Sample size is required when no survey sampling config exists"
   - Action: Prompt user to set sample size or configure survey defaults

4. **Invalid Random Start**
   - Status: 400 Bad Request
   - Message: "Random start must be between 1 and {populationSize}"
   - Action: Validate input before submission

5. **Sampling Not Found (for results)**
   - Status: 404 Not Found
   - Message: "No sampling results found for this enumeration area"
   - Action: Disable "View Results" button if no sampling exists

### Error Handling Pattern

```typescript
try {
  const result = await this.samplingService
    .runSampling(surveyId, seaId, request)
    .toPromise();
  
  // Success handling
} catch (error) {
  if (error.status === 400) {
    // Bad request - show error message
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: error.error.message,
    });
  } else if (error.status === 404) {
    // Not found
    this.messageService.add({
      severity: 'warn',
      summary: 'Not Found',
      detail: error.error.message,
    });
  } else {
    // Generic error
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'An unexpected error occurred',
    });
  }
}
```

---

## UI/UX Recommendations

### 1. Status Indicators

Use PrimeNG `p-tag` or custom badges to show EA status:

- **✅ Sampled** - Green badge, "View Results" button enabled
- **⏳ Not Sampled** - Gray badge, "View Results" button disabled
- **🔄 Processing** - Blue badge with spinner, disable actions
- **❌ Failed** - Red badge, show error message on hover

### 2. Progress Feedback

- Show progress bar for batch processing
- Display "Processing EA X of Y" message
- Use PrimeNG `p-progressBar` or `p-progressSpinner`

### 3. Results Display

- Use PrimeNG `p-dialog` or `p-sidebar` for results modal
- Display sampling metadata in a card
- Show selected households in a `p-table` with:
  - Selection order
  - Household details (serial number, HOH name, population)
  - Export to CSV option

### 4. Confirmation Dialogs

- Use PrimeNG `p-confirmDialog` for overwrite confirmation
- Show existing sampling details before confirming
- Allow user to cancel and skip that EA

### 5. Loading States

- Disable buttons during processing
- Show loading spinner on the EA being processed
- Prevent multiple simultaneous requests

### 6. Success/Error Messages

- Use PrimeNG `p-toast` for notifications
- Show success message after each EA is processed
- Display error messages with retry option

---

## Example Complete Workflow

```typescript
// User selects 3 enumeration areas: [101, 102, 103]

// Step 1: Check each EA
for (const seaId of [101, 102, 103]) {
  const check = await checkSamplingExists(surveyId, seaId);
  
  if (check.exists) {
    // Show dialog: "EA-101 already has sampling. Overwrite?"
    const confirmed = await showConfirmDialog();
    if (!confirmed) continue; // Skip this EA
  }
  
  // Step 2: Run sampling
  try {
    const result = await runSampling(surveyId, seaId, {
      method: 'CSS',
      sampleSize: 12,
      overwriteExisting: check.exists
    });
    
    // Step 3: Show success
    showToast('success', result.message);
    markAsCompleted(seaId);
    
  } catch (error) {
    // Step 4: Handle error
    showToast('error', error.message);
    markAsFailed(seaId, error.message);
  }
}

// Step 5: User clicks "View Results" for EA-101
const results = await getSamplingResults(surveyId, 101);
showResultsModal(results.data);
```

---

## Summary

**Key Points:**
- ✅ Process one EA at a time (sequential)
- ✅ Check for existing sampling before running
- ✅ Show confirmation dialog if sampling exists
- ✅ Display success/error messages for each EA
- ✅ Allow viewing detailed results after sampling
- ✅ Handle all error scenarios gracefully
- ✅ Provide clear status indicators and progress feedback

**API Endpoints Summary:**
1. `GET /sampling/surveys/:surveyId/config` - Get survey config
2. `POST /sampling/surveys/:surveyId/config` - Set survey config
3. `GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/check` - Check if exists
4. `POST /sampling/surveys/:surveyId/enumeration-areas/:seaId/run` - Run sampling
5. `GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/results` - View results

All endpoints require JWT authentication and appropriate role permissions (ADMIN or SUPERVISOR).

