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
    print("!!! BLOC: Received DashboardFetchStarted for id: ${event.studentId}");
    emit(DashboardLoading());
    try {
      print("!!! BLOC: Initiating parallel API calls...");

      // Parallelize API calls using Future.wait for high performance
      final results = await Future.wait([
        apiService.getStudentProfile(event.studentId),
        apiService.getStudentAttendance(event.studentId),
        apiService.getTimetable(),
        apiService.getStudentFees(event.studentId),
      ]);

      final profile = results[0];
      final attendance = results[1];
      final timetable = results[2];
      final fees = results[3];



      print("!!! BLOC: Profile Result: ${profile != null ? 'Success' : 'Null'}");

      if (profile == null) {
        emit(const DashboardError("Failed to fetch student profile."));
        return;
      }

      emit(DashboardLoaded(
        profile: profile,
        attendance: attendance ?? {},
        timetable: timetable ?? {},
        fees: fees ?? {},
      ));

    } catch (e) {
      print("!!! BLOC Error: $e");
      emit(DashboardError(e.toString()));
    }
  }
}

