# NSFD Backend - National Statistical Framework Database

A comprehensive NestJS backend application for managing Bhutan's administrative geographic boundaries and census data collection. This system provides a hierarchical geographic information system with PostGIS spatial capabilities, household listing management, and survey administration.

## 🏗️ Architecture Overview

The application implements a four-level geographic hierarchy:
1. **Dzongkhag** (Districts) - Top-level administrative division
2. **Administrative Zone** (Gewogs/Thromdes) - Second-level division
3. **Sub-Administrative Zone** (Chiwogs/Laps) - Third-level division
4. **Enumeration Area** (Census blocks) - Lowest-level division for data collection

## 🛠️ Technology Stack

### Core Framework
- **NestJS 9.0** - Progressive Node.js framework
- **TypeScript 4.7** - Type-safe development
- **Node.js** - JavaScript runtime

### Database & Spatial
- **PostgreSQL** - Primary database
- **PostGIS** - Spatial database extension
- **Sequelize 6.37** - ORM with sequelize-typescript decorators
- **SRID 4326 (WGS84)** - Geographic coordinate system

### Authentication & Security
- **JWT (JSON Web Tokens)** - Stateless authentication
- **Passport.js** - Authentication middleware
- **bcrypt** - Password hashing
- **Role-based Access Control** - Three user roles (ADMIN, SUPERVISOR, ENUMERATOR)

### Validation & File Processing
- **class-validator** - DTO validation
- **class-transformer** - Object transformation
- **@turf/turf** - GeoJSON validation and spatial analysis
- **multer** - File upload handling (50MB limit)

### Development Tools
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📋 Prerequisites

- Node.js 16+ and npm/yarn
- PostgreSQL 12+ with PostGIS extension
- Git

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd nsfd_backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Create PostgreSQL Database
```sql
CREATE DATABASE nsfd_db;
```

#### Enable PostGIS Extension
```sql
\c nsfd_db
CREATE EXTENSION postgis;
```

#### Verify PostGIS Installation
```sql
SELECT PostGIS_Version();
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
# Development Database
DB_HOST_DEVELOPMENT=localhost
DB_PORT_DEVELOPMENT=5432
DB_USER_DEVELOPMENT=postgres
DB_PASS_DEVELOPMENT=your_password
DB_NAME_DEVELOPMENT=nsfd_db
DB_DIALECT=postgres

# Test Database
DB_HOST_TEST=localhost
DB_PORT_TEST=5432
DB_USER_TEST=postgres
DB_PASS_TEST=your_password
DB_NAME_TEST=nsfd_test_db

# Production Database
DB_HOST_PRODUCION=your_production_host
DB_USER_PRODUCTION=your_production_user
DB_PASS_PRODUCTION=your_production_password
DB_NAME_PRODUCTION=nsfd_production_db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_min_32_characters
JWT_EXPIRATION=7d

# Application
NODE_ENV=development
PORT=3000
```

### 5. Start the Application

#### Development Mode (with hot reload)
```bash
npm run start:dev
```

#### Production Mode
```bash
npm run build
npm run start:prod
```

#### Debug Mode
```bash
npm run start:debug
```

The API will be available at `http://localhost:3000`

## 👥 User Roles & Permissions

### Role Hierarchy
1. **ADMIN** - Full system access, user management, survey creation
2. **SUPERVISOR** - Geographic data management, household listing approval
3. **ENUMERATOR** - Data collection, household listing creation

### Default User Setup
After first deployment, create an admin user manually in the database or use the auth registration endpoint (then update role in database).

## 📡 API Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response:
{
  "access_token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "ADMIN"
  }
}
```

**Note**: All endpoints below (except public routes) require JWT authentication via `Authorization: Bearer <token>` header.

---

### Dzongkhag (Districts)

#### Get All Dzongkhags (Public)
```http
GET /dzongkhag/all
```
*No authentication required - for dropdown selection*

#### Create Dzongkhag
```http
POST /dzongkhag
Authorization: Bearer <token>
Content-Type: application/json
Roles: ADMIN, SUPERVISOR

{
  "areaCode": "string",
  "name": "string",
  "areaSqKm": number,
  "geom": {
    "type": "MultiPolygon",
    "coordinates": [[[[lng, lat], ...]]]
  }
}
```

#### Get Single Dzongkhag
```http
GET /dzongkhag/:id
Authorization: Bearer <token>
```

#### Update Dzongkhag
```http
PATCH /dzongkhag/:id
Authorization: Bearer <token>
Roles: ADMIN, SUPERVISOR

