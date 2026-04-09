import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:chatra/core/network/api_service.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final ApiService apiService;

  AuthBloc({required this.apiService}) : super(AuthInitial()) {
    on<AppStarted>(_onAppStarted);
    on<LoggedIn>(_onLoggedIn);
    on<LoggedOut>(_onLoggedOut);
    on<IntroCompleted>(_onIntroCompleted);
  }

  Future<void> _onIntroCompleted(IntroCompleted event, Emitter<AuthState> emit) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('intro_completed', true);
    emit(AuthUnauthenticated());
  }

  Future<void> _onAppStarted(AppStarted event, Emitter<AuthState> emit) async {
    debugPrint("[AuthBloc] Reading token from storage...");
    final token = await apiService.storage.read(key: 'jwt_token');
    debugPrint("[AuthBloc] Token: ${token != null ? 'Present' : 'Null'}");
    final role = await apiService.storage.read(key: 'user_role');
    debugPrint("[AuthBloc] Role: $role");
    
    if (token != null && token.isNotEmpty) {
      if (role != 'student') {
        // Strict Role Guard: Only students allowed in Chatra
        await apiService.logout();
        emit(AuthUnauthenticated());
      } else {
        emit(AuthAuthenticated(token: token, role: role!));
      }
    } else {
      final prefs = await SharedPreferences.getInstance();
      final introDone = prefs.getBool('intro_completed') ?? false;
      if (!introDone) {
        emit(AuthNeedsIntro());
      } else {
        emit(AuthUnauthenticated());
      }
    }
  }

  void _onLoggedIn(LoggedIn event, Emitter<AuthState> emit) {
    emit(AuthAuthenticated(token: event.token, role: event.role));
  }

  Future<void> _onLoggedOut(LoggedOut event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    await apiService.logout();
    emit(AuthUnauthenticated());
  }
}
