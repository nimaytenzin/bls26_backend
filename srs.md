# Software Requirements Specification (SRS)

## National Sampling Frame Dashboard (NSFD) Backend System

**Version:** 2.0  
**Date:** November 13, 2025  
**Prepared for:** National Statistics Bureau, Bhutan  
**Prepared by:** NSFD Development Team  

---

## Document Control

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2024 | Development Team | Initial Release |
| 2.0 | November 2025 | Development Team | Added urban/rural segregation, hierarchical statistics, automated aggregation |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture](#6-system-architecture)
7. [Data Requirements](#7-data-requirements)
8. [Appendix](#8-appendix)

---

## 1. Introduction

### 1.1 Purpose

The National Sampling Frame Dashboard (NSFD) is a comprehensive web-based system designed to manage geographic hierarchies, user management, survey operations, and household data collection for national statistical operations in Bhutan. This document provides a complete specification of functional and non-functional requirements for the NSFD Backend System.

**Target Audience:**
- System Developers and Architects
- Database Administrators
- Quality Assurance Teams
- Project Managers
- National Statistics Bureau Stakeholders

### 1.2 Scope

The NSFD Backend System encompasses:

**Core Functionalities:**
- **Geographic hierarchy management** with 4-level structure (Dzongkhag → Administrative Zone → Sub-Administrative Zone → Enumeration Area)
- **User management** with role-based access control (Admin, Supervisor, Enumerator)
- **Survey lifecycle management** from creation to validation
- **Household data collection** and validation workflows
- **Statistical aggregation and reporting** with urban/rural segregation
- **Spatial data visualization** using PostGIS and GeoJSON
- **Automated statistics computation** via scheduled cron jobs

**Key Capabilities:**
- Real-time data synchronization
- Historical trend analysis
- Urban/rural demographic analysis
- Hierarchical data aggregation
- Multi-level data validation
- Audit trail and compliance tracking

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| **NSF** | National Sampling Frame |
| **NSFD** | National Sampling Frame Dashboard |
| **EA** | Enumeration Area - smallest geographic unit for census/survey data collection |
| **AZ** | Administrative Zone - second-level division (Gewog or Thromde) |
| **SAZ** | Sub-Administrative Zone - third-level division (Chiwog or Lap) |
| **Dzongkhag** | District - top-level administrative division in Bhutan |
| **Gewog** | Rural administrative block (type of Administrative Zone) |
| **Thromde** | Urban municipality/town (type of Administrative Zone) |
| **Chiwog** | Rural village cluster (type of Sub-Administrative Zone under Gewog) |
| **Lap** | Urban ward (type of Sub-Administrative Zone under Thromde) |
| **HOH** | Head of Household |
| **RBAC** | Role-Based Access Control |
| **ERD** | Entity Relationship Diagram |
| **API** | Application Programming Interface |
| **REST** | Representational State Transfer |
| **ORM** | Object-Relational Mapping |
| **PostGIS** | Spatial database extension for PostgreSQL |
| **GeoJSON** | Geographic data encoding format |
| **SRID** | Spatial Reference System Identifier |
| **WGS 84** | World Geodetic System 1984 (SRID 4326) |

### 1.4 References

| Document | Description |
|----------|-------------|
| **Bhutan National Statistics Bureau Requirements** | Official guidelines for statistical data collection |
| **GIS Standards** | Geographic Information System implementation standards |
| **Data Privacy Regulations** | Bhutan data protection and privacy compliance requirements |
| **PostgreSQL Documentation** | Database system reference (v12+) |
| **PostGIS Documentation** | Spatial database extension reference |
| **NestJS Documentation** | Backend framework reference |
| **Sequelize-TypeScript Documentation** | ORM framework reference |

### 1.5 Document Overview

This SRS document is organized into eight main sections:

1. **Introduction** - Purpose, scope, and definitions
2. **Overall Description** - Product perspective, user characteristics, constraints
3. **System Features** - Detailed functional requirements organized by feature
4. **External Interfaces** - UI, hardware, software, and communication interfaces
5. **Non-Functional Requirements** - Performance, security, quality attributes
6. **System Architecture** - Technical architecture and design patterns
7. **Data Requirements** - Database schema, constraints, relationships
8. **Appendix** - ERD, data dictionary, SQL examples, API endpoints

---

## 2. Overall Description

### 2.1 Product Perspective

The NSFD Backend System is a standalone web application that serves as the central data management platform for Bhutan's national statistical operations. The system integrates with multiple components:

**System Context Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│                    External Systems                          │
├─────────────────────────────────────────────────────────────┤
│  Web Browsers  │  Mobile Apps  │  Mapping Services  │  Auth │
└────────┬─────────────┬──────────────┬──────────────┬────────┘
         │             │              │              │
         └─────────────┴──────────────┴──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │    NSFD Backend System     │
              │    (NestJS Application)    │
              └─────────────┬──────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌──────▼──────┐   ┌──────▼──────┐
    │PostgreSQL│      │   PostGIS   │   │   Redis     │
    │ Database │      │   Spatial   │   │   Cache     │
    └──────────┘      └─────────────┘   └─────────────┘
```

**Key Integrations:**

1. **PostgreSQL with PostGIS Extension**
   - Primary data storage
   - Spatial data management
   - ACID-compliant transactions

2. **Authentication Systems**
   - JWT-based authentication
   - Role-based access control
   - Session management

3. **Mapping Services**
   - GeoJSON rendering
   - Spatial queries and operations
   - Boundary visualization

4. **Cron Scheduler**
   - Automated statistics computation
   - Background job processing
   - Data synchronization

### 2.2 Product Functions

The NSFD Backend provides the following major functions:

#### 2.2.1 User & Access Management
- User registration and authentication
- Role-based authorization (Admin, Supervisor, Enumerator)
- Supervisor-dzongkhag assignment
- Password management and recovery
- Activity audit trails

#### 2.2.2 Geographic Information Management
- Four-level geographic hierarchy (Dzongkhag → AZ → SAZ → EA)
- Spatial boundary management using PostGIS
- Urban/rural classification (Thromde vs Gewog, Lap vs Chiwog)
- Area calculations and spatial queries
- Building/structure mapping

#### 2.2.3 Survey Operations
- Survey creation and lifecycle management
- Enumeration area assignment to surveys
- Enumerator assignment and workload distribution
- Survey status tracking (Active/Ended)
- Multi-survey support per EA

#### 2.2.4 Data Collection & Validation
- Household listing data entry
- Real-time validation rules
- Submission workflow (Draft → Submitted → Validated)
- Multi-level validation (Enumerator → Supervisor → Admin)
- Data quality checks

#### 2.2.5 Statistical Aggregation & Reporting
- **Automated Statistics Computation**
  - Runs every minute via cron job
  - Bottom-up hierarchical aggregation (EA → SAZ → AZ → Dzongkhag)
  - Urban/rural segregation at all levels
  - Upsert pattern for idempotent updates
  
- **Annual Statistics Management**
  - EA-level statistics from validated survey data
  - SAZ-level aggregation with EA counts
  - AZ-level aggregation with SAZ and EA counts
  - Dzongkhag-level aggregation with complete urban/rural breakdown
  
- **Historical Analysis**
  - Year-over-year trend analysis
  - Growth rate calculations
  - Urbanization rate tracking
  - National-level aggregations

#### 2.2.6 Spatial Data Operations
- Boundary visualization
- Spatial containment queries
- Distance calculations
- Area measurements
- GeoJSON import/export

### 2.3 User Characteristics

The system supports three distinct user roles with varying levels of access and responsibilities:

| User Role | Profile | Responsibilities | Technical Skills | Access Level |
|-----------|---------|------------------|------------------|--------------|
| **Admin** | System administrators from NSB headquarters | • System configuration<br>• User account management<br>• Data validation and approval<br>• Report generation<br>• System monitoring | High - Technical background, system administration experience | **Full Access**<br>All modules, all data, all operations |
| **Supervisor** | District-level coordinators and managers | • Manage assigned dzongkhag(s)<br>• Oversee enumerators<br>• Review and submit EA data<br>• Monitor survey progress<br>• Generate district reports | Medium - Computer literacy, data entry experience, basic GIS knowledge | **Limited Access**<br>Only assigned dzongkhags and related EAs |
| **Enumerator** | Field workers collecting household data | • Collect household listings<br>• Enter survey data<br>• Update household information<br>• Submit completed EA data<br>• Work in assigned areas | Basic - Mobile/computer literacy, data entry skills | **Restricted Access**<br>Only assigned surveys and EAs |

**User Demographics:**
- **Total Expected Users:** 500-1000 concurrent users
- **Geographic Distribution:** All 20 dzongkhags across Bhutan
- **Usage Pattern:** Periodic intensive usage during survey periods
- **Device Types:** Desktop computers, tablets, smartphones
- **Connectivity:** Variable (urban high-speed to rural low-bandwidth)

### 2.4 Constraints

#### 2.4.1 Regulatory Constraints
- **Data Privacy Compliance:** Must comply with Bhutan's data protection regulations
- **Statistical Standards:** Adherence to international statistical data collection standards
- **Audit Requirements:** Complete audit trail for all data modifications
- **Data Retention:** Minimum 10-year retention for historical data

#### 2.4.2 Technical Constraints
- **Geographic Structure:** Must strictly follow Bhutan's 4-level administrative hierarchy
- **Spatial Data:** All geographic boundaries must use WGS 84 (SRID 4326)
- **Database:** PostgreSQL 12+ with PostGIS extension required
- **Framework:** Built on NestJS with TypeScript
- **ORM:** Sequelize-TypeScript for database operations

#### 2.4.3 Business Constraints
- **Urban/Rural Classification:** 
  - Thromde (urban) → Lap (urban SAZ) → Urban EA
  - Gewog (rural) → Chiwog (rural SAZ) → Rural EA
- **Survey Lifecycle:** Surveys cannot be deleted once data collection begins
- **Data Validation:** Only validated data contributes to annual statistics
- **Backward Compatibility:** Must support historical data from previous systems

#### 2.4.4 Performance Constraints
- **Response Time:** Dashboard must load within 3 seconds
- **Concurrent Users:** Support 500+ simultaneous users
- **Data Processing:** Statistics aggregation must complete within 60 seconds
- **Spatial Queries:** Map operations must respond within 5 seconds

### 2.5 Assumptions and Dependencies

#### 2.5.1 Assumptions
1. **Network Connectivity:** Stable internet connection available at data collection points
2. **User Training:** Users receive adequate training before system access
3. **Master Data:** Geographic boundaries and codes are pre-loaded and maintained
4. **Device Compatibility:** Users have access to compatible devices (desktop/mobile)
5. **Browser Support:** Modern web browsers (Chrome, Firefox, Safari, Edge)

#### 2.5.2 Dependencies

**External Dependencies:**
- PostgreSQL database server availability (99.9% uptime SLA)
- PostGIS extension properly configured
- Node.js runtime environment (v16+)
- Network infrastructure reliability
- Authentication service availability

**Internal Dependencies:**
- Geographic hierarchy data loaded before survey operations
- User accounts created before enumerator assignments
- Buildings data available for household listings
- Validated survey data required for statistics computation

**Third-Party Services:**
- Mapping tile services for spatial visualization
- Email service for notifications and password resets
- Backup and disaster recovery infrastructure

---

## 3. System Features

### 3.1 User Management

#### 3.1.1 Description
Comprehensive user management system with role-based access control supporting three user types (Admin, Supervisor, Enumerator) with distinct permissions and capabilities.

#### 3.1.2 Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| **UM-001** | System shall allow creation of user accounts with roles (Admin, Supervisor, Enumerator) | **High** | • User account created with specified role<br>• Role determines access permissions<br>• Cannot create duplicate accounts |
| **UM-002** | System shall enforce unique CID (Citizenship ID) and email for each user | **High** | • CID must be unique across all users<br>• Email must be unique across all users<br>• Validation error displayed for duplicates |
| **UM-003** | System shall assign supervisors to specific dzongkhag(s) | **High** | • Many-to-many relationship supported<br>• Supervisor can manage multiple dzongkhags<br>• Dzongkhag can have multiple supervisors |
| **UM-004** | System shall provide password management and reset functionality | **Medium** | • Secure password hashing (bcrypt)<br>• Password reset via email<br>• Password change with old password verification |
| **UM-005** | System shall track user activity timestamps (createdAt, updatedAt) | **Low** | • Automatic timestamp on creation<br>• Automatic update on modification<br>• Timestamps displayed in user interface |
| **UM-006** | System shall implement JWT-based authentication | **High** | • Token generated on successful login<br>• Token validated on protected routes<br>• Token expiration after configured time |
| **UM-007** | System shall maintain audit trail for user actions | **Medium** | • Track who submitted survey data<br>• Track who validated data<br>• Track user login/logout activities |

#### 3.1.3 Business Rules
- BR-UM-001: Only Admins can create, update, or delete user accounts
- BR-UM-002: Users cannot delete their own accounts
- BR-UM-003: Supervisor assignments determine data access scope
- BR-UM-004: Failed login attempts tracked for security monitoring

---

### 3.2 Geographic Hierarchy Management

#### 3.2.1 Description
Management of Bhutan's 4-level geographic hierarchy with spatial data, urban/rural classification, and administrative boundaries.

#### 3.2.2 Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| **GH-001** | System shall maintain dzongkhag master data with spatial boundaries | **High** | • All 20 dzongkhags stored<br>• MULTIPOLYGON geometry (SRID 4326)<br>• Area in sq km calculated<br>• Unique area codes assigned |
| **GH-002** | System shall support administrative zones (Gewog/Thromde) with type classification | **High** | • Type enum: GEWOG (rural) or THROMDE (urban)<br>• Linked to parent dzongkhag<br>• Spatial boundaries stored<br>• Area calculations performed |
| **GH-003** | System shall manage sub-administrative zones (Chiwog/Lap) | **High** | • Type: chiwog (rural) or lap (urban)<br>• Linked to parent AZ<br>• Spatial boundaries maintained<br>• Consistent with parent AZ type |
| **GH-004** | System shall maintain enumeration areas as smallest geographic units | **High** | • Linked to parent SAZ<br>• Unique area codes<br>• Spatial boundaries defined<br>• Can be assigned to multiple surveys |
| **GH-005** | System shall store and display spatial data in WGS 84 coordinate system (SRID 4326) | **High** | • All geometries use SRID 4326<br>• Compatible with standard GPS/mapping tools<br>• GeoJSON export supported |
| **GH-006** | System shall calculate and store area measurements in square kilometers | **Medium** | • Automatic area calculation from geometry<br>• Area displayed in sq km<br>• Area validation (>0) |
| **GH-007** | System shall enforce strict parent-child relationships in hierarchy | **High** | • Cannot delete parent with children<br>• Foreign key constraints enforced<br>• Cascade rules defined |

#### 3.2.3 Urban/Rural Classification Rules
- **BR-GH-001:** If AZ type = THROMDE → Urban classification
  - SAZ type must be "lap" (urban ward)
  - All child EAs classified as urban
  - Statistics segregated as urban

- **BR-GH-002:** If AZ type = GEWOG → Rural classification
  - SAZ type must be "chiwog" (rural village)
  - All child EAs classified as rural
  - Statistics segregated as rural

---

### 3.3 Survey Management

#### 3.3.1 Description
End-to-end survey lifecycle management including creation, enumeration area assignment, enumerator allocation, and status tracking.

#### 3.3.2 Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| **SM-001** | System shall allow creation of surveys with metadata (name, description, dates, year) | **High** | • Survey created with start/end dates<br>• Year field for annual classification<br>• Status defaults to ACTIVE |
| **SM-002** | System shall assign enumeration areas to surveys (many-to-many) | **High** | • Multiple EAs assigned to one survey<br>• One EA can be in multiple surveys<br>• No duplicate EA-survey combinations |
| **SM-003** | System shall assign enumerators to surveys (many-to-many) | **High** | • Multiple enumerators per survey<br>• Enumerator can work on multiple surveys<br>• Composite unique key (userId, surveyId) |
| **SM-004** | System shall track survey status (ACTIVE/ENDED) | **High** | • Active surveys allow data entry<br>• Ended surveys are read-only<br>• Status change requires admin permission |
| **SM-005** | System shall prevent duplicate EA assignments to same survey | **High** | • Unique constraint on (surveyId, enumerationAreaId)<br>• Database-level enforcement<br>• User-friendly error message |
| **SM-006** | System shall track full validation status for surveys | **Medium** | • isFullyValidated flag<br>• Updated when all EAs validated<br>• Required before survey closure |
| **SM-007** | System shall filter surveys by supervisor's assigned dzongkhags | **Medium** | • Supervisors see only relevant surveys<br>• Based on dzongkhag assignment<br>• Hierarchical filtering (Dzongkhag → AZ → SAZ → EA) |

#### 3.3.3 Business Rules
- BR-SM-001: Survey start date must be before or equal to end date
- BR-SM-002: Cannot delete survey once data collection begins
- BR-SM-003: Cannot end survey until all EAs are validated
- BR-SM-004: Survey year must match operational year

---

### 3.4 Household Data Collection

#### 3.4.1 Description
Collection, storage, and management of household listing data at the enumeration area level during survey operations.

#### 3.4.2 Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| **HD-001** | System shall allow enumerators to input household data | **High** | • Form-based data entry<br>• Field validation<br>• Auto-save functionality<br>• Mobile-responsive interface |
| **HD-002** | System shall enforce unique household serial numbers within survey-EA | **High** | • Composite unique constraint<br>• (surveyEnumerationAreaId, householdSerialNumber)<br>• Prevents duplicate entries |
| **HD-003** | System shall capture demographic data (male/female counts) | **High** | • totalMale field (integer, ≥0)<br>• totalFemale field (integer, ≥0)<br>• Automatic validation |
| **HD-004** | System shall store head of household (HOH) information | **High** | • nameOfHOH field (required)<br>• Character limit validation<br>• Name formatting support |
| **HD-005** | System shall capture building/structure information | **High** | • structureNumber field<br>• Links to Buildings entity<br>• Spatial association |
| **HD-006** | System shall allow optional contact information and remarks | **Medium** | • phoneNumber (optional, formatted)<br>• remarks (text field)<br>• householdIdentification (unique ID) |
| **HD-007** | System shall track data submitter and timestamp | **High** | • submittedBy (user reference)<br>• createdAt/updatedAt timestamps<br>• Audit trail maintained |

#### 3.4.3 Data Validation Rules
- DV-HD-001: Household serial number must be positive integer
- DV-HD-002: Male/female counts must be non-negative integers
- DV-HD-003: Structure number must exist in Buildings table
- DV-HD-004: Phone number format validation (if provided)
- DV-HD-005: Name of HOH must not be empty

---

### 3.5 Workflow Management

#### 3.5.1 Description
Multi-stage data submission and validation workflow for survey enumeration areas with state tracking and audit capabilities.

#### 3.5.2 Workflow States

```
┌─────────────────┐
│  Not Submitted  │  Initial State
│ isSubmitted=0   │  • Enumerator collecting data
│ isValidated=0   │  • Can modify household listings
└────────┬────────┘
         │ Submit EA Data
         ▼
┌─────────────────┐
│   Submitted     │  Awaiting Validation
│ isSubmitted=1   │  • Read-only for enumerator
│ isValidated=0   │  • Admin can review
│ submittedBy=X   │  • Can add comments
└────────┬────────┘
         │ Validate/Reject
         ▼
┌─────────────────┐
│   Validated     │  Final State
│ isSubmitted=1   │  • Data frozen
│ isValidated=1   │  • Contributes to statistics
│ validatedBy=Y   │  • Cannot modify
└─────────────────┘
```

#### 3.5.3 Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| **WF-001** | System shall track submission status of survey enumeration areas | **High** | • isSubmitted boolean flag<br>• State transition logic<br>• Status visible in UI |
| **WF-002** | System shall record submitter and submission timestamp | **High** | • submittedBy (foreign key to Users)<br>• submissionDate (timestamp)<br>• Automatic capture on submit |
| **WF-003** | System shall allow administrators to validate submitted data | **High** | • Validate action for admins<br>• isValidated flag set to true<br>• Read-only after validation |
| **WF-004** | System shall record validator and validation timestamp | **High** | • validatedBy (foreign key to Users)<br>• validationDate (timestamp)<br>• Audit trail complete |
| **WF-005** | System shall support comments for validation feedback | **Medium** | • Comments field (text)<br>• Visible to submitter<br>• Used for rejection reasons |
| **WF-006** | System shall prevent modification of validated data | **High** | • Database triggers or app-level checks<br>• Error message on attempt<br>• Admin-only override |
| **WF-007** | System shall allow data resubmission after rejection | **Medium** | • Reset isSubmitted to false<br>• Clear submission metadata<br>• Preserve household listings |

#### 3.5.4 Business Rules
- BR-WF-001: Only enumerators or supervisors can submit EA data
- BR-WF-002: Only admins can validate submitted data
- BR-WF-003: Cannot validate without prior submission
- BR-WF-004: Validated data contributes to annual statistics
- BR-WF-005: Survey cannot end until all assigned EAs are validated

---

### 3.6 Statistical Aggregation & Annual Statistics

#### 3.6.1 Description
Automated hierarchical computation of annual statistics with urban/rural segregation across all geographic levels (EA → SAZ → AZ → Dzongkhag).

#### 3.6.2 System Architecture

**Aggregation Flow:**
```
┌──────────────────────────────────────────────────────────────┐
│  Validated Survey Data (Household Listings)                  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   EA Annual Statistics        │
         │   • totalHouseholds           │
         │   • totalMale / totalFemale   │
         │   • One record per EA/year    │
         └───────────────┬───────────────┘
                         │ Aggregate ↑
                         ▼
         ┌───────────────────────────────┐
         │   SAZ Annual Statistics       │
         │   • Aggregate from all EAs    │
         │   • eaCount                   │
         │   • Sum households/population │
         └───────────────┬───────────────┘
                         │ Aggregate ↑
                         ▼
         ┌───────────────────────────────┐
         │   AZ Annual Statistics        │
         │   • Aggregate from all SAZs   │
         │   • eaCount + sazCount        │
         │   • Sum households/population │
         └───────────────┬───────────────┘
                         │ Aggregate ↑
                         ▼
         ┌───────────────────────────────┐
         │   Dzongkhag Annual Stats      │
         │   • Aggregate from all AZs    │
         │   • Urban/Rural Segregation   │
         │   • Complete statistics       │
         └───────────────────────────────┘
                         │
                         ▼
              National Aggregations
```

#### 3.6.3 Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| **SA-001** | System shall compute EA-level annual statistics from validated survey data | **High** | • Aggregates household listings<br>• Sums male/female counts<br>• One record per EA per year<br>• Upsert pattern (update or create) |
| **SA-002** | System shall aggregate statistics hierarchically (EA → SAZ → AZ → Dzongkhag) | **High** | • Bottom-up aggregation<br>• Separate queries at each level<br>• No nested includes (performance)<br>• Pure Sequelize/ORM (no raw SQL) |
| **SA-003** | System shall segregate urban/rural statistics at dzongkhag level | **High** | • Urban: Thromde → Lap → Urban EA<br>• Rural: Gewog → Chiwog → Rural EA<br>• Separate counts for urban/rural |
| **SA-004** | System shall run automatic aggregation every minute via cron job | **High** | • Cron schedule: `*/1 * * * *`<br>• Auto-computes for current year<br>• Background processing<br>• Error handling and logging |
| **SA-005** | System shall support manual computation via API endpoint | **Medium** | • POST /dzongkhag-annual-stats/compute<br>• Admin-only access<br>• Synchronous execution<br>• Returns aggregated results |
| **SA-006** | System shall maintain historical statistics for trend analysis | **High** | • Year-based records preserved<br>• Unique constraint (entityId, year)<br>• No deletion of historical data<br>• Supports multi-year queries |
| **SA-007** | System shall create entries even with zero values | **High** | • Always upsert records<br>• Zero values for no data<br>• Complete time series<br>• No conditional creation |
| **SA-008** | System shall update existing records for given year (upsert pattern) | **High** | • Check (entityId, year) uniqueness<br>• Update if exists<br>• Create if not exists<br>• Idempotent operations |

#### 3.6.4 Annual Statistics Data Models

**EA Annual Statistics:**
- `enumerationAreaId` (FK)
- `year`
- `totalHouseholds`
- `totalMale`
- `totalFemale`
- Unique: `(enumerationAreaId, year)`

**SAZ Annual Statistics:**
- `subAdministrativeZoneId` (FK)
- `year`
- `eaCount` (count of EAs in SAZ)
- `totalHouseholds`
- `totalMale`
- `totalFemale`
- Unique: `(subAdministrativeZoneId, year)`

**AZ Annual Statistics:**
- `administrativeZoneId` (FK)
- `year`
- `eaCount` (count of EAs in AZ)
- `sazCount` (count of SAZs in AZ)
- `totalHouseholds`
- `totalMale`
- `totalFemale`
- Unique: `(administrativeZoneId, year)`

**Dzongkhag Annual Statistics (with Urban/Rural Segregation):**
- `dzongkhagId` (FK)
- `year`
- **EA Counts:** `eaCount`, `urbanEACount`, `ruralEACount`
- **SAZ Counts:** `sazCount`, `urbanSAZCount`, `ruralSAZCount`
- **AZ Counts:** `azCount`, `urbanAZCount` (Thromdes), `ruralAZCount` (Gewogs)
- **Household Counts:** `totalHouseholds`, `urbanHouseholdCount`, `ruralHouseholdCount`
- **Male Population:** `totalMale`, `urbanMale`, `ruralMale`
- **Female Population:** `totalFemale`, `urbanFemale`, `ruralFemale`
- Unique: `(dzongkhagId, year)`

#### 3.6.5 Business Rules
- BR-SA-001: Only validated survey data contributes to annual statistics
- BR-SA-002: Statistics computed for current year automatically
- BR-SA-003: Urban classification based on AZ type (THROMDE)
- BR-SA-004: Rural classification based on AZ type (GEWOG)
- BR-SA-005: Aggregation uses separate queries at each level for performance
- BR-SA-006: Upsert ensures idempotent operations (safe to re-run)

---

### 3.7 Reporting and Dashboard

#### 3.7.1 Description
Comprehensive reporting and data visualization capabilities with support for real-time metrics, historical trends, and urban/rural analysis.

#### 3.7.2 Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| **RP-001** | System shall display survey progress metrics | **High** | • Total EAs assigned<br>• EAs submitted<br>• EAs validated<br>• Completion percentage |
| **RP-002** | System shall show geographic coverage statistics | **High** | • Counts by dzongkhag<br>• Counts by AZ<br>• Coverage maps<br>• Drill-down capability |
| **RP-003** | System shall provide year-over-year growth analysis | **Medium** | • Household growth rates<br>• Population growth rates<br>• Comparison charts<br>• Trend visualization |
| **RP-004** | System shall display urban/rural demographic breakdowns | **High** | • Urban vs rural households<br>• Urban vs rural population<br>• Urbanization rates<br>• Gender distribution |
| **RP-005** | System shall generate national-level aggregation reports | **Medium** | • Sum across all dzongkhags<br>• National urban/rural totals<br>• National urbanization rate<br>• Export to Excel/PDF |
| **RP-006** | System shall support custom date range queries | **Medium** | • Filter by year range<br>• Historical comparisons<br>• Multi-year trends<br>• Configurable periods |

#### 3.7.3 Report Types
- Survey Progress Reports
- Geographic Coverage Reports
- Demographic Analysis Reports
- Urban/Rural Comparison Reports
- Historical Trend Reports
- National Summary Reports

---
## 4. External Interface Requirements

### 4.1 User Interfaces

#### 4.1.1 General UI Requirements

**Design Principles:**
- **Responsive Design:** Mobile-first approach, supports devices from 320px to 4K displays
- **Accessibility:** WCAG 2.1 Level AA compliance
- **Language Support:** Dzongkha and English with easy toggle
- **Consistency:** Unified design language across all modules

**UI Components:**
- Dashboard with key metrics and visualizations
- Data entry forms with real-time validation
- Interactive maps with zoom, pan, and layer controls
- Data tables with sorting, filtering, and pagination
- Modal dialogs for confirmations and details
- Notification system for alerts and messages

#### 4.1.2 Role-Specific Interfaces

**Admin Dashboard:**
```
┌────────────────────────────────────────────────────────┐
│  NSFD - Admin Dashboard                    [Profile ▼]│
├────────────────────────────────────────────────────────┤
│  [Users] [Surveys] [Validation] [Reports] [Settings]  │
├────────────────────────────────────────────────────────┤
│  System Overview                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Total Users  │ │Active Surveys│ │Pending Valid.│   │
│  │    1,234     │ │      15      │ │     89       │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                         │
│  Validation Queue               Survey Progress        │
│  [List of pending validations]  [Progress charts]     │
└────────────────────────────────────────────────────────┘
```

**Supervisor Dashboard:**
```
┌────────────────────────────────────────────────────────┐
│  NSFD - Supervisor Dashboard           [Profile ▼]     │
├────────────────────────────────────────────────────────┤
│  [My Dzongkhags] [Surveys] [Enumerators] [Reports]    │
├────────────────────────────────────────────────────────┤
│  Assigned Dzongkhags: [Thimphu] [Paro]                │
│                                                         │
│  Active Survey Progress                                │
│  Survey: PHC 2025                                      │
│  ┌─────────────────────────────────────────────┐      │
│  │ ████████████████░░░░░░░░░░  67% Complete    │      │
│  │ 120/180 EAs Submitted  |  95/120 Validated  │      │
│  └─────────────────────────────────────────────┘      │
│                                                         │
│  [Map View] [List View] [Enumerator Workload]         │
└────────────────────────────────────────────────────────┘
```

**Enumerator Interface:**
```
┌────────────────────────────────────────────────────────┐
│  NSFD - Enumerator                     [Profile ▼]     │
├────────────────────────────────────────────────────────┤
│  [My Assignments] [Data Entry] [Help]                 │
├────────────────────────────────────────────────────────┤
│  Current Assignment: EA-TH-01-05-123                   │
│  Survey: PHC 2025  |  Status: In Progress             │
│                                                         │
│  Household Listings (15 households entered)           │
│  ┌──────┬──────────────┬──────┬──────┬──────────┐    │
│  │Serial│ HOH Name     │ Male │Female│  Actions │    │
│  ├──────┼──────────────┼──────┼──────┼──────────┤    │
│  │  001 │ Tashi Dorji  │  3   │  2   │ [Edit]   │    │
│  │  002 │ Karma Wangmo │  2   │  3   │ [Edit]   │    │
│  └──────┴──────────────┴──────┴──────┴──────────┘    │
│                                                         │
│  [+ Add Household] [Submit EA Data]                    │
└────────────────────────────────────────────────────────┘
```

#### 4.1.3 Map Interface Requirements
- **Base Maps:** Support for multiple tile providers (OSM, satellite)
- **Interactive Layers:** Toggle geographic boundaries (Dzongkhag, AZ, SAZ, EA)
- **Popup Information:** Click on features to view details
- **Drawing Tools:** For boundary corrections (admin only)
- **Legend:** Clear indication of layer colors and symbols
- **Zoom Controls:** Pan, zoom in/out, fit to bounds
- **Search:** Find locations by name or code

### 4.2 Hardware Interfaces

#### 4.2.1 Client Devices
- **Desktop Computers:** Windows 10+, macOS 10.14+, Linux
- **Tablets:** iPad (iOS 13+), Android tablets (Android 8+)
- **Smartphones:** iPhone (iOS 13+), Android phones (Android 8+)
- **Screen Resolutions:** 320px to 3840px width
- **Input Methods:** Keyboard, mouse, touch screen

#### 4.2.2 Server Hardware
- **CPU:** Multi-core processor (8+ cores recommended)
- **RAM:** 16GB minimum, 32GB recommended
- **Storage:** SSD with 500GB+ capacity
- **Network:** 1Gbps Ethernet connection
- **Backup:** Dedicated backup storage system

### 4.3 Software Interfaces

#### 4.3.1 Database Interface
- **DBMS:** PostgreSQL 12.0 or higher
- **Extension:** PostGIS 3.0+ for spatial operations
- **Connection:** Sequelize-TypeScript ORM
- **Connection Pool:** Configurable pool size (default 20-50 connections)
- **SSL/TLS:** Encrypted database connections

#### 4.3.2 External Services

| Service | Purpose | Protocol | Data Format |
|---------|---------|----------|-------------|
| **Email Service** | Password reset, notifications | SMTP/TLS | HTML/Text |
| **Map Tiles** | Base map visualization | HTTPS | PNG/WebP |
| **Authentication** | JWT token validation | HTTPS | JSON |
| **Backup Service** | Automated backups | SFTP/rsync | SQL dumps |

#### 4.3.3 Operating System Interface
- **Node.js Runtime:** v16.x or higher
- **Process Management:** PM2 or systemd
- **File System:** Read/write access for logs and uploads
- **Environment Variables:** Configuration management

### 4.4 Communications Interfaces

#### 4.4.1 Network Protocols
- **HTTP/HTTPS:** All client-server communication
- **WebSocket:** Real-time updates (optional)
- **REST API:** JSON over HTTPS
- **Database Protocol:** PostgreSQL wire protocol

#### 4.4.2 API Interface

**Base URL:** `https://api.nsfd.gov.bt/v1`

**Authentication:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "emailAddress": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "John Doe", "role": "ADMIN" }
}
```

**Request Headers:**
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
Accept: application/json
```

**Response Format:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

**Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  },
  "timestamp": "2025-11-13T10:30:00Z"
}
```

#### 4.4.3 Data Exchange Formats
- **JSON:** Primary data format for API
- **GeoJSON:** Spatial data representation
- **CSV:** Bulk data import/export
- **Excel:** Report generation
- **PDF:** Document generation

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

| Requirement | Specification | Measurement Method |
|-------------|---------------|-------------------|
| **Page Load Time** | Dashboard loads within 3 seconds on 4G connection | Browser DevTools, Lighthouse |
| **API Response Time** | 95% of API calls respond within 500ms | APM tools, server logs |
| **Data Operations** | CRUD operations complete within 5 seconds | Application metrics |
| **Statistics Computation** | Automatic aggregation completes within 60 seconds | Cron job monitoring |
| **Spatial Queries** | Map rendering and queries within 5 seconds | Query performance logs |
| **Concurrent Users** | Support 500+ simultaneous users without degradation | Load testing |
| **Database Queries** | Complex queries execute within 2 seconds | Query analyzer, EXPLAIN |
| **File Upload** | Support files up to 10MB with progress indication | Upload handler metrics |

**Performance Optimization Strategies:**
- Database indexing on frequently queried columns
- Query optimization with EXPLAIN ANALYZE
- Caching frequently accessed data (Redis)
- CDN for static assets
- Database connection pooling
- Lazy loading for large datasets
- Pagination for list views (50 items per page)

### 5.2 Security Requirements

#### 5.2.1 Authentication & Authorization
- **JWT Tokens:** Secure token-based authentication
  - Expiration: 24 hours
  - Refresh token mechanism
  - Secure storage (httpOnly cookies)
  
- **Password Policy:**
  - Minimum 8 characters
  - Mix of uppercase, lowercase, numbers
  - Bcrypt hashing with salt rounds: 10
  - Password history (prevent reuse of last 3)
  - Account lockout after 5 failed attempts

- **Role-Based Access Control (RBAC):**
  - Admin: Full system access
  - Supervisor: Limited to assigned dzongkhags
  - Enumerator: Limited to assigned surveys
  - Endpoint-level authorization checks
  - Resource-level permission validation

#### 5.2.2 Data Security
- **Encryption at Rest:** Database-level encryption for sensitive fields
- **Encryption in Transit:** TLS 1.3 for all communications
- **SQL Injection Prevention:** Parameterized queries, ORM usage
- **XSS Prevention:** Input sanitization, output encoding
- **CSRF Protection:** Token-based validation
- **Rate Limiting:** API throttling (100 requests/minute per user)

#### 5.2.3 Audit & Compliance
- **Audit Logging:**
  - User login/logout events
  - Data modification tracking (who, what, when)
  - Failed authentication attempts
  - Admin actions (user management, validation)
  - Log retention: 2 years minimum

- **Data Privacy:**
  - PII data protection
  - Access logs for sensitive data
  - Right to data deletion (GDPR-style)
  - Data anonymization for reporting

- **Backup & Recovery:**
  - Daily automated backups
  - Point-in-time recovery capability
  - Backup encryption
  - Off-site backup storage
  - Recovery time objective (RTO): 4 hours
  - Recovery point objective (RPO): 24 hours

### 5.3 Software Quality Attributes

#### 5.3.1 Availability
- **Uptime Target:** 99.5% during business hours (8 AM - 6 PM)
- **Planned Downtime:** Saturday nights 10 PM - 2 AM for maintenance
- **Monitoring:** 24/7 system health monitoring
- **Alerting:** Automated alerts for critical failures
- **Redundancy:** Database replication, application load balancing

#### 5.3.2 Reliability
- **Mean Time Between Failures (MTBF):** 720 hours (30 days)
- **Mean Time To Repair (MTTR):** < 4 hours
- **Error Handling:** Graceful degradation, user-friendly error messages
- **Data Integrity:** ACID compliance, transaction management
- **Consistency:** Referential integrity via foreign keys

#### 5.3.3 Maintainability
- **Code Quality:**
  - TypeScript for type safety
  - ESLint and Prettier for code standards
  - Unit test coverage: >70%
  - Integration test coverage: >50%
  
- **Documentation:**
  - API documentation (Swagger/OpenAPI)
  - Code comments and JSDoc
  - Database schema documentation (ERD)
  - Deployment guides and runbooks
  
- **Modularity:**
  - NestJS module-based architecture
  - Clear separation of concerns
  - Dependency injection
  - Reusable components

#### 5.3.4 Scalability
- **Horizontal Scaling:** Support for multiple application instances
- **Database Scaling:** Read replicas for reporting queries
- **Vertical Scaling:** Ability to increase server resources
- **Data Volume:** Handle 1 million+ household records
- **Geographic Distribution:** Support for all 20 dzongkhags

#### 5.3.5 Usability
- **Learnability:** New users productive within 2 hours of training
- **Efficiency:** Common tasks completable in < 5 clicks
- **Error Prevention:** Validation and confirmation dialogs
- **Help System:** Context-sensitive help and tooltips
- **User Satisfaction:** >80% satisfaction score in surveys

#### 5.3.6 Portability
- **Browser Compatibility:**
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+
  
- **Platform Independence:**
  - Runs on Linux, Windows, macOS servers
  - Cloud-ready (AWS, Azure, GCP)
  - Docker containerization support

---
## 6. System Architecture

### 6.1 Technology Stack

#### 6.1.1 Backend Framework
- **Framework:** NestJS v10+
- **Language:** TypeScript 5.x
- **Runtime:** Node.js v16+ (LTS recommended)
- **Architecture Pattern:** Model-View-Controller (MVC) with Dependency Injection

#### 6.1.2 Database Layer
- **RDBMS:** PostgreSQL 12+
- **Spatial Extension:** PostGIS 3.0+
- **ORM:** Sequelize-TypeScript
- **Migrations:** Sequelize CLI
- **Connection Pooling:** pg-pool

#### 6.1.3 Additional Technologies
- **Authentication:** JWT (jsonwebtoken), Passport.js
- **Validation:** class-validator, class-transformer
- **Scheduling:** @nestjs/schedule (cron jobs)
- **Logging:** Winston, Morgan
- **Testing:** Jest, Supertest
- **Documentation:** Swagger/OpenAPI

### 6.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile App  │  Admin Portal  │  Field App      │
└────────┬──────────────┬────────────┬────────────────┬───────────┘
         │              │            │                │
         └──────────────┴────────────┴────────────────┘
                          │ HTTPS/REST
         ┌────────────────▼────────────────┐
         │      Load Balancer / CDN        │
         └────────────────┬────────────────┘
                          │
         ┌────────────────▼────────────────────────────────────┐
         │          NestJS Application Server(s)                │
         ├─────────────────────────────────────────────────────┤
         │  ┌──────────────────────────────────────────────┐   │
         │  │          Controllers Layer                    │   │
         │  │  AuthController │ SurveyController │ etc.    │   │
         │  └──────────────────┬───────────────────────────┘   │
         │                     │                                │
         │  ┌──────────────────▼───────────────────────────┐   │
         │  │          Services Layer                       │   │
         │  │  AuthService │ SurveyService │ StatsService  │   │
         │  └──────────────────┬───────────────────────────┘   │
         │                     │                                │
         │  ┌──────────────────▼───────────────────────────┐   │
         │  │       Repository/ORM Layer                    │   │
         │  │         Sequelize-TypeScript                  │   │
         │  └──────────────────┬───────────────────────────┘   │
         └────────────────────┬┴──────────────────────────────┘
                              │
         ┌────────────────────▼────────────────┐
         │      PostgreSQL + PostGIS           │
         │  ┌──────────────────────────────┐   │
         │  │ Users  │ Surveys  │ Stats    │   │
         │  │ Locations │ Geometries       │   │
         │  └──────────────────────────────┘   │
         └─────────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │   Backup Storage      │
         └───────────────────────┘
```

