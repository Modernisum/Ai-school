import 'package:equatable/equatable.dart';

abstract class TasksEvent extends Equatable {
  const TasksEvent();

  @override
  List<Object> get props => [];
}

class LoadTasks extends TasksEvent {
  final String schoolId;
  final String responsibilityId;

  const LoadTasks({required this.schoolId, required this.responsibilityId});

  @override
  List<Object> get props => [schoolId, responsibilityId];
}

class CompleteTask extends TasksEvent {
  final String schoolId;
  final String taskId;

  const CompleteTask({required this.schoolId, required this.taskId});

  @override
  List<Object> get props => [schoolId, taskId];
}
