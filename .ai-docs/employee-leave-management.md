# Employee Leave Management System

## Overview
जब कोई टीचर या एम्प्लॉयी चुट्टी के लिए प्रपोजल देता है, तो पूरा सिस्टम तीन लेयर में काम करता है: **Frontend (Vidhyam Web App)**, **Backend (Rust API)**, और **Mobile App (Chatra Flutter App)**।

## System Architecture

### 1. Backend System (Rust API)

#### Database Schema
```sql
-- leave_applications table structure
CREATE TABLE leave_applications (
    leave_id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100),
    reason TEXT,
    leave_type VARCHAR(20) DEFAULT 'casual',
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/leave/:schoolId` | Create new leave application |
| GET | `/api/leave/:schoolId` | List all leaves for school |
| POST | `/api/leave/:schoolId/:leaveId/approve` | Approve leave application |
| POST | `/api/leave/:schoolId/:leaveId/reject` | Reject leave application |
| POST | `/api/leave/:schoolId/:leaveId/extend` | Extend leave duration |
| POST | `/api/leave/:schoolId/:leaveId/reduce` | Reduce leave duration |
| GET | `/api/leave/:schoolId/:leaveId/pdf` | Download leave PDF |

#### Backend Services
- **LeaveService** (`Backend/src/services/leave_service.rs`): Core business logic
- **LeaveRepository** (`Backend/src/repository/leave_repo.rs`): Database operations
- **TimetableEngine**: AI-based proxy teacher suggestions

#### Key Backend Features:
- **Multi-tenancy Support**: हर स्कूल का अलग डेटा isolation
- **Audit Logging**: सभी actions का पूरा रिकॉर्ड
- **AI Proxy Suggestions**: टीचर के absence में substitute teachers की AI-based suggestions
- **Status Management**: pending → approved/rejected workflow
- **Duration Management**: Leave extension/reduction capabilities

### 2. Frontend System (Vidhyam React App)

#### Components Structure
```
frontend/Vidhyam/src/features/employees/
├── components/
│   ├── LeaveManagement.jsx          # Admin leave management interface
│   ├── addemployee.jsx              # Add employee form
│   └── employeeprofile/             # Employee profile components
└── pages/
    ├── EmployeeModule.jsx           # Main employee module
    ├── employee.jsx                 # Employee listing
    └── payroll.jsx                  # Payroll management
```

#### Frontend Features:
- **Real-time Updates**: Leave status changes immediately visible
- **AI Proxy Integration**: Substitute teacher suggestions based on timetable
- **Bulk Actions**: Multiple leaves approve/reject simultaneously
- **Filtering & Sorting**: Status-wise, date-wise filtering
- **PDF Generation**: Leave application PDF download functionality
- **Responsive Design**: Works on desktop and tablet

#### UI Workflow:
1. Admin logs into Vidhyam dashboard (`/dashboard`)
2. Navigates to Employees → Leave Management
3. Views all pending leave applications in tabular format
4. Reviews each application with employee details and dates
5. Clicks "Approve" or "Reject" with optional comments
6. AI suggests substitutes for teacher leaves automatically
7. Notifications sent to concerned employees

### 3. Mobile App System (Chatra Flutter App)

#### Current Implementation:
- **Live Classroom Leave**: "Leave Class" functionality in live sessions
- **Basic Navigation**: Dashboard and profile management
- **Future Roadmap**: Mobile leave application submission planned

#### Mobile App Structure:
```
Apps/chatra/lib/
├── account_screen.dart              # User account management
├── api_service.dart                 # API communication
└── widgets/                         # UI components
```

## Complete Workflow

### Step-by-Step Process

#### 1. Leave Application Submission
```
Employee/Teacher → Mobile App/Web Portal → Submit Form → Backend API
```

**Data Payload Example:**
```json
{
  "employeeId": "EMP001",
  "employeeName": "John Doe",
  "reason": "Medical emergency",
  "leaveType": "sick",
  "fromDate": "2024-04-10",
  "toDate": "2024-04-12"
}
```