### 6.3 Module Architecture

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── app.controller.ts                # Root controller
├── app.service.ts                   # Root service
│
├── database/                        # Database configuration
│   ├── database.module.ts
│   ├── database.provider.ts
│   └── database.config.ts
│
├── constants/                       # Application constants
│   └── constants.ts
│
└── modules/                         # Feature modules
    │
    ├── auth/                        # Authentication & Authorization
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── entities/
    │   │   ├── user.entity.ts
    │   │   └── supervisor-dzongkhag.entity.ts
    │   ├── dto/
    │   │   ├── login.dto.ts
    │   │   ├── register.dto.ts
    │   │   └── ...
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts
    │   │   ├── roles.guard.ts
    │   │   └── jwt.strategy.ts
    │   └── decorators/
    │       └── roles.decorator.ts
    │
    ├── location/                    # Geographic hierarchy
    │   ├── dzongkhag/
    │   │   ├── dzongkhag.module.ts
    │   │   ├── dzongkhag.controller.ts
    │   │   ├── dzongkhag.service.ts
    │   │   └── entities/
    │   ├── administrative-zone/
    │   │   └── [similar structure]
    │   ├── sub-administrative-zone/
    │   │   └── [similar structure]
    │   └── enumeration-area/
    │       └── [similar structure]
    │
    ├── survey/                      # Survey operations
    │   ├── survey/
    │   │   ├── survey.module.ts
    │   │   ├── survey.controller.ts
    │   │   └── survey.service.ts
    │   ├── survey-enumeration-area/
    │   │   └── [workflow management]
    │   ├── survey-enumerator/
    │   │   └── [enumerator assignments]
    │   └── survey-enumeration-area-household-listing/
    │       └── [household data]
    │
    ├── annual statistics/           # Statistics aggregation
    │   ├── ea-annual-statistics/
    │   │   ├── ea-annual-stats.module.ts
    │   │   ├── ea-annual-stats.controller.ts
    │   │   ├── ea-annual-stats.service.ts
    │   │   ├── entities/
    │   │   └── dto/
    │   ├── sub-administrative-zone-annual-statistics/
    │   │   └── [SAZ stats with eaCount]
    │   ├── administrative-zone-annual-statistics/
    │   │   └── [AZ stats with eaCount, sazCount]
    │   └── dzongkhag-annual-statistics/
    │       └── [Dzongkhag stats with urban/rural segregation]
    │
    ├── buildings/                   # Building/structure management
    │   ├── buildings.module.ts
    │   ├── buildings.controller.ts
    │   └── buildings.service.ts
    │
    ├── reports/                     # Report generation
    │   ├── reports.module.ts
    │   ├── reports.controller.ts
    │   ├── reports.service.ts
    │   └── templates/
    │
    ├── enumerator-routes/           # Enumerator-specific routes
    │   ├── enumerator-routes.module.ts
    │   ├── enumerator-routes.controller.ts
    │   └── enumerator-routes.service.ts
    │
    └── validators/                  # Custom validators
        └── geojson.validator.ts
