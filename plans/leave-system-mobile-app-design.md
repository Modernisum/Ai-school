# Enhanced Employee Leave Management System - Mobile App Design

## Overview
This document outlines the mobile app (Flutter) implementation for the enhanced employee leave management system in the Chatra app. The mobile app will allow employees to submit leave requests, receive real-time notifications, respond to conditional approvals, and track their leave balance.

## Current Mobile App Analysis

### Existing Structure
- `Apps/chatra/lib/` - Main Chatra app directory
- `api_service.dart` - Existing API client with WebSocket support
- `home_screen.dart` - Main home screen with navigation
- `account_screen.dart` - Account management screen
- `live_classroom_screen.dart` - Contains "Leave Class" button (unrelated to leave management)

### Integration Points
1. **API Service Extension** - Add leave-related API methods
2. **WebSocket Integration** - Real-time notification system
3. **Navigation Structure** - New leave management screens
4. **Local Storage** - Caching leave balance and pending requests

## Mobile App Architecture

### Directory Structure
```
Apps/chatra/lib/
├── leave/
│   ├── screens/
│   │   ├── leave_dashboard_screen.dart      # Leave management dashboard
│   │   ├── submit_leave_screen.dart         # Leave submission form
│   │   ├── leave_history_screen.dart        # Past leave requests
│   │   ├── leave_balance_screen.dart        # Leave balance and quota
│   │   ├── conditional_response_screen.dart # Respond to conditional approvals
│   │   └── notification_center_screen.dart  # Real-time notifications
│   ├── widgets/
│   │   ├── leave_request_card.dart          # Leave request display card
│   │   ├── leave_balance_card.dart          # Balance visualization
│   │   ├── conditional_approval_card.dart   # Conditional approval UI
│   │   ├── notification_badge.dart          # Notification indicator
│   │   └── leave_calendar_picker.dart       # Date range picker
│   ├── models/
│   │   ├── leave_request.dart               # Leave request data model
│   │   ├── leave_balance.dart               # Leave balance data model
│   │   ├── conditional_approval.dart        # Conditional approval model
│   │   └── notification.dart                # Notification data model
│   ├── services/
│   │   ├── leave_api_service.dart           # Leave API service
│   │   ├── notification_service.dart        # Real-time notification service
│   │   └── leave_local_service.dart         # Local storage service
│   └── utils/
│       ├── leave_validators.dart            # Form validators
│       ├── leave_calculators.dart           # Leave day calculations
│       └── notification_utils.dart          # Notification utilities
└── core/
    └── navigation/
        └── leave_navigation.dart            # Leave module navigation
```

## Core Components Design

### 1. Leave API Service Extension

#### API Methods to Add:
```dart
// In api_service.dart or new leave_api_service.dart
class LeaveApiService {
  final ApiService _apiService;
  
  Future<Map<String, dynamic>> submitLeaveRequest({
    required String schoolId,
    required String employeeId,
    required DateTime fromDate,
    required DateTime toDate,
    required String leaveType,
    required String reason,
    List<String>? attachments,
    String? emergencyContact,
  }) async {
    final response = await _apiService.postRequest(
      '/api/v1/leave/submit',
      {
        'school_id': schoolId,
        'employee_id': employeeId,
        'from_date': fromDate.toIso8601String(),
        'to_date': toDate.toIso8601String(),
        'leave_type': leaveType,
        'reason': reason,
        'attachments': attachments,
        'emergency_contact': emergencyContact,
        'submitted_via': 'mobile',
      },
    );
    return response;
  }
  
  Future<List<LeaveRequest>> getLeaveHistory({
    required String schoolId,
    required String employeeId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final response = await _apiService.getRequest(
      '/api/v1/leave/history',
      {
        'school_id': schoolId,
        'employee_id': employeeId,
        'start_date': startDate?.toIso8601String(),
        'end_date': endDate?.toIso8601String(),
      },
    );
    return (response['leaves'] as List)
        .map((json) => LeaveRequest.fromJson(json))
        .toList();
  }
  
  Future<LeaveBalance> getLeaveBalance({
    required String schoolId,
    required String employeeId,
  }) async {
    final response = await _apiService.getRequest(
      '/api/v1/leave/balance',
      {
        'school_id': schoolId,
        'employee_id': employeeId,
      },
    );
    return LeaveBalance.fromJson(response);
  }
  
  Future<Map<String, dynamic>> respondToConditionalApproval({
    required String schoolId,
    required String leaveId,
    required String employeeId,
    required bool acceptConditions,
    Map<String, dynamic>? responses,
    String? employeeNotes,
  }) async {
    final response = await _apiService.postRequest(
      '/api/v1/leave/conditional/respond',
      {
        'school_id': schoolId,
        'leave_id': leaveId,
        'employee_id': employeeId,
        'accept_conditions': acceptConditions,
        'responses': responses,
        'employee_notes': employeeNotes,
        'responded_via': 'mobile',
      },
    );
    return response;
  }
  
  Future<List<Notification>> getNotifications({
    required String schoolId,
    required String employeeId,
    bool? unreadOnly,
  }) async {
    final response = await _apiService.getRequest(
      '/api/v1/notifications',
      {
        'school_id': schoolId,
        'employee_id': employeeId,
        'unread_only': unreadOnly,
      },
    );
    return (response['notifications'] as List)
        .map((json) => Notification.fromJson(json))
        .toList();
  }
  
  Future<void> markNotificationAsRead({
    required String schoolId,
    required String notificationId,
  }) async {
    await _apiService.postRequest(
      '/api/v1/notifications/mark-read',
      {
        'school_id': schoolId,
        'notification_id': notificationId,
      },
    );
  }
}
```