{
  "name": "string",
  "areaSqKm": number
}
```

#### Delete Dzongkhag
```http
DELETE /dzongkhag/:id
Authorization: Bearer <token>
Roles: ADMIN
```

#### Upload Geometry File
```http
POST /dzongkhag/upload-geojson/:dzongkhagId
Authorization: Bearer <token>
Content-Type: multipart/form-data
Roles: ADMIN, SUPERVISOR

Body (form-data):
- file: <geojson_file> (Feature/FeatureCollection/Geometry)
```
*Updates the geometry of existing dzongkhag*

#### Export All as GeoJSON
```http
GET /dzongkhag/geojson/all
Authorization: Bearer <token>

Response: FeatureCollection with all dzongkhags
```

---

### Administrative Zone (Gewogs/Thromdes)

#### Get Administrative Zones by Dzongkhag
```http
GET /administrative-zone?dzongkhagId=<id>
Authorization: Bearer <token>
```

#### Create Administrative Zone
```http
POST /administrative-zone
Authorization: Bearer <token>
Roles: ADMIN, SUPERVISOR

{
  "dzongkhagId": number,
  "areaCode": "string",
  "name": "string",
  "areaSqKm": number,
  "geom": {
    "type": "MultiPolygon",
    "coordinates": [[[[lng, lat], ...]]]
  }
}
```

#### Update Administrative Zone
```http
PATCH /administrative-zone/:id
Authorization: Bearer <token>
Roles: ADMIN, SUPERVISOR
```

#### Delete Administrative Zone
```http
DELETE /administrative-zone/:id
Authorization: Bearer <token>
Roles: ADMIN
```

#### Export All as GeoJSON
```http
GET /administrative-zone/geojson/all
Authorization: Bearer <token>
```

#### Export by Dzongkhag as GeoJSON
```http
GET /administrative-zone/geojson/by-dzongkhag/:dzongkhagId
Authorization: Bearer <token>
```

---

### Sub-Administrative Zone (Chiwogs/Laps)

#### Get Sub-Administrative Zones by Admin Zone
```http
GET /sub-administrative-zone?administrativeZoneId=<id>
Authorization: Bearer <token>
```

#### Create Sub-Administrative Zone
```http
POST /sub-administrative-zone
Authorization: Bearer <token>
Roles: ADMIN, SUPERVISOR

{
  "administrativeZoneId": number,
  "areaCode": "string",
  "name": "string",
  "areaSqKm": number,
  "geom": {
    "type": "MultiPolygon",
    "coordinates": [[[[lng, lat], ...]]]
  }
}
```

#### Upload Geometry File
```http
POST /sub-administrative-zone/upload-geojson/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
Roles: ADMIN, SUPERVISOR

Body (form-data):
- file: <geojson_file>
```

#### Export All as GeoJSON
```http
GET /sub-administrative-zone/geojson/all
Authorization: Bearer <token>
```

#### Export by Administrative Zone as GeoJSON
```http
GET /sub-administrative-zone/geojson/by-administrative-zone/:administrativeZoneId
Authorization: Bearer <token>
```

---

### Enumeration Area (Census Blocks)

#### Get Enumeration Areas by Sub-Administrative Zone
```http
GET /enumeration-area?subAdministrativeZoneId=<id>
Authorization: Bearer <token>
```

#### Create Enumeration Area
```http
POST /enumeration-area
Authorization: Bearer <token>
Roles: ADMIN, SUPERVISOR

{
  "subAdministrativeZoneId": number,
  "areaCode": "string",
  "name": "string",
  "description": "string",
  "areaSqKm": number,
  "geom": {
    "type": "MultiPolygon",
    "coordinates": [[[[lng, lat], ...]]]
  }
}
```

#### Bulk Upload from GeoJSON FeatureCollection
```http
POST /enumeration-area/bulk-upload-geojson
Authorization: Bearer <token>
Content-Type: multipart/form-data
Roles: ADMIN, SUPERVISOR

Body (form-data):
- file: <geojson_feature_collection>

Feature Properties Required:
- subAdministrativeZoneId: number
- areaCode: string
- name: string
- description: string
- areaSqKm: number

Response:
{
  "success": number,
  "skipped": number,
  "created": [{ id, name, areaCode }],
  "skippedItems": [{ areaCode, reason }],
  "errors": [{ areaCode, error }]
}
```
*Automatically detects duplicates using composite key (areaCode + subAdministrativeZoneId)*

#### Upload Geometry File
```http
POST /enumeration-area/upload-geojson/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
Roles: ADMIN, SUPERVISOR