```

### 6.4 Design Patterns

#### 6.4.1 Dependency Injection
- NestJS built-in DI container
- Constructor-based injection
- Provider scoping (singleton, transient, request)

#### 6.4.2 Repository Pattern
- Abstraction over data access
- Sequelize repositories
- Testable data layer

#### 6.4.3 DTO Pattern
- Data Transfer Objects for API
- Validation decorators
- Type safety

#### 6.4.4 Guard Pattern
- Authentication guards (JWT)
- Authorization guards (Roles)
- Route protection

#### 6.4.5 Decorator Pattern
- Custom decorators (@Roles, @Public)
- Metadata reflection
- Clean controller syntax

### 6.5 Database Design Principles

#### 6.5.1 Normalization
- Third Normal Form (3NF)
- Minimize data redundancy
- Referential integrity via foreign keys

#### 6.5.2 Indexing Strategy
- Primary keys (auto-indexed)
- Foreign keys for join performance
- Composite indexes for frequent query patterns
- Spatial indexes for geometry columns

#### 6.5.3 Constraints
- NOT NULL constraints for required fields
- UNIQUE constraints for business keys
- CHECK constraints for data validation
- Foreign key constraints with CASCADE rules

#### 6.5.4 Transactions
- ACID compliance
- Explicit transaction management for multi-step operations
- Isolation level: READ COMMITTED

---

## 7. Data Requirements

### 7.1 Database Schema Overview

**Total Tables:** 15

1. Users
2. SupervisorDzongkhags
3. Dzongkhags
4. AdministrativeZones
5. SubAdministrativeZones
6. EnumerationAreas
7. Buildings
8. EAAnnualStats
9. SubAdministrativeZoneAnnualStats (SAZAnnualStats)
10. AdministrativeZoneAnnualStats (AZAnnualStats)
11. DzongkhagAnnualStats
12. Surveys
13. SurveyEnumerationAreas
14. survey_enumerators
15. SurveyEnumerationAreaHouseholdListings

### 7.2 Entity Relationships

**Geographic Hierarchy (1:N):**
```
Dzongkhag (1) → (N) AdministrativeZone
                     ↓ (1:N)
              SubAdministrativeZone
                     ↓ (1:N)
              EnumerationArea
                     ↓ (1:N)
                  Building