### 2. Real-time Notification Service

#### WebSocket Integration:
```dart
class NotificationService {
  final ApiService _apiService;
  WebSocketChannel? _channel;
  final StreamController<Notification> _notificationStream =
      StreamController<Notification>.broadcast();
  
  Stream<Notification> get notificationStream => _notificationStream.stream;
  
  Future<void> connect() async {
    try {
      final wsUrl = await _apiService.getSocketUrl();
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      
      _channel!.stream.listen(
        (message) {
          final data = jsonDecode(message);
          if (data['type'] == 'notification') {
            final notification = Notification.fromJson(data['data']);
            _notificationStream.add(notification);
            
            // Show local notification
            _showLocalNotification(notification);
          }
        },
        onError: (error) {
          debugPrint('WebSocket error: $error');
          // Attempt reconnection after delay
          Future.delayed(const Duration(seconds: 5), connect);
        },
      );
    } catch (e) {
      debugPrint('Failed to connect to WebSocket: $e');
    }
  }
  
  void _showLocalNotification(Notification notification) {
    // Use flutter_local_notifications package
    LocalNotifications.show(
      title: notification.title,
      body: notification.body,
      payload: jsonEncode(notification.toJson()),
    );
    
    // Vibrate device
    HapticFeedback.mediumImpact();
  }
  
  Future<void> disconnect() async {
    await _channel?.sink.close();
  }
}
```

### 3. Leave Dashboard Screen

#### Main Features:
- Leave balance overview
- Quick leave submission button
- Pending leave requests
- Upcoming approved leaves
- Notification badges
- Conditional approval responses pending

