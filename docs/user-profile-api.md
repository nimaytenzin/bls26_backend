# User Profile Management API

## Overview

This document describes the API endpoints for user profile management, including changing password and updating profile information.

**Base URL:** `/api/auth`

**Authentication:** All endpoints require JWT authentication. Include the token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Change Password

Update the authenticated user's password.

### Endpoint

```
POST /auth/change-password
```

### Request Headers

```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Request Body (DTO)

```typescript
{
  currentPassword: string;  // Required - Current password for verification
  newPassword: string;      // Required - New password (minimum 6 characters)
}
```

### Example Request

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

### Response

**Success (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `401 Unauthorized` - Current password is incorrect
- `400 Bad Request` - Validation errors

### Validation Rules

- `currentPassword`: Required, string
- `newPassword`: Required, string, minimum 6 characters

---

## 2. Get Profile

Get the authenticated user's profile information.

### Endpoint

```
GET /auth/profile
```

### Request Headers

```
Authorization: Bearer <jwt-token>
```

### Response

**Success (200 OK):**
```json
{
  "id": 1,
  "name": "John Doe",
  "cid": "123456789",
  "emailAddress": "john.doe@example.com",
  "phoneNumber": "+975-1234567",
  "role": "ENUMERATOR",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token

---

## 3. Update Profile

Update the authenticated user's profile information (name, email, phone number).

### Endpoint

```
PATCH /auth/profile
```

### Request Headers

```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Request Body (DTO)

All fields are optional. Only include fields you want to update.

```typescript
{
  name?: string;           // Optional - User's full name
  emailAddress?: string;   // Optional - Valid email address
  phoneNumber?: string;    // Optional - Phone number
}
```

### Example Request

```json
{
  "name": "John Smith",
  "emailAddress": "john.smith@example.com",
  "phoneNumber": "+975-9876543"
}
```

### Response

**Success (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "John Smith",
    "cid": "123456789",
    "emailAddress": "john.smith@example.com",
    "phoneNumber": "+975-9876543",
    "role": "ENUMERATOR",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - User not found
- `409 Conflict` - Email address already in use
- `400 Bad Request` - Validation errors

### Validation Rules

- `name`: Optional, string
- `emailAddress`: Optional, must be a valid email format
- `phoneNumber`: Optional, string

### Notes

- **CID cannot be updated** - This is an immutable identifier
- **Role cannot be updated** - Only admins can change user roles
- **Password cannot be updated** - Use the change-password endpoint instead
- If updating email, the system checks for uniqueness (excluding your own account)
- At least one field must be provided in the request body

---

## TypeScript Interfaces

For frontend TypeScript projects, use these interfaces:

```typescript
// Change Password DTO
interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// Update Profile DTO
interface UpdateProfileDto {
  name?: string;
  emailAddress?: string;
  phoneNumber?: string;
}

// User Response
interface User {
  id: number;
  name: string;
  cid: string;
  emailAddress: string;
  phoneNumber: string | null;
  role: 'ADMIN' | 'SUPERVISOR' | 'ENUMERATOR';
  createdAt: string;
  updatedAt: string;
}

// Change Password Response
interface ChangePasswordResponse {
  message: string;
}

// Update Profile Response
interface UpdateProfileResponse {
  user: User;
  message: string;
}
```

---

## Example Frontend Usage

### React/TypeScript Example

```typescript
// Change Password
const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to change password');
  }

  return response.json();
};

// Get Profile
const getProfile = async () => {
  const response = await fetch('/api/auth/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
};

// Update Profile
const updateProfile = async (profileData: UpdateProfileDto) => {
  const response = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }

  return response.json();
};
```

---

## Error Handling

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["validation error messages"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Email address already in use",
  "error": "Conflict"
}
```

---

## Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/auth/change-password` | POST | Change user password | Yes |
| `/auth/profile` | GET | Get user profile | Yes |
| `/auth/profile` | PATCH | Update user profile | Yes |