```

**Annual Statistics Hierarchy:**
```
EAAnnualStats
     ↓ Aggregates to
SAZAnnualStats (+ eaCount)
     ↓ Aggregates to
AZAnnualStats (+ eaCount, sazCount)
     ↓ Aggregates to
DzongkhagAnnualStats (+ urban/rural segregation)
```

**Survey Workflow:**
```
Survey ←→ SurveyEnumerationAreas ←→ EnumerationArea
   ↓              ↓
   ↓    SurveyEnumerationAreaHouseholdListings
   ↓
survey_enumerators ←→ Users (Enumerators)
```

### 7.3 Data Integrity Rules

#### 7.3.1 Unique Constraints
- **Users:** `cid`, `emailAddress`
- **Buildings:** `structureId`
- **SurveyEnumerationAreas:** `(surveyId, enumerationAreaId)`
- **SurveyEnumerationAreaHouseholdListings:** `(surveyEnumerationAreaId, householdSerialNumber)`
- **survey_enumerators:** `(userId, surveyId)`
- **EAAnnualStats:** `(enumerationAreaId, year)`
- **SAZAnnualStats:** `(subAdministrativeZoneId, year)`
- **AZAnnualStats:** `(administrativeZoneId, year)`
- **DzongkhagAnnualStats:** `(dzongkhagId, year)`

#### 7.3.2 Foreign Key Constraints
- All foreign keys with appropriate CASCADE or RESTRICT rules
- Cannot delete parent records with dependent children
- Orphan prevention via database constraints

#### 7.3.3 Check Constraints
- Demographic counts (male, female) ≥ 0
- Household serial numbers > 0
- Area measurements > 0
- Dates: startDate ≤ endDate

### 7.4 Data Volume Estimates

| Entity | Estimated Records |
|--------|------------------|
| Dzongkhags | 20 |
| AdministrativeZones | ~200 |
| SubAdministrativeZones | ~1,000 |
| EnumerationAreas | ~10,000 |
| Buildings | ~500,000 |
| Users | ~1,000 |
| Surveys | ~50 (cumulative) |
| SurveyEnumerationAreas | ~100,000 |
| Household Listings | ~1,000,000 |
| Annual Statistics (all levels) | ~50,000/year |

### 7.5 Backup and Recovery

**Backup Strategy:**
- **Frequency:** Daily full backups, hourly incremental
- **Retention:** 30 days online, 1 year archive
- **Storage:** Encrypted off-site storage
- **Testing:** Monthly restore testing

**Recovery Procedures:**
- Point-in-time recovery capability
- Transaction log shipping
- Automated failover for critical failures

---

## 8. Appendix

### 8.1 Entity Relationship Diagram (ERD)

Refer to the complete ERD documentation in `DATABASE_ERD.md` for detailed entity relationships, field definitions, and database schema.

**Key ERD Highlights:**
- 15 interconnected tables
- 4-level geographic hierarchy
- Urban/rural segregation at dzongkhag level
- Workflow state tracking
- Audit trail fields (createdAt, updatedAt, submittedBy, validatedBy)
- Spatial data (PostGIS GEOMETRY type, SRID 4326)

### 8.2 Data Dictionary

#### 8.2.1 Users Table

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | Primary Key, Auto-increment | Unique user identifier |
| `name` | STRING | Not Null | Full name of the user |
| `cid` | STRING | Unique, Not Null | Citizenship ID (Bhutan national ID) |
| `emailAddress` | STRING | Unique, Not Null | Email for login and notifications |
| `phoneNumber` | STRING | Nullable | Contact phone number |
| `password` | STRING | Not Null | Bcrypt hashed password |
| `role` | ENUM | Not Null | ADMIN, SUPERVISOR, ENUMERATOR |
| `createdAt` | TIMESTAMP | Auto | Account creation timestamp |
| `updatedAt` | TIMESTAMP | Auto | Last modification timestamp |

#### 8.2.2 SurveyEnumerationAreas Table

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | Primary Key | Unique identifier |
| `surveyId` | INTEGER | Foreign Key, Not Null | References Surveys table |
| `enumerationAreaId` | INTEGER | Foreign Key, Not Null | References EnumerationAreas table |
| `isSubmitted` | BOOLEAN | Default: false | Data submission status |
| `submittedBy` | INTEGER | Foreign Key, Nullable | References Users (who submitted) |
| `submissionDate` | TIMESTAMP | Nullable | When data was submitted |
| `isValidated` | BOOLEAN | Default: false | Validation status |
| `validatedBy` | INTEGER | Foreign Key, Nullable | References Users (who validated) |
| `validationDate` | TIMESTAMP | Nullable | When data was validated |
| `comments` | TEXT | Nullable | Feedback or rejection reasons |
| `createdAt` | TIMESTAMP | Auto | Record creation |
| `updatedAt` | TIMESTAMP | Auto | Last update |

**Unique Constraint:** `(surveyId, enumerationAreaId)`

#### 8.2.3 DzongkhagAnnualStats Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary Key |
| `dzongkhagId` | INTEGER | Foreign Key to Dzongkhags |
| `year` | INTEGER | Statistical year |
| **EA Counts** | | |
| `eaCount` | INTEGER | Total enumeration areas |
| `urbanEACount` | INTEGER | EAs under Thromdes (urban) |
| `ruralEACount` | INTEGER | EAs under Gewogs (rural) |
| **SAZ Counts** | | |
| `sazCount` | INTEGER | Total sub-administrative zones |
| `urbanSAZCount` | INTEGER | Laps (urban wards) |
| `ruralSAZCount` | INTEGER | Chiwogs (rural villages) |
| **AZ Counts** | | |
| `azCount` | INTEGER | Total administrative zones |
| `urbanAZCount` | INTEGER | Thromdes (urban municipalities) |
| `ruralAZCount` | INTEGER | Gewogs (rural blocks) |
| **Household Counts** | | |
| `totalHouseholds` | INTEGER | Total households in dzongkhag |
| `urbanHouseholdCount` | INTEGER | Households in urban areas |
| `ruralHouseholdCount` | INTEGER | Households in rural areas |
| **Male Population** | | |
| `totalMale` | INTEGER | Total male population |
| `urbanMale` | INTEGER | Male in urban areas |
| `ruralMale` | INTEGER | Male in rural areas |
| **Female Population** | | |
| `totalFemale` | INTEGER | Total female population |
| `urbanFemale` | INTEGER | Female in urban areas |
| `ruralFemale` | INTEGER | Female in rural areas |
| `createdAt` | TIMESTAMP | Record creation |
| `updatedAt` | TIMESTAMP | Last update |

**Unique Constraint:** `(dzongkhagId, year)`

### 8.3 Sample SQL Queries

#### 8.3.1 Survey Progress Monitoring

```sql
-- Get survey completion statistics
SELECT 
  s.id,
  s.name as survey_name,
  s.year,
  COUNT(sea.id) as total_assigned_areas,
  SUM(CASE WHEN sea.isSubmitted THEN 1 ELSE 0 END) as submitted_areas,
  SUM(CASE WHEN sea.isValidated THEN 1 ELSE 0 END) as validated_areas,
  ROUND(
    (SUM(CASE WHEN sea.isValidated THEN 1 ELSE 0 END) * 100.0 / COUNT(sea.id)),
    2
  ) as completion_percentage
