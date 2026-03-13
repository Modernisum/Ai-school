import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'blocs/auth/auth_bloc.dart';
import 'blocs/auth/auth_event.dart';
import 'blocs/auth/auth_state.dart';
import 'core/widgets/animated_gradient_bg.dart';
import 'core/widgets/glass_card.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isOtpSent = false;

  void _sendOtp(BuildContext context) {
    if (_phoneController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter mobile number')),
      );
      return;
    }
    // In MVP, we spoof OTP sending. The real verification happens on LoginRequested.
    setState(() {
      _isOtpSent = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("OTP Sent! (Use 1234 for testing)")),
    );
  }

  void _verifyOtp(BuildContext context) {
    if (_otpController.text.isEmpty) return;
    
    // Dispatch event to BLoC
    context.read<AuthBloc>().add(
      LoginRequested(
        schoolId: '123456', // Optional/Dynamic later
        identifier: _phoneController.text,
        password: _otpController.text,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedGradientBg(
        child: SafeArea(
          child: BlocConsumer<AuthBloc, AuthState>(
            listener: (context, state) {
              if (state is AuthError) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(state.message), backgroundColor: Colors.redAccent),
                );
              }
            },
            builder: (context, state) {
              final isLoading = state is AuthLoading;

              return Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: GlassCard(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(Icons.school, size: 80, color: Colors.white),
                        const SizedBox(height: 16),
                        const Text(
                          "Vidhyam V3",
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const Text(
                          "Unified Employee Portal",
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 16, color: Colors.white70),
                        ),
                        const SizedBox(height: 48),
                        
                        if (!_isOtpSent) ...[
                          TextField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            style: const TextStyle(color: Colors.white),
                            decoration: const InputDecoration(
                              labelText: "Mobile Number",
                              prefixIcon: Icon(Icons.phone, color: Colors.white70),
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: isLoading ? null : () => _sendOtp(context),
                            child: isLoading
                                ? const CircularProgressIndicator(color: Colors.white)
                                : const Text("Verify Mobile Number"),
                          ),
                        ] else ...[
                          TextField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: Colors.white),
                            decoration: const InputDecoration(
                              labelText: "Enter OTP (1234)",
                              prefixIcon: Icon(Icons.lock, color: Colors.white70),
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: isLoading ? null : () => _verifyOtp(context),
                            child: isLoading
                                ? const CircularProgressIndicator(color: Colors.white)
                                : const Text("Secure Login"),
                          ),
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: isLoading ? null : () => setState(() => _isOtpSent = false),
                            child: const Text("Use a different number", style: TextStyle(color: Colors.white)),
                          )
                        ],
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

