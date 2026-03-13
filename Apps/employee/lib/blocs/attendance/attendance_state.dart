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