Body (form-data):
- file: <geojson_file>
```

#### Export All as GeoJSON
```http
GET /enumeration-area/geojson/all
Authorization: Bearer <token>
```

#### Export by Sub-Administrative Zone as GeoJSON
```http
GET /enumeration-area/geojson/by-sub-administrative-zone/:subAdministrativeZoneId
Authorization: Bearer <token>
```

---

### Current Household Listing

#### Get Household Listings by EA
```http
GET /current-household-listing?eaId=<id>
Authorization: Bearer <token>
```

#### Create Household Listing
```http
POST /current-household-listing
Authorization: Bearer <token>
Roles: ADMIN, SUPERVISOR, ENUMERATOR

{
  "eaId": number,
  "structureNumber": "string",
  "householdIdentification": "string",
  "householdSerialNumber": "string",
  "nameOfHOH": "string",
  "totalMale": number,
  "totalFemale": number,
  "phoneNumber": "string (optional)",
  "remarks": "string (optional)"
}
```

#### Get Single Household Listing
```http
GET /current-household-listing/:id
Authorization: Bearer <token>
```

#### Update Household Listing
```http
PATCH /current-household-listing/:id
Authorization: Bearer <token>
Roles: ADMIN, SUPERVISOR, ENUMERATOR

{
  "nameOfHOH": "string",
  "totalMale": number,
  "totalFemale": number,
  "phoneNumber": "string",
  "remarks": "string"
}
```

#### Delete Household Listing
```http
DELETE /current-household-listing/:id
Authorization: Bearer <token>
Roles: ADMIN, SUPERVISOR
```

---

### Survey Management

#### Get All Surveys
```http
GET /survey
Authorization: Bearer <token>
```

#### Create Survey
```http
POST /survey
Authorization: Bearer <token>
Roles: ADMIN

{
  "name": "string",
  "description": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "status": "ACTIVE" | "ENDED",
  "isSubmitted": boolean,
  "isVerified": boolean
}
```

#### Get Single Survey
```http
GET /survey/:id
Authorization: Bearer <token>
```

#### Update Survey
```http
PATCH /survey/:id
Authorization: Bearer <token>
Roles: ADMIN

{
  "name": "string",
  "description": "string",
  "status": "ACTIVE" | "ENDED"
}
```

#### Delete Survey
```http
DELETE /survey/:id
Authorization: Bearer <token>
Roles: ADMIN
```

#### Assign Enumeration Areas to Survey (Bulk)
```http
POST /survey/:surveyId/enumeration-areas
Authorization: Bearer <token>
Roles: ADMIN

{
  "enumerationAreaIds": [1, 2, 3, 4]
}
```

#### Remove Enumeration Areas from Survey (Bulk)
```http
DELETE /survey/:surveyId/enumeration-areas
Authorization: Bearer <token>
Roles: ADMIN

{
  "enumerationAreaIds": [1, 2, 3]
}
```

#### Get Survey with Assigned Enumeration Areas
```http
GET /survey/:id
Authorization: Bearer <token>

Response includes enumerationAreas array with associated EAs
```

---

## 📐 Database Schema

### Geographic Hierarchy Tables

#### dzongkhags
```sql
- id: INTEGER PRIMARY KEY
- areaCode: VARCHAR UNIQUE NOT NULL
- name: VARCHAR NOT NULL
- areaSqKm: DECIMAL
- geom: GEOMETRY(MULTIPOLYGON, 4326)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### administrative_zones
```sql
- id: INTEGER PRIMARY KEY
- dzongkhagId: INTEGER FOREIGN KEY → dzongkhags(id)
- areaCode: VARCHAR UNIQUE NOT NULL
- name: VARCHAR NOT NULL
- areaSqKm: DECIMAL
- geom: GEOMETRY(MULTIPOLYGON, 4326)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### sub_administrative_zones
```sql
- id: INTEGER PRIMARY KEY
- administrativeZoneId: INTEGER FOREIGN KEY → administrative_zones(id)
- areaCode: VARCHAR UNIQUE NOT NULL
- name: VARCHAR NOT NULL
- areaSqKm: DECIMAL
- geom: GEOMETRY(MULTIPOLYGON, 4326)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### enumeration_areas
```sql
- id: INTEGER PRIMARY KEY
- subAdministrativeZoneId: INTEGER FOREIGN KEY → sub_administrative_zones(id)
- areaCode: VARCHAR NOT NULL
- name: VARCHAR NOT NULL
- description: TEXT
- areaSqKm: DECIMAL
- geom: GEOMETRY(MULTIPOLYGON, 4326)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
- UNIQUE(areaCode, subAdministrativeZoneId)
```

### Data Collection Tables

