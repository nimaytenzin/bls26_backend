# NSFD Admin Training Agenda
## National Sampling Frame Dashboard - 2-Day Training Program

**Training Duration:** 2 Days (16 hours total)  
**Target Audience:** System Administrators  
**Training Format:** Hands-on workshop with practical exercises  
**Prerequisites:** Basic computer literacy, understanding of statistical operations

---

## Table of Contents

1. [Day 1: System Fundamentals & Geographic Management](#day-1-system-fundamentals--geographic-management)
2. [Day 2: Survey Operations & Data Management](#day-2-survey-operations--data-management)
3. [Training Materials & Resources](#training-materials--resources)
4. [Assessment & Certification](#assessment--certification)

---

## Day 1: System Fundamentals & Geographic Management

### Session 1: Introduction & System Overview (9:00 AM - 10:30 AM)

**Duration:** 1.5 hours

#### Topics Covered:
- **Welcome & Introductions**
  - Trainer introduction
  - Participant introductions
  - Training objectives and expectations

- **NSFD System Overview**
  - Purpose and scope of the National Sampling Frame Dashboard
  - System architecture and components
  - Key stakeholders and user roles
  - System benefits and use cases

- **System Access & Navigation**
  - Accessing the NSFD system
  - Dashboard overview
  - Navigation menu and interface elements
  - User profile management

#### Hands-on Exercise:
- Log in to the system
- Navigate through main sections
- Update user profile
- Explore dashboard widgets

**Break:** 10:30 AM - 10:45 AM (15 minutes)

---

### Session 2: Authentication & User Management (10:45 AM - 12:30 PM)

**Duration:** 1.75 hours

#### Topics Covered:
- **User Roles & Permissions**
  - Admin role capabilities
  - Supervisor role overview
  - Enumerator role overview
  - Role-based access control (RBAC)

- **User Account Management**
  - Creating new user accounts
  - User registration process
  - User profile management
  - Account activation/deactivation
  - Password management policies

- **Supervisor-Dzongkhag Assignment**
  - Assigning supervisors to dzongkhags
  - Managing supervisor assignments
  - Viewing assignment history
  - Bulk assignment operations

- **Security Best Practices**
  - Password policies
  - Session management
  - Security audit trails
  - Handling security incidents

#### Hands-on Exercises:
1. **Create User Accounts**
   - Create a new supervisor account
   - Create a new enumerator account
   - Set appropriate roles and permissions

2. **Manage Supervisor Assignments**
   - Assign supervisor to dzongkhag
   - View all supervisor-dzongkhag relationships
   - Modify existing assignments

3. **User Management Operations**
   - Deactivate a user account
   - Reset user password
   - View user activity logs

**Lunch Break:** 12:30 PM - 1:30 PM (1 hour)

---

### Session 3: Geographic Hierarchy Management - Part 1 (1:30 PM - 3:00 PM)

**Duration:** 1.5 hours

#### Topics Covered:
- **Understanding the Geographic Hierarchy**
  - Four-level hierarchy structure:
    - Level 1: Dzongkhag (District)
    - Level 2: Administrative Zone (Gewog/Thromde)
    - Level 3: Sub-Administrative Zone (Chiwog/Lap)
    - Level 4: Enumeration Area (EA)
  - Urban vs Rural classification
  - Geographic relationships and dependencies

- **Dzongkhag Management**
  - Viewing dzongkhag list
  - Creating new dzongkhag entries
  - Updating dzongkhag information
  - Dzongkhag area codes and naming conventions

- **Administrative Zone Management**
  - Creating administrative zones
  - Gewog vs Thromde classification
  - Linking administrative zones to dzongkhags
  - Area calculations and measurements

#### Hands-on Exercises:
1. **Dzongkhag Operations**
   - Create a new dzongkhag entry
   - Update dzongkhag details
   - View dzongkhag statistics

2. **Administrative Zone Operations**
   - Create a new Gewog
   - Create a new Thromde
   - Link administrative zones to dzongkhags
   - View administrative zone hierarchy

**Break:** 3:00 PM - 3:15 PM (15 minutes)

---

### Session 4: Geographic Hierarchy Management - Part 2 (3:15 PM - 5:00 PM)

**Duration:** 1.75 hours

#### Topics Covered:
- **Sub-Administrative Zone (SAZ) Management**
  - Creating sub-administrative zones
  - Chiwog vs Lap classification
  - Linking SAZ to administrative zones
  - SAZ area codes and naming

- **Enumeration Area (EA) Management**
  - Creating enumeration areas
  - Linking EA to sub-administrative zones
  - EA area codes and descriptions
  - EA area calculations

- **GeoJSON Data Management**
  - Understanding GeoJSON format
  - Uploading GeoJSON files
  - Bulk upload operations
  - Geometry validation
  - Updating existing geometries

- **Spatial Data Operations**
  - Viewing boundaries on map
  - Spatial queries and operations
  - Area calculations
  - Boundary validation

#### Hands-on Exercises:
1. **Sub-Administrative Zone Operations**
   - Create a new Chiwog
   - Create a new Lap
   - Link SAZ to administrative zone
   - Upload SAZ geometry via GeoJSON

2. **Enumeration Area Operations**
   - Create multiple enumeration areas
   - Link EAs to sub-administrative zones
   - Upload EA geometry via GeoJSON file
   - View EA boundaries on map

3. **Bulk Upload Operations**
   - Prepare GeoJSON FeatureCollection file
   - Upload multiple SAZs via bulk upload
   - Upload multiple EAs via bulk upload
   - Handle upload errors and validation

4. **Geometry Management**
   - Update existing zone geometry
   - Replace geometry from GeoJSON file
   - Validate geometry integrity
   - Export boundaries as GeoJSON

**End of Day 1 Review:** 5:00 PM - 5:15 PM
- Q&A session
- Day 1 recap
- Preview of Day 2 topics

---

## Day 2: Survey Operations & Data Management

### Session 5: Survey Lifecycle Management (9:00 AM - 10:30 AM)

**Duration:** 1.5 hours

#### Topics Covered:
- **Survey Creation & Configuration**
  - Creating new surveys
  - Survey naming and identification
  - Survey status management (Active/Ended)
  - Survey metadata and descriptions

- **Enumeration Area Assignment**
  - Assigning EAs to surveys
  - Bulk EA assignment
  - Viewing survey-EA relationships
  - Managing EA assignments

- **Enumerator Assignment**
  - Assigning enumerators to surveys
  - Workload distribution
  - Viewing enumerator assignments
  - Managing enumerator workload

- **Survey Status Management**
  - Activating surveys
  - Ending surveys
  - Survey status tracking
  - Survey history and audit trails

#### Hands-on Exercises:
1. **Create a New Survey**
   - Create survey with proper naming
   - Set survey status
   - Add survey description

2. **Assign Enumeration Areas**
   - Assign multiple EAs to survey
   - View assigned EAs
   - Remove EA from survey

3. **Assign Enumerators**
   - Assign enumerators to survey
   - Distribute workload evenly
   - View enumerator assignments

**Break:** 10:30 AM - 10:45 AM (15 minutes)

---

### Session 6: Sampling Operations (10:45 AM - 12:30 PM)

**Duration:** 1.75 hours

#### Topics Covered:
- **Sampling Concepts**
  - Understanding sampling methodology
  - Sampling configuration
  - Sample size calculations
  - Sampling strategies

- **Enumeration Area Sampling**
  - Running EA sampling
  - Sampling parameters
  - Sampling results interpretation
  - Sampling hierarchy

- **Sampling Configuration**
  - Updating sampling configurations
  - Sampling rules and criteria
  - Sampling validation
  - Sampling reports

#### Hands-on Exercises:
1. **Configure Sampling Parameters**
   - Set sampling configuration
   - Define sampling rules
   - Validate sampling parameters

2. **Run Enumeration Area Sampling**
   - Execute sampling for a survey
   - Review sampling results
   - Analyze sampling hierarchy
   - Export sampling reports

**Lunch Break:** 12:30 PM - 1:30 PM (1 hour)

---

### Session 7: Data Collection & Validation Workflows (1:30 PM - 3:00 PM)

**Duration:** 1.5 hours

#### Topics Covered:
- **Household Listing Data**
  - Understanding household listing structure
  - Data entry workflow
  - Data validation rules
  - Submission process

- **Structure Data Management**
  - Building/structure information
  - Structure types and classifications
  - Structure validation
  - Structure updates

- **Data Validation Process**
  - Enumerator submission workflow
  - Supervisor validation
  - Admin validation
  - Validation status tracking
  - Handling validation rejections

- **Data Quality Assurance**
  - Data quality checks
  - Validation rules and constraints
  - Error handling and corrections
  - Data completeness verification

#### Hands-on Exercises:
1. **Review Submitted Data**
   - View enumerator submissions
   - Check data completeness
   - Identify validation errors

2. **Perform Data Validation**
   - Validate household listing data
   - Approve valid submissions
   - Reject invalid submissions with comments
   - Request data corrections

3. **Data Quality Checks**
   - Run data quality reports
   - Identify data inconsistencies
   - Generate validation summaries

**Break:** 3:00 PM - 3:15 PM (15 minutes)

---

### Session 8: Statistical Aggregation & Reporting (3:15 PM - 4:30 PM)

**Duration:** 1.25 hours

#### Topics Covered:
- **Automated Statistics Computation**
  - Understanding automated aggregation
  - Statistics computation schedule (cron job)
  - Hierarchical aggregation process
  - Urban/rural segregation

- **Annual Statistics Management**
  - EA-level statistics
  - SAZ-level aggregation
  - AZ-level aggregation
  - Dzongkhag-level aggregation
  - National-level statistics

- **Statistics Viewing & Analysis**
  - Viewing statistics by level
  - Urban/rural breakdowns
  - Year-over-year comparisons
  - Growth rate calculations
  - Trend analysis

- **Report Generation**
  - Generating standard reports
  - Custom report creation
  - Exporting reports (PDF, Excel)
  - Report scheduling

#### Hands-on Exercises:
1. **View Statistics**
   - View EA-level statistics
   - View SAZ aggregated statistics
   - View AZ aggregated statistics
   - View Dzongkhag aggregated statistics
   - Analyze urban/rural breakdowns

2. **Generate Reports**
   - Generate annual statistics report
   - Create custom report
   - Export report to PDF
   - Schedule automated reports

---

### Session 9: Advanced Features & Best Practices (4:30 PM - 5:15 PM)

**Duration:** 45 minutes

#### Topics Covered:
- **Building/Structure Management**
  - Adding building information
  - Structure classification
  - Building updates
  - Building queries

- **Enumerator Routes**
  - Viewing enumerator routes
  - Route optimization
  - Route tracking
  - Route reports

- **Location Downloads**
  - Exporting location data
  - GeoJSON exports
  - CSV exports
  - Bulk data downloads

- **System Maintenance**
  - Regular maintenance tasks
  - Data backup procedures
  - System monitoring
  - Performance optimization

- **Troubleshooting Common Issues**
  - Common error messages
  - Problem resolution steps
  - Support resources
  - Escalation procedures

#### Hands-on Exercises:
1. **Data Export Operations**
   - Export location hierarchy as GeoJSON
   - Export statistics as CSV
   - Download bulk data files

2. **Troubleshooting Practice**
   - Identify common errors
   - Apply resolution steps
   - Document issues

---

### Session 10: Assessment & Q&A (5:15 PM - 5:30 PM)

**Duration:** 15 minutes

- **Final Assessment**
  - Quick knowledge check
  - Practical scenario questions
  - System navigation test

- **Q&A Session**
  - Address remaining questions
  - Clarify doubts
  - Additional resources

- **Training Wrap-up**
  - Training summary
  - Next steps
  - Certification information
  - Feedback collection

---

## Training Materials & Resources

### Required Materials:
1. **Training Manual**
   - System user guide
   - API documentation
   - Quick reference cards

2. **Practice Data Sets**
   - Sample GeoJSON files
   - Test user accounts
   - Sample survey data
   - Practice exercises

3. **System Access**
   - Training environment credentials
   - Test database access
   - API endpoints documentation

### Reference Documents:
1. **API Documentation**
   - `/src/modules/location/sub-administrative-zone/API_ENDPOINTS_DOCUMENTATION.md`
   - `/src/modules/location/administrative-zone/BULK_UPLOAD_INTEGRATION_GUIDE.md`
   - `/src/modules/location/enumeration-area/ENUMERATION_AREA_ADMINISTRATIVE_ZONE_ROUTES.md`

2. **System Documentation**
   - Software Requirements Specification (SRS)
   - Database ERD documentation
   - System architecture diagrams

### Online Resources:
- System help documentation
- Video tutorials
- FAQ section
- Support portal

---

## Assessment & Certification

### Assessment Criteria:

#### Day 1 Assessment:
1. **User Management Test** (30 minutes)
   - Create user accounts
   - Assign supervisor-dzongkhag relationships
   - Manage user permissions

2. **Geographic Hierarchy Test** (45 minutes)
   - Create complete geographic hierarchy
   - Upload GeoJSON files
   - Perform bulk operations

#### Day 2 Assessment:
1. **Survey Management Test** (30 minutes)
   - Create and configure survey
   - Assign EAs and enumerators
   - Manage survey status

2. **Data Validation Test** (30 minutes)
   - Validate submitted data
   - Handle validation errors
   - Generate reports

### Certification Requirements:
- **Passing Score:** 80% or higher
- **Practical Exercises:** Complete all hands-on exercises
- **Attendance:** 100% attendance required
- **Final Assessment:** Pass all assessment tests

### Certification Levels:
1. **NSFD Admin Certified** - Basic certification
   - Completed training
   - Passed all assessments
   - Can perform standard admin tasks

2. **NSFD Admin Advanced** - Advanced certification
   - Basic certification + advanced topics
   - Can perform complex operations
   - Can train other users

---

## Training Schedule Summary

| Day | Session | Time | Duration | Topic |
|-----|---------|------|----------|-------|
| **Day 1** | 1 | 9:00-10:30 | 1.5h | Introduction & System Overview |
| | Break | 10:30-10:45 | 15m | |
| | 2 | 10:45-12:30 | 1.75h | Authentication & User Management |
| | Lunch | 12:30-1:30 | 1h | |
| | 3 | 1:30-3:00 | 1.5h | Geographic Hierarchy - Part 1 |
| | Break | 3:00-3:15 | 15m | |
| | 4 | 3:15-5:00 | 1.75h | Geographic Hierarchy - Part 2 |
| | Review | 5:00-5:15 | 15m | Day 1 Recap |
| **Day 2** | 5 | 9:00-10:30 | 1.5h | Survey Lifecycle Management |
| | Break | 10:30-10:45 | 15m | |
| | 6 | 10:45-12:30 | 1.75h | Sampling Operations |
| | Lunch | 12:30-1:30 | 1h | |
| | 7 | 1:30-3:00 | 1.5h | Data Collection & Validation |
| | Break | 3:00-3:15 | 15m | |
| | 8 | 3:15-4:30 | 1.25h | Statistical Aggregation & Reporting |
| | 9 | 4:30-5:15 | 45m | Advanced Features & Best Practices |
| | 10 | 5:15-5:30 | 15m | Assessment & Q&A |

**Total Training Time:** 16 hours (2 days)

---

## Pre-Training Checklist

### For Participants:
- [ ] Review system overview document
- [ ] Ensure stable internet connection
- [ ] Have access to training environment
- [ ] Prepare questions about current workflows
- [ ] Review basic GIS concepts (if applicable)

### For Trainers:
- [ ] Prepare training environment
- [ ] Set up test data and accounts
- [ ] Prepare presentation materials
- [ ] Test all system features
- [ ] Prepare assessment materials

---

## Post-Training Support

### Support Channels:
1. **Help Desk**
   - Email: support@nsfd.gov.bt
   - Phone: [Contact Number]
   - Hours: 9:00 AM - 5:00 PM (Monday-Friday)

2. **Documentation**
   - Online user manual
   - Video tutorials
   - FAQ database

3. **Follow-up Sessions**
   - Optional advanced training
   - Refresher courses
   - Q&A sessions

### Continuous Learning:
- Monthly webinars
- System updates notifications
- Best practices sharing
- User community forum

---

## Training Feedback Form

At the end of the training, participants will be asked to provide feedback on:
- Training content quality
- Trainer effectiveness
- Hands-on exercises
- Training materials
- Overall satisfaction
- Suggestions for improvement

---

## Contact Information

**Training Coordinator:**  
Email: training@nsfd.gov.bt  
Phone: [Contact Number]

**Technical Support:**  
Email: support@nsfd.gov.bt  
Phone: [Contact Number]

**System Administrator:**  
Email: admin@nsfd.gov.bt  
Phone: [Contact Number]

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Prepared by:** NSFD Development Team