FROM Surveys s
LEFT JOIN SurveyEnumerationAreas sea ON s.id = sea.surveyId
WHERE s.status = 'ACTIVE'
GROUP BY s.id, s.name, s.year
ORDER BY s.year DESC, s.name;
```

#### 8.3.2 Household Statistics by Survey

```sql
-- Aggregate household data for a survey
SELECT 
  sea.surveyId,
  s.name as survey_name,
  COUNT(DISTINCT hl.id) as total_households,
  SUM(hl.totalMale) as total_male,
  SUM(hl.totalFemale) as total_female,
  (SUM(hl.totalMale) + SUM(hl.totalFemale)) as total_population
FROM SurveyEnumerationAreaHouseholdListings hl
JOIN SurveyEnumerationAreas sea ON hl.surveyEnumerationAreaId = sea.id
JOIN Surveys s ON sea.surveyId = s.id
WHERE sea.isValidated = true
GROUP BY sea.surveyId, s.name;
```

#### 8.3.3 Geographic Coverage Analysis

```sql
-- Show geographic structure with counts
SELECT 
  d.id as dzongkhag_id,
  d.name as dzongkhag,
  COUNT(DISTINCT az.id) as administrative_zones,
  COUNT(DISTINCT saz.id) as sub_administrative_zones,
  COUNT(DISTINCT ea.id) as enumeration_areas,
  SUM(CASE WHEN az.type = 'THROMDE' THEN 1 ELSE 0 END) as urban_zones,
  SUM(CASE WHEN az.type = 'GEWOG' THEN 1 ELSE 0 END) as rural_zones
