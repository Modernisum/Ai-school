import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/core/network/api_response.dart';
import 'dashboard_event.dart';
import 'dashboard_state.dart';

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final ApiService apiService;

  DashboardBloc({required this.apiService}) : super(DashboardInitial()) {
    on<DashboardFetchStarted>(_onFetchStarted);
  }

  /// Safely convert dynamic data to Map<String, dynamic>.
  /// If data is already Map<String, dynamic>, return it.
  /// If data is Map<dynamic, dynamic>, convert keys to String.
  /// If data is List or other types, return empty map.
  Map<String, dynamic> _safeConvertToMap(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data;
    }
    if (data is Map<dynamic, dynamic>) {
      return Map<String, dynamic>.from(data);
    }
    return <String, dynamic>{};
  }

  /// Extracts data from ApiSuccess or returns empty map; logs error if ApiError.
  Map<String, dynamic> _extractDataOrEmpty(ApiResponse<dynamic> resp, String apiName) {
    if (resp is ApiSuccess<dynamic>) {
      return _safeConvertToMap(resp.data);
    } else if (resp is ApiError) {
      // Log error but don't fail the whole dashboard
      print('[$apiName] Error: ${resp.message}');
    }
    return <String, dynamic>{};
  }

  Future<void> _onFetchStarted(DashboardFetchStarted event, Emitter<DashboardState> emit) async {
    // Validate studentId
    if (event.studentId.isEmpty) {
      emit(DashboardError('Invalid student ID'));
      return;
    }

    emit(DashboardLoading());
    try {
      // Parallelize API calls using Future.wait
      final results = await Future.wait([
        apiService.getStudentProfile(event.studentId),
        apiService.getStudentAttendance(event.studentId),
        apiService.getTimetable(),
        apiService.getStudentFees(event.studentId),
      ], eagerError: false); // Continue even if one fails

      // Extract and check for errors
      final profileResp = results[0];
      final attendanceResp = results[1];
      final timetableResp = results[2];
      final feesResp = results[3];

      // If profile fails, show error and abort
      if (profileResp is ApiError) {
        emit(DashboardError("Profile fetch failed: ${(profileResp as ApiError).message}"));
        return;
      }

      // Extract data with error logging for other APIs
      final profile = (profileResp as ApiSuccess<Map<String, dynamic>>).data;
      final attendance = _extractDataOrEmpty(attendanceResp, 'Attendance');
      final timetable = _extractDataOrEmpty(timetableResp, 'Timetable');
      final fees = _extractDataOrEmpty(feesResp, 'Fees');

      // Check if any critical API failed (optional)
      final errors = <String>[];
      if (attendanceResp is ApiError) errors.add('Attendance');
      if (timetableResp is ApiError) errors.add('Timetable');
      if (feesResp is ApiError) errors.add('Fees');

      emit(DashboardLoaded(
        profile: profile,
        attendance: attendance,
        timetable: timetable,
        fees: fees,
      ));

      // Log partial failures
      if (errors.isNotEmpty) {
        print('Dashboard loaded with partial failures: ${errors.join(', ')}');
      }

    } catch (e) {
      emit(DashboardError("Critical Dashboard Error: $e"));
    }
  }
}
