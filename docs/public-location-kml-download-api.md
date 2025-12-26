# Public Location KML Download API

## Overview

This document describes the public API endpoints for downloading location data as KML files for the national dashboard. These endpoints are publicly accessible and do not require authentication.

**Key Features:**
- Public access (no authentication required)
- KML format for Google Earth and GIS applications
- Renamed area codes for clarity (Dzongkhag Code, Gewog Code, Thromde Code, Chiwog Code, LAP Code, EA Code)
- Blue border styling applied to all KML files

**Base URL:** `/location/download/national`

---

## API Endpoints

### 1. Download All Dzongkhags as KML

Download all Dzongkhag boundaries as a KML file.

**Endpoint:** `GET /location/download/national/dzongkhags/kml`

**Access:** Public (no authentication required)

**Response:**
- Content-Type: `application/vnd.google-earth.kml+xml`
- File download: `all_dzongkhags.kml`

**Description:** Returns a KML file containing all Dzongkhag boundaries. The `areaCode` field is renamed to `Dzongkhag Code` in the KML properties.

**Example Request:**
```bash
GET /location/download/public/national/dzongkhags/kml
```

---

### 2. Download All Administrative Zones (Gewogs/Thromdes) as KML

Download all Administrative Zone boundaries as a KML file.

**Endpoint:** `GET /location/download/national/administrative-zones/kml`

**Access:** Public (no authentication required)

**Response:**
- Content-Type: `application/vnd.google-earth.kml+xml`
- File download: `all_administrative_zones.kml`

**Description:** Returns a KML file containing all Administrative Zone boundaries (both Gewogs and Thromdes). Includes full hierarchical information with Location column (R for Rural/Gewog, U for Urban/Thromde) and combined Name/Code fields matching the CSV format.

**Example Request:**
```bash
GET /location/download/public/national/administrative-zones/kml
```

---

### 3. Download All Sub-Administrative Zones (Chiwogs/LAPs) as KML

Download all Sub-Administrative Zone boundaries as a KML file.

**Endpoint:** `GET /location/download/national/sub-administrative-zones/kml`

**Access:** Public (no authentication required)

**Response:**
- Content-Type: `application/vnd.google-earth.kml+xml`
- File download: `all_sub_administrative_zones.kml`

**Description:** Returns a KML file containing all Sub-Administrative Zone boundaries (both Chiwogs and LAPs). Includes full hierarchical information (Dzongkhag → Gewog/Thromde → Chiwog/LAP) with Location columns (R for Rural, U for Urban) and combined Name/Code fields matching the CSV format.

**Example Request:**
```bash
GET /location/download/public/national/sub-administrative-zones/kml
```

---

### 4. Download All Enumeration Areas as KML

Download all Enumeration Area boundaries as a KML file.

**Endpoint:** `GET /location/download/national/enumeration-areas/kml`

**Access:** Public (no authentication required)

**Response:**
- Content-Type: `application/vnd.google-earth.kml+xml`
- File download: `all_enumeration_areas.kml`

**Description:** Returns a KML file containing all active Enumeration Area boundaries. The `areaCode` field is renamed to `EA Code` in the KML properties.

**Example Request:**
```bash
GET /location/download/public/national/enumeration-areas/kml
```

---

## KML File Structure

### Dzongkhag KML Properties

Each Dzongkhag feature in the KML contains:

```xml
<Placemark>
  <name>Thimphu</name>
  <ExtendedData>
    <Data name="id">
      <value>1</value>
    </Data>
    <Data name="name">
      <value>Thimphu</value>
    </Data>
    <Data name="Dzongkhag Code">
      <value>TH</value>
    </Data>
  </ExtendedData>
  <Polygon>...</Polygon>
</Placemark>
```

### Administrative Zone KML Properties

Each Administrative Zone feature contains:

```xml
<Placemark>
  <name>Paro Gewog</name>
  <ExtendedData>
    <Data name="id">
      <value>1</value>
    </Data>
    <Data name="Dzongkhag Name">
      <value>Paro</value>
    </Data>
    <Data name="Dzongkhag Code">
      <value>PA</value>
    </Data>
    <Data name="Location">
      <value>R</value>
    </Data>
    <Data name="Gewog/Thromde Name">
      <value>Paro Gewog</value>
    </Data>
    <Data name="Gewog/Thromde Code">
      <value>PA-GW-01</value>
    </Data>
  </ExtendedData>
  <Polygon>...</Polygon>
</Placemark>
```

