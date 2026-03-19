import 'package:equatable/equatable.dart';

abstract class AttendanceHistoryEvent extends Equatable {
  const AttendanceHistoryEvent();
  @override
  List<Object?> get props => [];
}

class AttendanceHistoryFetchStarted extends AttendanceHistoryEvent {
  final String schoolId;
  final String studentId;
  const AttendanceHistoryFetchStarted({required this.schoolId, required this.studentId});
  @override
  List<Object?> get props => [schoolId, studentId];
}
