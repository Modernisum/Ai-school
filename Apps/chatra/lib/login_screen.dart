import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'api_service.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/auth/auth_event.dart';
import 'widgets/glass_card.dart';
import 'widgets/animated_gradient_bg.dart';
import 'theme/app_theme.dart';
import 'package:lottie/lottie.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController(text: "+91 ");
  final _otpController = TextEditingController();
  bool _isOtpSent = false;
  bool _isLoading = false;

  void _sendOtp() async {
    if (_phoneController.text.isEmpty) return;
    setState(() => _isLoading = true);
    
    final apiService = context.read<ApiService>();
    final success = await apiService.login(_phoneController.text, 'student');
    
    setState(() {
      _isLoading = false;
      if (success) {
        _isOtpSent = true;
      }
    });

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("OTP Sent! (Use 1234 for testing)")),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to send OTP. Check connection.")),
      );
    }
  }

  void _verifyOtp() async {
    if (_otpController.text.isEmpty) return;
    setState(() => _isLoading = true);

    final apiService = context.read<ApiService>();
    final success = await apiService.verifyOtp(_phoneController.text, 'student', _otpController.text);

    setState(() => _isLoading = false);

    if (success) {
      final token = await apiService.storage.read(key: 'jwt_token');
      final role = await apiService.storage.read(key: 'user_role');
      if (context.mounted) {
        context.read<AuthBloc>().add(LoggedIn(token: token!, role: role!));
      }
    }
 else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Invalid OTP")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedGradientBg(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Lottie.network(
                    'https://assets9.lottiefiles.com/packages/lf20_mr6l9jjt.json', // Placeholder school/login animation
                    height: 150,
                    errorBuilder: (context, error, stackTrace) => const Icon(Icons.school, size: 80, color: Colors.white),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "Chatra",
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 40,
                    ),
                  ),
                  Text(
                    "Student Portal",
                    style: TextStyle(fontSize: 18, color: Colors.white.withOpacity(0.9)),
                  ),
                  const SizedBox(height: 40),
                  GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (!_isOtpSent) ...[
                          Text(
                            "Welcome Back",
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 24),
                          TextField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            decoration: InputDecoration(
                              labelText: "Mobile Number",
                              prefixIcon: const Icon(Icons.phone),
                              filled: true,
                              fillColor: Colors.white.withOpacity(0.5),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: _isLoading ? null : _sendOtp,
                            child: _isLoading 
                              ? const CircularProgressIndicator(color: Colors.white)
                              : const Text("Send OTP", style: TextStyle(fontSize: 16)),
                          ),
                        ] else ...[
                          Text(
                            "Verify OTP",
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 24),
                          TextField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: "Enter OTP (1234)",
                              prefixIcon: const Icon(Icons.lock),
                              filled: true,
                              fillColor: Colors.white.withOpacity(0.5),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: _isLoading ? null : _verifyOtp,
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.green[600]),
                            child: _isLoading 
                              ? const CircularProgressIndicator(color: Colors.white)
                              : const Text("Verify & Login", style: TextStyle(fontSize: 16)),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
