# School Management API Documentation

This document outlines the new API endpoints for managing Schools, School Admins, and Lead Mentors.

## Base URL
All endpoints are prefixed with the base API URL (e.g., `http://localhost:5000/api`)

## Authentication
All endpoints require authentication. Include the Bearer token in the Authorization header:
```
Authorization: Bearer <your-token>
```

## Schools API

### Get All Schools
```
GET /schools
```
Returns a list of all active schools.

### Get School by ID
```
GET /schools/:id
```
Returns a specific school by ID.

### Create School
```
POST /schools
```
**Body:**
```json
{
  "name": "School Name",
  "address": "School Address",
  "board": "CBSE|ICSE|State|Other",
  "state": "State Name",
  "city": "City Name",
  "image": "image-url (optional)",
  "logo": "logo-url (optional)",
  "affiliatedTo": "Affiliation (optional)",
  "branchName": "Branch Name (optional)"
}
```

### Update School
```
PUT /schools/:id
```
**Body:** Same as create, all fields optional.

### Delete School
```
DELETE /schools/:id
```
Permanently deletes the school and automatically cascades to delete all associated records:
- All students and their user accounts
- All school admins and their user accounts  
- All assessments
- Removes school from lead mentors' assigned schools list

## School Admins API

### Get All School Admins
```
GET /school-admins
```
Returns all active school admins with populated user and school data.

### Get School Admins by School
```
GET /school-admins/school/:schoolId
```
Returns school admins for a specific school.

### Create School Admin
```
POST /school-admins
```
**Body:**
```json
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "phoneNumber": "1234567890",
  "schoolId": "school-object-id"
}
```
Creates a user account and sends setup invitation email.

**Note:** Multiple school admins can be assigned to the same school. Each school admin must have a unique email address.

### Update School Admin
```
PUT /school-admins/:id
```
**Body:**
```json
{
  "phoneNumber": "1234567890",
  "isActive": true
}
```

### Delete School Admin
```
DELETE /school-admins/:id
```
Soft deletes the school admin.

## Lead Mentors API

### Get All Lead Mentors
```
GET /lead-mentors
```
Returns all active lead mentors with populated user and school data.

### Get Lead Mentor by ID
```
GET /lead-mentors/:id
```
Returns a specific lead mentor by ID.

### Create Lead Mentor
```
POST /lead-mentors
```
**Body:**
```json
{
  "name": "Mentor Name",
  "email": "mentor@example.com",
  "phoneNumber": "1234567890",
  "assignedSchools": ["school-id-1", "school-id-2"],
  "hasAccessToAllSchools": false
}
```
**Note:** If `hasAccessToAllSchools` is true, `assignedSchools` array is ignored.

### Update Lead Mentor
```
PUT /lead-mentors/:id
```
**Body:**
```json
{
  "phoneNumber": "1234567890",
  "assignedSchools": ["school-id-1", "school-id-2"],
  "hasAccessToAllSchools": false,
  "isActive": true
}
```

### Delete Lead Mentor
```
DELETE /lead-mentors/:id
```
Soft deletes the lead mentor.

## Setup Process

When a School Admin or Lead Mentor is created:
1. A User record is created with the provided email and name
2. A setup token is generated and stored
3. An invitation email is sent with a setup link
4. The user clicks the setup link and sets their password
5. The account becomes active and they can log in

## Data Models

### School
```javascript
{
  name: String (required),
  address: String (required),
  board: String (enum: ICSE, CBSE, State, Other),
  image: String (optional),
  logo: String (optional),
  affiliatedTo: String (optional),
  state: String (required),
  city: String (required),
  branchName: String (optional),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### SchoolAdmin
```javascript
{
  user: ObjectId (ref: User),
  school: ObjectId (ref: School),
  phoneNumber: String (required),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### LeadMentor
```javascript
{
  user: ObjectId (ref: User),
  phoneNumber: String (required),
  assignedSchools: [ObjectId] (ref: School),
  hasAccessToAllSchools: Boolean (default: false),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## Error Responses

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 404: Not Found
- 409: Conflict (duplicate email/name)
- 500: Internal Server Error

## Success Responses

All successful responses include:
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```
