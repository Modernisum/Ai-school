
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/features/auth/bloc/auth_bloc.dart';
import 'package:chatra/features/auth/bloc/auth_event.dart';
import 'services/notification_service.dart';
import 'router/app_router.dart';
import 'package:chatra/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(
    RepositoryProvider(
      create: (context) {
        final api = ApiService();
        api.onSessionExpired = () {
          debugPrint("[ApiService] Session expired, logging out...");
          api.logout();
        };
        return api;
      },
      child: const _AppBootstrap(),
    ),
  );
}

class _AppBootstrap extends StatefulWidget {
  const _AppBootstrap();

  @override
  State<_AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends State<_AppBootstrap> {
  late Future<void> _initFuture;

  @override
  void initState() {
    super.initState();
    _initFuture = _initialize();
  }

  Future<void> _initialize() async {
    await Firebase.initializeApp();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _initFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            home: const Scaffold(
              backgroundColor: AppColors.primaryBrand,
              body: Center(child: CircularProgressIndicator(color: Colors.white)),
            ),
          );
        }

        return BlocProvider(
          create: (context) => AuthBloc(
            apiService: context.read<ApiService>(),
          )..add(AppStarted()),
          child: const MyApp(),
        );
      },
    );
  }
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late AppRouter _appRouter;

  @override
  void initState() {
    super.initState();
    _appRouter = AppRouter(authBloc: context.read<AuthBloc>());
    NotificationService.router = _appRouter.router;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Chatra — Student Portal',
      theme: AppTheme.lightTheme,
      routerConfig: _appRouter.router,
      debugShowCheckedModeBanner: false,
    );
  }
}