#### 2. Backend Processing
- Generate unique `leave_id` (format: "LV" + timestamp)
- Validate dates and employee existence
- Set initial status as "pending"
- Store in `leave_applications` table
- Create audit log entry

#### 3. Admin Notification
- Real-time notification in Vidhyam dashboard
- Email/SMS notifications (if configured)
- Dashboard badge shows pending count

#### 4. Admin Review & Decision
- Admin views application details
- AI suggests substitute teachers (for teaching staff)
- Admin can:
  - **Approve**: Change status to "approved"
  - **Reject**: Change status to "rejected" with reason
  - **Modify Duration**: Extend or reduce leave days
  - **Assign Proxy**: Manually assign substitute teacher

#### 5. Post-Approval Actions
- **Timetable Update**: Adjust schedules for absent period
- **Proxy Assignment**: Assign substitute teacher (automated/manual)
- **Notifications**: Inform employee and affected parties
- **Payroll Integration**: Leave days deducted from salary (if applicable)

#### 6. Completion & Reporting
- Leave history maintained for each employee
- Monthly/Yearly leave reports
- PDF generation for official records
- Analytics dashboard for leave patterns

## AI Proxy Suggestion System

### How It Works
1. **Input Analysis**: Teacher ID, dates, subject, class
2. **Availability Check**: Scan other teachers' schedules
3. **Expertise Matching**: Match subject expertise levels
4. **Score Calculation**: Compatibility score (0-100%)
5. **Ranking**: Top 3 suggestions with scores

### Algorithm Components
- **Timetable Engine**: Checks teacher availability
- **Subject Expertise Database**: Teacher-subject proficiency levels
- **Conflict Detection**: Avoids double-booking
- **Priority Rules**: Seniority, proximity, preference

### Example Output:
```json
{
  "suggestions": [
    {
      "employee_id": "TCH045",
      "name": "Rajesh Kumar",
      "subject": "Mathematics",
      "score": 92,
      "availability": "Free all periods"
    },
    {
      "employee_id": "TCH128",
      "name": "Priya Sharma",
      "subject": "Mathematics",
      "score": 85,
      "availability": "Free periods 3-5"
    }
  ]
}
```

## Database Design Details

### Tables Involved
1. **leave_applications**: Main leave records
2. **employees**: Employee master data
3. **audit_logs**: Action tracking
4. **timetable_slots**: Schedule management
5. **proxy_assignments**: Substitute teacher records

### Relationships
```
employees (1) ──── (many) leave_applications
leave_applications (1) ──── (many) proxy_assignments
timetable_slots (many) ──── (1) employees
```

## API Documentation

### Create Leave Application
```http
POST /api/leave/{schoolId}
Content-Type: application/json

{
  "employeeId": "string",
  "employeeName": "string",
  "reason": "string",
  "leaveType": "casual|sick|emergency|annual",
  "fromDate": "YYYY-MM-DD",
  "toDate": "YYYY-MM-DD"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "leaveId": "LV1712489321000",
    "status": "pending",
    "message": "Leave application submitted successfully"
  }
}
```

### List Leaves
```http
GET /api/leave/{schoolId}
```

### Approve/Reject Leave
```http
POST /api/leave/{schoolId}/{leaveId}/approve
POST /api/leave/{schoolId}/{leaveId}/reject
```

## Frontend Implementation Details

### LeaveManagement.jsx Key Features
- **State Management**: React hooks for real-time updates
- **API Integration**: RTK Query for efficient data fetching
- **UI Components**: 
  - Status badges (pending/approved/rejected)
  - Action buttons with loading states
  - Date range display
  - Employee information cards
- **Error Handling**: Graceful error states and retry logic

