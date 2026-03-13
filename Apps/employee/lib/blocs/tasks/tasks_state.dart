import 'package:equatable/equatable.dart';

// Represents a unified task/duty object
class DutyItem extends Equatable {
  final String id;
  final String title;
  final String subtitle;
  final String type; // e.g. 'cleaning', 'inventory'
  final bool isCompleted;

  const DutyItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.type,
    this.isCompleted = false,
  });

  DutyItem copyWith({bool? isCompleted}) {
    return DutyItem(
      id: id,
      title: title,
      subtitle: subtitle,
      type: type,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }

  @override
  List<Object> get props => [id, title, subtitle, type, isCompleted];
}

abstract class TasksState extends Equatable {
  const TasksState();

  @override
  List<Object> get props => [];
}

class TasksLoading extends TasksState {}

class TasksLoaded extends TasksState {
  final List<DutyItem> duties;

  const TasksLoaded({required this.duties});

  @override
  List<Object> get props => [duties];
}

class TasksError extends TasksState {
  final String message;

  const TasksError(this.message);

  @override
  List<Object> get props => [message];
}
