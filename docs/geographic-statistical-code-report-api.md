# Geographic Statistical Code Report API Documentation

## Overview

The Geographic Statistical Code Report system provides comprehensive reporting of enumeration areas organized by geographic hierarchy (Dzongkhag → Administrative Zone → Sub-Administrative Zone → Enumeration Area). Reports categorize enumeration areas into Urban (Thromde/LAP) and Rural (Gewog/Chiwog) classifications and are available in JSON, PDF, and Excel formats.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Structures](#data-structures)
3. [Request Examples](#request-examples)
4. [Response Examples](#response-examples)
5. [Urban vs Rural Classification](#urban-vs-rural-classification)
6. [Error Handling](#error-handling)
7. [Use Cases](#use-cases)

---

## API Endpoints

### 1. Get Report Data (JSON)

**Endpoint:** `GET /reports/geographic-statistical-code/data`

**Access:** Public  
**Authentication:** Not required

**Description:** Returns complete report data as JSON, including all dzongkhags with their enumeration areas organized by Urban/Rural classification.

**Response:** `GeographicStatisticalCodeResponse` (see [Data Structures](#data-structures))

---

### 2. Generate PDF Report

**Endpoint:** `GET /reports/geographic-statistical-code/pdf`

**Access:** Public  
**Authentication:** Not required

**Query Parameters:**
- `download` (optional): Set to `true` to force download instead of inline display (default: inline)

**Description:** Generates and returns a PDF report with all dzongkhags, their summary statistics, and enumeration areas organized by Urban/Rural classification.

**Response Headers:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="geographic-statistical-code-report-{timestamp}.pdf"` (if download=true)
- `Content-Disposition: inline; filename="geographic-statistical-code-report-{timestamp}.pdf"` (if download not set)

**Response:** PDF file (binary)

---

### 3. Generate Excel Report

**Endpoint:** `GET /reports/geographic-statistical-code/excel`

**Access:** Public  
**Authentication:** Not required

**Description:** Generates and returns an Excel workbook (.xlsx) with all report data in a single sheet format.

**Response Headers:**
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="geographic-statistical-code-report-{timestamp}.xlsx"`

**Response:** Excel file (binary)

---

## Data Structures

### GeographicStatisticalCodeResponse

```typescript
interface GeographicStatisticalCodeResponse {
  generatedAt: string;              // ISO timestamp
  totalDzongkhags: number;
  totalEAs: number;
  totalUrbanEAs: number;
  totalRuralEAs: number;
  dzongkhags: DzongkhagReportData[];
}
```

### DzongkhagReportData

```typescript
interface DzongkhagReportData {
  id: number;
  name: string;
  code: string;                     // Dzongkhag area code
  summary: DzongkhagSummary;
  urbanEAs: EnumerationAreaReportRow[];
  ruralEAs: EnumerationAreaReportRow[];
}
```

### DzongkhagSummary

```typescript
interface DzongkhagSummary {
  totalGewogs: number;
  totalThromdes: number;
  totalChiwogs: number;
  totalLaps: number;
  totalEAs: number;
  urbanEAs: number;
  ruralEAs: number;
}
```

### EnumerationAreaReportRow

```typescript
interface EnumerationAreaReportRow {
  eaId: number;
  eaName: string;
  eaCode: string;
  administrativeZone: {
    id: number;
    name: string;                   // Gewog or Thromde name
    code: string;                    // GewogCode or ThromdeCode
    type: 'Gewog' | 'Thromde';
  };
  subAdministrativeZone: {
    id: number;
    name: string;                   // Chiwog or LAP name
    code: string;                    // ChiwogCode or LAPCode
    type: 'chiwog' | 'lap';
  };
}
```

---

## Request Examples

### Get JSON Data

**cURL:**
```bash
curl "http://localhost:3000/reports/geographic-statistical-code/data"
```

**JavaScript:**
```javascript
const response = await fetch('/reports/geographic-statistical-code/data');
const data = await response.json();
console.log(data);
```

**Response Time:** Typically 1-5 seconds depending on data volume

---

### Generate PDF Report

**cURL (Inline Display):**
```bash
curl "http://localhost:3000/reports/geographic-statistical-code/pdf" \
  --output report.pdf
```

**cURL (Force Download):**
```bash
curl "http://localhost:3000/reports/geographic-statistical-code/pdf?download=true" \
  --output report.pdf
```

**JavaScript:**
```javascript
// Inline display
const response = await fetch('/reports/geographic-statistical-code/pdf');
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
window.open(url);

// Force download
const response = await fetch('/reports/geographic-statistical-code/pdf?download=true');
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'geographic-statistical-code-report.pdf';
a.click();
```

---

### Generate Excel Report

**cURL:**
```bash
curl "http://localhost:3000/reports/geographic-statistical-code/excel" \
  --output report.xlsx
```

**JavaScript:**
```javascript
const response = await fetch('/reports/geographic-statistical-code/excel');
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'geographic-statistical-code-report.xlsx';
a.click();
```

---

## Response Examples

### JSON Response Example

```json
{
  "generatedAt": "2024-12-18T10:30:00.000Z",
  "totalDzongkhags": 20,
  "totalEAs": 1250,
  "totalUrbanEAs": 450,
  "totalRuralEAs": 800,
  "dzongkhags": [
    {
      "id": 1,
      "name": "Thimphu",
      "code": "01",
      "summary": {
        "totalGewogs": 8,
        "totalThromdes": 1,
        "totalChiwogs": 45,
        "totalLaps": 12,
        "totalEAs": 120,
        "urbanEAs": 45,
        "ruralEAs": 75
      },
      "urbanEAs": [
        {
          "eaId": 101,
          "eaName": "EA-Thimphu-Urban-01",
          "eaCode": "01-UR-01",
          "administrativeZone": {
            "id": 10,
            "name": "Thimphu Thromde",
            "code": "01-TH",
            "type": "Thromde"
          },
          "subAdministrativeZone": {
            "id": 50,
            "name": "LAP-01",
            "code": "01-LAP-01",
            "type": "lap"
          }
        }
      ],
      "ruralEAs": [
        {
          "eaId": 201,
          "eaName": "EA-Thimphu-Rural-01",
          "eaCode": "01-RU-01",
          "administrativeZone": {
            "id": 11,
            "name": "Kawang Gewog",
            "code": "01-GW-01",
            "type": "Gewog"
          },
          "subAdministrativeZone": {
            "id": 60,
            "name": "Chiwog-01",
            "code": "01-CH-01",
            "type": "chiwog"
          }
        }
      ]
    }
  ]
}
```

---

## Urban vs Rural Classification

Enumeration areas are classified as **Urban** or **Rural** based on the following rules:

### Urban Classification
An EA is classified as **Urban** if it is linked to a Sub-Administrative Zone where:
- The Administrative Zone type is **Thromde**, OR
- The Sub-Administrative Zone type is **LAP**

### Rural Classification
An EA is classified as **Rural** if it is linked to a Sub-Administrative Zone where:
- The Administrative Zone type is **Gewog**, AND
- The Sub-Administrative Zone type is **chiwog**

### Classification Logic

```typescript
isUrban(adminZoneType, subAdminZoneType) {
  return (
    adminZoneType === 'Thromde' ||
    subAdminZoneType === 'lap'
  );
}
```

**Note:** Only **active** enumeration areas (`isActive = true`) are included in the report.

---

## PDF Report Structure

The PDF report includes:

1. **Cover Page:**
   - Report title: "Geographic Statistical Code Report"
   - Generation date and time
   - Total statistics (all dzongkhags combined)

2. **For Each Dzongkhag:**
   - **Header:** Dzongkhag name and code
   - **Summary Table:** Statistics (Gewogs, Thromdes, Chiwogs, LAPs, Total EAs, Urban EAs, Rural EAs)
   - **Urban EAs Section:**
     - Table with columns: Thromde, ThromdeCode, LAP, LAPCode, EA Name, EA Code
   - **Rural EAs Section:**
     - Table with columns: Gewog, GewogCode, Chiwog, ChiwogCode, EA Name, EA Code
   - Page break after each dzongkhag

**PDF Features:**
- Professional styling with borders and alternating row colors
- Header row with bold text and background color
- Proper page breaks
- Footer with generation date and copyright

---

## Excel Report Structure

The Excel report uses a **single sheet** format with the following columns:

| Column | Description |
|--------|-------------|
| Dzongkhag Name | Name of the dzongkhag |
| Dzongkhag Code | Area code of the dzongkhag |
| Type | "Urban" or "Rural" |
| Gewog/Thromde | Administrative zone name |
| GewogCode/ThromdeCode | Administrative zone code |
| Chiwog/LAP | Sub-administrative zone name |
| ChiwogCode/LAPCode | Sub-administrative zone code |
| EA Name | Enumeration area name |
| EA Code | Enumeration area code |

**Excel Features:**
- Summary rows for each dzongkhag (highlighted in gray)
- Frozen header row
- Bold headers with blue background
- Alternating row colors for readability
- Auto-width columns
- Borders around all cells
- Grouped by dzongkhag with summary statistics

---

## Error Handling

### Common Error Responses

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "Failed to generate PDF: [error details]"
}
```

**Possible Causes:**
- Database connection issues
- Template file not found
- Memory issues with large datasets
- PDF/Excel generation library errors

### Error Handling Best Practices

1. **Check Response Status:**
   ```javascript
   const response = await fetch('/reports/geographic-statistical-code/data');
   if (!response.ok) {
     throw new Error(`HTTP error! status: ${response.status}`);
   }
   ```

2. **Handle Large Files:**
   ```javascript
   // For PDF/Excel downloads, use streaming for large files
   const response = await fetch('/reports/geographic-statistical-code/pdf');
   const reader = response.body.getReader();
   // Process stream...
   ```

3. **Timeout Handling:**
   ```javascript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
   
   try {
     const response = await fetch('/reports/geographic-statistical-code/data', {
       signal: controller.signal
     });
     clearTimeout(timeoutId);
   } catch (error) {
     if (error.name === 'AbortError') {
       console.error('Request timeout');
     }
   }
   ```

---

## Use Cases

### 1. Dashboard Statistics Display

```javascript
async function getReportStatistics() {
  const response = await fetch('/reports/geographic-statistical-code/data');
  const data = await response.json();
  
  return {
    totalDzongkhags: data.totalDzongkhags,
    totalEAs: data.totalEAs,
    urbanPercentage: (data.totalUrbanEAs / data.totalEAs * 100).toFixed(2),
    ruralPercentage: (data.totalRuralEAs / data.totalEAs * 100).toFixed(2),
  };
}
```

### 2. Export Report for Analysis

```javascript
async function exportReport(format = 'pdf') {
  const endpoint = format === 'excel' 
    ? '/reports/geographic-statistical-code/excel'
    : '/reports/geographic-statistical-code/pdf?download=true';
  
  const response = await fetch(endpoint);
  const blob = await response.blob();
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `geographic-statistical-code-report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
```

### 3. Filter by Dzongkhag

```javascript
async function getDzongkhagReport(dzongkhagId) {
  const response = await fetch('/reports/geographic-statistical-code/data');
  const data = await response.json();
  
  return data.dzongkhags.find(d => d.id === dzongkhagId);
}
```

### 4. Compare Urban vs Rural Distribution

```javascript
async function compareUrbanRural() {
  const response = await fetch('/reports/geographic-statistical-code/data');
  const data = await response.json();
  
  const comparison = data.dzongkhags.map(dz => ({
    dzongkhag: dz.name,
    urbanCount: dz.summary.urbanEAs,
    ruralCount: dz.summary.ruralEAs,
    urbanPercentage: (dz.summary.urbanEAs / dz.summary.totalEAs * 100).toFixed(2),
    ruralPercentage: (dz.summary.ruralEAs / dz.summary.totalEAs * 100).toFixed(2),
  }));
  
  return comparison;
}
```

### 5. Generate Report on Schedule

```javascript
// Server-side example (Node.js)
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');

// Generate and save report daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    const response = await axios.get('http://localhost:3000/reports/geographic-statistical-code/pdf', {
      responseType: 'arraybuffer'
    });
    
    const filename = `reports/geographic-statistical-code-${new Date().toISOString().split('T')[0]}.pdf`;
    fs.writeFileSync(filename, response.data);
    console.log(`Report saved: ${filename}`);
  } catch (error) {
    console.error('Failed to generate scheduled report:', error);
  }
});
```

---

## Performance Considerations

### Data Volume
- Reports include **only active enumeration areas** (`isActive = true`)
- Large datasets may take 5-15 seconds to generate
- PDF generation is typically faster than Excel for very large datasets

### Optimization Tips
1. **Caching:** Consider caching JSON data for frequently accessed reports
2. **Pagination:** For very large datasets, consider implementing pagination (future enhancement)
3. **Background Jobs:** For scheduled reports, use background job processing
4. **Streaming:** For large file downloads, implement streaming responses

### Database Queries
The service uses optimized queries with:
- Single query per dzongkhag to fetch all related data
- Proper JOIN operations to avoid N+1 query problems
- Filtering at database level (only active EAs)

---

## Integration Examples

### React Component Example

```typescript
import React, { useState, useEffect } from 'react';

function GeographicReport() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/reports/geographic-statistical-code/data')
      .then(res => res.json())
      .then(data => {
        setReportData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load report:', err);
        setLoading(false);
      });
  }, []);

  const handleExportPDF = () => {
    window.open('/reports/geographic-statistical-code/pdf?download=true');
  };

  const handleExportExcel = () => {
    window.open('/reports/geographic-statistical-code/excel');
  };

  if (loading) return <div>Loading report...</div>;
  if (!reportData) return <div>Failed to load report</div>;

  return (
    <div>
      <h1>Geographic Statistical Code Report</h1>
      <div>
        <button onClick={handleExportPDF}>Export PDF</button>
        <button onClick={handleExportExcel}>Export Excel</button>
      </div>
      <div>
        <p>Total Dzongkhags: {reportData.totalDzongkhags}</p>
        <p>Total EAs: {reportData.totalEAs}</p>
        <p>Urban EAs: {reportData.totalUrbanEAs}</p>
        <p>Rural EAs: {reportData.totalRuralEAs}</p>
      </div>
      {/* Render dzongkhag data */}
    </div>
  );
}
```

### Vue.js Component Example

```vue
<template>
  <div>
    <h1>Geographic Statistical Code Report</h1>
    <button @click="exportPDF">Export PDF</button>
    <button @click="exportExcel">Export Excel</button>
    
    <div v-if="loading">Loading...</div>
    <div v-else-if="reportData">
      <p>Total Dzongkhags: {{ reportData.totalDzongkhags }}</p>
      <p>Total EAs: {{ reportData.totalEAs }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      reportData: null,
      loading: true
    };
  },
  async mounted() {
    try {
      const response = await fetch('/reports/geographic-statistical-code/data');
      this.reportData = await response.json();
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    exportPDF() {
      window.open('/reports/geographic-statistical-code/pdf?download=true');
    },
    exportExcel() {
      window.open('/reports/geographic-statistical-code/excel');
    }
  }
};
</script>
```

---

## Notes

### Data Accuracy
- Reports reflect the current state of the database at generation time
- Only active enumeration areas are included
- Historical/inactive EAs are excluded

### File Naming
- PDF files: `geographic-statistical-code-report-{YYYY-MM-DDTHH-MM-SS}.pdf`
- Excel files: `geographic-statistical-code-report-{YYYY-MM-DDTHH-MM-SS}.xlsx`
- Timestamp format: ISO 8601 without colons (filesystem-safe)


