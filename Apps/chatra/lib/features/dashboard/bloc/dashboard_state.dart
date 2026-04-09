import 'package:equatable/equatable.dart';

abstract class DashboardState extends Equatable {
  const DashboardState();

  @override
  List<Object?> get props => [];
}

class DashboardInitial extends DashboardState {}
class DashboardLoading extends DashboardState {}
class DashboardLoaded extends DashboardState {
  final Map<String, dynamic> profile;
  final Map<String, dynamic> attendance;
  final Map<String, dynamic> timetable;
  final Map<String, dynamic> fees;

  const DashboardLoaded({
    required this.profile,
    required this.attendance,
    required this.timetable,
    required this.fees,
  });

  @override
  List<Object?> get props => [profile, attendance, timetable, fees];
}

class DashboardError extends DashboardState {
  final String message;
  const DashboardError(this.message);

  @override
  List<Object?> get props => [message];
}
