abstract class LeaveEvent {}

class LeaveFetchStarted extends LeaveEvent {
  final String schoolId;
  final String studentId;

  LeaveFetchStarted({required this.schoolId, required this.studentId});
}

class LeaveRefreshRequested extends LeaveEvent {}

class LeaveApplyStarted extends LeaveEvent {
  final Map<String, dynamic> leaveData;

  LeaveApplyStarted(this.leaveData);
}

class LeaveStatusUpdateRequested extends LeaveEvent {
  final int leaveId;
  final String action;

  LeaveStatusUpdateRequested({required this.leaveId, required this.action});
}
