import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'firebase_options.dart';

import 'api_service.dart';
import 'blocs/auth/auth_bloc.dart';
import 'blocs/auth/auth_event.dart';
import 'blocs/notifications/notifications_bloc.dart';
import 'blocs/notifications/notifications_event.dart';
import 'core/theme/app_theme.dart';
import 'routes/app_router.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Configure Firebase Auth emulator for local testing
  // This bypasses network connectivity issues in the emulator
  try {
    await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
    print('Firebase Auth emulator configured successfully');
  } catch (e) {
    print('Could not configure Firebase Auth emulator: $e');
    print('Using production Firebase Auth (requires internet connection)');
  }
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<ApiService>(
          create: (context) => ApiService(),
        ),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider<AuthBloc>(
            create: (context) => AuthBloc(
              apiService: context.read<ApiService>(),
            )..add(AppStarted()),
          ),
          BlocProvider<NotificationsBloc>(
            create: (context) => NotificationsBloc()..add(ConnectWebSocket()),
          ),
        ],
        child: Builder(
          builder: (context) {
            return MaterialApp.router(
              title: 'Adhyapak Employee App',
              theme: AppTheme.theme,
              debugShowCheckedModeBanner: false,
              routerConfig: createRouter(context.read<AuthBloc>()),
            );
          }
        ),
      ),
    );
  }
}

