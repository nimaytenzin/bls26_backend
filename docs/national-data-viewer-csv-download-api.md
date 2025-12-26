# National Data Viewer CSV Download API

## Overview

This document describes the API endpoints for downloading annual statistics as CSV files specifically designed for the national data viewer. These endpoints provide structured data at different hierarchical levels (Dzongkhag → Gewog/Thromde → Chiwog/LAP → EA).

**Key Features:**
- Public access (no authentication required)
- CSV format for easy data analysis
- Multiple hierarchical breakdown levels
- Area codes included for all administrative levels
- Year-based filtering (defaults to latest available year)

**Base URL:** `/annual-statistics-download/national-viewer`

---

## API Endpoints

### 1. Download All Dzongkhags

Download all Dzongkhags with basic statistics including urban/rural breakdowns.

**Endpoint:** `GET /annual-statistics-download/national-viewer/dzongkhags/csv`

**Access:** Public (no authentication required)

**Query Parameters:**
- `year` (optional): Statistical year (defaults to latest available year)

**Response:**
- Content-Type: `text/csv`
- File download: `national_viewer_dzongkhags.csv`

**CSV Columns:**
1. `Dzongkhag Name` - Name of the Dzongkhag
2. `Dzongkhag Code` - Area code of the Dzongkhag
3. `EA Count` - Total number of Enumeration Areas
4. `Household Count` - Total number of households
5. `Urban EA Count` - Number of EAs in urban areas (Thromdes)
6. `Rural EA Count` - Number of EAs in rural areas (Gewogs)
7. `Urban Household Count` - Number of households in urban areas

**Example Request:**
```bash
GET /annual-statistics-download/national-viewer/dzongkhags/csv
GET /annual-statistics-download/national-viewer/dzongkhags/csv?year=2024
```

**Example CSV Output:**
```csv
Dzongkhag Name,Dzongkhag Code,EA Count,Household Count,Urban EA Count,Rural EA Count,Urban Household Count
"Thimphu","TH",150,25000,50,100,8000
"Paro","PA",200,30000,60,140,10000
```

---

### 2. Download Dzongkhag with Gewog/Thromde Breakdown

Download statistics broken down by Dzongkhag and their Administrative Zones (Gewogs/Thromdes).

**Endpoint:** `GET /annual-statistics-download/national-viewer/dzongkhag-gewog-thromde/csv`

**Access:** Public (no authentication required)

**Query Parameters:**
- `year` (optional): Statistical year (defaults to latest available year)

**Response:**
- Content-Type: `text/csv`
- File download: `national_viewer_dzongkhag_gewog_thromde.csv`

**CSV Columns:**
1. `Dzongkhag Name` - Name of the Dzongkhag
2. `Dzongkhag Code` - Area code of the Dzongkhag
3. `Type` - Administrative zone type: "R" (Rural) for Gewog, "U" (Urban) for Thromde
4. `Gewog/Thromde Name` - Name of the Administrative Zone (Gewog or Thromde)
5. `Gewog/Thromde Code` - Area code of the Administrative Zone (Gewog or Thromde)
6. `Total EA` - Total number of Enumeration Areas in the Administrative Zone
7. `Total Household` - Total number of households in the Administrative Zone

**Example Request:**
```bash
GET /annual-statistics-download/national-viewer/dzongkhag-gewog-thromde/csv
GET /annual-statistics-download/national-viewer/dzongkhag-gewog-thromde/csv?year=2024
```

**Example CSV Output:**
```csv
Dzongkhag Name,Dzongkhag Code,Type,Gewog/Thromde Name,Gewog/Thromde Code,Total EA,Total Household
"Thimphu","TH","R","Chang Gewog","TH-GW-01",25,4000
"Thimphu","TH","U","Thimphu Thromde","TH-TH-01",30,5000
"Paro","PA","R","Dopshari Gewog","PA-GW-01",35,6000
```

**Notes:**
- Each row represents one Administrative Zone (either a Gewog or a Thromde)
- Type "R" indicates Rural (Gewog), Type "U" indicates Urban (Thromde)
- The `Gewog/Thromde Name` and `Gewog/Thromde Code` columns contain the name and code for whichever type applies

---

### 3. Download Dzongkhag with Chiwog/LAP Breakdown

Download statistics broken down by Dzongkhag → Gewog/Thromde → Chiwog/LAP.

**Endpoint:** `GET /annual-statistics-download/national-viewer/dzongkhag-chiwog-lap/csv`

**Access:** Public (no authentication required)

**Query Parameters:**
- `year` (optional): Statistical year (defaults to latest available year)

