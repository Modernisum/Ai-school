import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../blocs/auth/auth_bloc.dart';
import '../blocs/auth/auth_state.dart';
import '../login_screen.dart';

import '../screens/common/intro_screen.dart';

// Deferred Imports for Lazy Loading Chunks
import '../screens/dashboards/teacher_dashboard.dart' deferred as teacherUI;
import '../screens/dashboards/driver_dashboard.dart' deferred as driverUI;
import '../screens/dashboards/peon_dashboard.dart' deferred as peonUI;
import '../screens/dashboards/management_dashboard.dart' deferred as managementUI;

// Listenable Wrapper to trigger GoRouter redirects on Auth state changes
class AuthStreamScope extends ChangeNotifier {
  late final StreamSubscription _subscription;
  
  AuthStreamScope(AuthBloc authBloc) {
    _subscription = authBloc.stream.listen((_) => notifyListeners());
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

GoRouter createRouter(AuthBloc authBloc) {
  return GoRouter(
    initialLocation: '/intro',
    refreshListenable: AuthStreamScope(authBloc),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isLoggingIn = state.matchedLocation == '/login';
      final isIntro = state.matchedLocation == '/intro';

      if (authState is AuthInitial || authState is AuthLoading || authState is AuthUnauthenticated || authState is AuthError) {
        if (isIntro || isLoggingIn) return null;
        return '/intro';
      }

      if (authState is AuthAuthenticated) {
        final type = authState.employeeType.toLowerCase();

        // Redirect from root or login to specific dashboard
        if (state.matchedLocation == '/' || isLoggingIn) {
          if (type.contains('driver')) return '/driver';
          if (type.contains('peon') || type.contains('staff')) return '/peon';
          if (type.contains('admin') || type.contains('manager') || type.contains('principal')) return '/management';
          return '/teacher';
        }

        // Strict Guard: Prevent unauthorized access to other roles' URLs
        if (state.matchedLocation.startsWith('/driver') && !type.contains('driver')) return '/';
        if (state.matchedLocation.startsWith('/peon') && !(type.contains('peon') || type.contains('staff'))) return '/';
        if (state.matchedLocation.startsWith('/management') && !(type.contains('admin') || type.contains('manager') || type.contains('principal'))) return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/intro',
        builder: (context, state) => const IntroScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/teacher',
        builder: (context, state) => FutureBuilder(
          future: teacherUI.loadLibrary(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.done) {
              return teacherUI.TeacherDashboard();
            }
            return _buildLoadingScreen();
          },
        ),
      ),
      GoRoute(
        path: '/driver',
        builder: (context, state) => FutureBuilder(
          future: driverUI.loadLibrary(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.done) {
              return driverUI.DriverDashboard();
            }
            return _buildLoadingScreen();
          },
        ),
      ),
      GoRoute(
        path: '/peon',
        builder: (context, state) => FutureBuilder(
          future: peonUI.loadLibrary(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.done) {
              return peonUI.PeonDashboard();
            }
            return _buildLoadingScreen();
          },
        ),
      ),
      GoRoute(
        path: '/management',
        builder: (context, state) => FutureBuilder(
          future: managementUI.loadLibrary(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.done) {
              return managementUI.ManagementDashboard();
            }
            return _buildLoadingScreen();
          },
        ),
      ),
    ],
  );
}

Widget _buildLoadingScreen() {
  return const Scaffold(
    backgroundColor: Color(0xFFB298E7), 
    body: Center(
      child: CircularProgressIndicator(color: Colors.white),
    ),
  );
}
