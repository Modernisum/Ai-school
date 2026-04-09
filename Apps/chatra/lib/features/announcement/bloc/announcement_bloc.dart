import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/core/network/api_response.dart';
import 'announcement_event.dart';
import 'announcement_state.dart';

export 'announcement_event.dart';
export 'announcement_state.dart';

class AnnouncementBloc extends Bloc<AnnouncementEvent, AnnouncementState> {
  final ApiService apiService;
  String? _currentSchoolId;

  AnnouncementBloc({required this.apiService}) : super(AnnouncementInitial()) {
    on<AnnouncementFetchStarted>(_onFetchStarted);
    on<AnnouncementRefreshRequested>(_onRefreshRequested);
  }

  Future<void> _onFetchStarted(
    AnnouncementFetchStarted event,
    Emitter<AnnouncementState> emit,
  ) async {
    _currentSchoolId = event.schoolId;
    emit(AnnouncementLoading());
    final resp = await apiService.getAnnouncements();
    _handleResponse(resp, emit);
  }

  Future<void> _onRefreshRequested(
    AnnouncementRefreshRequested event,
    Emitter<AnnouncementState> emit,
  ) async {
    if (_currentSchoolId != null) {
      final resp = await apiService.getAnnouncements();
      _handleResponse(resp, emit);
    }
  }

  void _handleResponse(ApiResponse<Map<String, dynamic>> resp, Emitter<AnnouncementState> emit) {
    if (resp is ApiSuccess<Map<String, dynamic>>) {
      final data = resp.data;
      if (data != null && data['announcements'] != null) {
        emit(AnnouncementLoaded(List<Map<String, dynamic>>.from(data['announcements'])));
      } else {
        emit(AnnouncementLoaded([]));
      }
    } else if (resp is ApiError) {
      emit(AnnouncementError((resp as ApiError).message));
    } else {
      emit(AnnouncementError("Failed to fetch announcements."));
    }
  }
}
