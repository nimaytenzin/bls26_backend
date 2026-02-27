# Livability Backend — Module Documentation

Base URL for all routes: `/` (e.g. `POST /auth/login`).

---

## 1. Auth Module

**Prefix:** `/auth`  
**Purpose:** Authentication (login by CID + password), user management, and admin-only operations for creating/updating users (admin and enumerator), resetting passwords, and bulk enumerator upload.

### Entity: User

| Field        | Type    | Description                    |
|-------------|---------|--------------------------------|
| id          | number  | Primary key                    |
| name        | string  | Full name                      |
| cid         | string  | Unique Citizen ID              |
| phoneNumber | string? | Phone                          |
| password    | string  | Hashed (never returned in API) |
| role        | enum    | `ADMIN` \| `ENUMERATOR`        |
| isActive    | boolean | Account active flag            |

### Public routes (no auth)

| Method | Route           | Description |
|--------|-----------------|-------------|
| POST   | /auth/register  | Register; body: `{ name, cid, phoneNumber?, password, role? }`. Returns `{ user, token }`. |
| POST   | /auth/login     | Login; body: `{ cid, password }`. Returns `{ user, token }`. |

### Protected — any authenticated user

| Method | Route              | Description |
|--------|--------------------|-------------|
| GET    | /auth/profile      | Get current user (no password). |
| PATCH  | /auth/profile      | Update own profile; body: `{ name?, phoneNumber? }`. |
| POST   | /auth/change-password | Change own password; body: `{ currentPassword, newPassword }`. |
| POST   | /auth/signout      | Sign out (client discards token). |

### Admin-only routes

All require `Authorization: Bearer <token>` and user `role === ADMIN`.

| Method | Route                        | Description |
|--------|------------------------------|-------------|
| GET    | /auth/users                  | List all users. Query: `?role=ADMIN` or `?role=ENUMERATOR`. |
| GET    | /auth/admins                 | List all admins. |
| GET    | /auth/enumerators            | List all enumerators. |
| GET    | /auth/users/:id              | Get one user by ID. |
| POST   | /auth/users                  | Create user (admin or enumerator); body: `{ name, cid, phoneNumber?, password, role }`. |
| POST   | /auth/admins                 | Create admin; body: same as above (role forced to ADMIN). |
| POST   | /auth/enumerators            | Create one enumerator; body: same as above (role forced to ENUMERATOR). |
| POST   | /auth/enumerators/bulk       | Bulk create enumerators; body: `{ enumerators: [{ name, cid, phoneNumber?, password }] }`. Returns `{ created, failed, users, errors }`. |
| PATCH  | /auth/users/:id              | Update user; body: `{ name?, phoneNumber? }`. |
| PATCH  | /auth/users/:id/reset-password | Set user password; body: `{ newPassword }` (min 6 chars). |
| PATCH  | /auth/users/:id/activate     | Set user active. |
| PATCH  | /auth/users/:id/deactivate   | Set user inactive. |
| DELETE | /auth/users/:id              | Delete user. 204 No Content. |

---

## 2. Dzongkhag Module

**Prefix:** `/dzongkhags`  
**Purpose:** Read-only geographic/admin unit. Dzongkhag has many Enumeration Areas.

### Entity: Dzongkhag

| Field | Type   | Description   |
|-------|--------|---------------|
| id    | number | Primary key   |
| name  | string | Name          |
| areaCode | string | Area code  |

### Routes (no auth in current setup)

| Method | Route                              | Description |
|--------|------------------------------------|-------------|
| GET    | /dzongkhags                        | List all dzongkhags. |
| GET    | /dzongkhags/:id                    | Get one dzongkhag by ID. |
| GET    | /dzongkhags/:id/statistics         | Aggregates: `{ dzongkhagId, totalEnumerationAreas, totalStructures, totalHouseholds }`. |
| GET    | /dzongkhags/:id/enumeration-areas  | List enumeration areas for this dzongkhag (with hierarchy). |

---

## 3. Enumeration Area (EA) Module

**Prefix:** `/enumeration-areas`  
**Purpose:** Enumeration areas belong to a Dzongkhag and contain many Structures. Status workflow: `incomplete` → `in_progress` → `completed`.

### Entity: EnumerationArea

| Field       | Type   | Description                          |
|------------|--------|--------------------------------------|
| id         | number | Primary key                          |
| name       | string | Name                                 |
| description| string | Description                          |
| areaCode   | string | Area code                            |
| dzongkhagId| number?| FK to Dzongkhag                      |
| status     | enum   | `incomplete` \| `in_progress` \| `completed` |
| geom       | string?| Geometry (optional)                  |

