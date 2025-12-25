# NSFD Backend - Complete Entity Relationship Diagram (ERD)

## Overview

This ERD represents the complete database schema for the National Statistical Field Database (NSFD) Backend system, organized by modules and showing all entity relationships.

---

## Complete Entity Relationship Diagram

```mermaid
erDiagram
    %% ===== AUTH MODULE =====
    Users {
        int id PK
        string name
        string cid UK
        string emailAddress UK
        string phoneNumber
        string password
        enum role "ADMIN|SUPERVISOR|ENUMERATOR"
        timestamp createdAt
        timestamp updatedAt
    }

    SupervisorDzongkhags {
        int id PK
        int supervisorId FK
        int dzongkhagId FK
        timestamp createdAt
        timestamp updatedAt
    }

    %% ===== LOCATION MODULE =====
    Dzongkhags {
        int id PK
        string name
        string areaCode
        double areaSqKm
        geometry geom "MULTIPOLYGON, SRID 4326"
    }

    AdministrativeZones {
        int id PK
        int dzongkhagId FK
        string name
        string areaCode
        enum type "Gewog|Thromde"
        geometry geom "MULTIPOLYGON, SRID 4326"
    }

    SubAdministrativeZones {
        int id PK
        int administrativeZoneId FK
        string name
        string areaCode
        enum type "chiwog|lap"
        geometry geom "MULTIPOLYGON, SRID 4326"
    }

    EnumerationAreas {
        int id PK
        string name
        string description
        string areaCode
        int subAdministrativeZoneId FK
        geometry geom "MULTIPOLYGON, SRID 4326"
        boolean isActive
        timestamp deactivatedAt
    }

    EnumerationAreaSubAdministrativeZones {
        int enumerationAreaId PK_FK
        int subAdministrativeZoneId PK_FK
    }

    EnumerationAreaLineages {
        int id PK
        int parentEaId FK
        int childEaId FK
        enum operationType "SPLIT|MERGE"
        date operationDate
        text reason
    }

    Buildings {
        int id PK
        int structureId UK
        int enumerationAreaId FK
        string source
        geometry geom "MULTIPOLYGON, SRID 4326"
    }

    %% ===== SURVEY MODULE =====
    Surveys {
        int id PK
        string name
        string description
        date startDate
        date endDate
        int year
        enum status "DRAFT|ACTIVE|COMPLETED|ARCHIVED"
        boolean isFullyValidated
        timestamp createdAt
        timestamp updatedAt
    }

    SurveyEnumerationAreas {
        int id PK
        int surveyId FK
        int enumerationAreaId FK
        int enumeratorId FK
        text comments
        boolean isEnumerated
        boolean isSampled
        boolean isPublished
        date publishedDate
        int submittedBy FK
        int validatedBy FK
        timestamp submittedAt
        timestamp validatedAt
        timestamp createdAt
        timestamp updatedAt
    }

    SurveyEnumerators {
        int userId PK_FK
        int surveyId PK_FK
        timestamp createdAt
        timestamp updatedAt
    }

    SurveyEnumerationAreaStructures {
        int id PK
        int surveyEnumerationAreaId FK
        string structureNumber UK
        decimal latitude
        decimal longitude
        timestamp createdAt
        timestamp updatedAt
    }

    SurveyEnumerationAreaHouseholdListings {
        int id PK
        int surveyEnumerationAreaId FK
        int structureId FK
        string serialNumber
        string householdHeadName
        string phoneNumber
        int totalMale
        int totalFemale
        text remarks
        int submittedBy FK
        timestamp submittedAt
        timestamp createdAt
        timestamp updatedAt
    }

    %% ===== SAMPLING MODULE =====
    SurveySamplingConfigs {
        int id PK
        int surveyId FK UK
        enum defaultMethod "CSS|SRS"
        int defaultSampleSize
        int urbanSampleSize
        int ruralSampleSize
        int createdBy FK
        int updatedBy FK
        timestamp createdAt
        timestamp updatedAt
    }

    SurveyEnumerationAreaSamplings {
        int id PK
        int surveyEnumerationAreaId FK
        int surveyId FK
        enum method "CSS|SRS"
        int sampleSize
        boolean isSampled
        timestamp sampledAt
        timestamp createdAt
        timestamp updatedAt
    }

    SurveyEnumerationAreaHouseholdSamples {
        int id PK
        int surveyEnumerationAreaSamplingId FK
        int householdListingId FK
        int serialNumber
        timestamp createdAt
        timestamp updatedAt
    }

    %% ===== ANNUAL STATISTICS MODULE =====
    EAAnnualStats {
        int id PK
        int enumerationAreaId FK
        int year
        int totalHouseholds
        int totalMale
        int totalFemale
        timestamp createdAt
        timestamp updatedAt
    }

    SubAdministrativeZoneAnnualStats {
        int id PK
        int subAdministrativeZoneId FK
        int year
        int eaCount
        int totalHouseholds
        int totalMale
        int totalFemale
        timestamp createdAt
        timestamp updatedAt
    }

    AdministrativeZoneAnnualStats {
        int id PK
        int administrativeZoneId FK
        int year
        int eaCount
        int sazCount
        int totalHouseholds
        int totalMale
        int totalFemale
        timestamp createdAt
        timestamp updatedAt
    }

    DzongkhagAnnualStats {
        int id PK
        int dzongkhagId FK
        int year
        int eaCount
        int urbanEACount
        int ruralEACount
        int sazCount
        int urbanSAZCount
        int ruralSAZCount
        int azCount
        int urbanAZCount
        int ruralAZCount
        int totalHouseholds
        int urbanHouseholdCount
        int ruralHouseholdCount
        int totalMale
        int urbanMale
        int ruralMale
        int totalFemale
        int urbanFemale
        int ruralFemale
        timestamp createdAt
        timestamp updatedAt
    }

    %% ===== RELATIONSHIPS =====
    
    %% Auth Module Relationships
    Users ||--o{ SupervisorDzongkhags : "supervisorId"
    Dzongkhags ||--o{ SupervisorDzongkhags : "dzongkhagId"
    Users ||--o{ SurveyEnumerators : "userId"
    Surveys ||--o{ SurveyEnumerators : "surveyId"
    Users ||--o{ SurveyEnumerationAreas : "enumeratorId"
    Users ||--o{ SurveyEnumerationAreas : "submittedBy"
    Users ||--o{ SurveyEnumerationAreas : "validatedBy"
    Users ||--o{ SurveyEnumerationAreaHouseholdListings : "submittedBy"
    Users ||--o{ SurveySamplingConfigs : "createdBy"
    Users ||--o{ SurveySamplingConfigs : "updatedBy"

    %% Location Module Relationships
    Dzongkhags ||--o{ AdministrativeZones : "dzongkhagId"
    AdministrativeZones ||--o{ SubAdministrativeZones : "administrativeZoneId"
    SubAdministrativeZones ||--o{ EnumerationAreas : "subAdministrativeZoneId"
    EnumerationAreas ||--o{ EnumerationAreaSubAdministrativeZones : "enumerationAreaId"
    SubAdministrativeZones ||--o{ EnumerationAreaSubAdministrativeZones : "subAdministrativeZoneId"
    EnumerationAreas ||--o{ EnumerationAreaLineages : "parentEaId"
    EnumerationAreas ||--o{ EnumerationAreaLineages : "childEaId"
    EnumerationAreas ||--o{ Buildings : "enumerationAreaId"

    %% Survey Module Relationships
    Surveys ||--o{ SurveyEnumerationAreas : "surveyId"
    EnumerationAreas ||--o{ SurveyEnumerationAreas : "enumerationAreaId"
    SurveyEnumerationAreas ||--o{ SurveyEnumerationAreaStructures : "surveyEnumerationAreaId"
    SurveyEnumerationAreaStructures ||--o{ SurveyEnumerationAreaHouseholdListings : "structureId"
    SurveyEnumerationAreas ||--o{ SurveyEnumerationAreaHouseholdListings : "surveyEnumerationAreaId"

    %% Sampling Module Relationships
    Surveys ||--o{ SurveySamplingConfigs : "surveyId"
    SurveyEnumerationAreas ||--o{ SurveyEnumerationAreaSamplings : "surveyEnumerationAreaId"
    Surveys ||--o{ SurveyEnumerationAreaSamplings : "surveyId"
    SurveyEnumerationAreaSamplings ||--o{ SurveyEnumerationAreaHouseholdSamples : "surveyEnumerationAreaSamplingId"
    SurveyEnumerationAreaHouseholdListings ||--o{ SurveyEnumerationAreaHouseholdSamples : "householdListingId"

    %% Annual Statistics Module Relationships
    EnumerationAreas ||--o{ EAAnnualStats : "enumerationAreaId"
    SubAdministrativeZones ||--o{ SubAdministrativeZoneAnnualStats : "subAdministrativeZoneId"
    AdministrativeZones ||--o{ AdministrativeZoneAnnualStats : "administrativeZoneId"
    Dzongkhags ||--o{ DzongkhagAnnualStats : "dzongkhagId"
```

