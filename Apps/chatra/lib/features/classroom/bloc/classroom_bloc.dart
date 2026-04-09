import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/core/network/api_service.dart';
import 'classroom_event.dart';
import 'classroom_state.dart';

export 'classroom_event.dart';
export 'classroom_state.dart';

class ClassroomBloc extends Bloc<ClassroomEvent, ClassroomState> {
  final ApiService apiService;
  String? _currentSchoolId;
  String? _currentStudentId;

  ClassroomBloc({required this.apiService}) : super(ClassroomInitial()) {
    on<ClassroomFetchStarted>(_onFetchStarted);
    on<ClassroomRefreshRequested>(_onRefreshRequested);
  }

  Future<void> _onFetchStarted(
    ClassroomFetchStarted event,
    Emitter<ClassroomState> emit,
  ) async {
    _currentSchoolId = event.schoolId;
    _currentStudentId = event.studentId;
    emit(ClassroomLoading());
    try {
      // TODO: Implement actual API call when getClassrooms method is available
      // For now, return empty list
      await Future.delayed(const Duration(milliseconds: 500));
      emit(ClassroomLoaded([]));
    } catch (e) {
      emit(ClassroomError(e.toString()));
    }
  }

  Future<void> _onRefreshRequested(
    ClassroomRefreshRequested event,
    Emitter<ClassroomState> emit,
  ) async {
    if (_currentSchoolId != null && _currentStudentId != null) {
      try {
        // TODO: Implement actual API call when getClassrooms method is available
        // For now, return empty list
        await Future.delayed(const Duration(milliseconds: 500));
        emit(ClassroomLoaded([]));
      } catch (e) {
        emit(ClassroomError(e.toString()));
      }
    }
  }
}
