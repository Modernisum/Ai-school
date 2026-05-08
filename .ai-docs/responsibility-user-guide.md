# Responsibility System - User Guide

## Overview
The Responsibility System helps schools manage employee responsibilities, assignments, and track performance. This guide explains how to use the system as an administrator or staff member.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Managing Responsibilities](#managing-responsibilities)
3. [Assigning Responsibilities](#assigning-responsibilities)
4. [Tracking Performance](#tracking-performance)
5. [Filtering & Searching](#filtering--searching)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the System
1. Log in to the school management system
2. Navigate to **Infrastructure → Responsibility Management**
3. You'll see the main dashboard with:
   - Total responsibilities
   - Active assignments
   - Utilization rate
   - Analytics overview

### User Roles & Permissions
- **Administrator**: Full access to create, edit, delete responsibilities and assignments
- **Principal**: View all responsibilities, generate reports
- **Department Head**: Manage responsibilities within their department
- **Teacher/Staff**: View assigned responsibilities, update status

---

## Managing Responsibilities

### Creating a Responsibility
1. Click **"Create Responsibility"** button
2. Fill in the form:
   - **Name**: Descriptive name (e.g., "Class Teacher - Grade 5")
   - **Description**: Detailed responsibilities
   - **Employee Type**: Teacher, Staff, Administrator, etc.
   - **Priority**: Low, Medium, High
   - **Estimated Hours/Week**: Numerical workload value
   - **Compensation**: Fixed compensation amount
   - **Start Date / End Date**: Active period
   - **Is Active**: Toggle to enable/disable

3. Click **Save** to create the responsibility

### Editing a Responsibility
1. Find the responsibility in the list
2. Click the **Edit** button (pencil icon)
3. Update the required fields
4. Click **Save Changes**

### Deleting a Responsibility
1. Find the responsibility in the list
2. Click the **Delete** button (trash icon)
3. Confirm deletion
   - **Note:** Deleting a responsibility will also remove all assignments

---

## Assigning Responsibilities

### Assigning to an Employee
1. Navigate to **Assignments → New Assignment**
2. Select:
   - **Employee**: Choose from the employee list
   - **Responsibility**: Select from available responsibilities
   - **Start Date**: Assignment start date
   - **End Date**: Optional end date
3. Click **Assign**

### Bulk Assignments
1. Navigate to **Assignments → Bulk Assign**
2. Select the responsibility and add multiple employee IDs
3. Set a common assignment date and optional notes
4. Click **Process Assignments**

### Viewing Assignments
- **By Employee**: Go to **Employees → [Employee Name] → Responsibilities**
- **By Responsibility**: Go to **Responsibilities → [Responsibility Name] → Assignments**

### Removing Assignments
1. Find the assignment in the list
2. Click **Remove Assignment**
3. Provide reason (optional)
4. Confirm removal

---

## Tracking Performance

### Responsibility Analytics
Each responsibility has an analytics dashboard showing:
- **Total Assignments**: Number of employees assigned
- **Active Assignments**: Currently active assignments
- **Completion Rate**: Percentage of tasks completed
- **Utilization Rate**: Percentage of capacity used
- **Trends**: Assignment trend over the last 30 days

### Employee Workload
View an employee's workload:
1. Go to **Employees → [Employee Name] → Workload**
2. See:
   - Total responsibilities assigned
   - Hours this week
   - Completion percentage

### Overview Analytics Dashboard
The school-wide analytics view shows:
- Total vs. active responsibilities
- Breakdown by employee type and priority
- Average assignments per responsibility
- Total estimated hours per week
- Overall utilization rate

---

## Filtering & Searching

### All filtering and pagination happens in the frontend — no need to reload data.

### Available Filters
Use the filter panel to narrow down the responsibility list:

| Filter | Options |
|--------|---------|
| **Employee Type** | Teacher, Staff, Administrator |
| **Status** | Active, Inactive |
| **Priority** | High, Medium, Low |
| **Date Range** | Start Date / End Date |

### Search
Use the search bar to find responsibilities by:
- Name
- Description keywords

### Sorting
Click column headers to sort by:
- Name (A–Z, Z–A)
- Priority (High–Low)
- Created Date (Newest–Oldest)
- Number of Assignments

### Pagination
The list is paginated locally in the browser. Use the **Next / Previous** buttons or select a page size (10, 25, 50) from the toolbar.

### Exporting Data
Export the current filtered list to **CSV** using the **Export** button in the toolbar. The file is generated directly in the browser — no server request needed.

---

## Best Practices

### 1. Naming Conventions
- Use consistent naming: `[Role] - [Grade/Subject]`
- Example: `Class Teacher - Grade 5`

### 2. Assignment Management
- Assign responsibilities before the academic year starts
- Review assignments quarterly
- Update assignments when employees change roles

### 3. Using Filters Effectively
- Use **Date Range** filters for time-bound analytics
- Use **isActive=false** to audit inactive responsibilities
- Use **Priority: High** filter to focus on critical responsibilities

### 4. Performance Tips
- Use filters to reduce the visible data set before exporting
- The analytics dashboard auto-updates when filters change — no page reload needed

---

## Troubleshooting

### Common Issues

#### "Responsibility not found"
- Check if the responsibility exists
- Verify you have permission to view it
- Refresh the page

#### "Cannot assign responsibility"
- Employee may already be assigned to this responsibility
- Check assignment dates (no overlap)

#### "Slow page load"
- Apply filters to reduce data volume on the next fetch
- Contact IT if the issue persists

### Error Messages
- **"Duplicate assignment"**: Employee already assigned
- **"Permission denied"**: Insufficient user permissions
- **"Invalid date range"**: End date before start date

---

## Getting Help

### Support Channels
1. **IT Help Desk**: For technical issues
2. **Administrator**: For permission and access issues
3. **System Documentation**: For detailed technical information

### Training Resources
1. **Video Tutorials**: Available in the help section
2. **Quick Start Guide**: PDF download
3. **Live Training Sessions**: Monthly schedule

### Feedback
- Use the **Feedback** button in the application
- Report bugs through the **Issue Tracker**
- Suggest features via the **Feature Request** form

---

## Appendix

### Keyboard Shortcuts
- `Ctrl + N`: New responsibility
- `Ctrl + A`: New assignment
- `Ctrl + F`: Search / Filter
- `Ctrl + E`: Export current list as CSV

### Mobile Access
The responsibility system is accessible via:
- Web browser on mobile devices
- Mobile app (available for iOS and Android)

### Data Privacy
- Responsibility data is stored securely
- Access is restricted by role
- Exported data follows school data privacy policies

### Version History
- **v1.0**: Basic responsibility management
- **v1.1**: Added analytics and reporting
- **v1.2**: Added bulk assignments
- **v1.3**: Scheduled reports and email delivery
- **v2.0**: Frontend-driven pagination, filtering, sorting & CSV export; backend APIs streamlined

---

*Last Updated: April 2026*  
*For the latest updates, check the system announcements.*