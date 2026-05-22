import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/core/network/api_response.dart';
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
      final result = await apiService.getClassrooms(event.studentId);
      if (result is ApiSuccess<List<dynamic>>) {
        final classrooms = result.data.map((e) => Map<String, dynamic>.from(e)).toList();
        emit(ClassroomLoaded(classrooms));
      } else {
        emit(ClassroomLoaded([]));
      }
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
        final result = await apiService.getClassrooms(_currentStudentId!);
        if (result is ApiSuccess<List<dynamic>>) {
          final classrooms = result.data.map((e) => Map<String, dynamic>.from(e)).toList();
          emit(ClassroomLoaded(classrooms));
        }
      } catch (e) {
        emit(ClassroomError(e.toString()));
      }
    }
  }
}