FROM Dzongkhags d
LEFT JOIN AdministrativeZones az ON d.id = az.dzongkhagId
LEFT JOIN SubAdministrativeZones saz ON az.id = saz.administrativeZoneId
LEFT JOIN EnumerationAreas ea ON saz.id = ea.subAdministrativeZoneId
GROUP BY d.id, d.name
ORDER BY d.name;
```

#### 8.3.4 Year-over-Year Growth Analysis

```sql
-- Calculate year-over-year household growth
SELECT 
  curr.enumerationAreaId,
  ea.name as enumeration_area,
  ea.areaCode,
  curr.year as current_year,
  curr.totalHouseholds as current_households,
  prev.totalHouseholds as previous_households,
  (curr.totalHouseholds - prev.totalHouseholds) as household_growth,
  ROUND(
    ((curr.totalHouseholds - prev.totalHouseholds) * 100.0 / 
    NULLIF(prev.totalHouseholds, 0)),
    2
  ) as growth_percentage
FROM EAAnnualStats curr
LEFT JOIN EAAnnualStats prev 
  ON curr.enumerationAreaId = prev.enumerationAreaId 
  AND prev.year = curr.year - 1
JOIN EnumerationAreas ea ON curr.enumerationAreaId = ea.id
WHERE curr.year = 2025
ORDER BY growth_percentage DESC NULLS LAST
LIMIT 20;
```

#### 8.3.5 Dzongkhag Urban/Rural Statistics

```sql
-- Get urban/rural breakdown for all dzongkhags
SELECT 
  d.id,
  d.name as dzongkhag,
  das.year,
  das.totalHouseholds,
  das.urbanHouseholdCount,
  das.ruralHouseholdCount,
  ROUND(
    (das.urbanHouseholdCount * 100.0 / NULLIF(das.totalHouseholds, 0)),
    2
  ) as urban_percentage,
  das.urbanAZCount as thromde_count,
  das.ruralAZCount as gewog_count,
  das.urbanEACount,
  das.ruralEACount,
  (das.totalMale + das.totalFemale) as total_population,
  (das.urbanMale + das.urbanFemale) as urban_population,
  (das.ruralMale + das.ruralFemale) as rural_population,
  ROUND(
    ((das.urbanMale + das.urbanFemale) * 100.0 / 
    NULLIF((das.totalMale + das.totalFemale), 0)),
    2
  ) as urbanization_rate
