# User Management API Manual

## Overview

This manual documents the User Management API endpoints for managing Admins, Supervisors, and Enumerators in the NSB Survey Data Collection System. The API supports CRUD operations, password management, dzongkhag assignments for supervisors, and survey assignments for enumerators.

## Quick Reference: Viewing Complete User Profiles

To view a complete user profile with all details and assignments:

| User Role | Recommended Endpoint | Alternative (Multiple Calls) |
|-----------|---------------------|------------------------------|
| **Admin** | `GET /auth/users/:id/profile` | `GET /auth/profile` or `GET /auth/users/:id` |
| **Supervisor** | `GET /auth/users/:id/profile` | `GET /auth/users/:id` + `GET /auth/supervisors/:id/dzongkhags` |
| **Enumerator** | `GET /auth/users/:id/profile` | `GET /auth/users/:id` + `GET /survey-enumerator/by-enumerator/:userId` + `GET /enumerator-routes/active-surveys/:enumeratorId` |

**Note:** The comprehensive profile endpoint (`GET /auth/users/:id/profile`) is the recommended approach as it returns all relevant data in a single API call. See section 7.3 for detailed examples.

## Base URL

All endpoints are prefixed with `/auth` unless otherwise specified.

## Authentication

Most endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Roles

- **ADMIN**: Full system access, can manage all users
- **SUPERVISOR**: Can manage enumerators and view assigned dzongkhags
- **ENUMERATOR**: Can view assigned surveys and manage own profile

---

## 1. Admin Management

### 1.1 Create Admin

**Endpoint:** `POST /auth/register`  
**Access:** Public (typically used during initial setup)  
**Description:** Creates a new admin user

