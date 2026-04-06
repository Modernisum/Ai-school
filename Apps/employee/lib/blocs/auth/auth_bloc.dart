import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../api_service.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final ApiService apiService;
  final FlutterSecureStorage storage = const FlutterSecureStorage();

  AuthBloc({required this.apiService}) : super(AuthInitial()) {
    on<AppStarted>(_onAppStarted);
    on<LoginRequested>(_onLoginRequested);
    on<ProfileSelected>(_onProfileSelected);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onAppStarted(AppStarted event, Emitter<AuthState> emit) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      final employeeType = await storage.read(key: 'employee_type');

      // For MVP V3.0, if token exists, we consider them authenticated.
      // In production, we'd verify the token with the backend `/api/me`.
      if (token != null && token.isNotEmpty && employeeType != null) {
        // Here we just pass an empty user map, but ideally fetch profile
        emit(AuthAuthenticated(
          token: token,
          employeeType: employeeType,
          user: const {},
        ));
      } else {
        emit(AuthUnauthenticated());
      }
    } catch (_) {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
      LoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      // Step 1: Fetch Profiles (Firebase OTP is already verified in UI)
      final profiles = await apiService.getProfiles(event.identifier);
      
      if (profiles != null && profiles.isNotEmpty) {
        emit(AuthProfileSelection(profiles: profiles, identifier: event.identifier));
      } else {
        emit(const AuthError('No Employee profiles found for this number.'));
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      emit(AuthError(e.toString()));
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onProfileSelected(
      ProfileSelected event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final success = await apiService.selectProfile(
        event.profile['schoolId'].toString(),
        event.identifier,
        event.profile['userId'].toString(),
        event.profile['userType'].toString()
      );

      if (success) {
        final token = await storage.read(key: 'jwt_token');
        final employeeType = await storage.read(key: 'user_role') ?? 'staff'; 
        
        emit(AuthAuthenticated(
          token: token ?? '',
          employeeType: employeeType,
          user: const {},
        ));
      } else {
        emit(const AuthError('Failed to login with this profile.'));
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      emit(AuthError(e.toString()));
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLogoutRequested(
      LogoutRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    await apiService.logout();
    emit(AuthUnauthenticated());
  }
}
