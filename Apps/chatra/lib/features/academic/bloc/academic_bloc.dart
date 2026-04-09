import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/core/network/api_response.dart';
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
      final List<ApiResponse<Map<String, dynamic>>> results = await Future.wait([
        apiService.getExams(),
        apiService.getDocumentBox(event.studentId),
      ]);

      final examsResp = results[0];
      final docsResp = results[1];

      List<Map<String, dynamic>> exams = [];
      List<Map<String, dynamic>> docs = [];

      if (examsResp is ApiSuccess<Map<String, dynamic>>) {
        final data = examsResp.data;
        exams = (data != null && data['data'] != null)
            ? (data['data'] as List).map((e) => e as Map<String, dynamic>).toList()
            : [];
      }

      if (docsResp is ApiSuccess<Map<String, dynamic>>) {
        final data = docsResp.data;
        docs = (data != null && data['data'] != null)
            ? (data['data'] as List).map((d) => d as Map<String, dynamic>).toList()
            : [];
      }

      emit(AcademicLoaded(upcomingExams: exams, reportCards: docs));
    } catch (e) {
      emit(AcademicError("$e"));
    }
  }
}
