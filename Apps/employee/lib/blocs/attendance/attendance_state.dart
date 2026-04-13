import 'package:equatable/equatable.dart';

abstract class AttendanceState extends Equatable {
  const AttendanceState();

  @override
  List<Object> get props => [];
}

class AttendanceInitial extends AttendanceState {}

class AttendanceLoading extends AttendanceState {}

class AttendanceLoaded extends AttendanceState {
  final List<Map<String, dynamic>> students;
  final Map<String, bool> attendanceMap;
  final bool isClassTeacher;
  final bool isOverrideEnabled;

  const AttendanceLoaded({
    required this.students,
    required this.attendanceMap,
    this.isClassTeacher = true,
    this.isOverrideEnabled = false,
  });

  @override
  List<Object> get props => [students, attendanceMap, isClassTeacher, isOverrideEnabled];
}

class AttendanceSubmitting extends AttendanceState {}

class AttendanceSuccess extends AttendanceState {}

class AttendanceError extends AttendanceState {
  final String message;

  const AttendanceError(this.message);

  @override
  List<Object> get props => [message];
}

class QrAttendanceGenerating extends AttendanceState {}

class QrAttendanceGenerated extends AttendanceState {
  final String qrToken;
  final String qrImageBase64;
  final DateTime expiresAt;

  const QrAttendanceGenerated({
    required this.qrToken,
    required this.qrImageBase64,
    required this.expiresAt,
  });

  @override
  List<Object> get props => [qrToken, qrImageBase64, expiresAt];
}

class MobileAttendanceMarking extends AttendanceState {}

class MobileAttendanceMarked extends AttendanceState {
  final String studentId;
  final String status;
  final bool locationVerified;

  const MobileAttendanceMarked({
    required this.studentId,
    required this.status,
    required this.locationVerified,
  });

  @override
  List<Object> get props => [studentId, status, locationVerified];
}

class OfflineAttendanceSyncing extends AttendanceState {}

class OfflineAttendanceSynced extends AttendanceState {
  final List<Map<String, dynamic>> results;

  const OfflineAttendanceSynced(this.results);

  @override
  List<Object> get props => [results];
}
