import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'api_service.dart';
import 'login_screen.dart';
import 'home_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(
    RepositoryProvider(
      create: (context) => ApiService(),
      child: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Adhyapk / Chatra Portal',
      theme: AppTheme.lightTheme,
      home: AuthChecker(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class AuthChecker extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final apiService = context.read<ApiService>();
    
    return FutureBuilder<bool>(
      future: apiService.isLoggedIn(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.data == true) {
          return HomeScreen();
        }
        return LoginScreen();
      },
    );
  }
}
