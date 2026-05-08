import 'package:flutter/material.dart';

import 'package:flutter_animate/flutter_animate.dart';
import 'package:lottie/lottie.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/core/network/api_response.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/widgets/animated_gradient_bg.dart';
import 'package:chatra/features/auth/screens/widgets/login_step_widgets.dart';
import 'package:chatra/features/auth/bloc/auth_bloc.dart';
import 'package:chatra/features/auth/bloc/auth_event.dart';
import 'package:chatra/services/notification_service.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

enum LoginStep { identifier, otp, profileSelect }

class _LoginScreenState extends State<LoginScreen> {
  final _identController = TextEditingController();
  final _otpController = TextEditingController();
  LoginStep _currentStep = LoginStep.identifier;
  bool _isLoading = false;
  List<dynamic> _profiles = [];

  void _sendOtp() async {
    final phone = _identController.text.trim();
    if (phone.isEmpty || phone.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Enter valid 10-digit mobile number.")));
      return;
    }
    setState(() => _isLoading = true);
    // Simulation: In a real app, Firebase Phone Auth would trigger here.
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    setState(() {
      _isLoading = false;
      _currentStep = LoginStep.otp;
    });
  }

  void _verifyOtp() async {
    if (_otpController.text.length < 4) return;
    setState(() => _isLoading = true);
    
    // Simulate verification and fetch profiles
    final phone = _identController.text.trim();
    final formattedPhone = phone.startsWith('+') ? phone : "+91$phone";
    
    final apiService = context.read<ApiService>();
    final resp = await apiService.getProfiles(formattedPhone);
    
    if (!mounted) return;
    setState(() => _isLoading = false);
    
    if (resp is ApiSuccess<List<dynamic>>) {
      setState(() {
        _profiles = resp.data;
        _currentStep = LoginStep.profileSelect;
      });
    } else {
      String msg = resp is ApiError ? (resp as ApiError).message : "No profiles found.";
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  void _selectProfile(Map<String, dynamic> profile) async {
    setState(() => _isLoading = true);
    final apiService = context.read<ApiService>();
    final studentId = profile['userId'].toString();
    
    final resp = await apiService.getStudentProfile(studentId);
    
    if (!mounted) return;
    setState(() => _isLoading = false);
    
    if (resp is ApiSuccess) {
      final token = await apiService.storage.read(key: 'jwt_token') ?? "dummy_token";
      final role = profile['userType'].toString();
      
      await apiService.storage.write(key: 'school_id', value: profile['schoolId'].toString());
      await apiService.storage.write(key: 'user_id', value: studentId);
      await apiService.storage.write(key: 'student_id', value: studentId);
      await apiService.storage.write(key: 'user_role', value: role);

      // 🔔 Register for push notifications
      NotificationService.instance.registerWithBackend(apiService);
      
      if (!mounted) return;
      context.read<AuthBloc>().add(LoggedIn(token: token, role: role));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Failed to link profile.")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedGradientBg(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                RepaintBoundary(
                  child: Animate(
                    effects: [
                      ScaleEffect(
                        delay: 200.ms,
                        duration: 600.ms,
                        curve: Curves.easeOutBack,
                      ),
                    ],
                    child: Lottie.asset(
                      'assets/lottie/teaching.lottie',
                      height: 180,
                      errorBuilder: (_, __, ___) => Icon(
                        Icons.school_rounded,
                        size: 80,
                        color: AppColors.accentTeal,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "Chatra",
                  style: const TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: -1,
                  ),
                ).animate().fadeIn(delay: 400.ms),
                Text(
                  "Smart Student Connect",
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withOpacity(0.6),
                    letterSpacing: 1.5,
                  ),
                ).animate().fadeIn(delay: 600.ms),
                const SizedBox(height: 48),
                RepaintBoundary(
                  child: GlassCard(
                    padding: const EdgeInsets.all(32),
                    child: _buildStepContent(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case LoginStep.identifier:
        return IdentifierStepWidget(controller: _identController, isLoading: _isLoading, onVerify: _sendOtp);
      case LoginStep.otp:
        return OtpStepWidget(
          controller: _otpController,
          isLoading: _isLoading,
          onVerify: _verifyOtp,
          onChangeIdentifier: () => setState(() => _currentStep = LoginStep.identifier),
        );
      case LoginStep.profileSelect:
        return ProfileSelectionWidget(
          profiles: _profiles,
          isLoading: _isLoading,
          onSelect: _selectProfile,
          onBack: () => setState(() => _currentStep = LoginStep.identifier),
        );
    }
  }

  @override
  void dispose() {
    _identController.dispose();
    _otpController.dispose();
    super.dispose();
  }
}
