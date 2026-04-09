abstract class LeaveState {}

class LeaveInitial extends LeaveState {}

class LeaveLoading extends LeaveState {}

class LeaveLoaded extends LeaveState {
  final List<dynamic> leaves;
  final Map<String, dynamic>? leaveBalance;
  final List<dynamic> notifications;

  LeaveLoaded({
    required this.leaves,
    this.leaveBalance,
    this.notifications = const [],
  });
}

class LeaveError extends LeaveState {
  final String message;

  LeaveError(this.message);
}

class LeaveSubmitting extends LeaveState {}

class LeaveSubmitted extends LeaveState {}
