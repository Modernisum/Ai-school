# Enhanced Employee Leave Management System - Frontend Components Design

## Overview
This document outlines the frontend component architecture for the enhanced employee leave management system in the Vidhyam web application.

## Current Frontend Analysis

### Existing Components
- `LeaveManagement.jsx` - Basic leave management interface
- `EmployeeModule.jsx` - Employee management dashboard
- Existing notification system in dashboard

## Enhanced Frontend Architecture

### Component Structure
```
frontend/Vidhyam/src/features/employees/
├── components/
│   ├── leave/
│   │   ├── EnhancedLeaveManagement.jsx          # Main admin interface
│   │   ├── LeaveQueueTable.jsx                  # Leave request queue
│   │   ├── LeaveDetailModal.jsx                 # Detailed leave view
│   │   ├── ConditionalApprovalPanel.jsx         # Conditional approval interface
│   │   ├── CoverageAssignmentWizard.jsx         # Responsibility coverage wizard
│   │   ├── LeaveBalanceCard.jsx                 # Employee leave balance display
│   │   ├── WorkloadAssessmentPanel.jsx          # Workload feasibility assessment
│   │   ├── NotificationCenter.jsx               # Real-time notification center
│   │   └── templates/
│   │       └── ConditionalTemplateManager.jsx   # Template management
│   └── shared/
│       └── NotificationBadge.jsx                # Reusable notification badge
├── pages/
│   ├── EnhancedEmployeeModule.jsx               # Enhanced employee module
│   ├── LeaveDashboard.jsx                       # Comprehensive leave dashboard
│   └── ConditionalApprovalTemplates.jsx         # Template management page
└── hooks/
    ├── useLeaveManagement.js                    # Leave management hooks
    ├── useRealTimeNotifications.js              # Real-time notification hooks
    └── useConditionalApproval.js                # Conditional approval logic hooks
```

## Core Components Design

### 1. EnhancedLeaveManagement.jsx

#### Features:
- Real-time leave request queue
- Priority-based sorting and filtering
- Bulk action support
- Quick approval/rejection with conditions
- Integration with notification system

#### Component Structure:
```jsx
const EnhancedLeaveManagement = ({ schoolId }) => {
  const [leaves, setLeaves] = useState([]);
  const [selectedLeaves, setSelectedLeaves] = useState([]);
  const [filters, setFilters] = useState({
    status: 'pending',
    department: 'all',
    leaveType: 'all',
    priority: 'all',
    dateRange: { from: null, to: null }
  });
  const [viewMode, setViewMode] = useState('table'); // 'table', 'card', 'calendar'
  
  // Real-time updates via WebSocket
  const { notifications, unreadCount } = useRealTimeNotifications(schoolId);
  
  return (
    <div className="enhanced-leave-management">
      <div className="header-section">
        <h1>Leave Management</h1>
        <div className="header-actions">
          <NotificationCenter 
            notifications={notifications}
            unreadCount={unreadCount}
            onNotificationClick={handleNotificationClick}
          />
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          <BulkActionMenu 
            selectedCount={selectedLeaves.length}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            onBulkConditional={handleBulkConditional}
          />
        </div>
      </div>
      
      <DashboardSummary 
        schoolId={schoolId}
        timeframe="month"
        onTimeframeChange={handleTimeframeChange}
      />
      
      <FilterPanel 
        filters={filters}
        onFilterChange={handleFilterChange}
        departments={departments}
        leaveTypes={leaveTypes}
      />
      
      {viewMode === 'table' ? (
        <LeaveQueueTable
          leaves={filteredLeaves}
          selectedLeaves={selectedLeaves}
          onSelectLeave={handleSelectLeave}
          onSelectAll={handleSelectAll}
          onViewDetails={handleViewDetails}
          onQuickApprove={handleQuickApprove}
          onQuickReject={handleQuickReject}
          onConditionalApprove={handleConditionalApprove}
        />
      ) : viewMode === 'card' ? (
        <LeaveCardView
          leaves={filteredLeaves}
          onCardClick={handleViewDetails}
        />
      ) : (
        <LeaveCalendarView
          leaves={filteredLeaves}
          onEventClick={handleViewDetails}
        />
      )}
      
      {/* Modals */}
      {selectedLeave && (
        <LeaveDetailModal
          leave={selectedLeave}
          isOpen={!!selectedLeave}
          onClose={() => setSelectedLeave(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onConditionalApprove={handleOpenConditionalPanel}
          onAssignCoverage={handleOpenCoverageWizard}
        />
      )}
      
      {showConditionalPanel && selectedLeave && (
        <ConditionalApprovalPanel
          leave={selectedLeave}
          isOpen={showConditionalPanel}
          onClose={() => setShowConditionalPanel(false)}
          onSave={handleSaveConditions}
          templates={conditionalTemplates}
        />
      )}
      
      {showCoverageWizard && selectedLeave && (
        <CoverageAssignmentWizard
          leave={selectedLeave}
          isOpen={showCoverageWizard}
          onClose={() => setShowCoverageWizard(false)}
          onComplete={handleCoverageAssignment}
        />
      )}
    </div>
  );
};
```

