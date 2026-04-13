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

class GenerateQrAttendance extends AttendanceEvent {
  final String className;

  const GenerateQrAttendance(this.className);

  @override
  List<Object> get props => [className];
}

class MarkMobileAttendance extends AttendanceEvent {
  final String studentId;
  final String status;
  final double latitude;
  final double longitude;
  final String? qrToken;

  const MarkMobileAttendance({
    required this.studentId,
    required this.status,
    required this.latitude,
    required this.longitude,
    this.qrToken,
  });

  @override
  List<Object> get props => [studentId, status, latitude, longitude];
}

class SyncOfflineAttendance extends AttendanceEvent {
  final List<Map<String, dynamic>> records;

  const SyncOfflineAttendance(this.records);

  @override
  List<Object> get props => [records];
}