---

## Module Organization

### 1. **Auth Module**
- **Users**: Central user management with role-based access (ADMIN, SUPERVISOR, ENUMERATOR)
- **SupervisorDzongkhags**: Junction table for supervisor-dzongkhag assignments

### 2. **Location Module**
- **Dzongkhags**: Top-level administrative division (20 dzongkhags in Bhutan)
- **AdministrativeZones**: Second-level (Gewogs/Thromdes)
- **SubAdministrativeZones**: Third-level (Chiwogs/Laps)
- **EnumerationAreas**: Smallest geographic unit for data collection
- **EnumerationAreaSubAdministrativeZones**: Many-to-many junction table
- **EnumerationAreaLineages**: Tracks EA split/merge history
- **Buildings**: Physical structures within enumeration areas

### 3. **Survey Module**
- **Surveys**: Survey definitions and metadata
- **SurveyEnumerationAreas**: Assignment of EAs to surveys with workflow status
- **SurveyEnumerators**: Many-to-many relationship between users and surveys
- **SurveyEnumerationAreaStructures**: Physical structures in survey EAs
- **SurveyEnumerationAreaHouseholdListings**: Household data collection records

### 4. **Sampling Module**
- **SurveySamplingConfigs**: Sampling configuration per survey
- **SurveyEnumerationAreaSamplings**: Sampling execution per EA
- **SurveyEnumerationAreaHouseholdSamples**: Selected households for sampling

