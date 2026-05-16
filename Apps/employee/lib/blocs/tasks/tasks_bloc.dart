import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import 'tasks_event.dart';
import 'tasks_state.dart';

class TasksBloc extends Bloc<TasksEvent, TasksState> {
  final ApiService _apiService;

  TasksBloc({ApiService? apiService})
      : _apiService = apiService ?? ApiService(),
        super(TasksLoading()) {
    on<LoadTasks>(_onLoadTasks);
    on<CompleteTask>(_onCompleteTask);
  }

  Future<void> _onLoadTasks(LoadTasks event, Emitter<TasksState> emit) async {
    emit(TasksLoading());
    try {
      final tasks = await _apiService.getTasksByResponsibility(
        event.schoolId,
        event.responsibilityId,
      );

      final duties = tasks.map<DutyItem>((task) {
        return DutyItem(
          id: task['id']?.toString() ?? task['taskId']?.toString() ?? '',
          title: task['title']?.toString() ?? 'Unknown Task',
          subtitle: task['description']?.toString() ?? '',
          type: task['type']?.toString() ?? 'general',
          isCompleted: task['isCompleted'] == true || task['status'] == 'completed',
        );
      }).toList();

      emit(TasksLoaded(duties: duties));
    } catch (e) {
      emit(TasksError(e.toString()));
    }
  }

  Future<void> _onCompleteTask(CompleteTask event, Emitter<TasksState> emit) async {
    try {
      final success = await _apiService.completeTask(event.schoolId, event.taskId);
      if (success && state is TasksLoaded) {
        final currentState = state as TasksLoaded;
        final updatedDuties = currentState.duties.map((duty) {
          if (duty.id == event.taskId) {
            return duty.copyWith(isCompleted: true);
          }
          return duty;
        }).toList();
        emit(TasksLoaded(duties: updatedDuties));
      }
    } catch (e) {
      emit(TasksError(e.toString()));
    }
  }
}
