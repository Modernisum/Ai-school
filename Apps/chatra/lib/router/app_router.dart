import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/features/auth/bloc/auth_bloc.dart';
import 'package:chatra/features/auth/bloc/auth_state.dart';
import 'package:chatra/features/dashboard/bloc/dashboard_bloc.dart';
import 'package:chatra/features/notices/bloc/notice_bloc.dart';
import 'package:chatra/features/auth/screens/login_screen.dart';
import '../navbar_screen.dart';
import '../intro_screen.dart';

// ─── DEFERRED IMPORTS — heavy screens load only on demand ⚡ ───────────────────
import 'package:chatra/features/fees/screens/fees_screen.dart' deferred as fees;
import 'package:chatra/features/transport/screens/bus_tracking_screen.dart' deferred as tracking;
import 'package:chatra/features/attendance/screens/attendance_calendar_screen.dart' deferred as attendance;
import 'package:chatra/features/academic/screens/academic_vault_screen.dart' deferred as vault;
import 'package:chatra/features/live/screens/live_classroom_screen.dart' deferred as live;
import 'package:chatra/features/leave/screens/leave_management_screen.dart' deferred as leave;
import 'package:chatra/features/responsibility/screens/my_teachers_screen.dart' deferred as teachers;
import 'package:chatra/features/responsibility/screens/fee_breakdown_screen.dart' deferred as feeBreakdown;

/// Lightweight transparent splash shown while a deferred library loads.
class _DeferredLoader extends StatefulWidget {
  final Future<void> Function() loader;
  final Widget Function() builder;
  const _DeferredLoader({required this.loader, required this.builder});

  @override
  State<_DeferredLoader> createState() => _DeferredLoaderState();
}

class _DeferredLoaderState extends State<_DeferredLoader> {
  late Future<void> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.loader();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _future,
      builder: (ctx, snap) {
        if (snap.connectionState == ConnectionState.done)
          return widget.builder();
        return const Scaffold(
          backgroundColor: Color(0xFF1A1A2E),
          body: Center(child: CircularProgressIndicator(color: Colors.white)),
        );
      },
    );
  }
}

class AppRouter {
  final AuthBloc authBloc;

  AppRouter({required this.authBloc});

  late final GoRouter router = GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: _GoRouterRefreshStream(authBloc.stream),

    // ─── Strict auth + role guard ────────────────────────────────────────────
    redirect: (context, state) {
      final authState = authBloc.state;
      final isLoggingIn = state.matchedLocation == '/login';

      if (authState is AuthNeedsIntro) {
        return state.matchedLocation == '/intro' ? null : '/intro';
      }
      if (authState is AuthUnauthenticated || authState is AuthInitial) {
        return isLoggingIn ? null : '/login';
      }
      if (authState is AuthAuthenticated) {
        if (authState.role != 'student') return '/login';
        if (isLoggingIn)
          return '/dashboard'; // replace, not push — no back to login
      }
      return null;
    },

    routes: [
      // ── Login ────────────────────────────────────────────────────────────────
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => NoTransitionPage(child: LoginScreen()),
      ),
      GoRoute(
        path: '/intro',
        pageBuilder: (context, state) =>
            const NoTransitionPage(child: IntroScreen()),
      ),

      // ── Student Hub (always resident, never deferred) ─────────────────────
      GoRoute(
        path: '/dashboard',
        pageBuilder: (context, state) => NoTransitionPage(
          child: MultiBlocProvider(
            providers: [
              BlocProvider(
                create: (ctx) =>
                    DashboardBloc(apiService: ctx.read<ApiService>()),
              ),
              BlocProvider(
                create: (ctx) => NoticeBloc(apiService: ctx.read<ApiService>()),
              ),
            ],
            child: const NavbarScreen(),
          ),
        ),
      ),

      // ── Fees — deferred ───────────────────────────────────────────────────
      GoRoute(
        path: '/fees',
        pageBuilder: (context, state) => CustomTransitionPage(
          transitionDuration: const Duration(milliseconds: 300),
          child: _DeferredLoader(
            loader: fees.loadLibrary,
            builder: () => fees.FeesScreen(),
          ),
          transitionsBuilder: _slideUp,
        ),
      ),