FROM DzongkhagAnnualStats das
JOIN Dzongkhags d ON das.dzongkhagId = d.id
WHERE das.year = 2025
ORDER BY urbanization_rate DESC;
```

#### 8.3.6 National Urban/Rural Aggregation

```sql
-- National-level statistics with urban/rural breakdown
SELECT 
  das.year,
  COUNT(DISTINCT das.dzongkhagId) as total_dzongkhags,
  SUM(das.azCount) as total_administrative_zones,
  SUM(das.urbanAZCount) as total_thromdes,
  SUM(das.ruralAZCount) as total_gewogs,
  SUM(das.sazCount) as total_sazs,
  SUM(das.eaCount) as total_eas,
  SUM(das.totalHouseholds) as national_total_households,
  SUM(das.urbanHouseholdCount) as national_urban_households,
  SUM(das.ruralHouseholdCount) as national_rural_households,
  SUM(das.totalMale + das.totalFemale) as national_population,
  SUM(das.urbanMale + das.urbanFemale) as national_urban_population,
  SUM(das.ruralMale + das.ruralFemale) as national_rural_population,
  ROUND(
    (SUM(das.urbanMale + das.urbanFemale) * 100.0 / 
    NULLIF(SUM(das.totalMale + das.totalFemale), 0)),
    2
  ) as national_urbanization_rate