### 2. LeaveQueueTable.jsx

#### Features:
- Sortable columns
- Priority indicators
- Status badges with colors
- Quick action buttons
- Selectable rows for bulk operations

#### Design:
```jsx
const LeaveQueueTable = ({ 
  leaves, 
  selectedLeaves, 
  onSelectLeave, 
  onSelectAll,
  onViewDetails,
  onQuickApprove,
  onQuickReject,
  onConditionalApprove 
}) => {
  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedLeaves.length === leaves.length}
          onChange={onSelectAll}
        />
      ),
      render: (leave) => (
        <input
          type="checkbox"
          checked={selectedLeaves.includes(leave.leaveId)}
          onChange={() => onSelectLeave(leave.leaveId)}
        />
      ),
      width: '50px'
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (leave) => (
        <PriorityBadge priority={leave.priority} />
      ),
      width: '100px'
    },
    {
      key: 'employee',
      header: 'Employee',
      sortable: true,
      render: (leave) => (
        <div className="employee-cell">
          <Avatar src={leave.employeeAvatar} size="sm" />
          <div>
            <div className="employee-name">{leave.employeeName}</div>
            <div className="employee-department">{leave.department}</div>
          </div>
        </div>
      ),
      width: '200px'
    },
    {
      key: 'leaveDetails',
      header: 'Leave Details',
      render: (leave) => (
        <div className="leave-details">
          <div className="leave-type">{leave.leaveType}</div>
          <div className="date-range">
            {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
            <span className="days-count">({leave.totalDays} days)</span>
          </div>
          <div className="reason">{leave.reason}</div>
        </div>
      ),
      width: '250px'
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (leave) => (
        <LeaveBalanceIndicator
          used={leave.leaveBalanceUsed}
          remaining={leave.remainingBalance}
          total={leave.totalQuota}
        />
      ),
      width: '150px'
    },
    {
      key: 'submitted',
      header: 'Submitted',
      sortable: true,
      render: (leave) => (
        <div className="submitted-info">
          <div>{formatRelativeTime(leave.createdAt)}</div>
          <div className="submitted-via">
            via {leave.submittedVia === 'mobile' ? '📱 Mobile' : '💻 Web'}
          </div>
        </div>
      ),
      width: '150px'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (leave) => (
        <div className="action-buttons">
          <button
            className="btn-view"
            onClick={() => onViewDetails(leave)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            className="btn-approve"
            onClick={() => onQuickApprove(leave.leaveId)}
            title="Quick Approve"
            disabled={leave.status !== 'pending'}
          >
            <CheckCircle size={16} />
          </button>
          <button
            className="btn-conditional"
            onClick={() => onConditionalApprove(leave.leaveId)}
            title="Conditional Approve"
            disabled={leave.status !== 'pending'}
          >
            <FileCheck size={16} />
          </button>
          <button
            className="btn-reject"
            onClick={() => onQuickReject(leave.leaveId)}
            title="Quick Reject"
            disabled={leave.status !== 'pending'}
          >
            <XCircle size={16} />
          </button>
        </div>
      ),
      width: '200px'
    }
  ];

  return (
    <div className="leave-queue-table">
      <Table
        columns={columns}
        data={leaves}
        emptyState={
          <EmptyState
            icon={<Calendar size={48} />}
            title="No leave requests"
            description="There are no pending leave requests matching your filters."
          />
        }
        onSort={handleSort}
      />
    </div>
  );
};
```

### 3. ConditionalApprovalPanel.jsx

#### Features:
- Template-based condition selection
- Custom condition builder
- Preview of conditions
- Response deadline setting
- Auto-reject configuration