### Sub-Administrative Zone KML Properties

Each Sub-Administrative Zone feature contains:

```xml
<Placemark>
  <name>Chiwog Name</name>
  <ExtendedData>
    <Data name="id">
      <value>1</value>
    </Data>
    <Data name="Dzongkhag Name">
      <value>Thimphu</value>
    </Data>
    <Data name="Dzongkhag Code">
      <value>TH</value>
    </Data>
    <Data name="Location">
      <value>R</value>
    </Data>
    <Data name="Gewog/Thromde Name">
      <value>Chang Gewog</value>
    </Data>
    <Data name="Gewog/Thromde Code">
      <value>TH-GW-01</value>
    </Data>
    <Data name="Chiwog/LAP Name">
      <value>Chiwog Name</value>
    </Data>
    <Data name="Chiwog/LAP Code">
      <value>CH-001</value>
    </Data>
  </ExtendedData>
  <Polygon>...</Polygon>
</Placemark>
```

### Enumeration Area KML Properties

Each Enumeration Area feature contains full hierarchy:

```xml
<Placemark>
  <name>EA Name</name>
  <ExtendedData>
    <Data name="id">
      <value>1</value>
    </Data>
    <Data name="Dzongkhag Name">
      <value>Thimphu</value>
    </Data>
    <Data name="Dzongkhag Code">
      <value>TH</value>
    </Data>
    <Data name="Location">
      <value>R</value>
    </Data>
    <Data name="Gewog/Thromde Name">
      <value>Chang Gewog</value>
    </Data>
    <Data name="Gewog/Thromde Code">
      <value>TH-GW-01</value>
    </Data>
    <Data name="Chiwog/LAP Name">
      <value>Chang Chiwog 1</value>
    </Data>
    <Data name="Chiwog/LAP Code">
      <value>TH-GW-01-CH-01</value>
    </Data>
    <Data name="EA Name">
      <value>EA Name</value>
    </Data>
    <Data name="EA Code">
      <value>EA-001</value>
    </Data>
  </ExtendedData>
  <Polygon>...</Polygon>
</Placemark>
```

---

## Field Structure

KML files include hierarchical information with Location indicators (R for Rural, U for Urban) and combined Name/Code fields:

### Dzongkhag KML Fields:
- `Dzongkhag Name`
- `Dzongkhag Code`

### Administrative Zone KML Fields:
- `Dzongkhag Name`
- `Dzongkhag Code`
- `Location` - "R" for Gewog (Rural), "U" for Thromde (Urban)
- `Gewog/Thromde Name`
- `Gewog/Thromde Code`

### Sub-Administrative Zone KML Fields:
- `Dzongkhag Name`
- `Dzongkhag Code`
- `Location` - "R" for Gewog (Rural), "U" for Thromde (Urban)
- `Gewog/Thromde Name`
- `Gewog/Thromde Code`
- `Chiwog/LAP Name`
- `Chiwog/LAP Code`

### Enumeration Area KML Fields:
- `Dzongkhag Name`
- `Dzongkhag Code`
- `Location` - "R" for Gewog (Rural), "U" for Thromde (Urban)
- `Gewog/Thromde Name`
- `Gewog/Thromde Code`
- `Chiwog/LAP Name`
- `Chiwog/LAP Code`
- `EA Name`
- `EA Code`

**Note:** The original `areaCode` field is removed and replaced with formatted hierarchical fields. Location values indicate Rural (R) or Urban (U) classification.

---

## Usage Examples

### Using cURL

```bash
# Download all Dzongkhags
curl -O -J "https://api.example.com/location/download/national/dzongkhags/kml"

# Download all Administrative Zones
curl -O -J "https://api.example.com/location/download/national/administrative-zones/kml"

# Download all Sub-Administrative Zones
curl -O -J "https://api.example.com/location/download/national/sub-administrative-zones/kml"

# Download all Enumeration Areas
curl -O -J "https://api.example.com/location/download/national/enumeration-areas/kml"
```