#### Design:
```dart
class LeaveDashboardScreen extends StatefulWidget {
  final String schoolId;
  final String employeeId;
  
  const LeaveDashboardScreen({
    super.key,
    required this.schoolId,
    required this.employeeId,
  });
  
  @override
  State<LeaveDashboardScreen> createState() => _LeaveDashboardScreenState();
}

class _LeaveDashboardScreenState extends State<LeaveDashboardScreen> {
  late LeaveApiService _leaveService;
  late NotificationService _notificationService;
  LeaveBalance? _leaveBalance;
  List<LeaveRequest> _pendingLeaves = [];
  List<LeaveRequest> _upcomingLeaves = [];
  List<Notification> _recentNotifications = [];
  int _unreadNotificationCount = 0;
  
  @override
  void initState() {
    super.initState();
    _leaveService = LeaveApiService();
    _notificationService = NotificationService();
    _loadData();
    _connectToNotifications();
  }
  
  Future<void> _loadData() async {
    try {
      // Load leave balance
      final balance = await _leaveService.getLeaveBalance(
        schoolId: widget.schoolId,
        employeeId: widget.employeeId,
      );
      
      // Load pending leaves
      final pending = await _leaveService.getLeaveHistory(
        schoolId: widget.schoolId,
        employeeId: widget.employeeId,
        startDate: DateTime.now(),
      );
      
      // Filter for pending status
      _pendingLeaves = pending.where((leave) => leave.status == 'pending').toList();
      
      // Load upcoming approved leaves
      final upcoming = await _leaveService.getLeaveHistory(
        schoolId: widget.schoolId,
        employeeId: widget.employeeId,
        startDate: DateTime.now(),
        endDate: DateTime.now().add(const Duration(days: 30)),
      );
      
      _upcomingLeaves = upcoming.where((leave) => leave.status == 'approved').toList();
      
      // Load notifications
      final notifications = await _leaveService.getNotifications(
        schoolId: widget.schoolId,
        employeeId: widget.employeeId,
        unreadOnly: true,
      );
      
      _unreadNotificationCount = notifications.length;
      
      setState(() {
        _leaveBalance = balance;
        _recentNotifications = notifications.take(3).toList();
      });
    } catch (e) {
      debugPrint('Error loading leave data: $e');
    }
  }
  
  Future<void> _connectToNotifications() async {
    await _notificationService.connect();
    _notificationService.notificationStream.listen((notification) {
      // Update UI when new notification arrives
      setState(() {
        _unreadNotificationCount++;
        _recentNotifications.insert(0, notification);
        if (_recentNotifications.length > 3) {
          _recentNotifications = _recentNotifications.sublist(0, 3);
        }
      });
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Management'),
        actions: [
          // Notification badge
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => NotificationCenterScreen(
                        schoolId: widget.schoolId,
                        employeeId: widget.employeeId,
                      ),
                    ),
                  );
                },
              ),
              if (_unreadNotificationCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Text(
                      _unreadNotificationCount > 9 ? '9+' : '$_unreadNotificationCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: _leaveBalance == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Leave Balance Card
                  LeaveBalanceCard(balance: _leaveBalance!),
                  
                  const SizedBox(height: 20),
                  
                  // Quick Actions Row
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.add),
                          label: const Text('Submit Leave'),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => SubmitLeaveScreen(
                                  schoolId: widget.schoolId,
                                  employeeId: widget.employeeId,
                                  onLeaveSubmitted: _loadData,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.history),
                          label: const Text('History'),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => LeaveHistoryScreen(
                                  schoolId: widget.schoolId,
                                  employeeId: widget.employeeId,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 20),
                  
                  // Pending Leave Requests
                  if (_pendingLeaves.isNotEmpty) ...[
                    const Text(
                      'Pending Requests',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ..._pendingLeaves.map((leave) => LeaveRequestCard(
                      leave: leave,
                      onTap: () => _showLeaveDetails(leave),
                    )),
                    const SizedBox(height: 20),
                  ],
                  
                  // Upcoming Approved Leaves
                  if (_upcomingLeaves.isNotEmpty) ...[
                    const Text(
                      'Upcoming Leaves',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ..._upcomingLeaves.map((leave) => LeaveRequestCard(
                      leave: leave,
                      onTap: () => _showLeaveDetails(leave),
                    )),
                    const SizedBox(height: 20),
                  ],
                  
                  // Recent Notifications
                  if (_recentNotifications.isNotEmpty) ...[
                    const Text(
                      'Recent Notifications',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ..._recentNotifications.map((notification) => ListTile(
                      leading: const Icon(Icons.notifications),
                      title: Text(notification.title),
                      subtitle: Text(
                        notification.body,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: Text(
                        _formatTimeAgo(notification.createdAt),
                        style: const TextStyle(fontSize: 12),
                      ),
                      onTap: () => _handleNotificationTap(notification),
                    )),
                  ],
                ],
              ),
            ),
    );
  }
  
  void _showLeaveDetails(LeaveRequest leave) {
    showModalBottomSheet(
      context: context,
      builder: (context) => LeaveDetailsBottomSheet(leave: leave),
    );
  }
  
  void _handleNotificationTap(Notification notification) {
    // Mark as read
    _leaveService.markNotificationAsRead(
      schoolId: widget.schoolId,
      notificationId: notification.id,
    );
    
    // Handle based on notification type
    if (notification.type == 'conditional_approval') {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ConditionalResponseScreen(
            schoolId: widget.schoolId,
            leaveId: notification.data['leave_id'],
            employeeId: widget.employeeId,
          ),
        ),
      );
    }
  }
  
  String _formatTimeAgo(DateTime date) {
    final difference = DateTime.now().difference(date);
    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
  
  @override
  void dispose() {
    _notificationService.disconnect();
    super.dispose();
  }
}
```

### 4. Submit Leave Screen

#### Features:
- Leave type selection (Casual, Medical, Earned, etc.)
- Date range picker with calendar view
- Reason input with character counter
- Emergency contact information
- Attachment upload (camera/gallery)
- Leave balance validation
- Draft saving capability

#### Design:
```dart
class SubmitLeaveScreen extends StatefulWidget {
  final String schoolId;
  final String employeeId;
  final VoidCallback? onLeaveSubmitted;
  
  const SubmitLeaveScreen({
    super.key,
    required this.schoolId,
    required this.employeeId,
    this.onLeaveSubmitted,
  });
  
  @override
  State<SubmitLeaveScreen> createState() => _SubmitLeaveScreenState();
}

class _SubmitLeaveScreenState extends State<SubmitLeaveScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _reasonController = TextEditingController();
  final TextEditingController _emergencyContactController = TextEditingController();
  
  DateTime? _fromDate;
  DateTime? _toDate;
  String? _selectedLeaveType;
  List<String> _attachments = [];
  bool _isSubmitting = false;
  LeaveBalance? _leaveBalance;
  
  final List<String> _leaveTypes = [
    'Casual Leave',
    'Medical Leave',
    'Earned Leave',
    'Maternity Leave',
    'Paternity Leave',
    'Study Leave