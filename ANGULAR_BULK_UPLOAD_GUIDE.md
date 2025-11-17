# Angular Bulk Upload Guide - Enumeration Areas

This guide provides route details for downloading the CSV template and uploading enumeration areas in bulk for a survey.

## API Routes

### 1. Download CSV Template

**Endpoint:** `GET /survey-enumeration-area/template/csv`

**Description:** Downloads a CSV template file for bulk upload of enumeration areas.

**Headers:**
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="enumeration_area_upload_template.csv"`

**Authentication:** Not required (public endpoint)

**Response:** CSV file with headers:
- Dzongkhag Code
- Admin Zone Code
- Sub Admin Zone Code
- Enumeration Code

**Example CSV Content:**
```csv
Dzongkhag Code,Admin Zone Code,Sub Admin Zone Code,Enumeration Code
01,001,001,001
```

---

### 2. Bulk Upload Enumeration Areas

**Endpoint:** `POST /survey-enumeration-area/bulk-upload/:surveyId`

**Description:** Uploads a CSV file containing enumeration area codes and assigns them to the specified survey.

**URL Parameters:**
- `surveyId` (number) - The ID of the survey to assign enumeration areas to

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with file field named `file`
- File: CSV file (max 10MB)

**Authentication:** Required (JWT token)
- Role: `ADMIN` only

**Response:**
```json
{
  "success": true,
  "totalRows": 10,
  "successful": 9,
  "failed": 1,
  "errors": [
    {
      "row": 5,
      "codes": "01-001-001-999",
      "error": "Enumeration area not found with these codes"
    }
  ],
  "created": 8,
  "skipped": 1
}
```

**Response Fields:**
- `success` (boolean) - Overall success status
- `totalRows` (number) - Total number of rows processed
- `successful` (number) - Number of successfully processed rows
- `failed` (number) - Number of failed rows
- `errors` (array) - Array of error objects with row number, codes, and error message
- `created` (number) - Number of new survey enumeration area assignments created
- `skipped` (number) - Number of rows skipped (already assigned)

---

## Angular Implementation Example

### Service Setup

```typescript
// enumeration-area-upload.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnumerationAreaUploadService {
  private apiUrl = 'http://your-api-url'; // Replace with your API base URL

  constructor(private http: HttpClient) {}

  /**
   * Download CSV template
   */
  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/survey-enumeration-area/template/csv`, {
      responseType: 'blob'
    });
  }

  /**
   * Upload CSV file for a survey
   * @param surveyId - Survey ID
   * @param file - CSV file to upload
   */
  uploadCSV(surveyId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(
      `${this.apiUrl}/survey-enumeration-area/bulk-upload/${surveyId}`,
      formData
    );
  }
}
```

### Component Example

```typescript
// enumeration-area-upload.component.ts
import { Component } from '@angular/core';
import { EnumerationAreaUploadService } from './enumeration-area-upload.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-enumeration-area-upload',
  templateUrl: './enumeration-area-upload.component.html',
  providers: [MessageService]
})
export class EnumerationAreaUploadComponent {
  surveyId: number | null = null;
  uploadResult: any = null;
  loading = false;

  constructor(
    private uploadService: EnumerationAreaUploadService,
    private messageService: MessageService
  ) {}

  /**
   * Download CSV template
   */
  downloadTemplate(): void {
    this.uploadService.downloadTemplate().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'enumeration_area_upload_template.csv';
        link.click();
        window.URL.revokeObjectURL(url);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Template downloaded successfully'
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to download template'
        });
      }
    });
  }

  /**
   * Handle file upload
   */
  onFileSelect(event: any): void {
    const file = event.files[0];
    if (!file) return;

    if (!this.surveyId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a survey first'
      });
      return;
    }

    this.loading = true;
    this.uploadService.uploadCSV(this.surveyId, file).subscribe({
      next: (result) => {
        this.uploadResult = result;
        this.loading = false;
        this.messageService.add({
          severity: result.success ? 'success' : 'warn',
          summary: result.success ? 'Success' : 'Partial Success',
          detail: `Uploaded: ${result.successful}/${result.totalRows} rows. Created: ${result.created}, Skipped: ${result.skipped}, Failed: ${result.failed}`
        });
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Failed',
          detail: error.error?.message || 'Failed to upload file'
        });
      }
    });
  }
}
```