FROM DzongkhagAnnualStats das
WHERE das.year = 2025
GROUP BY das.year;
```

#### 8.3.7 Enumerator Workload Analysis

```sql
-- Track enumerator assignments and completion
SELECT 
  u.id as enumerator_id,
  u.name as enumerator_name,
  s.name as survey_name,
  COUNT(sea.id) as assigned_eas,
  SUM(CASE WHEN sea.isSubmitted THEN 1 ELSE 0 END) as submitted_eas,
  SUM(CASE WHEN sea.isValidated THEN 1 ELSE 0 END) as validated_eas,
  COUNT(DISTINCT hl.id) as households_collected,
  ROUND(
    (SUM(CASE WHEN sea.isSubmitted THEN 1 ELSE 0 END) * 100.0 / 
    NULLIF(COUNT(sea.id), 0)),
    2
  ) as completion_rate
FROM Users u
JOIN survey_enumerators se ON u.id = se.userId
JOIN Surveys s ON se.surveyId = s.id
LEFT JOIN SurveyEnumerationAreas sea ON s.id = sea.surveyId AND sea.submittedBy = u.id
LEFT JOIN SurveyEnumerationAreaHouseholdListings hl ON sea.id = hl.surveyEnumerationAreaId
WHERE u.role = 'ENUMERATOR'
GROUP BY u.id, u.name, s.id, s.name
ORDER BY completion_rate DESC;
```

### 8.4 API Endpoints Summary

#### 8.4.1 Authentication Endpoints

| Endpoint | Method | Description | Access | Request Body | Response |
|----------|--------|-------------|--------|--------------|----------|
| `/api/auth/login` | POST | User login | Public | `{ emailAddress, password }` | `{ accessToken, user }` |
| `/api/auth/register` | POST | Create user account | Admin | `{ name, cid, emailAddress, password, role }` | `{ user }` |
| `/api/auth/forgot-password` | POST | Request password reset | Public | `{ emailAddress }` | `{ message }` |
| `/api/auth/reset-password` | POST | Reset password with token | Public | `{ token, newPassword }` | `{ message }` |
| `/api/auth/change-password` | POST | Change own password | Authenticated | `{ oldPassword, newPassword }` | `{ message }` |

#### 8.4.2 User Management Endpoints

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/users` | GET | List all users | Admin |
| `/api/users/:id` | GET | Get user details | Admin, Self |
| `/api/users` | POST | Create new user | Admin |
| `/api/users/:id` | PATCH | Update user | Admin, Self (limited) |
| `/api/users/:id` | DELETE | Delete user | Admin |
| `/api/users/:id/dzongkhags` | POST | Assign supervisor to dzongkhag | Admin |

#### 8.4.3 Survey Management Endpoints

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/surveys` | GET | List surveys | Admin, Supervisor |
| `/api/surveys/:id` | GET | Get survey details | Admin, Supervisor, Enumerator |
| `/api/surveys` | POST | Create survey | Admin |
| `/api/surveys/:id` | PATCH | Update survey | Admin |
| `/api/surveys/:id/enumeration-areas` | POST | Assign EAs to survey | Admin |
| `/api/surveys/:id/enumerators` | POST | Assign enumerators | Admin, Supervisor |

#### 8.4.4 Survey Enumeration Area Endpoints

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/survey-enumeration-areas` | GET | List survey EAs | Role-based filter |
| `/api/survey-enumeration-areas/:id` | GET | Get EA details | Assigned users |
| `/api/survey-enumeration-areas/:id/submit` | POST | Submit EA data | Enumerator, Supervisor |
| `/api/survey-enumeration-areas/:id/validate` | POST | Validate EA data | Admin |
| `/api/survey-enumeration-areas/:id/reject` | POST | Reject EA data | Admin |

#### 8.4.5 Household Listings Endpoints

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/household-listings` | GET | List households | Role-based filter |
| `/api/household-listings` | POST | Create household entry | Enumerator |
| `/api/household-listings/:id` | GET | Get household details | Assigned users |
| `/api/household-listings/:id` | PATCH | Update household | Enumerator (before submit) |
| `/api/household-listings/:id` | DELETE | Delete household | Enumerator (before submit) |

#### 8.4.6 Annual Statistics Endpoints

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/ea-annual-stats` | GET | Get EA statistics | Authenticated |
| `/api/ea-annual-stats/:id` | GET | Get specific EA stats | Authenticated |
| `/api/saz-annual-stats` | GET | Get SAZ statistics | Authenticated |
| `/api/az-annual-stats` | GET | Get AZ statistics | Authenticated |
| `/api/dzongkhag-annual-stats` | GET | Get Dzongkhag statistics | Authenticated |
| `/api/dzongkhag-annual-stats/compute` | POST | Manual statistics computation | Admin |

**Query Parameters for Statistics:**
- `year`: Filter by year (default: current year)
- `dzongkhagId`: Filter by dzongkhag
- `startYear`, `endYear`: Date range for trends

#### 8.4.7 Geographic Endpoints

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/dzongkhags` | GET | List dzongkhags | Authenticated |
| `/api/dzongkhags/:id` | GET | Get dzongkhag details | Authenticated |
| `/api/administrative-zones` | GET | List AZs | Authenticated |
| `/api/administrative-zones/:id` | GET | Get AZ details | Authenticated |
| `/api/sub-administrative-zones` | GET | List SAZs | Authenticated |
| `/api/enumeration-areas` | GET | List EAs | Authenticated |
| `/api/enumeration-areas/:id` | GET | Get EA details | Authenticated |

#### 8.4.8 Report Endpoints

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/reports/survey-progress/:surveyId` | GET | Survey progress report | Admin, Supervisor |
| `/api/reports/geographic-coverage` | GET | Geographic coverage report | Admin |
| `/api/reports/demographic-analysis` | GET | Demographic analysis report | Admin |
| `/api/reports/urbanization-trends` | GET | Urbanization trends report | Admin |

### 8.5 Glossary of Terms

| Term | Definition |
|------|------------|
| **Aggregation** | Process of combining data from multiple lower-level entities into summary statistics at higher levels |
| **Audit Trail** | Historical record of data changes and user actions for accountability |
| **Bcrypt** | Password hashing algorithm used for secure password storage |
| **Bottom-up Aggregation** | Data aggregation starting from the lowest level (EA) and moving up to higher levels (SAZ → AZ → Dzongkhag) |
| **CRUD** | Create, Read, Update, Delete - basic database operations |
| **Idempotent** | Operation that produces the same result regardless of how many times it's executed |
| **Junction Table** | Database table that creates many-to-many relationships between two entities |
| **ORM** | Object-Relational Mapping - technique for converting data between incompatible type systems |
| **Spatial Query** | Database query involving geographic/geometric data and spatial relationships |
| **Upsert** | Database operation that updates a record if it exists, or creates it if it doesn't |
| **Workflow State** | Current status of a process (e.g., Not Submitted, Submitted, Validated) |

### 8.6 Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-Q1 | 1.0 | Initial release with core functionality | Development Team |
| 2024-Q3 | 1.5 | Added survey workflow and validation | Development Team |
| 2025-11-13 | 2.0 | • Added urban/rural segregation<br>• Implemented hierarchical statistics aggregation<br>• Added automated cron jobs<br>• Enhanced annual statistics with counts<br>• Implemented upsert pattern | Development Team |

### 8.7 References and Resources

**Documentation:**
- [NestJS Official Documentation](https://docs.nestjs.com/)
- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

**Standards:**
- ISO 3166 (Country Codes)
- ISO 8601 (Date and Time Format)
- GeoJSON Specification (RFC 7946)
- WCAG 2.1 (Web Accessibility Guidelines)

**Bhutan-Specific Resources:**
- National Statistics Bureau of Bhutan
- Bhutan Geographic Data Standards
- Administrative Boundary Definitions

---

## Approval and Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Project Manager** | | | |
| **Technical Lead** | | | |
| **Database Administrator** | | | |
| **Quality Assurance Lead** | | | |
| **Client Representative (NSB)** | | | |
| **System Architect** | | | |

---

## Document End

**Document Version:** 2.0  
**Last Updated:** November 13, 2025  
**Next Review Date:** May 2026  

**Contact Information:**  
NSFD Development Team  
**Location:** Segment X, Babesa, Thimphu Thromde  
**Email:** nsfd-support@nsb.gov.bt | segmentx22@gmail.com  
**Phone:** +975 17263764  

---

*This Software Requirements Specification (SRS) document is confidential and proprietary to the National Statistics Bureau, Bhutan. Unauthorized distribution or reproduction is prohibited.*			
