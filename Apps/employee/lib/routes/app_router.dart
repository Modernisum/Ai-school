import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../blocs/auth/auth_bloc.dart';
import '../blocs/auth/auth_state.dart';
import '../login_screen.dart';

import '../screens/common/intro_screen.dart';
import 'package:flutter/services.dart';

// Deferred Imports for Lazy Loading Chunks
import '../screens/dashboards/teacher_dashboard.dart' deferred as teacherUI;
import '../screens/dashboards/driver_dashboard.dart' deferred as driverUI;
import '../screens/dashboards/peon_dashboard.dart' deferred as peonUI;
import '../screens/dashboards/management_dashboard.dart' deferred as managementUI;
import '../screens/responsibility/responsibility_list_screen.dart';
import '../screens/responsibility/responsibility_detail_screen.dart';

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
    debugLogDiagnostics: true,
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
      GoRoute(
        path: '/responsibilities',
        builder: (context, state) => const ResponsibilityListScreen(),
      ),
      GoRoute(
        path: '/responsibilities/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          final name = state.uri.queryParameters['name'] ?? 'Responsibility';
          return ResponsibilityDetailScreen(
            responsibilityId: id,
            responsibilityName: name,
          );
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Page not found: ${state.uri}',
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB298E7),
              ),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
}

// Deep Link Handler
class DeepLinkHandler {
  static const MethodChannel _channel = MethodChannel('com.modernschool.employee/deeplink');

  static Future<void> handleDeepLink(Uri uri) async {
    try {
      final path = uri.path;
      final params = uri.queryParameters;

      if (path.startsWith('/responsibilities/')) {
        final id = path.split('/').last;
        // Navigate to responsibility detail
        // This will be handled by GoRouter
      }
    } catch (e) {
      debugPrint('Deep link error: $e');
    }
  }
}

Widget _buildLoadingScreen() {
  return const Scaffold(
    backgroundColor: Color(0xFFB298E7), 
    body: Center(
      child: CircularProgressIndicator(color: Colors.white),
    ),
  );
}
