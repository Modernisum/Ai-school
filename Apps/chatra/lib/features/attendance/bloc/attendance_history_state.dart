import 'package:equatable/equatable.dart';

abstract class AttendanceHistoryState extends Equatable {
  const AttendanceHistoryState();
  @override
  List<Object?> get props => [];
}

class AttendanceHistoryInitial extends AttendanceHistoryState {}
class AttendanceHistoryLoading extends AttendanceHistoryState {}

class AttendanceHistoryLoaded extends AttendanceHistoryState {
  // Map of "YYYY-MM-DD" -> status ("present", "absent", "holiday")
  final Map<String, String> records;
  final double percentage;
  final int totalPresent;
  final int totalDays;

  const AttendanceHistoryLoaded({
    required this.records,
    required this.percentage,
    required this.totalPresent,
    required this.totalDays,
  });

  @override
  List<Object?> get props => [records, percentage];
}

class AttendanceHistoryError extends AttendanceHistoryState {
  final String message;
  const AttendanceHistoryError(this.message);
  @override
  List<Object?> get props => [message];
}
