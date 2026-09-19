# Lead Mentor Permissions System

## Overview

The Lead Mentor Permissions System provides granular access control for Lead Mentors, allowing Super Admins to assign specific permissions to each Lead Mentor based on their responsibilities.

## Available Permissions

The system includes the following permissions:

- `ADD_RESOURCES` - Allow adding and managing educational resources
- `ADD_MODULES` - Allow creating and managing learning modules  
- `ADD_STUDENTS` - Allow adding and managing students
- `ADD_ADMINS` - Allow adding and managing school administrators
- `ADD_MENTORS` - Allow adding and managing mentors

## Backend Implementation

### 1. Constants

Permissions are defined in `backend/src/constants/index.ts`:

```typescript
export const PERMISSIONS = {
  ADD_RESOURCES: "add_resources",
  ADD_MODULES: "add_modules", 
  ADD_STUDENTS: "add_students",
  ADD_ADMINS: "add_admins",
  ADD_MENTORS: "add_mentors",
} as const;
```

### 2. Database Model

The `LeadMentor` model includes a `permissions` field:

```typescript
permissions: {
  type: [{
    type: String,
    enum: Object.values(PERMISSIONS),
  }],
  default: [],
},
```

### 3. Permission Middleware

Use the permission middleware to protect routes:

```typescript
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

// Require specific permission
router.post("/students", requirePermission(PERMISSIONS.ADD_STUDENTS), createStudent);

// Require any of multiple permissions
router.get("/resources", requireAnyPermission([PERMISSIONS.ADD_RESOURCES, PERMISSIONS.ADD_MODULES]), getResources);
```

### 4. Controller Updates

Controllers now handle permissions in create/update operations:

```typescript
// Create Lead Mentor with permissions
const { name, email, phoneNumber, permissions } = req.body;
const newLeadMentor = new LeadMentor({
  // ... other fields
  permissions: permissions || [],
});
```

## Frontend Implementation

### 1. Permission Constants

Frontend constants are defined in `frontend/src/constants/permissions.ts`:

```typescript
export const PERMISSIONS = {
  ADD_RESOURCES: "add_resources",
  ADD_MODULES: "add_modules", 
  ADD_STUDENTS: "add_students",
  ADD_ADMINS: "add_admins",
  ADD_MENTORS: "add_mentors",
} as const;

export const PERMISSION_LABELS = {
  [PERMISSIONS.ADD_RESOURCES]: "Add Resources",
  // ... other labels
};
```

### 2. Form Components

Both Create and Edit Lead Mentor forms include permission checkboxes with:
- Individual permission toggles
- Select All / Clear All buttons
- Permission descriptions
- Visual indicators

### 3. API Service

The Lead Mentor service handles permissions in requests:

```typescript
export interface CreateLeadMentorData {
  // ... other fields
  permissions?: string[];
}
```

## Usage Examples

### Creating a Lead Mentor with Permissions

```typescript
const leadMentorData = {
  name: "John Doe",
  email: "john@example.com",
  phoneNumber: "+1234567890",
  permissions: [PERMISSIONS.ADD_STUDENTS, PERMISSIONS.ADD_ADMINS]
};

await leadMentorService.create(leadMentorData);
```

### Protecting Routes with Permissions

```typescript
// Only lead mentors with ADD_STUDENTS permission can access
router.post("/students", requirePermission(PERMISSIONS.ADD_STUDENTS), createStudent);

// Multiple permissions - user needs at least one
router.get("/dashboard", requireAnyPermission([PERMISSIONS.ADD_STUDENTS, PERMISSIONS.ADD_ADMINS]), getDashboard);
```

### Checking Permissions in Controllers

```typescript
export const createStudent = async (req: Request, res: Response) => {
  // Permission is already checked by middleware
  // req.leadMentor contains the lead mentor with permissions
  const leadMentor = req.leadMentor;
  
  // Proceed with student creation
  // ...
};
```

## Migration Notes

### Existing Lead Mentors

- Existing Lead Mentors will have an empty `permissions` array by default
- They will need to be updated through the Edit form to assign permissions
- Without permissions, they will only have read access to most resources

### Database Migration

If you have existing data, you may want to create a migration script to assign default permissions to existing Lead Mentors:

```typescript
// Example migration script
const leadMentors = await LeadMentor.find({ permissions: { $exists: false } });
for (const mentor of leadMentors) {
  mentor.permissions = [PERMISSIONS.ADD_STUDENTS, PERMISSIONS.ADD_ADMINS]; // Default permissions
  await mentor.save();
}
```

## Security Considerations

1. **Super Admin Override**: Super Admins always have all permissions regardless of their assigned permissions
2. **Permission Validation**: All permissions are validated against the enum values
3. **Middleware Order**: Permission middleware should be applied after authentication middleware
4. **Default Permissions**: New Lead Mentors start with no permissions (empty array)

## Testing

To test the permissions system:

1. Create a Lead Mentor with specific permissions
2. Try to access protected routes with and without the required permission
3. Verify that Super Admins can access all routes regardless of permissions
4. Test the Select All / Clear All functionality in the forms

## Future Enhancements

Potential future improvements:
- Role-based permission groups
- Time-based permissions
- Resource-specific permissions
- Permission inheritance
- Audit logging for permission changes
