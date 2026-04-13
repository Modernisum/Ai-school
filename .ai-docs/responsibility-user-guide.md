# Responsibility System - User Guide

## Overview
The Responsibility System helps schools manage employee responsibilities, assignments, and track performance. This guide explains how to use the system as an administrator or staff member.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Managing Responsibilities](#managing-responsibilities)
3. [Assigning Responsibilities](#assigning-responsibilities)
4. [Tracking Performance](#tracking-performance)
5. [Generating Reports](#generating-reports)
6. [Troubleshooting](#troubleshooting)

## Getting Started

### Accessing the System
1. Log in to the school management system
2. Navigate to **Infrastructure → Responsibility Management**
3. You'll see the main dashboard with:
   - Total responsibilities
   - Active assignments
   - Revenue overview
   - Utilization rate

### User Roles & Permissions
- **Administrator**: Full access to create, edit, delete responsibilities and assignments
- **Principal**: View all responsibilities, generate reports
- **Department Head**: Manage responsibilities within their department
- **Teacher/Staff**: View assigned responsibilities, update status

## Managing Responsibilities

### Creating a Responsibility
1. Click **"Create Responsibility"** button
2. Fill in the form:
   - **Name**: Descriptive name (e.g., "Class Teacher - Grade 5")
   - **Description**: Detailed responsibilities
   - **Employee Type**: Teacher, Staff, Administrator, etc.
   - **Space Category**: Classroom, Lab, Office, etc.
   - **Monthly Price**: Fixed monthly compensation
   - **Per Day Price**: Daily rate (for part-time)
   - **Student Fee**: Additional fee per student
   - **Work Level**: Low, Medium, High
   - **Work Period**: Daily, Weekly, Monthly
   - **Work Amount**: Numerical workload (e.g., 1.0 for full-time)

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
   - **Note**: Deleting a responsibility will also remove all assignments

## Assigning Responsibilities

### Assigning to an Employee
1. Navigate to **Assignments → New Assignment**
2. Select:
   - **Employee**: Choose from the employee list
   - **Responsibility**: Select from available responsibilities
   - **Space**: Select the physical space (classroom, lab, etc.)
   - **Start Date**: Assignment start date
   - **End Date**: Optional end date

3. Click **Assign**

### Bulk Assignments
1. Navigate to **Assignments → Bulk Assign**
2. Upload a CSV file with columns:
   ```
   employee_id,responsibility_id,space_id,start_date,end_date
   emp_123,resp_456,class_101,2024-01-01,2024-12-31
   ```

3. Or use the form to add multiple assignments manually
4. Click **Process Assignments**

### Viewing Assignments
- **By Employee**: Go to **Employees → [Employee Name] → Responsibilities**
- **By Responsibility**: Go to **Responsibilities → [Responsibility Name] → Assignments**
- **By Student**: Go to **Students → [Student Name] → Teachers/Responsibilities**

### Removing Assignments
1. Find the assignment in the list
2. Click **Remove Assignment**
3. Provide reason (optional)
4. Confirm removal

## Tracking Performance

### Responsibility Analytics
Each responsibility has an analytics dashboard showing:
- **Total Assignments**: Number of employees assigned
- **Active Assignments**: Currently active assignments
- **Total Revenue**: Total earnings from this responsibility
- **Utilization Rate**: Percentage of capacity used
- **Employee Distribution**: Breakdown by employee type
- **Space Utilization**: Performance by space

### Employee Workload
View an employee's workload:
1. Go to **Employees → [Employee Name] → Workload**
2. See:
   - Total responsibilities assigned
   - Monthly earnings
   - Workload distribution
   - Performance metrics

### Student-Teacher Mapping
For students to see their teachers:
1. Go to **Students → [Student Name] → My Teachers**
2. View all teachers assigned to their classes/spaces
3. See contact information and responsibilities

## Generating Reports

### Available Reports
1. **Utilization Report**: Shows how effectively spaces are being used
2. **Workload Report**: Employee workload distribution
3. **Space Distribution Report**: Responsibility distribution across spaces
4. **Revenue Report**: Financial performance by responsibility
5. **Assignment History**: Timeline of all assignments

### Generating a Report
1. Navigate to **Reports → [Report Type]**
2. Select date range:
   - Last 7 days
   - Last 30 days
   - Last 90 days
   - Custom range
3. Click **Generate Report**

### Export Options
All reports can be exported as:
- **PDF**: For printing or sharing
- **CSV**: For data analysis
- **Excel**: For spreadsheet processing

### Scheduled Reports
Set up automatic report generation:
1. Go to **Reports → Scheduled Reports**
2. Configure:
   - Report type
   - Frequency (Daily, Weekly, Monthly)
   - Recipients (email addresses)
   - Format (PDF, CSV)
3. Click **Save Schedule**

## Common Tasks

### Finding a Responsibility
Use the search bar to find responsibilities by:
- Name
- Employee type
- Space category
- Description keywords

### Filtering Responsibilities
Use filters to narrow down the list:
- **Employee Type**: Teacher, Staff, etc.
- **Space Category**: Classroom, Lab, etc.
- **Status**: Active, Inactive
- **Work Level**: Low, Medium, High

### Sorting Responsibilities
Click column headers to sort by:
- Name (A-Z, Z-A)
- Monthly Price (High-Low, Low-High)
- Created Date (Newest-Oldest)
- Number of Assignments

## Best Practices

### 1. Naming Conventions
- Use consistent naming: `[Role] - [Grade/Subject] - [Space]`
- Example: `Class Teacher - Grade 5 - Room 101`

### 2. Pricing Strategy
- Set realistic monthly prices based on market rates
- Consider per-day pricing for part-time roles
- Include student fees where applicable

### 3. Assignment Management
- Assign responsibilities before the academic year starts
- Review assignments quarterly
- Update assignments when employees change roles

### 4. Space Utilization
- Monitor space utilization regularly
- Reassign underutilized spaces
- Balance workload across similar spaces

## Troubleshooting

### Common Issues

#### "Responsibility not found"
- Check if the responsibility exists
- Verify you have permission to view it
- Refresh the page

#### "Cannot assign responsibility"
- Employee may already be assigned to this responsibility
- Space may be at full capacity
- Check assignment dates (no overlap)

#### "Report generation failed"
- Check date range validity
- Ensure you have sufficient data for the period
- Try a smaller date range

#### "Slow performance"
- Use filters to reduce data volume
- Generate reports during off-peak hours
- Contact IT if issue persists

### Error Messages
- **"Duplicate assignment"**: Employee already assigned
- **"Space not available"**: Space at full capacity or not found
- **"Permission denied"**: Insufficient user permissions
- **"Invalid date range"**: End date before start date

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

## Appendix

### Keyboard Shortcuts
- `Ctrl + N`: New responsibility
- `Ctrl + A`: New assignment
- `Ctrl + F`: Search
- `Ctrl + P`: Print report
- `Ctrl + E`: Export data

### Mobile Access
The responsibility system is accessible via:
- Web browser on mobile devices
- Mobile app (available for iOS and Android)

### Data Privacy
- Responsibility data is stored securely
- Access is restricted by role
- Reports contain anonymized data where appropriate

### Version History
- **v1.0**: Basic responsibility management
- **v1.1**: Added analytics and reporting
- **v1.2**: Added bulk assignments and CSV import/export
- **v1.3**: Added scheduled reports and email delivery
- **Current**: v1.4 with performance optimizations and pagination

---

*Last Updated: April 2024*  
*For the latest updates, check the system announcements.*