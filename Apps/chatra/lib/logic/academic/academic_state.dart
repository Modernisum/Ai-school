import 'package:equatable/equatable.dart';

abstract class AcademicState extends Equatable {
  const AcademicState();
  @override
  List<Object?> get props => [];
}

class AcademicInitial extends AcademicState {}
class AcademicLoading extends AcademicState {}

class AcademicLoaded extends AcademicState {
  final List<Map<String, dynamic>> upcomingExams;
  final List<Map<String, dynamic>> reportCards; // GCS document links

  const AcademicLoaded({required this.upcomingExams, required this.reportCards});

  @override
  List<Object?> get props => [upcomingExams, reportCards];
}

class AcademicError extends AcademicState {
  final String message;
  const AcademicError(this.message);
  @override
  List<Object?> get props => [message];
}