### Key Functions
```javascript
// Fetch all leaves
const fetchLeaves = async () => {
  const res = await callApiWithBackoff(`${API_BASE_URL}/leave/${schoolId}`);
  setLeaves(res.leaves || res);
};

// Update leave status
const updateStatus = async (leaveId, action) => {
  await callApiWithBackoff(
    `${API_BASE_URL}/leave/${schoolId}/${leaveId}/${action}`,
    { method: 'POST' }
  );
  // Update local state
};

// Get AI proxy suggestions
const fetchProxySuggestions = async (leave) => {
  const res = await callApiWithBackoff(
    `${API_BASE_URL}/dashboard/${schoolId}/leaves/proxy-suggestions`
  );
  return res.data.suggestions;
};
```

## Security & Compliance

### Authentication & Authorization
- **JWT Tokens**: Bearer token authentication
- **Role-based Access**: Admin vs Employee permissions
- **School Isolation**: Data scoped to school ID

### Audit Trail
All actions are logged with:
- Timestamp
- Admin/User ID
- Action type (CREATE, APPROVE, REJECT, etc.)
- Before/After state (for modifications)
- IP address and user agent

### Data Validation
- Date range validation (fromDate ≤ toDate)
- Employee existence check
- Leave type validation
- Reason length limits
- School ID format validation

## Error Handling

### Common Error Scenarios
1. **Invalid Dates**: "From date cannot be after to date"
2. **Employee Not Found**: "Employee does not exist"
3. **Duplicate Leave**: "Leave already exists for this period"
4. **Insufficient Balance**: "Not enough leave balance"
5. **System Errors**: "Internal server error"

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-04-07T09:30:00Z"
}
```

## Testing & Quality Assurance

### Test Cases
1. **Unit Tests**: Service layer logic
2. **Integration Tests**: API endpoints
3. **UI Tests**: Frontend component behavior
4. **Load Tests**: Concurrent leave applications
5. **Security Tests**: Authentication and authorization

### Monitoring
- **Application Logs**: Debug and error logging
- **Performance Metrics**: API response times
- **Business Metrics**: Leave approval rates, average processing time
- **Alerting**: Critical error notifications

## Deployment & Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/school_db
JWT_SECRET=your_jwt_secret_here
API_BASE_URL=http://localhost:3000
```

### Dependencies
- **Backend**: Rust, Axum, SQLx, Tokio
- **Frontend**: React, Redux Toolkit, Tailwind CSS
- **Database**: PostgreSQL with RLS
- **Mobile**: Flutter, Dart

## Future Enhancements

### Planned Features
1. **Mobile Leave Application**: Submit leaves via Chatra app
2. **Leave Balance Tracking**: Annual leave quotas and usage
3. **Auto-approval Rules**: Rules-based automatic approval
4. **Calendar Integration**: Google Calendar/Outlook sync
5. **Advanced Analytics**: Leave pattern analysis and predictions
6. **Multi-language Support**: Regional language interfaces
7. **Bulk Operations**: Bulk approve/reject for admins

### Technical Improvements
1. **WebSocket Updates**: Real-time status updates
2. **Caching Layer**: Redis for frequent queries
3. **Queue System**: Async processing for heavy operations
4. **Microservices**: Split into dedicated leave service
5. **API Versioning**: Support multiple API versions

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Leave Not Appearing in List
- Check school ID in API call
- Verify employee exists in database
- Confirm leave status is not "deleted"

#### 2. AI Proxy Suggestions Not Working
- Ensure timetable data is populated
- Check teacher-subject mappings
- Verify date format in API request

#### 3. PDF Generation Fails
- Check server disk space
- Verify PDF library installation
- Validate leave data completeness

#### 4. Performance Issues
- Check database indexes on frequently queried columns
- Implement pagination for large datasets
- Add caching for static data

## Conclusion

यह employee leave management system एक comprehensive solution है जो:
1. **Employees** को आसानी से leave apply करने देता है
2. **Admins** को efficient approval process provide करता है
3. **AI-powered suggestions** से substitute teacher assignment automate करता है
4. **Complete audit trail** maintain करता है compliance के लिए
5. **Multi-platform support** (Web + Mobile) provide करता है

सिस्टम scalable, secure, और user-friendly design किया गया है जो छोटे से लेकर बड़े schools तक support कर सकता है।