### 5. **Annual Statistics Module**
- **EAAnnualStats**: Annual aggregated statistics at EA level
- **SubAdministrativeZoneAnnualStats**: Aggregated statistics at SAZ level
- **AdministrativeZoneAnnualStats**: Aggregated statistics at AZ level
- **DzongkhagAnnualStats**: Aggregated statistics at Dzongkhag level

---

## Key Relationships Summary

### Geographic Hierarchy (1:N)
```
Dzongkhag (1) → (N) AdministrativeZone
                     ↓ (1:N)
              SubAdministrativeZone
                     ↓ (1:N)
              EnumerationArea
                     ↓ (1:N)
                  Building
```

### Survey Workflow
```
Survey (1) → (N) SurveyEnumerationArea → (N) SurveyEnumerationAreaStructure
                                                      ↓ (1:N)
                                    SurveyEnumerationAreaHouseholdListing
```

### Annual Statistics Aggregation
```
EAAnnualStats → SubAdministrativeZoneAnnualStats → AdministrativeZoneAnnualStats → DzongkhagAnnualStats
```

### User Assignments
- **Supervisors** → Dzongkhags (Many-to-Many via SupervisorDzongkhags)
- **Enumerators** → Surveys (Many-to-Many via SurveyEnumerators)
- **Enumerators** → SurveyEnumerationAreas (One-to-Many)

---

## Notes

- All tables use integer primary keys with auto-increment
- Foreign keys maintain referential integrity
- Unique constraints on composite keys where appropriate
- Timestamps (createdAt, updatedAt) on most tables for audit trails
- Geometry columns use PostGIS MULTIPOLYGON with SRID 4326
- Enum types used for status fields and classifications
- Junction tables support many-to-many relationships

