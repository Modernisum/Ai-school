import 'package:equatable/equatable.dart';

abstract class DashboardEvent extends Equatable {
  const DashboardEvent();

  @override
  List<Object?> get props => [];
}

class DashboardFetchStarted extends DashboardEvent {
  final String studentId;
  const DashboardFetchStarted({required this.studentId});

  @override
  List<Object?> get props => [studentId];
}