      // ── Live Bus Tracking (heaviest — Google Maps) — deferred ─────────────
      GoRoute(
        path: '/tracking/:schoolId/:vehicleId',
        pageBuilder: (context, state) => CustomTransitionPage(
          transitionDuration: const Duration(milliseconds: 300),
          child: _DeferredLoader(
            loader: tracking.loadLibrary,
            builder: () => tracking.BusTrackingScreen(
              schoolId: state.pathParameters['schoolId']!,
              vehicleId: state.pathParameters['vehicleId']!,
            ),
          ),
          transitionsBuilder: _slideUp,
        ),
      ),

      // ── Attendance Calendar — deferred ────────────────────────────────────
      GoRoute(
        path: '/attendance/:schoolId/:studentId',
        pageBuilder: (context, state) => CustomTransitionPage(
          transitionDuration: const Duration(milliseconds: 280),
          child: _DeferredLoader(
            loader: attendance.loadLibrary,
            builder: () => attendance.AttendanceCalendarScreen(
              schoolId: state.pathParameters['schoolId']!,
              studentId: state.pathParameters['studentId']!,
            ),
          ),
          transitionsBuilder: _slideUp,
        ),
      ),

      // ── My Teachers — deferred ─────────────────────────────────────────
      GoRoute(
        path: '/teachers',
        pageBuilder: (context, state) => CustomTransitionPage(
          transitionDuration: const Duration(milliseconds: 300),
          child: _DeferredLoader(
            loader: teachers.loadLibrary,
            builder: () => teachers.MyTeachersScreen(),
          ),
          transitionsBuilder: _slideUp,
        ),
      ),

      // ── Fee Breakdown — deferred ───────────────────────────────────────
      GoRoute(
        path: '/fee-breakdown/:responsibilityId',
        pageBuilder: (context, state) => CustomTransitionPage(
          transitionDuration: const Duration(milliseconds: 300),
          child: _DeferredLoader(
            loader: feeBreakdown.loadLibrary,
            builder: () => feeBreakdown.FeeBreakdownScreen(
              responsibilityId: state.pathParameters['responsibilityId']!,
              responsibilityName: state.uri.queryParameters['name'] ?? 'Responsibility',
            ),
          ),
          transitionsBuilder: _slideUp,
        ),
      ),

      // ── Academic Vault — deferred ─────────────────────────────────────────
      GoRoute(
        path: '/vault/:schoolId/:studentId',
        pageBuilder: (context, state) => CustomTransitionPage(
          transitionDuration: const Duration(milliseconds: 280),
          child: _DeferredLoader(
            loader: vault.loadLibrary,
            builder: () => vault.AcademicVaultScreen(
              schoolId: state.pathParameters['schoolId']!,
              studentId: state.pathParameters['studentId']!,
            ),
          ),
          transitionsBuilder: _slideUp,
        ),
      ),

      // ── Live Classroom Broadcast Receiver — deferred ──────────────────────
      GoRoute(
        path: '/live/:schoolId/:classId',
        pageBuilder: (context, state) => CustomTransitionPage(
          transitionDuration: const Duration(milliseconds: 350),
          child: _DeferredLoader(
            loader: live.loadLibrary,
            builder: () => live.LiveClassroomScreen(
              schoolId: state.pathParameters['schoolId']!,
              classId: state.pathParameters['classId']!,
            ),
          ),
          transitionsBuilder: _slideUp,
        ),
      ),

      // ── Leave Management — deferred ───────────────────────────────────────
      GoRoute(
        path: '/leave',
        pageBuilder: (context, state) => CustomTransitionPage(
          transitionDuration: const Duration(milliseconds: 280),
          child: _DeferredLoader(
            loader: leave.loadLibrary,
            builder: () => leave.LeaveManagementScreen(),
          ),
          transitionsBuilder: _slideUp,
        ),
      ),
    ],
  );

  /// Hardware-accelerated slide-up transition (no CrossFade — cheaper on GPU).
  static Widget _slideUp(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, 0.06),
        end: Offset.zero,
      ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic)),
      child: FadeTransition(opacity: animation, child: child),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
class _GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<dynamic> _subscription;

  _GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
