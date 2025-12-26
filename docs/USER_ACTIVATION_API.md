# User Activation/Deactivation API Documentation

This document describes the API endpoints for activating and deactivating users in the system.

## Overview

Users can be activated or deactivated by administrators. When a user is deactivated:
- They cannot log in to the system
- Any existing authentication tokens become invalid
- They will receive an error message: "Account is deactivated. Please contact administrator."

## Authentication

All endpoints require:
- **Authentication**: Bearer token (JWT) in the Authorization header
- **Role**: Admin only

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Activate User

Activates a previously deactivated user account.

**Endpoint:** `PATCH /auth/users/:id/activate`

**URL Parameters:**
- `id` (number, required) - The ID of the user to activate

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
None (no body required)

**Response (200 OK):**
```json
{
  "message": "User activated successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "cid": "123456789",
    "emailAddress": "john.doe@example.com",
    "phoneNumber": "+9751234567",
    "role": "ENUMERATOR",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- **401 Unauthorized** - Missing or invalid token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

- **403 Forbidden** - User is not an admin
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

- **404 Not Found** - User does not exist
```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

- **400 Bad Request** - User is already active
```json
{
  "statusCode": 400,
  "message": "User is already active"
}
```

**Example Request (cURL):**
```bash
curl -X PATCH \
  http://localhost:3000/auth/users/1/activate \
  -H 'Authorization: Bearer <your-jwt-token>' \
  -H 'Content-Type: application/json'
```

**Example Request (JavaScript/Fetch):**
```javascript
const activateUser = async (userId, token) => {
  try {
    const response = await fetch(`/auth/users/${userId}/activate`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error activating user:', error);
    throw error;
  }
};

// Usage
activateUser(1, 'your-jwt-token')
  .then(result => {
    console.log('User activated:', result.user);
  })
  .catch(error => {
    console.error('Failed to activate user:', error);
  });
```

**Example Request (Axios):**
```javascript
import axios from 'axios';

const activateUser = async (userId, token) => {
  try {
    const response = await axios.patch(
      `/auth/users/${userId}/activate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

// Usage
activateUser(1, 'your-jwt-token')
  .then(result => {
    console.log('User activated:', result.user);
  })
  .catch(error => {
    console.error('Failed to activate user:', error.message);
  });
```

---

### 2. Deactivate User

Deactivates an active user account. The user will no longer be able to log in.

**Endpoint:** `PATCH /auth/users/:id/deactivate`

**URL Parameters:**
- `id` (number, required) - The ID of the user to deactivate

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
None (no body required)

**Response (200 OK):**
```json
{
  "message": "User deactivated successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "cid": "123456789",
    "emailAddress": "john.doe@example.com",
    "phoneNumber": "+9751234567",
    "role": "ENUMERATOR",
    "isActive": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- **401 Unauthorized** - Missing or invalid token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

- **403 Forbidden** - User is not an admin
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

- **404 Not Found** - User does not exist
```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

- **400 Bad Request** - User is already deactivated
```json
{
  "statusCode": 400,
  "message": "User is already deactivated"
}
```

**Example Request (cURL):**
```bash
curl -X PATCH \
  http://localhost:3000/auth/users/1/deactivate \
  -H 'Authorization: Bearer <your-jwt-token>' \
  -H 'Content-Type: application/json'
```

**Example Request (JavaScript/Fetch):**
```javascript
const deactivateUser = async (userId, token) => {
  try {
    const response = await fetch(`/auth/users/${userId}/deactivate`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
};

// Usage
deactivateUser(1, 'your-jwt-token')
  .then(result => {
    console.log('User deactivated:', result.user);
  })
  .catch(error => {
    console.error('Failed to deactivate user:', error);
  });
```

**Example Request (Axios):**
```javascript
import axios from 'axios';

const deactivateUser = async (userId, token) => {
  try {
    const response = await axios.patch(
      `/auth/users/${userId}/deactivate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

// Usage
deactivateUser(1, 'your-jwt-token')
  .then(result => {
    console.log('User deactivated:', result.user);
  })
  .catch(error => {
    console.error('Failed to deactivate user:', error.message);
  });
```

---

## React Component Example

Here's a complete React component example for managing user activation:

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const UserActivationButton = ({ userId, isActive, onUpdate, token }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.patch(
        `/auth/users/${userId}/activate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      onUpdate(response.data.user);
      // Show success message
      alert('User activated successfully');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to activate user';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate this user? They will not be able to log in.')) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.patch(
        `/auth/users/${userId}/deactivate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      onUpdate(response.data.user);
      // Show success message
      alert('User deactivated successfully');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to deactivate user';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {isActive ? (
        <button 
          onClick={handleDeactivate} 
          disabled={loading}
          className="btn btn-danger"
        >
          {loading ? 'Deactivating...' : 'Deactivate User'}
        </button>
      ) : (
        <button 
          onClick={handleActivate} 
          disabled={loading}
          className="btn btn-success"
        >
          {loading ? 'Activating...' : 'Activate User'}
        </button>
      )}
    </div>
  );
};

export default UserActivationButton;
```

---

## User List Component Example

Example of displaying users with activation status:

```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import UserActivationButton from './UserActivationButton';

const UserList = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setUsers(users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.id}>
            <td>{user.id}</td>
            <td>{user.name}</td>
            <td>{user.emailAddress}</td>
            <td>{user.role}</td>
            <td>
              <span className={user.isActive ? 'status-active' : 'status-inactive'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <UserActivationButton
                userId={user.id}
                isActive={user.isActive}
                onUpdate={handleUserUpdate}
                token={token}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserList;
```

---

## Notes

1. **User Status Field**: The `isActive` field is a boolean that indicates whether a user account is active or not. Default value is `true` for new users.

2. **Login Prevention**: When a user is deactivated:
   - They cannot log in (login endpoint will return an error)
   - Any existing JWT tokens become invalid (validateUser checks isActive status)

3. **Permissions**: Only users with the `ADMIN` role can activate or deactivate other users.

4. **Idempotency**: Calling activate on an already active user, or deactivate on an already deactivated user, will return a 400 Bad Request error.

5. **Base URL**: Replace `http://localhost:3000` with your actual API base URL in production.

---

## Error Handling Best Practices

When implementing these endpoints in your frontend:

1. **Handle 401 Unauthorized**: Redirect to login page
2. **Handle 403 Forbidden**: Show message that only admins can perform this action
3. **Handle 404 Not Found**: Show "User not found" message
4. **Handle 400 Bad Request**: Show the specific error message from the response
5. **Network Errors**: Show a generic error message and allow retry

Example error handling:

```javascript
const handleApiError = (error) => {
  if (error.response) {
    switch (error.response.status) {
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        alert('You do not have permission to perform this action');
        break;
      case 404:
        alert('User not found');
        break;
      case 400:
        alert(error.response.data.message);
        break;
      default:
        alert('An error occurred. Please try again.');
    }
  } else {
    alert('Network error. Please check your connection.');
  }
};
```

