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
  final _identController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isOtpSent = false;

  void _sendOtp(BuildContext context) {
    if (_identController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter Mobile, Email or Aadhaar')),
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
        schoolId: '', // Discovered globally
        identifier: _identController.text.trim(),
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

              if (state is AuthProfileSelection) {
                final profiles = state.profiles;
                return Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: GlassCard(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Icon(Icons.group, size: 80, color: Colors.white),
                          const SizedBox(height: 16),
                          const Text(
                            "Select Profile",
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 24),
                          if (profiles.isEmpty)
                            const Text("No profile found.", textAlign: TextAlign.center, style: TextStyle(color: Colors.white)),
                          ...profiles.map((p) {
                             final profile = p as Map<String, dynamic>;
                             return Card(
                               color: Colors.white.withOpacity(0.2),
                               margin: const EdgeInsets.only(bottom: 12),
                               shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                               child: ListTile(
                                 leading: CircleAvatar(
                                   backgroundColor: profile['user_type'] == 'employee' ? Colors.indigoAccent : Colors.deepPurpleAccent,
                                   child: Icon(profile['user_type'] == 'employee' ? Icons.work : Icons.school, color: Colors.white),
                                 ),
                                 title: Text(profile['name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                 subtitle: Text("${profile['user_type'].toString().toUpperCase()} • ${profile['class_name'] ?? ''}", style: const TextStyle(color: Colors.white70)),
                                 trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
                                 onTap: isLoading ? null : () {
                                    context.read<AuthBloc>().add(ProfileSelected(profile: profile, identifier: state.identifier));
                                 },
                               ),
                             );
                          }).toList(),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: () {
                              setState(() => _isOtpSent = false);
                              context.read<AuthBloc>().add(LogoutRequested());
                            },
                            child: const Text("Back To Login", style: TextStyle(color: Colors.white)),
                          )
                        ]
                      )
                    )
                  )
                );
              }

              return Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: GlassCard(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(Icons.badge, size: 80, color: Colors.white),
                        const SizedBox(height: 16),
                        const Text(
                          "Adhyapak",
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const Text(
                          "Employee Portal",
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 16, color: Colors.white70),
                        ),
                        const SizedBox(height: 48),
                        
                        if (!_isOtpSent) ...[
                          TextField(
                            controller: _identController,
                            keyboardType: TextInputType.text,
                            style: const TextStyle(color: Colors.white),
                             decoration: const InputDecoration(
                               labelText: "Identifier",
                               hintText: "Phone / Email / Aadhaar",
                               prefixIcon: Icon(Icons.person, color: Colors.white70),
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
                            child: const Text("Use a different identifier", style: TextStyle(color: Colors.white)),
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