### Template Example (PrimeNG + Tailwind CSS)

```html
<!-- enumeration-area-upload.component.html -->
<div class="container mx-auto p-6">
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">
      Bulk Upload Enumeration Areas
    </h2>

    <!-- Survey Selection -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Survey ID
      </label>
      <input
        type="number"
        [(ngModel)]="surveyId"
        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter Survey ID"
      />
    </div>

    <!-- Download Template Button -->
    <div class="mb-6">
      <p-button
        label="Download Template"
        icon="pi pi-download"
        (onClick)="downloadTemplate()"
        styleClass="p-button-outlined p-button-primary"
        class="w-full md:w-auto"
      ></p-button>
    </div>

    <!-- File Upload -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Upload CSV File
      </label>
      <p-fileUpload
        mode="basic"
        name="file"
        accept=".csv"
        maxFileSize="10000000"
        (onSelect)="onFileSelect($event)"
        [auto]="false"
        chooseLabel="Choose CSV File"
        [disabled]="!surveyId || loading"
        styleClass="w-full"
      ></p-fileUpload>
    </div>

    <!-- Loading Indicator -->
    <div *ngIf="loading" class="mb-6">
      <p-progressSpinner></p-progressSpinner>
      <p class="text-gray-600 mt-2">Uploading file...</p>
    </div>

    <!-- Upload Results -->
    <div *ngIf="uploadResult" class="mt-6">
      <div class="bg-gray-50 rounded-lg p-4">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">
          Upload Results
        </h3>

        <!-- Statistics -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="bg-white p-3 rounded shadow-sm">
            <p class="text-sm text-gray-600">Total Rows</p>
            <p class="text-2xl font-bold text-gray-800">
              {{ uploadResult.totalRows }}
            </p>
          </div>
          <div class="bg-white p-3 rounded shadow-sm">
            <p class="text-sm text-gray-600">Successful</p>
            <p class="text-2xl font-bold text-green-600">
              {{ uploadResult.successful }}
            </p>
          </div>
          <div class="bg-white p-3 rounded shadow-sm">
            <p class="text-sm text-gray-600">Created</p>
            <p class="text-2xl font-bold text-blue-600">
              {{ uploadResult.created }}
            </p>
          </div>
          <div class="bg-white p-3 rounded shadow-sm">
            <p class="text-sm text-gray-600">Failed</p>
            <p class="text-2xl font-bold text-red-600">
              {{ uploadResult.failed }}
            </p>
          </div>
        </div>

        <!-- Errors Table -->
        <div *ngIf="uploadResult.errors && uploadResult.errors.length > 0">
          <h4 class="font-semibold mb-2 text-gray-700">Errors:</h4>
          <p-table
            [value]="uploadResult.errors"
            [paginator]="true"
            [rows]="10"
            styleClass="p-datatable-sm"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>Row</th>
                <th>Codes</th>
                <th>Error</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-error>
              <tr>
                <td>{{ error.row }}</td>
                <td>{{ error.codes }}</td>
                <td class="text-red-600">{{ error.error }}</td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Route Summary

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| `GET` | `/survey-enumeration-area/template/csv` | Download CSV template | No |
| `POST` | `/survey-enumeration-area/bulk-upload/:surveyId` | Upload CSV file | Yes (ADMIN) |

---

## Notes

1. **File Size Limit:** Maximum file size is 10MB
2. **File Format:** Only CSV files are accepted
3. **CSV Format:** The CSV must include headers matching the template (case-insensitive matching)
4. **Duplicate Handling:** If an enumeration area is already assigned to the survey, it will be skipped
5. **Error Reporting:** All errors are reported with row numbers for easy identification

---

## CSV File Format

The CSV file should follow this format:

```csv
Dzongkhag Code,Admin Zone Code,Sub Admin Zone Code,Enumeration Code
01,001,001,001
01,001,001,002
02,001,001,001
```

**Important:**
- First row must be headers
- All four codes are required for each row
- Codes are matched hierarchically (Dzongkhag → Admin Zone → Sub Admin Zone → Enumeration Area)
- Empty rows are ignored