### Routes

| Method | Route                                | Description |
|--------|--------------------------------------|-------------|
| GET    | /enumeration-areas                  | List EAs. Query: `?dzongkhagId=<id>`, `?status=incomplete` \| `in_progress` \| `completed`. |
| GET    | /enumeration-areas/:id               | Get one EA. Query: `?withGeom=true`, `?includeStructures=true`. |
| GET    | /enumeration-areas/:id/progress      | Progress: `{ totalStructures, totalHouseholds, status }`. |
| POST   | /enumeration-areas                   | Create; body: `{ dzongkhagId?, name, description, areaCode, status?, geom? }`. |
| PATCH  | /enumeration-areas/:id/status        | Update status; body: `{ status }` (enum value). |
| POST   | /enumeration-areas/:id/complete      | Mark EA completed (validates e.g. at least one structure). |
| DELETE | /enumeration-areas/:id               | Delete EA. |

---

## 4. Structure Module

**Prefix:** `/structures`  
**Purpose:** Structures belong to an Enumeration Area and contain many Household Listings. Structure number is unique per EA.

### Entity: Structure

| Field             | Type    | Description        |
|-------------------|---------|--------------------|
| id                | number  | Primary key        |
| enumerationAreaId | number  | FK to EnumerationArea |
| structureNumber   | string  | Unique within EA   |
| latitude          | number? | WGS84              |
| longitude         | number? | WGS84              |

### Routes

| Method | Route                                  | Description |
|--------|----------------------------------------|-------------|
| GET    | /structures                            | List structures. Query: `?enumerationAreaId=<id>`. |
| GET    | /structures/:id                        | Get one structure (with household listings). |
| GET    | /structures/:id/next-structure-number  | Next available structure number for same EA; returns `{ nextNumber }`. |
| POST   | /structures                            | Create one; body: `{ enumerationAreaId, structureNumber, latitude?, longitude? }`. |
| POST   | /structures/bulk                       | Bulk create; body: `{ structures: [ CreateStructureDto, ... ] }`. |
| PATCH  | /structures/:id                        | Update; body: partial CreateStructureDto. |
| DELETE | /structures/:id                        | Delete structure. |

---

## 5. Household Listing Module

**Prefix:** `/household-listings`  
**Purpose:** Household listings belong to a Structure and to the User (enumerator) who submitted them. Household serial number is unique per structure.

### Entity: HouseholdListing

| Field                   | Type   | Description        |
|-------------------------|--------|--------------------|
| id                      | number | Primary key        |
| structureId             | number | FK to Structure    |
| userId                  | number | FK to User (submitter) |
| householdIdentification | string | ID string          |
| householdSerialNumber   | number | Unique per structure |
| nameOfHOH               | string | Head of household  |
| totalMale               | number | Count              |
| totalFemale             | number | Count              |
| phoneNumber             | string?| Optional           |
| remarks                 | string?| Optional           |

### Routes

| Method | Route                                   | Description |
|--------|-----------------------------------------|-------------|
| GET    | /household-listings                     | List with filters. Query: `?eaId=<id>`, `?userId=<id>`, `?structureId=<id>`. |
| GET    | /household-listings/user/:userId        | List all listings submitted by this user. |
| GET    | /household-listings/structure/:structureId | List all listings for this structure. |
| GET    | /household-listings/:id                 | Get one listing. |
| POST   | /household-listings                     | Create one; body includes `structureId`, `userId`, `householdIdentification`, `householdSerialNumber`, `nameOfHOH`, `totalMale`, `totalFemale`, `phoneNumber?`, `remarks?`. |
| POST   | /household-listings/bulk                | Bulk create; body: `{ householdListings: [ CreateHouseholdListingDto, ... ] }`. |
| PUT    | /household-listings/:id                 | Full update (same body shape as create, partial allowed). |
| PATCH  | /household-listings/:id                 | Partial update. |
| DELETE | /household-listings/:id                 | Delete listing. |

---

## Hierarchy Summary

```
Dzongkhag
  └── Enumeration Area (EA)
        └── Structure
              └── Household Listing (linked to User)
```

- **Dzongkhag** → has many **Enumeration Areas**
- **Enumeration Area** → has many **Structures**, belongs to **Dzongkhag**
- **Structure** → has many **Household Listings**, belongs to **EA**
- **Household Listing** → belongs to **Structure** and **User** (submitter)