**Response:**
- Content-Type: `text/csv`
- File download: `national_viewer_dzongkhag_chiwog_lap.csv`

**CSV Columns:**
1. `Dzongkhag Name` - Name of the Dzongkhag
2. `Dzongkhag Code` - Area code of the Dzongkhag
3. `Type` - Administrative zone type: "R" (Rural) for Gewog, "U" (Urban) for Thromde
4. `Gewog/Thromde Name` - Name of the Administrative Zone (Gewog or Thromde)
5. `Gewog/Thromde Code` - Area code of the Administrative Zone (Gewog or Thromde)
6. `Type` - Sub-administrative zone type: "R" (Rural) for Chiwog, "U" (Urban) for LAP
7. `Chiwog/LAP Name` - Name of the Sub-Administrative Zone (Chiwog or LAP)
8. `Chiwog/LAP Code` - Area code of the Sub-Administrative Zone (Chiwog or LAP)
9. `Total EA` - Total number of Enumeration Areas in the Sub-Administrative Zone
10. `Total Household` - Total number of households in the Sub-Administrative Zone

**Example Request:**
```bash
GET /annual-statistics-download/national-viewer/dzongkhag-chiwog-lap/csv
GET /annual-statistics-download/national-viewer/dzongkhag-chiwog-lap/csv?year=2024
```

**Example CSV Output:**
```csv
Dzongkhag Name,Dzongkhag Code,Type,Gewog/Thromde Name,Gewog/Thromde Code,Type,Chiwog/LAP Name,Chiwog/LAP Code,Total EA,Total Household
"Thimphu","TH","R","Chang Gewog","TH-GW-01","R","Chang Chiwog 1","TH-GW-01-CH-01",5,800
"Thimphu","TH","U","Thimphu Thromde","TH-TH-01","U","LAP 1","TH-TH-01-LAP-01",6,1000
"Paro","PA","R","Dopshari Gewog","PA-GW-01","R","Dopshari Chiwog 1","PA-GW-01-CH-01",7,1200
```

**Notes:**
- Each row represents one Sub-Administrative Zone (either a Chiwog or a LAP)
- First Type column: "R" for Gewog (Rural), "U" for Thromde (Urban)
- Second Type column: "R" for Chiwog (Rural), "U" for LAP (Urban)
- Chiwogs are always under Gewogs (both Type="R"), LAPs are always under Thromdes (both Type="U")

---

### 4. Download Full Hierarchy (Dzongkhag → Gewog/Thromde → Chiwog/LAP → EA)

Download complete hierarchy with Enumeration Area level details.

**Endpoint:** `GET /annual-statistics-download/national-viewer/full-hierarchy/csv`

**Access:** Public (no authentication required)

**Query Parameters:**
- `year` (optional): Statistical year (defaults to latest available year)

**Response:**
- Content-Type: `text/csv`
- File download: `national_viewer_full_hierarchy.csv`

**CSV Columns:**
1. `Dzongkhag Name` - Name of the Dzongkhag
2. `Dzongkhag Code` - Area code of the Dzongkhag
3. `Type` - Administrative zone type: "R" (Rural) for Gewog, "U" (Urban) for Thromde
4. `Gewog/Thromde Name` - Name of the Administrative Zone (Gewog or Thromde)
5. `Gewog/Thromde Code` - Area code of the Administrative Zone (Gewog or Thromde)
6. `Type` - Sub-administrative zone type: "R" (Rural) for Chiwog, "U" (Urban) for LAP
7. `Chiwog/LAP Name` - Name of the Sub-Administrative Zone (Chiwog or LAP)
8. `Chiwog/LAP Code` - Area code of the Sub-Administrative Zone (Chiwog or LAP)
9. `EA Name` - Name of the Enumeration Area
10. `EA Code` - Area code of the Enumeration Area
11. `Household Count` - Number of households in the Enumeration Area

**Example Request:**
```bash
GET /annual-statistics-download/national-viewer/full-hierarchy/csv
GET /annual-statistics-download/national-viewer/full-hierarchy/csv?year=2024
```