### Using JavaScript/TypeScript

```typescript
// Download Dzongkhags KML
const downloadDzongkhagsKml = async () => {
  const response = await fetch('/location/download/national/dzongkhags/kml');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'all_dzongkhags.kml';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Download Administrative Zones KML
const downloadAdministrativeZonesKml = async () => {
  const response = await fetch('/location/download/national/administrative-zones/kml');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'all_administrative_zones.kml';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Download Sub-Administrative Zones KML
const downloadSubAdministrativeZonesKml = async () => {
  const response = await fetch('/location/download/national/sub-administrative-zones/kml');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'all_sub_administrative_zones.kml';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Download Enumeration Areas KML
const downloadEnumerationAreasKml = async () => {
  const response = await fetch('/location/download/national/enumeration-areas/kml');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'all_enumeration_areas.kml';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

### Using HTML Download Links

```html
<!-- Download Dzongkhags -->
<a href="/location/download/national/dzongkhags/kml" download="all_dzongkhags.kml">
  Download All Dzongkhags (KML)
</a>

<!-- Download Administrative Zones -->
<a href="/location/download/national/administrative-zones/kml" download="all_administrative_zones.kml">
  Download All Administrative Zones (KML)
</a>

<!-- Download Sub-Administrative Zones -->
<a href="/location/download/national/sub-administrative-zones/kml" download="all_sub_administrative_zones.kml">
  Download All Sub-Administrative Zones (KML)
</a>

<!-- Download Enumeration Areas -->
<a href="/location/download/national/enumeration-areas/kml" download="all_enumeration_areas.kml">
  Download All Enumeration Areas (KML)
</a>
```

---

## KML Styling

All KML files include:
- **Blue borders** for polygon boundaries
- **Transparent fill** for polygon areas
- **Proper styling** for Google Earth visualization

The styling is automatically applied using the `addBlueBordersToKml` utility function.

---

## Response Headers

All endpoints return the following headers:

```
Content-Type: application/vnd.google-earth.kml+xml
Content-Disposition: attachment; filename="[filename].kml"
```

---

## Error Handling

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

## Use Cases

1. **Public Dashboard Integration**: Embed KML downloads in public-facing dashboards
2. **GIS Applications**: Import KML files into GIS software (QGIS, ArcGIS, etc.)
3. **Google Earth**: Open KML files directly in Google Earth for visualization
4. **Data Analysis**: Use KML files for spatial analysis in external tools
5. **Map Sharing**: Share location boundaries with stakeholders

---

## Performance Considerations

- **File Size**: KML files can be large depending on the number of features and geometry complexity
- **Caching**: Consider implementing client-side caching for frequently accessed files
- **CDN**: For production, consider serving these files through a CDN for better performance

---

## Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/location/download/national/dzongkhags/kml` | GET | Download all Dzongkhags as KML | No |
| `/location/download/national/administrative-zones/kml` | GET | Download all Administrative Zones as KML | No |
| `/location/download/national/sub-administrative-zones/kml` | GET | Download all Sub-Administrative Zones as KML | No |
| `/location/download/national/enumeration-areas/kml` | GET | Download all Enumeration Areas as KML | No |

**Key Benefits:**
- Public access for national dashboard integration
- Hierarchical information included (Dzongkhag → Gewog/Thromde → Chiwog/LAP → EA)
- Location indicators (R for Rural, U for Urban) for easy classification
- Combined Name/Code fields matching CSV format
- Ready-to-use KML format for GIS applications
- Automatic styling with blue borders
- No authentication required

---

## Notes

- Only **active** Enumeration Areas are included in the EA KML file
- The `areaCode` field is **removed** and replaced with formatted hierarchical fields
- **Location** field values: "R" = Rural (Gewog/Chiwog), "U" = Urban (Thromde/LAP)
- All KML files include full hierarchical information (parent Dzongkhag, Gewog/Thromde, etc.)
- All KML files use WGS84 (EPSG:4326) coordinate system
- Field structure matches the CSV download format for consistency

