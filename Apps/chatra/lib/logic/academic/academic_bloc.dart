import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import 'academic_event.dart';
import 'academic_state.dart';

class AcademicBloc extends Bloc<AcademicEvent, AcademicState> {
  final ApiService apiService;

  AcademicBloc({required this.apiService}) : super(AcademicInitial()) {
    on<AcademicFetchStarted>(_onFetchStarted);
  }

  Future<void> _onFetchStarted(AcademicFetchStarted event, Emitter<AcademicState> emit) async {
    emit(AcademicLoading());
    try {
      final results = await Future.wait([
        apiService.getExams(),
        apiService.getDocumentBox(event.studentId),
      ]);

      final examsData = results[0];
      final docsData = results[1];

      final exams = (examsData?['data'] as List? ?? [])
          .map((e) => e as Map<String, dynamic>)
          .toList();

      final docs = (docsData?['data'] as List? ?? [])
          .map((d) => d as Map<String, dynamic>)
          .toList();

      emit(AcademicLoaded(upcomingExams: exams, reportCards: docs));
    } catch (e) {
      emit(AcademicError("$e"));
    }
  }
}