**Example CSV Output:**
```csv
Dzongkhag Name,Dzongkhag Code,Type,Gewog/Thromde Name,Gewog/Thromde Code,Type,Chiwog/LAP Name,Chiwog/LAP Code,EA Name,EA Code,Household Count
"Thimphu","TH","R","Chang Gewog","TH-GW-01","R","Chang Chiwog 1","TH-GW-01-CH-01","EA 001","TH-GW-01-CH-01-EA-001",150
"Thimphu","TH","R","Chang Gewog","TH-GW-01","R","Chang Chiwog 1","TH-GW-01-CH-01","EA 002","TH-GW-01-CH-01-EA-002",160
"Thimphu","TH","U","Thimphu Thromde","TH-TH-01","U","LAP 1","TH-TH-01-LAP-01","EA 001","TH-TH-01-LAP-01-EA-001",200
"Paro","PA","R","Dopshari Gewog","PA-GW-01","R","Dopshari Chiwog 1","PA-GW-01-CH-01","EA 001","PA-GW-01-CH-01-EA-001",180
```

**Notes:**
- Each row represents one Enumeration Area
- First Type column: "R" for Gewog (Rural), "U" for Thromde (Urban)
- Second Type column: "R" for Chiwog (Rural), "U" for LAP (Urban)
- This is the most detailed breakdown, showing the complete administrative hierarchy
- Only active Enumeration Areas are included
- The file can be large depending on the number of EAs in the system

---

## Data Hierarchy

The administrative hierarchy in Bhutan follows this structure:

```
Dzongkhag (District)
  ├── Gewog (Rural Administrative Zone)
  │   └── Chiwog (Rural Sub-Administrative Zone)
  │       └── Enumeration Area (EA)
  └── Thromde (Urban Administrative Zone)
      └── LAP (Urban Sub-Administrative Zone)
          └── Enumeration Area (EA)
```

**Key Relationships:**
- **Dzongkhag** contains multiple **Administrative Zones** (Gewogs or Thromdes)
- **Gewog** (rural) contains **Chiwogs**
- **Thromde** (urban) contains **LAPs**
- **Chiwog/LAP** contains **Enumeration Areas**
- Each **Enumeration Area** has household and population statistics

---

## Usage Examples

### Using cURL

```bash
# Download all Dzongkhags
curl -O -J "https://api.example.com/annual-statistics-download/national-viewer/dzongkhags/csv?year=2024"

# Download Dzongkhag with Gewog/Thromde breakdown
curl -O -J "https://api.example.com/annual-statistics-download/national-viewer/dzongkhag-gewog-thromde/csv?year=2024"

# Download Dzongkhag with Chiwog/LAP breakdown
curl -O -J "https://api.example.com/annual-statistics-download/national-viewer/dzongkhag-chiwog-lap/csv?year=2024"

# Download full hierarchy
curl -O -J "https://api.example.com/annual-statistics-download/national-viewer/full-hierarchy/csv?year=2024"
```

### Using JavaScript/TypeScript

```typescript
// Download all Dzongkhags
const downloadDzongkhags = async (year?: number) => {
  const url = year
    ? `/annual-statistics-download/national-viewer/dzongkhags/csv?year=${year}`
    : '/annual-statistics-download/national-viewer/dzongkhags/csv';
  
  const response = await fetch(url);
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'national_viewer_dzongkhags.csv';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);
};

// Download full hierarchy
const downloadFullHierarchy = async (year?: number) => {
  const url = year
    ? `/annual-statistics-download/national-viewer/full-hierarchy/csv?year=${year}`
    : '/annual-statistics-download/national-viewer/full-hierarchy/csv';
  
  const response = await fetch(url);
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'national_viewer_full_hierarchy.csv';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);
};
```

### Using HTML Download Links

```html
<!-- Download all Dzongkhags -->
<a href="/annual-statistics-download/national-viewer/dzongkhags/csv?year=2024" download="national_viewer_dzongkhags.csv">
  Download All Dzongkhags (CSV)
</a>

<!-- Download Dzongkhag with Gewog/Thromde -->
<a href="/annual-statistics-download/national-viewer/dzongkhag-gewog-thromde/csv?year=2024" download="national_viewer_dzongkhag_gewog_thromde.csv">
  Download Dzongkhag → Gewog/Thromde (CSV)
</a>

<!-- Download Dzongkhag with Chiwog/LAP -->
<a href="/annual-statistics-download/national-viewer/dzongkhag-chiwog-lap/csv?year=2024" download="national_viewer_dzongkhag_chiwog_lap.csv">
  Download Dzongkhag → Chiwog/LAP (CSV)
</a>

<!-- Download full hierarchy -->
<a href="/annual-statistics-download/national-viewer/full-hierarchy/csv?year=2024" download="national_viewer_full_hierarchy.csv">
  Download Full Hierarchy (CSV)
</a>
```

---

## Field Descriptions

### Dzongkhag Level Fields