#### current_household_listings
```sql
- id: INTEGER PRIMARY KEY
- eaId: INTEGER FOREIGN KEY → enumeration_areas(id)
- structureNumber: VARCHAR NOT NULL
- householdIdentification: VARCHAR NOT NULL
- householdSerialNumber: VARCHAR NOT NULL
- nameOfHOH: VARCHAR NOT NULL
- totalMale: INTEGER
- totalFemale: INTEGER
- phoneNumber: VARCHAR
- remarks: TEXT
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### surveys
```sql
- id: INTEGER PRIMARY KEY
- name: VARCHAR NOT NULL
- description: TEXT
- startDate: DATE NOT NULL
- endDate: DATE NOT NULL
- status: ENUM('ACTIVE', 'ENDED') DEFAULT 'ACTIVE'
- isSubmitted: BOOLEAN DEFAULT false
- isVerified: BOOLEAN DEFAULT false
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

#### survey_enumeration_areas (Junction Table)
```sql
- surveyId: INTEGER FOREIGN KEY → surveys(id)
- enumerationAreaId: INTEGER FOREIGN KEY → enumeration_areas(id)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
- PRIMARY KEY(surveyId, enumerationAreaId)
```

#### users
```sql
- id: INTEGER PRIMARY KEY
- username: VARCHAR UNIQUE NOT NULL
- email: VARCHAR UNIQUE NOT NULL
- password: VARCHAR NOT NULL (bcrypt hashed)
- role: ENUM('ADMIN', 'SUPERVISOR', 'ENUMERATOR') DEFAULT 'ENUMERATOR'
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

---

## 🗺️ GeoJSON Format

### Supported GeoJSON Types
The system accepts three GeoJSON formats for geometry uploads:

#### 1. Feature
```json
{
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [[[[lng, lat], ...]]]
  }
}
```

#### 2. FeatureCollection (for bulk upload)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "subAdministrativeZoneId": 1,
        "areaCode": "EA001",
        "name": "EA Name",
        "description": "Description",
        "areaSqKm": 5.5
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [[[[lng, lat], ...]]]
      }
    }
  ]
}
```

#### 3. Geometry
```json
{
  "type": "MultiPolygon",
  "coordinates": [[[[lng, lat], ...]]]
}
```

### Coordinate System
- **SRID**: 4326 (WGS84)
- **Format**: [longitude, latitude] (not latitude, longitude)
- **Geometry Type**: MULTIPOLYGON for all administrative boundaries

---

## 🔐 Security Features

### Authentication
- JWT tokens with 7-day expiration
- bcrypt password hashing with salt rounds
- Stateless authentication mechanism

### Authorization
- Role-based access control (RBAC)
- Guard decorators: `@UseGuards(JwtAuthGuard, RolesGuard)`
- Role decorator: `@Roles('ADMIN', 'SUPERVISOR')`

### File Upload Security
- File size limit: 50MB
- File type validation: .json, .geojson
- GeoJSON structure validation using Turf.js
- Custom validator: `@IsValidWGS84GeoJSON()`

### Public Routes
- Minimal public endpoints for dropdown data
- `GET /dzongkhag/all` - only endpoint without authentication requirement

---

## 🧪 Testing

### Run Unit Tests
```bash
npm run test
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run Tests with Coverage
```bash
npm run test:cov
```

---

## 📚 Additional Documentation

### Frontend Integration Guides
- **[ANGULAR_CURRENT_HOUSEHOLD_LISTING.md](./ANGULAR_CURRENT_HOUSEHOLD_LISTING.md)** - Angular service and component implementation for household listing module
- **[ANGULAR_SURVEY.md](./ANGULAR_SURVEY.md)** - Angular service and component implementation for survey management
- **[ANGULAR_HIERARCHICAL_DROPDOWN.md](./ANGULAR_HIERARCHICAL_DROPDOWN.md)** - Complete implementation guide for cascading geographic selection dropdowns

---

## 🚦 API Response Formats

### Success Response
```json
{
  "id": 1,
  "name": "Resource Name",
  "...": "other fields"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": ["Error message 1", "Error message 2"],
  "error": "Bad Request"
}
```

### Bulk Upload Response
```json
{
  "success": 5,
  "skipped": 2,
  "created": [
    { "id": 1, "name": "EA1", "areaCode": "EA001" }
  ],
  "skippedItems": [
    { "areaCode": "EA002", "reason": "Duplicate entry" }
  ],
  "errors": [
    { "areaCode": "EA003", "error": "Invalid geometry" }
  ]
}
```

---

## 🔄 Development Workflow

### Project Structure
```
nsfd_backend/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── constants/                 # Application constants
│   ├── database/                  # Database configuration
│   │   ├── database.config.ts
│   │   ├── database.module.ts
│   │   └── database.provider.ts
│   ├── validators/                # Custom validators
│   │   └── geojson.validator.ts
│   └── modules/                   # Feature modules
│       ├── auth/                  # Authentication
│       ├── dzongkhag/
│       ├── administrative-zone/
│       ├── sub-administrative-zone/
│       ├── enumeration-area/
│       ├── household-listings/
│       │   └── current-household-listing/
│       └── survey/
│           └── survey/
├── test/                          # E2E tests
├── package.json
├── tsconfig.json
└── README.md
```

### Module Structure (Example)
```
module-name/
├── module-name.module.ts          # Module definition
├── module-name.controller.ts      # HTTP endpoints
├── module-name.service.ts         # Business logic
├── module-name.provider.ts        # Repository provider
├── dto/                           # Data Transfer Objects
│   ├── create-module.dto.ts
│   └── update-module.dto.ts
└── entities/                      # Database models
    └── module-name.entity.ts