#### Design:
```jsx
const ConditionalApprovalPanel = ({ 
  leave, 
  isOpen, 
  onClose, 
  onSave,
  templates 
}) => {
  const [conditions, setConditions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [responseDeadline, setResponseDeadline] = useState(
    addDays(new Date(), 3).toISOString().split('T')[0]
  );
  const [autoReject, setAutoReject] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  
  const handleAddCondition = (type) => {
    const newCondition = {
      id: `cond_${Date.now()}`,
      type,
      value: getDefaultValueForType(type),
      status: 'pending'
    };
    setConditions([...conditions, newCondition]);
  };
  
  const handleApplyTemplate = (templateId) => {
    const template = templates.find(t => t.templateId === templateId);
    if (template) {
      setConditions(template.conditions);
      setSelectedTemplate(templateId);
    }
  };
  
  const calculateImpact = () => {
    // Calculate total salary deduction, day reduction, etc.
    return conditions.reduce((acc, cond) => {
      if (cond.type === 'salary_deduction') {
        acc.salaryDeduction += cond.value.amount || 0;
      } else if (cond.type === 'day_reduction') {
        acc.daysReduced += (cond.value.originalDays - cond.value.approvedDays) || 0;
      }
      return acc;
    }, { salaryDeduction: 0, daysReduced: 0 });
  };
  
  const impact = calculateImpact();
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <Modal.Header>
        <h2>Conditional Approval</h2>
        <p className="subtitle">Set conditions for {leave.employeeName}'s leave</p>
      </Modal.Header>
      
      <Modal.Body>
        <div className="conditional-approval-panel">
          {/* Template Selection */}
          <div className="template-section">
            <h3>Quick Templates</h3>
            <div className="template-grid">
              {templates.map(template => (
                <TemplateCard
                  key={template.templateId}
                  template={template}
                  isSelected={selectedTemplate === template.templateId}
                  onClick={() => handleApplyTemplate(template.templateId)}
                />
              ))}
            </div>
          </div>
          
          {/* Condition Builder */}
          <div className="condition-builder">
            <h3>Conditions</h3>
            <div className="condition-actions">
              <DropdownButton title="Add Condition" variant="outline">
                <Dropdown.Item onClick={() => handleAddCondition('salary_deduction')}>
                  💰 Salary Deduction
                </Dropdown.Item>
                <Dropdown.Item onClick={() => handleAddCondition('day_reduction')}>
                  📅 Day Reduction
                </Dropdown.Item>
                <Dropdown.Item onClick={() => handleAddCondition('coverage_required')}>
                  👥 Coverage Required
                </Dropdown.Item>
                <Dropdown.Item onClick={() => handleAddCondition('documentation_required')}>
                  📄 Documentation Required
                </Dropdown.Item>
                <Dropdown.Item onClick={() => handleAddCondition('alternative_arrangement')}>
                  🔄 Alternative Arrangement
                </Dropdown.Item>
              </DropdownButton>
            </div>
            
            <div className="conditions-list">
              {conditions.map((condition, index) => (
                <ConditionItem
                  key={condition.id}
                  condition={condition}
                  index={index}
                  onUpdate={(updated) => {
                    const newConditions = [...conditions];
                    newConditions[index] = updated;
                    setConditions(newConditions);
                  }}
                  onRemove={() => {
                    setConditions(conditions.filter((_, i) => i !== index));
                  }}
                />
              ))}
              
              {conditions.length === 0 && (
                <EmptyState
                  icon={<FileText size={32} />}
                  title="No conditions added"
                  description="Add conditions using the dropdown above or select a template."
                />
              )}
            </div>
          </div>
          
          {/* Impact Summary */}
          <div className="impact-summary">
            <h3>Impact Summary</h3>
            <div className="impact-cards">
              <ImpactCard
                title="Salary Impact"
                value={`₹${impact.salaryDeduction.toFixed(2)}`}
                icon={<CurrencyIcon />}
                color={impact.salaryDeduction > 0 ? 'warning' : 'success'}
              />
              <ImpactCard
                title="Days Reduced"
                value={`${impact.daysReduced} days`}
                icon={<CalendarIcon />}
                color={impact.daysReduced > 0 ? 'warning' : 'success'}
              />
              <ImpactCard
                title="Conditions"
                value={`${conditions.length}`}
                icon={<ListIcon />}
                color="info"
              />
            </div>
          </div>
          
          {/* Configuration */}
          <div className="configuration-section">
            <h3>Configuration</h3>
            <div className="config-grid">
              <div className="config-item">
                <label>Response Deadline</label>
                <input
                  type="date"
                  value={responseDeadline}
                  onChange={(e) => setResponseDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <small>Employee must respond by this date</small>
              </div>
              
              <div className="config-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={autoReject}
                    onChange={(e) => setAutoReject(e.target.checked)}
                  />
                  Auto-reject if no response
                </label>
                <small>Automatically reject leave if employee doesn't respond by deadline</small>
              </div>
            </div>
            
            <div className="config-item full-width">
              <label>Admin Notes (Optional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any additional notes for the employee..."
                rows={3}
              />
            </div>
          </div>
          
          {/* Preview */}
          <div className="preview-section">
            <h3>Preview</h3>
            <div className="preview-card">
              <p>
                <strong>To {leave.employeeName}:</strong>
              </p>
              <p>
                Your leave request for {leave.totalDays} days from {formatDate(leave.fromDate)} to {formatDate(leave.toDate)} has been conditionally approved with the following conditions:
              </p>
              <ul>
                {conditions.map(cond => (
                  <li key={cond.id}>
                    {renderConditionText(cond)}
                  </li>
                ))}
              </ul>
              <p>
                Please respond to these conditions by <strong>{formatDate(responseDeadline)}</strong>.
                {autoReject && ' If no response is received, your leave will be automatically rejected.'}
              </p>
            </div>
          </div>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={() => onSave({
            conditions,
            responseDeadline,
            autoReject,
            adminNotes
          })}
          disabled={conditions.length === 0}
        >
          Send Conditional Approval
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
```

### 4. CoverageAssignmentWizard.jsx

#### Features:
- Step-by-step coverage assignment
- AI-powered suggestions
- Workload visualization
- Conflict detection
- Multi-employee assignment

#### Design:
```jsx
const CoverageAssignmentWizard = ({ leave, isOpen, onClose, onComplete }) => {
  const [step, setStep] =