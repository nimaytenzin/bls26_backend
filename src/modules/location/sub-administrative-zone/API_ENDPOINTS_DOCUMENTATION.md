# API Endpoints Documentation

This document provides detailed information about key API endpoints for Sub-Administrative Zone (SAZ) creation, Enumeration Area bulk upload, and authentication.

## Table of Contents

1. [GeoJSON Creation Endpoint for SAZ](#1-geojson-creation-endpoint-for-saz)
2. [Bulk Upload Enumeration Area Endpoint](#2-bulk-upload-enumeration-area-endpoint)
3. [Login Endpoint](#3-login-endpoint)

---

## 1. GeoJSON Creation Endpoint for SAZ

### Overview
Creates a single Sub-Administrative Zone from a GeoJSON Feature object. This endpoint accepts GeoJSON format with geometry and properties.

### Endpoint Details

**URL:** `POST /sub-administrative-zone/geojson`

**Method:** `POST`

**Content-Type:** `application/json`

**Authentication:**
- **Required:** Yes
- **Type:** JWT Bearer Token
- **Role:** Admin only
- **Header:** `Authorization: Bearer <token>`

### Request Format

The request body must be a valid GeoJSON Feature object with the following structure:

```json
{
  "type": "Feature",
  "properties": {
    "administrativeZoneId": 1,
    "name": "SAZ Name",
    "areaCode": "SAZ001",
    "areaSqKm": 10.5,
    "type": "chiwog"
  },
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [
      [
        [
          [100.0, 0.0],
          [101.0, 0.0],
          [101.0, 1.0],
          [100.0, 1.0],
          [100.0, 0.0]
        ]
      ]
    ]
  }
}
```

### Request Parameters

#### Root Level
- `type` (string, required): Must be `"Feature"`

#### Properties Object
- `administrativeZoneId` (number, required): ID of the parent Administrative Zone
- `name` (string, required): Name of the Sub-Administrative Zone
- `areaCode` (string, required): Unique area code for the SAZ
- `areaSqKm` (number, required): Area in square kilometers
- `type` (string, required): Type of SAZ - must be either `"chiwog"` or `"lap"`

#### Geometry Object
- `type` (string, required): Geometry type - typically `"MultiPolygon"` for area boundaries
- `coordinates` (array, required): Coordinate array following GeoJSON specification
  - For MultiPolygon: `[[[[lon, lat], ...]]]`
  - Coordinates must be in WGS84 (EPSG:4326)

### Response Format

#### Success Response (200 OK)

Returns the created Sub-Administrative Zone entity:

```json
{
  "id": 123,
  "administrativeZoneId": 1,
  "name": "SAZ Name",
  "type": "chiwog",
  "areaCode": "SAZ001",
  "areaSqKm": 10.5,
  "geom": "0106000020E6100000010000000103000000010000000500000000000000000059400000000000000000000000000000F059400000000000000000000000000000F05940000000000000F03F0000000000005940000000000000F03F00000000000059400000000000000000",
  "administrativeZone": {
    "id": 1,
    "name": "Administrative Zone Name",
    "type": "Gewog",
    "dzongkhagId": 1,
    "areaCode": "AZ001",
    "areaSqKm": 50.0
  }
}
```

#### Response Fields
- `id` (number): Auto-generated unique identifier for the created SAZ
- `administrativeZoneId` (number): Parent Administrative Zone ID
- `name` (string): SAZ name
- `type` (string): Type of SAZ (`"chiwog"` or `"lap"`)
- `areaCode` (string): Area code
- `areaSqKm` (number): Area in square kilometers
- `geom` (string): PostGIS geometry representation (WKB format)
- `administrativeZone` (object): Associated Administrative Zone details

### Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "properties.administrativeZoneId must be a number",
    "properties.name should not be empty",
    "properties.type must be one of the following values: chiwog, lap"
  ],
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### Example cURL Request

```bash
curl -X POST http://localhost:3000/sub-administrative-zone/geojson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "type": "Feature",
    "properties": {
      "administrativeZoneId": 1,
      "name": "Thimphu Chiwog 1",
      "areaCode": "THM-CHW-001",
      "areaSqKm": 5.2,
      "type": "chiwog"
    },
    "geometry": {
      "type": "MultiPolygon",
      "coordinates": [
        [
          [
            [89.641, 27.472],
            [89.642, 27.472],
            [89.642, 27.473],
            [89.641, 27.473],
            [89.641, 27.472]
          ]
        ]
      ]
    }
  }'
```

### Example JavaScript/TypeScript Request

```typescript
const createSAZFromGeoJson = async (geoJsonData: any, token: string) => {
  const response = await fetch('http://localhost:3000/sub-administrative-zone/geojson', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(geoJsonData)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

// Usage
const geoJsonFeature = {
  type: "Feature",
  properties: {
    administrativeZoneId: 1,
    name: "Thimphu Chiwog 1",
    areaCode: "THM-CHW-001",
    areaSqKm: 5.2,
    type: "chiwog"
  },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [89.641, 27.472],
          [89.642, 27.472],
          [89.642, 27.473],
          [89.641, 27.473],
          [89.641, 27.472]
        ]
      ]
    ]
  }
};

const result = await createSAZFromGeoJson(geoJsonFeature, 'your-jwt-token');
console.log('Created SAZ ID:', result.id);
```

### Notes
- The `id` field is automatically generated by the database and returned in the response
- Geometry is stored in PostGIS format (WKB) but can be retrieved as GeoJSON using the GeoJSON endpoints
- Duplicate `areaCode` values within the same `administrativeZoneId` are not allowed
- The geometry must be valid according to GeoJSON and PostGIS specifications

---

## 2. Bulk Upload Enumeration Area Endpoint

### Overview
Bulk uploads multiple Enumeration Areas from a GeoJSON FeatureCollection file. This endpoint processes all features in the file and creates Enumeration Areas, skipping duplicates and reporting errors.

### Endpoint Details

**URL:** `POST /enumeration-area/bulk-upload-geojson`

**Method:** `POST`

**Content-Type:** `multipart/form-data`

**Authentication:**
- **Required:** Yes
- **Type:** JWT Bearer Token
- **Role:** Admin only
- **Header:** `Authorization: Bearer <token>`

### Request Format

The request must be sent as `multipart/form-data` with a file field named `file`.

#### Form Data
- `file` (file, required): GeoJSON FeatureCollection file
  - **Accepted file types:** `.json`, `.geojson`
  - **Accepted MIME types:** `application/json`, `application/geo+json`
  - **Maximum file size:** 50MB

### GeoJSON File Format

The uploaded file must be a valid GeoJSON FeatureCollection:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "subAdministrativeZoneId": 123,
        "name": "Enumeration Area 1",
        "areaCode": "EA001",
        "description": "Description of EA 1",
        "areaSqKm": 2.5
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [89.641, 27.472],
              [89.642, 27.472],
              [89.642, 27.473],
              [89.641, 27.473],
              [89.641, 27.472]
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "subAdministrativeZoneId": 123,
        "name": "Enumeration Area 2",
        "areaCode": "EA002",
        "description": "Description of EA 2",
        "areaSqKm": 3.1
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [89.643, 27.472],
              [89.644, 27.472],
              [89.644, 27.473],
              [89.643, 27.473],
              [89.643, 27.472]
            ]
          ]
        ]
      }
    }
  ]
}
```

### Feature Properties (Required)
- `subAdministrativeZoneId` (number, required): ID of the parent Sub-Administrative Zone
- `name` (string, required): Name of the Enumeration Area
- `areaCode` (string, required): Unique area code for the EA
- `description` (string, optional): Description of the EA (defaults to empty string if not provided)
- `areaSqKm` (number, optional): Area in square kilometers (defaults to 0 if not provided)

### Response Format

#### Success Response (200 OK)

Returns a summary object with created, skipped, and error items:

```json
{
  "success": 5,
  "skipped": 2,
  "created": [
    {
      "id": 456,
      "subAdministrativeZoneId": 123,
      "name": "Enumeration Area 1",
      "description": "Description of EA 1",
      "areaCode": "EA001",
      "areaSqKm": 2.5,
      "geom": "...",
      "subAdministrativeZone": {
        "id": 123,
        "name": "SAZ Name",
        "administrativeZoneId": 1
      }
    },
    {
      "id": 457,
      "subAdministrativeZoneId": 123,
      "name": "Enumeration Area 2",
      "description": "Description of EA 2",
      "areaCode": "EA002",
      "areaSqKm": 3.1,
      "geom": "...",
      "subAdministrativeZone": {
        "id": 123,
        "name": "SAZ Name",
        "administrativeZoneId": 1
      }
    }
  ],
  "skippedItems": [
    {
      "areaCode": "EA003",
      "subAdministrativeZoneId": 123,
      "reason": "Enumeration Area already exists"
    },
    {
      "areaCode": "EA004",
      "subAdministrativeZoneId": 123,
      "reason": "Enumeration Area already exists"
    }
  ],
  "errors": [
    {
      "feature": {
        "type": "Feature",
        "properties": {
          "name": "Invalid EA",
          "areaCode": "EA005"
        },
        "geometry": { ... }
      },
      "error": "Missing required properties: subAdministrativeZoneId, name, or areaCode"
    }
  ]
}
```

#### Response Fields
- `success` (number): Number of successfully created Enumeration Areas
- `skipped` (number): Number of items skipped (duplicates)
- `created` (array): Array of created Enumeration Area objects, each containing:
  - `id` (number): Auto-generated unique identifier
  - `subAdministrativeZoneId` (number): Parent SAZ ID
  - `name` (string): EA name
  - `description` (string): EA description
  - `areaCode` (string): Area code
  - `areaSqKm` (number): Area in square kilometers
  - `geom` (string): PostGIS geometry representation
  - `subAdministrativeZone` (object): Associated SAZ details
- `skippedItems` (array): Array of skipped items with reason
- `errors` (array): Array of error objects with feature and error message

### Error Responses

#### 400 Bad Request - No File
```json
{
  "statusCode": 400,
  "message": "No file uploaded",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Invalid File Type
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only .json or .geojson files are allowed.",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Invalid GeoJSON Format
```json
{
  "statusCode": 400,
  "message": "Invalid GeoJSON format. Must be a FeatureCollection.",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Empty FeatureCollection
```json
{
  "statusCode": 400,
  "message": "FeatureCollection contains no features.",
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### Example cURL Request

```bash
curl -X POST http://localhost:3000/enumeration-area/bulk-upload-geojson \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@enumeration_areas.geojson"
```

### Example JavaScript/TypeScript Request

```typescript
const bulkUploadEnumerationAreas = async (file: File, token: string) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/enumeration-area/bulk-upload-geojson', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Note: Don't set Content-Type header, browser will set it with boundary
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`HTTP error! status: ${response.status}, message: ${error.message}`);
  }

  const data = await response.json();
  return data;
};

// Usage
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = fileInput.files[0];

if (file) {
  const result = await bulkUploadEnumerationAreas(file, 'your-jwt-token');
  console.log(`Successfully created ${result.success} EAs`);
  console.log(`Skipped ${result.skipped} duplicates`);
  console.log(`Errors: ${result.errors.length}`);
  
  // Access created EA IDs
  result.created.forEach(ea => {
    console.log(`Created EA ID: ${ea.id}, Name: ${ea.name}`);
  });
}
```

### Example Python Request

```python
import requests

def bulk_upload_enumeration_areas(file_path: str, token: str):
    url = "http://localhost:3000/enumeration-area/bulk-upload-geojson"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(url, headers=headers, files=files)
    
    response.raise_for_status()
    return response.json()

# Usage
result = bulk_upload_enumeration_areas('enumeration_areas.geojson', 'your-jwt-token')
print(f"Successfully created {result['success']} EAs")
print(f"Skipped {result['skipped']} duplicates")
```

### Processing Behavior

1. **Validation:** Each feature is validated for required properties
2. **Duplicate Check:** Checks if EA already exists by `areaCode` + `subAdministrativeZoneId` combination
3. **Creation:** Valid, non-duplicate features are created
4. **Error Handling:** Invalid features are collected in the `errors` array
5. **Skipping:** Duplicate EAs are collected in the `skippedItems` array

### Notes
- The `id` field for each created EA is automatically generated and returned in the `created` array
- Duplicate detection is based on the combination of `areaCode` and `subAdministrativeZoneId`
- The endpoint processes features sequentially and continues even if some fail
- Maximum file size is 50MB
- Geometry must be valid according to GeoJSON and PostGIS specifications
- Empty `description` defaults to empty string
- Empty `areaSqKm` defaults to 0

---

## 3. Login Endpoint

### Overview
Authenticates a user and returns a JWT token for accessing protected endpoints. This is a public endpoint that does not require authentication.

### Endpoint Details

**URL:** `POST /auth/login`

**Method:** `POST`

**Content-Type:** `application/json`

**Authentication:**
- **Required:** No (Public endpoint)

### Request Format

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Request Parameters

- `email` (string, required): User's email address
- `password` (string, required): User's password

### Response Format

#### Success Response (200 OK)

```json
{
  "user": {
    "id": 1,
    "cid": "12345678901",
    "emailAddress": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImNpZCI6IjEyMzQ1Njc4OTAxIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjE3MDQxNTM2MDB9.signature"
}
```

#### Response Fields
- `user` (object): User object without password field
  - `id` (number): User ID
  - `cid` (string): Citizen ID
  - `emailAddress` (string): Email address
  - `firstName` (string): First name
  - `lastName` (string): Last name
  - `role` (string): User role (`ADMIN`, `SUPERVISOR`, `ENUMERATOR`)
  - `isActive` (boolean): Whether the user account is active
  - `createdAt` (string): Account creation timestamp (ISO 8601)
  - `updatedAt` (string): Last update timestamp (ISO 8601)
- `token` (string): JWT token for authentication (use in `Authorization: Bearer <token>` header)

### Error Responses

#### 401 Unauthorized - Invalid Credentials
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

#### 400 Bad Request - Validation Error
```json
{
  "statusCode": 400,
  "message": [
    "email should not be empty",
    "email must be a string",
    "password should not be empty",
    "password must be a string"
  ],
  "error": "Bad Request"
}
```

### Example cURL Request

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securePassword123"
  }'
```

### Example JavaScript/TypeScript Request

```typescript
const login = async (email: string, password: string) => {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Login failed: ${error.message}`);
  }

  const data = await response.json();
  return data;
};

// Usage
try {
  const { user, token } = await login('admin@example.com', 'securePassword123');
  console.log('Logged in as:', user.emailAddress);
  console.log('Role:', user.role);
  console.log('Token:', token);
  
  // Store token for subsequent requests
  localStorage.setItem('authToken', token);
} catch (error) {
  console.error('Login error:', error.message);
}
```

### Example Python Request

```python
import requests

def login(email: str, password: str):
    url = "http://localhost:3000/auth/login"
    
    payload = {
        "email": email,
        "password": password
    }
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()

# Usage
try:
    result = login("admin@example.com", "securePassword123")
    user = result["user"]
    token = result["token"]
    
    print(f"Logged in as: {user['emailAddress']}")
    print(f"Role: {user['role']}")
    print(f"Token: {token}")
    
    # Store token for subsequent requests
    # Use in headers: {"Authorization": f"Bearer {token}"}
except requests.exceptions.HTTPError as e:
    print(f"Login failed: {e}")
```

### Using the Token

After successful login, use the token in subsequent API requests:

```typescript
// Example: Using token for authenticated request
const getProtectedData = async (token: string) => {
  const response = await fetch('http://localhost:3000/sub-administrative-zone', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
};
```

### Token Details

- **Token Type:** JWT (JSON Web Token)
- **Token Format:** `Bearer <token>` in Authorization header
- **Token Expiration:** Typically 24 hours (check JWT payload for `exp` claim)
- **Token Storage:** Store securely (e.g., httpOnly cookie, secure localStorage, or memory)

### Security Notes

1. **Never expose tokens** in client-side code that can be accessed by others
2. **Use HTTPS** in production to protect tokens in transit
3. **Implement token refresh** mechanism for long-lived sessions
4. **Handle token expiration** gracefully by redirecting to login
5. **Never log tokens** in production environments

### Notes
- This is a public endpoint - no authentication required
- Password is validated using bcrypt comparison
- Invalid credentials return 401 Unauthorized
- The password field is never included in the response
- Token should be included in the `Authorization` header for all protected endpoints
- Token expiration time depends on server configuration (typically 24 hours)

---

## Additional Resources

### Base URL
- **Development:** `http://localhost:3000`
- **Production:** `https://api.nsfd.gov.bt/v1` (example)

### Common Headers
```http
Content-Type: application/json
Authorization: Bearer <token>
```

### Error Handling Best Practices

1. Always check response status before processing
2. Handle 401 errors by redirecting to login
3. Handle 403 errors by showing appropriate message
4. Validate request data before sending
5. Implement retry logic for network errors

### Testing Endpoints

You can test these endpoints using:
- **cURL** (command line)
- **Postman** (GUI tool)
- **Insomnia** (GUI tool)
- **HTTPie** (command line)
- **Browser DevTools** (for GET requests)
- **Custom scripts** (JavaScript, Python, etc.)

---

## Support

For issues or questions:
1. Check the error message in the response
2. Verify authentication token is valid
3. Ensure required fields are provided
4. Check file format and size for uploads
5. Contact the development team for assistance