```

### Adding a New Module

1. Generate module scaffolding:
```bash
nest generate module modules/your-module
nest generate controller modules/your-module
nest generate service modules/your-module
```

2. Create entity, DTOs, and provider
3. Register in `app.module.ts`
4. Add authentication and authorization guards
5. Update this README with new endpoints

---

## 🐛 Common Issues & Solutions

### PostGIS Extension Error
**Problem**: `ERROR: type "geometry" does not exist`

**Solution**: 
```sql
\c nsfd_db
CREATE EXTENSION postgis;
```

### JWT Authentication Error
**Problem**: `Unauthorized` responses

**Solution**: 
- Verify JWT_SECRET in .env matches between registration and login
- Check token format: `Authorization: Bearer <token>`
- Ensure token hasn't expired (7-day expiry)

### File Upload Error
**Problem**: `Payload Too Large`

**Solution**: 
- Check file size (max 50MB)
- Verify body-parser configuration in main.ts
- Ensure multer configuration in controller

### GeoJSON Validation Error
**Problem**: `Invalid GeoJSON format`

**Solution**:
- Verify coordinate format: [longitude, latitude]
- Check geometry type: Must be MultiPolygon
- Validate JSON structure using online validators
- Ensure SRID 4326 compatibility

### Database Connection Error
**Problem**: `Connection refused`

**Solution**:
- Verify PostgreSQL service is running
- Check .env database credentials
- Confirm database exists and PostGIS is installed
- Test connection: `psql -h localhost -U postgres -d nsfd_db`

---

## 📈 Performance Considerations

### Database Indexing
- Composite unique indexes on geographic hierarchy foreign keys
- Spatial indexes on geometry columns (automatic with PostGIS)
- Index on user credentials for authentication

### File Upload Optimization
- Stream processing for large GeoJSON files
- Bulk insert for FeatureCollection processing
- Transaction rollback on validation errors

### Query Optimization
- Lazy loading relationships by default
- Eager loading with `include` when needed
- Pagination for large result sets (implement as needed)

---

## 🔮 Future Enhancements

### Planned Features
- [ ] API versioning (v1, v2)
- [ ] Swagger/OpenAPI documentation generation
- [ ] Rate limiting for public endpoints
- [ ] Caching layer for GeoJSON exports (Redis)
- [ ] WebSocket support for real-time updates
- [ ] Audit logging for all data modifications
- [ ] Data export in multiple formats (Shapefile, KML, CSV)
- [ ] Advanced spatial queries (intersection, buffer, etc.)
- [ ] Dashboard analytics endpoints
- [ ] Bulk household listing import from Excel

### Architecture Improvements
- [ ] Separate public/private controllers
- [ ] Implement @Public() decorator pattern
- [ ] Add response transformation interceptors
- [ ] Implement request/response logging middleware
- [ ] Add database query logging in development
- [ ] Implement database migrations with Sequelize CLI
- [ ] Add comprehensive API integration tests

---

## 📞 Support & Contact

For issues, questions, or contributions, please contact the development team at National Statistics Bureau.

---

## 📄 License

UNLICENSED - Internal use only for National Statistics Bureau, Bhutan.

---

## 🏷️ Version History

### v0.0.1 (Current)
- Initial release
- Four-level geographic hierarchy implementation
- JWT authentication and RBAC
- GeoJSON upload/export capabilities
- Current household listing module
- Survey management with EA assignment
- Bulk enumeration area upload
- Hierarchical dropdown query support

---

**Built with ❤️ for National Statistics Bureau, Bhutan**