**Request Body:**
```json
{
  "name": "Admin Name",
  "cid": "12345678901",
  "emailAddress": "admin@nsb.gov.bt",
  "phoneNumber": "+975-12345678",
  "password": "securePassword123",
  "role": "ADMIN"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Admin Name",
    "cid": "12345678901",
    "emailAddress": "admin@nsb.gov.bt",
    "phoneNumber": "+975-12345678",
    "role": "ADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation Rules:**
- `name`: Required, string
- `cid`: Required, string, must be unique
- `emailAddress`: Required, valid email format, must be unique
- `phoneNumber`: Optional, string
- `password`: Required, minimum 6 characters
- `role`: Optional, defaults to ENUMERATOR if not specified

**Error Responses:**
- `409 Conflict`: User with CID or email already exists
- `400 Bad Request`: Validation errors

---

### 1.2 Get All Admins

**Endpoint:** `GET /auth/users?role=ADMIN`  
**Access:** Admin, Supervisor  
**Description:** Retrieves all admin users

**Query Parameters:**
- `role` (optional): Filter by role (e.g., `ADMIN`)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Admin Name",
    "cid": "12345678901",
    "emailAddress": "admin@nsb.gov.bt",
    "phoneNumber": "+975-12345678",
    "role": "ADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 1.3 Get Admin by ID

**Endpoint:** `GET /auth/users/:id`  
**Access:** Admin, Supervisor  
**Description:** Retrieves a specific admin user by ID

**Response:**
```json
{
  "id": 1,
  "name": "Admin Name",
  "cid": "12345678901",
  "emailAddress": "admin@nsb.gov.bt",
  "phoneNumber": "+975-12345678",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: User not found

---

### 1.4 Update Admin

**Endpoint:** `PATCH /auth/users/:id`  
**Access:** Admin only  
**Description:** Updates admin user details

**Request Body:**
```json
{
  "name": "Updated Admin Name",
  "phoneNumber": "+975-98765432",
  "emailAddress": "newadmin@nsb.gov.bt"
}
```

**Note:** 
- Password updates should use the change password endpoint
- Role cannot be changed through this endpoint

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Updated Admin Name",
    "cid": "12345678901",
    "emailAddress": "newadmin@nsb.gov.bt",
    "phoneNumber": "+975-98765432",
    "role": "ADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User updated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: User not found
- `403 Forbidden`: Insufficient permissions (Supervisors cannot update Admins)

---

### 1.5 Delete Admin

**Endpoint:** `DELETE /auth/users/:id`  
**Access:** Admin only  
**Description:** Deletes an admin user

**Response:**
- Status: `204 No Content`

**Error Responses:**
- `400 Bad Request`: User not found
- `403 Forbidden`: Only admins can delete users

---

## 2. Supervisor Management

### 2.1 Create Supervisor

**Endpoint:** `POST /auth/supervisors`  
**Access:** Admin only  
**Description:** Creates a new supervisor user

**Request Body:**
```json
{
  "name": "Supervisor Name",
  "cid": "23456789012",
  "emailAddress": "supervisor@nsb.gov.bt",
  "phoneNumber": "+975-23456789",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": 2,
    "name": "Supervisor Name",
    "cid": "23456789012",
    "emailAddress": "supervisor@nsb.gov.bt",
    "phoneNumber": "+975-23456789",
    "role": "SUPERVISOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "SUPERVISOR created successfully"
}
```

**Note:** Role is automatically set to `SUPERVISOR`

---

### 2.2 Get All Supervisors

**Endpoint:** `GET /auth/supervisors`  
**Access:** Admin only  
**Description:** Retrieves all supervisor users

**Response:**
```json
[
  {
    "id": 2,
    "name": "Supervisor Name",
    "cid": "23456789012",
    "emailAddress": "supervisor@nsb.gov.bt",
    "phoneNumber": "+975-23456789",
    "role": "SUPERVISOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 2.3 Get All Supervisors with Dzongkhags

**Endpoint:** `GET /auth/supervisors/with-dzongkhags`  
**Access:** Admin only  
**Description:** Retrieves all supervisors with their assigned dzongkhags

**Response:**
```json
[
  {
    "id": 2,
    "name": "Supervisor Name",
    "cid": "23456789012",
    "emailAddress": "supervisor@nsb.gov.bt",
    "phoneNumber": "+975-23456789",
    "role": "SUPERVISOR",
    "dzongkhags": [
      {
        "id": 1,
        "name": "Thimphu",
        "areaCode": "TH"
      },
      {
        "id": 2,
        "name": "Paro",
        "areaCode": "PA"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 2.4 Get Supervisor by ID

**Endpoint:** `GET /auth/users/:id`  
**Access:** Admin, Supervisor  
**Description:** Retrieves a specific supervisor user by ID

**Response:** Same format as Get Admin by ID

---

### 2.5 Update Supervisor

**Endpoint:** `PATCH /auth/users/:id`  
**Access:** Admin only  
**Description:** Updates supervisor user details

**Request Body:**
```json
{
  "name": "Updated Supervisor Name",
  "phoneNumber": "+975-98765432",
  "emailAddress": "newsupervisor@nsb.gov.bt"
}
```

**Response:** Same format as Update Admin

---

### 2.6 Delete Supervisor

**Endpoint:** `DELETE /auth/users/:id`  
**Access:** Admin only  
**Description:** Deletes a supervisor user

**Response:** Status `204 No Content`

---

## 3. Enumerator Management

### 3.1 Create Enumerator

**Endpoint:** `POST /auth/enumerators`  
**Access:** Admin, Supervisor  
**Description:** Creates a new enumerator user

**Request Body:**
```json
{
  "name": "Enumerator Name",
  "cid": "34567890123",
  "emailAddress": "enumerator@nsb.gov.bt",
  "phoneNumber": "+975-34567890",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": 3,
    "name": "Enumerator Name",
    "cid": "34567890123",
    "emailAddress": "enumerator@nsb.gov.bt",
    "phoneNumber": "+975-34567890",
    "role": "ENUMERATOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "ENUMERATOR created successfully"
}
```

**Note:** Role is automatically set to `ENUMERATOR`

---

### 3.2 Get All Enumerators

**Endpoint:** `GET /auth/enumerators`  
**Access:** Admin, Supervisor  
**Description:** Retrieves all enumerator users

**Response:**
```json
[
  {
    "id": 3,
    "name": "Enumerator Name",
    "cid": "34567890123",
    "emailAddress": "enumerator@nsb.gov.bt",
    "phoneNumber": "+975-34567890",
    "role": "ENUMERATOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 3.3 Get Enumerator by ID

**Endpoint:** `GET /auth/users/:id`  
**Access:** Admin, Supervisor  
**Description:** Retrieves a specific enumerator user by ID

**Response:** Same format as Get Admin by ID

---

### 3.4 Update Enumerator

**Endpoint:** `PATCH /auth/users/:id`  
**Access:** Admin, Supervisor  
**Description:** Updates enumerator user details

**Request Body:**
```json
{
  "name": "Updated Enumerator Name",
  "phoneNumber": "+975-98765432",
  "emailAddress": "newenumerator@nsb.gov.bt"
}
```

**Note:** Supervisors can only update Enumerators, not Admins or other Supervisors

**Response:** Same format as Update Admin

**Error Responses:**
- `403 Forbidden`: Supervisors can only update Enumerators

---

### 3.5 Delete Enumerator

**Endpoint:** `DELETE /auth/users/:id`  
**Access:** Admin only  
**Description:** Deletes an enumerator user

**Response:** Status `204 No Content`

---

## 4. Password Management

### 4.1 Forgot Password

**Endpoint:** `POST /auth/forgot-password`  
**Access:** Public  
**Description:** Generates a password reset token and sends it to the user's email address (or returns it in development mode)

**Request Body:**
```json
{
  "emailAddress": "user@nsb.gov.bt"
}
```

**Response:**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent.",
  "resetToken": "abc123def456..." // Only in development mode
}
```

**Note:** 
- In production, the reset token should be sent via email
- In development mode (`NODE_ENV=development`), the token is returned in the response for testing
- The reset token expires after 1 hour
- The response message is the same whether the user exists or not (security best practice)

**Error Responses:**
- `400 Bad Request`: Invalid email format

---

### 4.2 Password Reset (Using Token)

**Endpoint:** `POST /auth/reset-password`  
**Access:** Public  
**Description:** Resets password using a reset token (typically sent via email after forgot password request)

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid or expired reset token

**Note:** 
- The reset token is generated by the forgot password endpoint (section 4.1)
- Tokens expire after 1 hour
- After successful reset, the token is cleared and cannot be reused

---

### 4.3 Change Password (Authenticated User)

**Endpoint:** `POST /auth/change-password`  
**Access:** Authenticated users (Admin, Supervisor, Enumerator)  
**Description:** Allows authenticated users to change their own password. Requires current password for security.

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Current password is incorrect or user not found

**Note:** 
- All users (Admin, Supervisor, Enumerator) can use this endpoint to change their own password
- Requires the current password to be provided for security

---

### 4.4 Admin Password Reset for Other Users

**Endpoint:** `PATCH /auth/users/:id`  
**Access:** Admin only  
**Description:** Admins can reset any user's password (Admin, Supervisor, or Enumerator) by including the password field in the update request. The password will be automatically hashed.

**Request Body:**
```json
{
  "password": "newPassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": 2,
    "name": "User Name",
    "cid": "23456789012",
    "emailAddress": "user@nsb.gov.bt",
    "phoneNumber": "+975-23456789",
    "role": "SUPERVISOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User updated successfully"
}
```

**Note:** 
- The password will be automatically hashed using bcrypt before storage
- Admins can reset passwords for any user (Admin, Supervisor, or Enumerator)
- This is useful when users forget their password and need admin assistance
- The new password should be communicated securely to the user

---

## 5. Supervisor Dzongkhag Assignment

### 5.1 Assign Dzongkhags to Supervisor

**Endpoint:** `POST /auth/supervisors/:id/dzongkhags`  
**Access:** Admin only  
**Description:** Assigns one or more dzongkhags to a supervisor

**Request Body:**
```json
{
  "dzongkhagIds": [1, 2, 3]
}
```

**Response:**
```json
{
  "message": "Assigned 3 dzongkhag(s) to supervisor",
  "assigned": [
    {
      "id": 1,
      "supervisorId": 2,
      "dzongkhagId": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "supervisorId": 2,
      "dzongkhagId": 2,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 3,
      "supervisorId": 2,
      "dzongkhagId": 3,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Validation Rules:**
- `dzongkhagIds`: Required, array of integers, minimum 1 item
- Duplicate assignments are automatically skipped

**Error Responses:**
- `404 Not Found`: Supervisor not found
- `400 Bad Request`: User is not a supervisor

---

### 5.2 Remove Dzongkhag Assignments from Supervisor

**Endpoint:** `DELETE /auth/supervisors/:id/dzongkhags`  
**Access:** Admin only  
**Description:** Removes dzongkhag assignments from a supervisor

**Request Body:**
```json
{
  "dzongkhagIds": [2, 3]
}
```

**Response:**
```json
{
  "message": "Removed 2 dzongkhag assignment(s) from supervisor",
  "removedCount": 2
}
```

**Error Responses:**
- `404 Not Found`: Supervisor not found
- `400 Bad Request`: User is not a supervisor

---

### 5.3 Get Supervisor's Assigned Dzongkhags

**Endpoint:** `GET /auth/supervisors/:id/dzongkhags`  
**Access:** Admin, Supervisor  
**Description:** Retrieves all dzongkhags assigned to a supervisor

**Response:**
```json
[
  {
    "id": 1,
    "name": "Thimphu",
    "areaCode": "TH",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Paro",
    "areaCode": "PA",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Error Responses:**
- `404 Not Found`: Supervisor not found
- `400 Bad Request`: User is not a supervisor

---

### 5.4 Get Supervisors for a Dzongkhag

**Endpoint:** `GET /auth/dzongkhags/:id/supervisors`  
**Access:** Admin only  
**Description:** Retrieves all supervisors assigned to a specific dzongkhag

**Response:**
```json
[
  {
    "id": 2,
    "name": "Supervisor Name",
    "cid": "23456789012",
    "emailAddress": "supervisor@nsb.gov.bt",
    "phoneNumber": "+975-23456789",
    "role": "SUPERVISOR"
  }
]
```

---

## 6. Enumerator Survey Assignment

### 6.1 Assign Enumerator to Survey

**Endpoint:** `POST /survey-enumerator`  
**Access:** Admin, Supervisor  
**Description:** Assigns an enumerator to a survey

**Request Body:**
```json
{
  "userId": 3,
  "surveyId": 1
}
```

**Response:**
```json
{
  "userId": 3,
  "surveyId": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: User is not an enumerator or assignment already exists
- `404 Not Found`: User or survey not found

---

### 6.2 Bulk Assign Enumerators to Survey

**Endpoint:** `POST /survey-enumerator/bulk-assign`  
**Access:** Admin, Supervisor  
**Description:** Assigns multiple enumerators to a survey at once

**Request Body:**
```json
{
  "surveyId": 1,
  "userIds": [3, 4, 5, 6]
}
```

**Response:**
```json
{
  "message": "Successfully assigned 4 enumerator(s) to survey",
  "assignments": [
    {
      "userId": 3,
      "surveyId": 1
    },
    {
      "userId": 4,
      "surveyId": 1
    },
    {
      "userId": 5,
      "surveyId": 1
    },
    {
      "userId": 6,
      "surveyId": 1
    }
  ]
}
```

---

### 6.3 Bulk Assign Enumerators from CSV

**Endpoint:** `POST /survey-enumerator/bulk-assign-csv`  
**Access:** Admin, Supervisor  
**Description:** Bulk assigns enumerators to a survey from CSV data. Creates users if they don't exist.

**Request Body:**
```json
{
  "surveyId": 1,
  "enumerators": [
    {
      "name": "Enumerator One",
      "cid": "34567890123",
      "emailAddress": "enumerator1@nsb.gov.bt",
      "phoneNumber": "+975-34567890",
      "password": "password123"
    },
    {
      "name": "Enumerator Two",
      "cid": "45678901234",
      "emailAddress": "enumerator2@nsb.gov.bt",
      "phoneNumber": "+975-45678901",
      "password": "password123"
    }
  ]
}
```

**Response:**
```json
{
  "success": 2,
  "failed": 0,
  "created": 2,
  "existing": 0,
  "assignments": [
    {
      "userId": 3,
      "surveyId": 1
    },
    {
      "userId": 4,
      "surveyId": 1
    }
  ],
  "errors": []
}
```

**Note:** 
- If a user with the same CID exists, they will be assigned to the survey
- If a user doesn't exist, they will be created with ENUMERATOR role
- Email defaults to `{cid}@dummy.nsb.gov.bt` if not provided
- Password defaults to CID if not provided

---

### 6.4 Get CSV Template for Bulk Upload

**Endpoint:** `GET /survey-enumerator/template/csv`  
**Access:** Admin, Supervisor  
**Description:** Downloads a CSV template for bulk enumerator upload

**Response:**
- Content-Type: `text/csv`
- File: `enumerator_upload_template.csv`

**CSV Format:**
```csv
Name,CID,Email Address,Phone Number,Password
Enumerator One,34567890123,enumerator1@nsb.gov.bt,+975-34567890,password123
Enumerator Two,45678901234,enumerator2@nsb.gov.bt,+975-45678901,password123
```

---

### 6.5 Get All Enumerator-Survey Assignments

**Endpoint:** `GET /survey-enumerator`  
**Access:** Admin, Supervisor  
**Description:** Retrieves all enumerator-survey assignments

**Response:**
```json
[
  {
    "userId": 3,
    "surveyId": 1,
    "user": {
      "id": 3,
      "name": "Enumerator Name",
      "cid": "34567890123",
      "emailAddress": "enumerator@nsb.gov.bt",
      "role": "ENUMERATOR"
    },
    "survey": {
      "id": 1,
      "name": "Survey 2024",
      "status": "ACTIVE"
    }
  }
]
```

---

### 6.6 Get Enumerators by Survey

**Endpoint:** `GET /survey-enumerator/by-survey/:surveyId`  
**Access:** Admin, Supervisor  
**Description:** Retrieves all enumerators assigned to a specific survey

**Response:**
```json
[
  {
    "userId": 3,
    "surveyId": 1,
    "user": {
      "id": 3,
      "name": "Enumerator Name",
      "cid": "34567890123",
      "emailAddress": "enumerator@nsb.gov.bt",
      "role": "ENUMERATOR"
    }
  }
]
```

---

### 6.7 Get Surveys by Enumerator

**Endpoint:** `GET /survey-enumerator/by-enumerator/:userId`  
**Access:** Admin, Supervisor, Enumerator  
**Description:** Retrieves all surveys assigned to a specific enumerator

**Response:**
```json
[
  {
    "userId": 3,
    "surveyId": 1,
    "survey": {
      "id": 1,
      "name": "Survey 2024",
      "status": "ACTIVE",
      "year": 2024,
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    }
  }
]
```

**Note:** Enumerators can only view their own assignments

---

### 6.8 Get Active Surveys by Enumerator

**Endpoint:** `GET /enumerator-routes/active-surveys/:enumeratorId`  
**Access:** Admin, Supervisor, Enumerator  
**Description:** Retrieves only ACTIVE surveys assigned to an enumerator

**Response:**
```json
[
  {
    "id": 1,
    "name": "Survey 2024",
    "description": "Annual Survey",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "year": 2024,
    "status": "ACTIVE",
    "isFullyValidated": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Note:** Only returns surveys with `status: "ACTIVE"`

---

### 6.9 Get Specific Enumerator-Survey Assignment

**Endpoint:** `GET /survey-enumerator/:userId/:surveyId`  
**Access:** Admin, Supervisor, Enumerator  
**Description:** Retrieves a specific enumerator-survey assignment

**Response:**
```json
{
  "userId": 3,
  "surveyId": 1,
  "user": {
    "id": 3,
    "name": "Enumerator Name",
    "cid": "34567890123",
    "emailAddress": "enumerator@nsb.gov.bt",
    "role": "ENUMERATOR"
  },
  "survey": {
    "id": 1,
    "name": "Survey 2024",
    "status": "ACTIVE"
  }
}
```

---

### 6.10 Remove Enumerator from Survey

**Endpoint:** `DELETE /survey-enumerator/:userId/:surveyId`  
**Access:** Admin, Supervisor  
**Description:** Removes an enumerator assignment from a survey

**Response:**
```json
{
  "message": "Enumerator removed from survey successfully"
}
```

---

### 6.11 Bulk Remove Enumerators from Survey

**Endpoint:** `DELETE /survey-enumerator/bulk-remove/:surveyId`  
**Access:** Admin, Supervisor  
**Description:** Removes multiple enumerators from a survey at once

**Request Body:**
```json
{
  "userIds": [3, 4, 5]
}
```

**Response:**
```json
{
  "message": "Removed 3 enumerator(s) from survey",
  "removedCount": 3
}
```

---

## 7. User Profile Management

### 7.1 Get Current User Profile

**Endpoint:** `GET /auth/profile`  
**Access:** Authenticated users (Admin, Supervisor, Enumerator)  
**Description:** Retrieves the current authenticated user's basic profile information

**Response:**
```json
{
  "id": 1,
  "name": "User Name",
  "cid": "12345678901",
  "emailAddress": "user@nsb.gov.bt",
  "phoneNumber": "+975-12345678",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Note:** This endpoint returns basic user information only. To get complete profile with assignments, see section 7.3.

---

### 7.2 Get User Profile by ID

**Endpoint:** `GET /auth/users/:id`  
**Access:** Admin, Supervisor  
**Description:** Retrieves a specific user's basic profile information by ID

**Response:**
```json
{
  "id": 2,
  "name": "Supervisor Name",
  "cid": "23456789012",
  "emailAddress": "supervisor@nsb.gov.bt",
  "phoneNumber": "+975-23456789",
  "role": "SUPERVISOR",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: User not found

---

### 7.3 Get Complete User Profile with Assignments

**Endpoint:** `GET /auth/users/:id/profile`  
**Access:** Admin, Supervisor, Enumerator (own profile only)  
**Description:** Retrieves a comprehensive user profile with all role-specific assignments in a single response. This is the recommended endpoint for viewing complete user profiles.

**Response Examples:**

#### For Supervisors:
```json
{
  "user": {
    "id": 2,
    "name": "Supervisor Name",
    "cid": "23456789012",
    "emailAddress": "supervisor@nsb.gov.bt",
    "phoneNumber": "+975-23456789",
    "role": "SUPERVISOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "dzongkhags": [
    {
      "id": 1,
      "name": "Thimphu",
      "areaCode": "TH"
    },
    {
      "id": 2,
      "name": "Paro",
      "areaCode": "PA"
    }
  ]
}
```

#### For Enumerators:
```json
{
  "user": {
    "id": 3,
    "name": "Enumerator Name",
    "cid": "34567890123",
    "emailAddress": "enumerator@nsb.gov.bt",
    "phoneNumber": "+975-34567890",
    "role": "ENUMERATOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "allSurveys": [
    {
      "userId": 3,
      "surveyId": 1,
      "survey": {
        "id": 1,
        "name": "Survey 2024",
        "description": "Annual Survey",
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "year": 2024,
        "status": "ACTIVE",
        "isFullyValidated": false
      },
      "assignedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "userId": 3,
      "surveyId": 2,
      "survey": {
        "id": 2,
        "name": "Survey 2023",
        "description": "Previous Year Survey",
        "startDate": "2023-01-01",
        "endDate": "2023-12-31",
        "year": 2023,
        "status": "ENDED",
        "isFullyValidated": true
      },
      "assignedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "activeSurveys": [
    {
      "id": 1,
      "name": "Survey 2024",
      "description": "Annual Survey",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "year": 2024,
      "status": "ACTIVE",
      "isFullyValidated": false
    }
  ]
}
```

#### For Admins:
```json
{
  "user": {
    "id": 1,
    "name": "Admin Name",
    "cid": "12345678901",
    "emailAddress": "admin@nsb.gov.bt",
    "phoneNumber": "+975-12345678",
    "role": "ADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `404 Not Found`: User not found
- `403 Forbidden`: Enumerators can only view their own profile

**Note:** 
- This endpoint returns all relevant information in a single call
- For enumerators, `allSurveys` includes all surveys (active and ended) with assignment details
- For enumerators, `activeSurveys` is a filtered array containing only surveys with `status: "ACTIVE"`
- Enumerators can only access their own profile (`/auth/users/:id/profile` where `:id` matches their user ID)

---

### 7.4 Alternative: Get Profile Using Multiple Endpoints

**Note:** If you prefer to use separate endpoints, you can still make multiple API calls based on the user's role:

#### For Supervisors - Get Profile with Dzongkhag Assignments

**Step 1:** Get basic user information
```bash
GET /auth/users/:id
```

**Step 2:** Get dzongkhag assignments
```bash
GET /auth/supervisors/:id/dzongkhags
```

**Complete Supervisor Profile Example:**
```json
{
  "user": {
    "id": 2,
    "name": "Supervisor Name",
    "cid": "23456789012",
    "emailAddress": "supervisor@nsb.gov.bt",
    "phoneNumber": "+975-23456789",
    "role": "SUPERVISOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "dzongkhags": [
    {
      "id": 1,
      "name": "Thimphu",
      "areaCode": "TH",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Paro",
      "areaCode": "PA",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### For Enumerators - Get Profile with Survey Assignments

**Step 1:** Get basic user information
```bash
GET /auth/users/:id
```

**Step 2:** Get all survey assignments (participated and participating)
```bash
GET /survey-enumerator/by-enumerator/:userId
```

**Step 3:** Get only active surveys (currently participating)
```bash
GET /enumerator-routes/active-surveys/:enumeratorId
```

**Complete Enumerator Profile Example:**
```json
{
  "user": {
    "id": 3,
    "name": "Enumerator Name",
    "cid": "34567890123",
    "emailAddress": "enumerator@nsb.gov.bt",
    "phoneNumber": "+975-34567890",
    "role": "ENUMERATOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "allSurveys": [
    {
      "userId": 3,
      "surveyId": 1,
      "survey": {
        "id": 1,
        "name": "Survey 2024",
        "description": "Annual Survey",
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "year": 2024,
        "status": "ACTIVE",
        "isFullyValidated": false
      }
    },
    {
      "userId": 3,
      "surveyId": 2,
      "survey": {
        "id": 2,
        "name": "Survey 2023",
        "description": "Previous Year Survey",
        "startDate": "2023-01-01",
        "endDate": "2023-12-31",
        "year": 2023,
        "status": "ENDED",
        "isFullyValidated": true
      }
    }
  ],
  "activeSurveys": [
    {
      "id": 1,
      "name": "Survey 2024",
      "description": "Annual Survey",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "year": 2024,
      "status": "ACTIVE",
      "isFullyValidated": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### For Admins - Get Profile

Admins can view their own profile using:
```bash
GET /auth/profile
```

Admins don't have dzongkhag or survey assignments, so the basic profile is sufficient.

---

### 7.5 Update Own Profile

**Endpoint:** `PATCH /auth/users/:id`  
**Access:** Authenticated users (can update own profile)  
**Description:** Users can update their own profile details (name, email, phone number)

**Request Body:**
```json
{
  "name": "Updated Name",
  "phoneNumber": "+975-98765432",
  "emailAddress": "newemail@nsb.gov.bt"
}
```

**Note:** 
- Users cannot change their own role or CID
- Password updates should use the change password endpoint (section 4.2)

**Response:** Same format as Update Admin

---

## 8. Common Error Responses

### 8.1 Authentication Errors

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 8.2 Authorization Errors

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

### 8.3 Validation Errors

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "emailAddress must be an email"
  ]
}
```

### 8.4 Not Found Errors

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

### 8.5 Conflict Errors

**409 Conflict:**
```json
{
  "statusCode": 409,
  "message": "User with this CID already exists"
}
```

---

## 9. Access Control Summary

| Operation | Admin | Supervisor | Enumerator |
|-----------|-------|------------|------------|
| Create Admin | ✅ | ❌ | ❌ |
| Create Supervisor | ✅ | ❌ | ❌ |
| Create Enumerator | ✅ | ✅ | ❌ |
| View All Users | ✅ | ✅ (filtered) | ❌ |
| Update Admin | ✅ | ❌ | ❌ |
| Update Supervisor | ✅ | ❌ | ❌ |
| Update Enumerator | ✅ | ✅ | ❌ |
| Delete User | ✅ | ❌ | ❌ |
| Assign Dzongkhags | ✅ | ❌ | ❌ |
| View Dzongkhags | ✅ | ✅ (own) | ❌ |
| Assign Enumerators to Survey | ✅ | ✅ | ❌ |
| View Survey Assignments | ✅ | ✅ | ✅ (own) |
| Change Own Password | ✅ | ✅ | ✅ |
| Update Own Profile | ✅ | ✅ | ✅ |

---

## 10. Best Practices

1. **Password Security:**
   - Always use strong passwords (minimum 6 characters, but recommend 8+ with mixed case, numbers, and symbols)
   - Never send passwords in plain text over unsecured connections
   - Use the change password endpoint for authenticated users
   - Use password reset for forgotten passwords

2. **User Creation:**
   - Ensure CID and email are unique before creation
   - Set appropriate roles during creation
   - Provide secure default passwords that users must change

3. **Dzongkhag Assignment:**
   - Assign dzongkhags to supervisors before assigning enumerators to surveys
   - Verify supervisor exists and has correct role before assignment
   - Use bulk operations for efficiency when assigning multiple dzongkhags

4. **Survey Assignment:**
   - Verify enumerator role before assignment
   - Check survey status (ACTIVE) before assignment
   - Use bulk operations for multiple assignments
   - Use CSV bulk upload for large-scale enumerator onboarding

5. **Error Handling:**
   - Always check response status codes
   - Handle validation errors appropriately
   - Provide user-friendly error messages
   - Log errors for debugging

---

## 11. Example Workflows

### 11.1 Creating a Supervisor with Dzongkhag Assignment

```bash
# 1. Create supervisor
POST /auth/supervisors
{
  "name": "Supervisor Name",
  "cid": "23456789012",
  "emailAddress": "supervisor@nsb.gov.bt",
  "phoneNumber": "+975-23456789",
  "password": "tempPassword123"
}

# 2. Assign dzongkhags
POST /auth/supervisors/2/dzongkhags
{
  "dzongkhagIds": [1, 2, 3]
}

# 3. Verify assignment
GET /auth/supervisors/2/dzongkhags
```

### 11.2 Creating and Assigning Enumerators to Survey

```bash
# 1. Create enumerator
POST /auth/enumerators
{
  "name": "Enumerator Name",
  "cid": "34567890123",
  "emailAddress": "enumerator@nsb.gov.bt",
  "phoneNumber": "+975-34567890",
  "password": "tempPassword123"
}

# 2. Assign to survey
POST /survey-enumerator
{
  "userId": 3,
  "surveyId": 1
}

# 3. Verify active surveys
GET /survey-enumerator/by-enumerator/3
```

### 11.3 Bulk Enumerator Onboarding

```bash
# 1. Download CSV template
GET /survey-enumerator/template/csv

# 2. Fill template with enumerator data

# 3. Bulk assign from CSV
POST /survey-enumerator/bulk-assign-csv
{
  "surveyId": 1,
  "enumerators": [
    {
      "name": "Enumerator One",
      "cid": "34567890123",
      "emailAddress": "enum1@nsb.gov.bt",
      "phoneNumber": "+975-34567890",
      "password": "password123"
    },
    {
      "name": "Enumerator Two",
      "cid": "45678901234",
      "emailAddress": "enum2@nsb.gov.bt",
      "phoneNumber": "+975-45678901",
      "password": "password123"
    }
  ]
}
```

---

## 12. Notes

- All timestamps are in ISO 8601 format (UTC)
- Passwords are automatically hashed using bcrypt before storage
- JWT tokens expire after 7 days (configurable)
- CID (Citizen ID) must be unique across all users
- Email addresses must be unique across all users
- Survey assignments are unique (one enumerator cannot be assigned to the same survey twice)
- Dzongkhag assignments can have duplicates (same supervisor can be assigned to the same dzongkhag multiple times, but duplicates are skipped)

---

## 13. Implementation Notes

### 13.1 Email Service Integration

**Status:** ⚠️ **Needs Configuration**

The forgot password endpoint (`POST /auth/forgot-password`) generates reset tokens but currently does not send emails. In production, you should:

1. **Configure an email service** (e.g., SendGrid, AWS SES, Nodemailer with SMTP)
2. **Update the `forgotPassword` method** in `auth.service.ts` to send emails
3. **Create email templates** for password reset links
4. **Set environment variables** for email service credentials

**Development Mode:**
- In `NODE_ENV=development`, the reset token is returned in the response for testing
- This should be removed or disabled in production

**Example Email Template:**
```
Subject: Password Reset Request

Hello,

You requested a password reset for your NSB Survey Data Collection account.

Click the link below to reset your password:
${process.env.FRONTEND_URL}/reset-password?token=${resetToken}

This link will expire in 1 hour.

If you did not request this, please ignore this email.
```

### 13.2 Database Migration

**Status:** ⚠️ **Required**

The User entity now includes two new fields:
- `resetPasswordToken` (string, nullable)
- `resetPasswordExpires` (date, nullable)

**Action Required:** Run a database migration to add these columns to the Users table:

```sql
ALTER TABLE "Users" 
ADD COLUMN "resetPasswordToken" VARCHAR(255) NULL,
ADD COLUMN "resetPasswordExpires" TIMESTAMP NULL;
```

---

## Revision History

- **Version 1.2** (2024-01-01): 
  - ✅ Implemented comprehensive user profile endpoint (`GET /auth/users/:id/profile`)
  - ✅ Implemented forgot password endpoint (`POST /auth/forgot-password`)
  - ✅ Added reset password token fields to User entity
  - ✅ Updated documentation with new endpoints
- **Version 1.1** (2024-01-01): Added comprehensive user profile viewing, admin password reset, and missing endpoints documentation
- **Version 1.0** (2024-01-01): Initial documentation

