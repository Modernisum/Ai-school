import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import 'dashboard_event.dart';
import 'dashboard_state.dart';

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final ApiService apiService;

  DashboardBloc({required this.apiService}) : super(DashboardInitial()) {
    on<DashboardFetchStarted>(_onFetchStarted);
  }

  Future<void> _onFetchStarted(DashboardFetchStarted event, Emitter<DashboardState> emit) async {
    emit(DashboardLoading());
    try {
      // Parallelize API calls using Future.wait for high performance
      final results = await Future.wait([
        apiService.getStudentProfile(event.studentId),
        apiService.getStudentAttendance(event.studentId),
        apiService.getTimetable(),
      ]);

      final profile = results[0];
      final attendance = results[1] ?? {};
      final timetable = results[2] ?? {};

      if (profile == null) {
        emit(const DashboardError("Failed to fetch student profile."));
        return;
      }

      emit(DashboardLoaded(
        profile: profile as Map<String, dynamic>,
        attendance: attendance as Map<String, dynamic>,
        timetable: timetable as Map<String, dynamic>,
      ));
    } catch (e) {
      emit(DashboardError("An unexpected error occurred: $e"));
    }
  }
}
