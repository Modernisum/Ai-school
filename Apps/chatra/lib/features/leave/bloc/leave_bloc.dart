import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/core/network/api_response.dart';
import 'package:chatra/features/leave/services/leave_api.dart';
import 'leave_event.dart';
import 'leave_state.dart';

export 'leave_event.dart';
export 'leave_state.dart';

class LeaveBloc extends Bloc<LeaveEvent, LeaveState> {
  final LeaveApi leaveApi;
  String? _currentSchoolId;
  String? _currentStudentId;

  LeaveBloc({required this.leaveApi}) : super(LeaveInitial()) {
    on<LeaveFetchStarted>(_onFetchStarted);
    on<LeaveRefreshRequested>(_onRefreshRequested);
    on<LeaveApplyStarted>(_onApplyStarted);
    on<LeaveStatusUpdateRequested>(_onStatusUpdateRequested);
  }

  Future<void> _onFetchStarted(
    LeaveFetchStarted event,
    Emitter<LeaveState> emit,
  ) async {
    _currentSchoolId = event.schoolId;
    _currentStudentId = event.studentId;
    emit(LeaveLoading());
    try {
      final results = await Future.wait([
        leaveApi.getLeaveApplications(),
        leaveApi.getLeaveBalance(),
        leaveApi.getLeaveNotifications(),
      ]);

      final leavesResp = results[0] as ApiResponse<List<dynamic>>;
      final balanceResp = results[1] as ApiResponse<Map<String, dynamic>>;
      final notifResp = results[2] as ApiResponse<List<dynamic>>;

      if (leavesResp is ApiError || balanceResp is ApiError || notifResp is ApiError) {
         emit(LeaveError("Failed to fetch leave data. Please check your network."));
         return;
      }

      final leaves = (leavesResp as ApiSuccess<List<dynamic>>).data;
      final balance = (balanceResp as ApiSuccess<Map<String, dynamic>>).data;
      final notifications = (notifResp as ApiSuccess<List<dynamic>>).data;

      emit(
        LeaveLoaded(
          leaves: leaves,
          leaveBalance: balance,
          notifications: notifications,
        ),
      );
    } catch (e) {
      emit(LeaveError(e.toString()));
    }
  }

  Future<void> _onRefreshRequested(
    LeaveRefreshRequested event,
    Emitter<LeaveState> emit,
  ) async {
    if (_currentSchoolId != null && _currentStudentId != null) {
      try {
        final results = await Future.wait([
          leaveApi.getLeaveApplications(),
          leaveApi.getLeaveBalance(),
          leaveApi.getLeaveNotifications(),
        ]);

        final leavesResp = results[0] as ApiResponse<List<dynamic>>;
        final balanceResp = results[1] as ApiResponse<Map<String, dynamic>>;
        final notifResp = results[2] as ApiResponse<List<dynamic>>;

        // Graceful error handling for refresh without resetting to full error state if possible
        if (leavesResp is ApiError) return; // Keep old state

        final leaves = (leavesResp as ApiSuccess<List<dynamic>>).data;
        final balance = balanceResp is ApiSuccess<Map<String, dynamic>> ? balanceResp.data : <String, dynamic>{};
        final notifications = notifResp is ApiSuccess<List<dynamic>> ? notifResp.data : [];

        emit(
          LeaveLoaded(
            leaves: leaves,
            leaveBalance: balance,
            notifications: notifications,
          ),
        );
      } catch (e) {
        emit(LeaveError(e.toString()));
      }
    }
  }

  Future<void> _onApplyStarted(
    LeaveApplyStarted event,
    Emitter<LeaveState> emit,
  ) async {
    emit(LeaveSubmitting());
    try {
      final resp = await leaveApi.applyForLeave(event.leaveData);
      if (resp is ApiSuccess<bool> && resp.data == true) {
        // Refresh data after successful submission
        add(LeaveRefreshRequested());
      } else if (resp is ApiError) {
        emit(LeaveError("Application Failed: ${(resp as ApiError).message}"));
      } else {
        emit(LeaveError("Application Failed: Unknown error"));
      }
    } catch (e) {
      emit(LeaveError(e.toString()));
    }
  }

  Future<void> _onStatusUpdateRequested(
    LeaveStatusUpdateRequested event,
    Emitter<LeaveState> emit,
  ) async {
    try {
      final resp = await leaveApi.updateLeaveStatus(
        event.leaveId,
        event.action,
      );
      if (resp is ApiSuccess<bool> && resp.data == true) {
        add(LeaveRefreshRequested());
      } else {
        // Soft error handling, just return to loaded state
        if (state is LeaveLoaded) {
          emit(
            LeaveLoaded(
              leaves: (state as LeaveLoaded).leaves,
              leaveBalance: (state as LeaveLoaded).leaveBalance,
              notifications: (state as LeaveLoaded).notifications,
            ),
          );
        }
      }
    } catch (e) {
      if (state is LeaveLoaded) {
          emit(
            LeaveLoaded(
              leaves: (state as LeaveLoaded).leaves,
              leaveBalance: (state as LeaveLoaded).leaveBalance,
              notifications: (state as LeaveLoaded).notifications,
            ),
          );
      }
    }
  }
}
