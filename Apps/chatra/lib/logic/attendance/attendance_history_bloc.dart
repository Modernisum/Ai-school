import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import 'attendance_history_event.dart';
import 'attendance_history_state.dart';

class AttendanceHistoryBloc extends Bloc<AttendanceHistoryEvent, AttendanceHistoryState> {
  final ApiService apiService;

  AttendanceHistoryBloc({required this.apiService}) : super(AttendanceHistoryInitial()) {
    on<AttendanceHistoryFetchStarted>(_onFetchStarted);
  }

  Future<void> _onFetchStarted(
    AttendanceHistoryFetchStarted event,
    Emitter<AttendanceHistoryState> emit,
  ) async {
    emit(AttendanceHistoryLoading());
    try {
      final res = await apiService.getStudentAttendance(event.studentId);
      if (res != null && res['data'] != null) {
        final rawList = res['data'] as List;
        final Map<String, String> records = {};
        int present = 0;

        for (final record in rawList) {
          final date = record['date']?.toString() ?? '';
          final status = record['status']?.toString().toLowerCase() ?? 'absent';
          if (date.isNotEmpty) {
            records[date] = status;
            if (status == 'present') present++;
          }
        }

        final total = records.isNotEmpty ? records.length : 1;
        final pct = (present / total) * 100;

        emit(AttendanceHistoryLoaded(
          records: records,
          percentage: pct,
          totalPresent: present,
          totalDays: total,
        ));
      } else {
        emit(const AttendanceHistoryError("No attendance data found for this student."));
      }
    } catch (e) {
      emit(AttendanceHistoryError("$e"));
    }
  }
}
