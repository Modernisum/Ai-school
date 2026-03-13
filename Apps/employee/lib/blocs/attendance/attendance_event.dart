import 'package:equatable/equatable.dart';

abstract class AttendanceEvent extends Equatable {
  const AttendanceEvent();

  @override
  List<Object> get props => [];
}

class LoadStudents extends AttendanceEvent {
  final String classId;

  const LoadStudents(this.classId);

  @override
  List<Object> get props => [classId];
}

class ToggleStudentAttendance extends AttendanceEvent {
  final String studentId;
  final bool isPresent;

  const ToggleStudentAttendance(this.studentId, this.isPresent);

  @override
  List<Object> get props => [studentId, isPresent];
}

class SubmitAttendance extends AttendanceEvent {
  final String classId;

  const SubmitAttendance(this.classId);

  @override
  List<Object> get props => [classId];
}
