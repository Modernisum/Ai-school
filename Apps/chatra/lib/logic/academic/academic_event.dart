import 'package:equatable/equatable.dart';

abstract class AcademicEvent extends Equatable {
  const AcademicEvent();
  @override
  List<Object?> get props => [];
}

class AcademicFetchStarted extends AcademicEvent {
  final String schoolId;
  final String studentId;
  const AcademicFetchStarted({required this.schoolId, required this.studentId});
  @override
  List<Object?> get props => [schoolId, studentId];
}
