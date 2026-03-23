import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_core/firebase_core.dart';
import 'api_service.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/auth/auth_event.dart';
import 'services/notification_service.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  debugPrint("[Main] Checking network connectivity to backend (10.0.2.2:8080)...");
  try {
    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 5);
    final request = await client.getUrl(Uri.parse('http://10.0.2.2:8080/'));
    final response = await request.close();
    debugPrint("[Main] Network OK: ${response.statusCode}");
  } catch (e) {
    debugPrint("[Main] Network Error: $e");
  }

  debugPrint("[Main] Initializing Firebase...");
  // 🔥 Firebase — required before firebase_messaging can function
  await Firebase.initializeApp();
  debugPrint("[Main] Firebase Initialized");

//   // 🔔 Notification service — registers FCM, local notifications & handlers
//   await NotificationService.instance.init();

  runApp(
    RepositoryProvider(
      create: (context) => ApiService(),
      child: BlocProvider(
        create: (context) => AuthBloc(
          apiService: context.read<ApiService>(),
        )..add(AppStarted()),
        child: const MyApp(),
      ),
    ),
  );
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
    // 🔔 Deep link support — allow notifications to trigger GoRouter navigations
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
