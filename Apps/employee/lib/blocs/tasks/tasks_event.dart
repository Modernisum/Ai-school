import 'package:equatable/equatable.dart';

abstract class TasksEvent extends Equatable {
  const TasksEvent();

  @override
  List<Object> get props => [];
}

class LoadTasks extends TasksEvent {}

class CompleteTask extends TasksEvent {
  final String taskId;

  const CompleteTask(this.taskId);

  @override
  List<Object> get props => [taskId];
}