| Field | Description | Example |
|-------|-------------|---------|
| Dzongkhag Name | Name of the Dzongkhag | "Thimphu", "Paro" |
| Dzongkhag Code | Unique area code for the Dzongkhag | "TH", "PA" |
| EA Count | Total number of Enumeration Areas | 150 |
| Household Count | Total number of households | 25000 |
| Urban EA Count | Number of EAs in Thromdes (urban) | 50 |
| Rural EA Count | Number of EAs in Gewogs (rural) | 100 |
| Urban Household Count | Number of households in urban areas | 8000 |

### Administrative Zone Level Fields

| Field | Description | Example |
|-------|-------------|---------|
| Type | Administrative zone type: "R" (Rural) for Gewog, "U" (Urban) for Thromde | "R", "U" |
| Gewog/Thromde Name | Name of the Administrative Zone (Gewog or Thromde) | "Chang Gewog", "Thimphu Thromde" |
| Gewog/Thromde Code | Area code for the Administrative Zone (Gewog or Thromde) | "TH-GW-01", "TH-TH-01" |
| Total EA | Total Enumeration Areas in the zone | 25 |
| Total Household | Total households in the zone | 4000 |

### Sub-Administrative Zone Level Fields

| Field | Description | Example |
|-------|-------------|---------|
| Type | Sub-administrative zone type: "R" (Rural) for Chiwog, "U" (Urban) for LAP | "R", "U" |
| Chiwog/LAP Name | Name of the Sub-Administrative Zone (Chiwog or LAP) | "Chang Chiwog 1", "LAP 1" |
| Chiwog/LAP Code | Area code for the Sub-Administrative Zone (Chiwog or LAP) | "TH-GW-01-CH-01", "TH-TH-01-LAP-01" |
| Total EA | Total Enumeration Areas in the sub-zone | 5 |
| Total Household | Total households in the sub-zone | 800 |

### Enumeration Area Level Fields

| Field | Description | Example |
|-------|-------------|---------|
| EA Name | Name of the Enumeration Area | "EA 001" |
| EA Code | Area code for the Enumeration Area | "TH-GW-01-CH-01-EA-001" |
| Household Count | Number of households in the EA | 150 |

---

## Response Headers

All endpoints return the following headers:

```
Content-Type: text/csv
Content-Disposition: attachment; filename="[filename].csv"
```

---

## Error Handling

### 404 Not Found

If no statistics are found for the specified year:

```json
{
  "statusCode": 404,
  "message": "No annual statistics found in database",
  "error": "Not Found"
}
```

### 500 Internal Server Error

Database or server error:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Year Resolution

- If `year` is provided, statistics for that specific year are returned
- If `year` is not provided, the latest available year across all statistics tables is used
- The latest year is determined by checking all annual statistics tables (Dzongkhag, Administrative Zone, Sub-Administrative Zone, and Enumeration Area)

---

## Use Cases

1. **National Dashboard Integration**: Import CSV data into national data viewer dashboards
2. **Data Analysis**: Analyze statistics at different administrative levels
3. **Reporting**: Generate reports for specific years or administrative hierarchies
4. **Data Export**: Export data for external analysis tools (Excel, R, Python, etc.)
5. **Visualization**: Use CSV data to create charts and visualizations

---

## Performance Considerations

- **File Size**: CSV files can be large, especially the full hierarchy endpoint
- **Query Time**: Full hierarchy queries may take longer due to multiple joins
- **Caching**: Consider implementing client-side caching for frequently accessed data
- **Pagination**: For very large datasets, consider implementing pagination or filtering

---

## Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/national-viewer/dzongkhags/csv` | GET | Download all Dzongkhags with basic stats | No |
| `/national-viewer/dzongkhag-gewog-thromde/csv` | GET | Download Dzongkhag → Gewog/Thromde breakdown | No |
| `/national-viewer/dzongkhag-chiwog-lap/csv` | GET | Download Dzongkhag → Chiwog/LAP breakdown | No |
| `/national-viewer/full-hierarchy/csv` | GET | Download complete hierarchy with EA details | No |

**Key Benefits:**
- Public access for national data viewer integration
- Structured CSV format for easy data processing
- Multiple hierarchical breakdown levels
- Area codes included for all administrative levels
- Year-based filtering with automatic latest year detection
- No authentication required

---

## Notes

- All CSV files use UTF-8 encoding
- Values are properly quoted to handle commas and special characters
- Empty cells indicate that the field is not applicable (e.g., Thromde Code is empty for Gewogs)
- Only active Enumeration Areas are included in the full hierarchy
- Statistics are aggregated from the annual statistics tables for the specified year

