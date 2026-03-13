import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'tasks_event.dart';
import 'tasks_state.dart';

class TasksBloc extends Bloc<TasksEvent, TasksState> {
  TasksBloc() : super(TasksLoading()) {
    on<LoadTasks>(_onLoadTasks);
    on<CompleteTask>(_onCompleteTask);
  }

  Future<void> _onLoadTasks(LoadTasks event, Emitter<TasksState> emit) async {
    emit(TasksLoading());
    try {
      // Mock network delay
      await Future.delayed(const Duration(milliseconds: 600));

      final activeDuties = [
        const DutyItem(id: "task_1", title: "Clean Classroom 10-A", subtitle: "Requested by: Principal", type: "cleaning"),
        const DutyItem(id: "task_2", title: "Deliver 2 boxes of chalk", subtitle: "To: Staff Room", type: "inventory"),
        const DutyItem(id: "task_3", title: "Setup Projector in Hall", subtitle: "For: Morning Assembly", type: "cleaning"),
      ];

      emit(TasksLoaded(duties: activeDuties));
    } catch (e) {
      emit(TasksError(e.toString()));
    }
  }

  void _onCompleteTask(CompleteTask event, Emitter<TasksState> emit) {
    if (state is TasksLoaded) {
      final currentState = state as TasksLoaded;
      final updatedDuties = currentState.duties.map((duty) {
        if (duty.id == event.taskId) {
          return duty.copyWith(isCompleted: true);
        }
        return duty;
      }).toList();

      emit(TasksLoaded(duties: updatedDuties));
    }
  }
}
