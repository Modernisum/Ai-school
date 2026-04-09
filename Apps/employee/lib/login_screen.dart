import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'blocs/auth/auth_bloc.dart';
import 'blocs/auth/auth_event.dart';
import 'blocs/auth/auth_state.dart';
import 'core/theme/app_theme.dart';
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
  String _verificationId = "";

  void _sendOtp(BuildContext context) async {
    final phone = _identController.text.trim();
    if (phone.isEmpty || phone.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please enter a valid 10-digit phone number')),
      );
      return;
    }

    String formattedPhone = phone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = "+91$formattedPhone";
    }

    // --- DEVELOPER BYPASS: SKIP FIREBASE AND GO TO PROFILE FETCH ---
    debugPrint("Developer Mode: Bypassing Firebase OTP for $formattedPhone");

    if (context.mounted) {
      context.read<AuthBloc>().add(
            LoginRequested(
              schoolId: '',
              identifier: formattedPhone,
              password: '',
            ),
          );
    }
  }

  void _verifyOtp(BuildContext context) async {
    if (_otpController.text.isEmpty) return;

    try {
      PhoneAuthCredential credential = PhoneAuthProvider.credential(
        verificationId: _verificationId,
        smsCode: _otpController.text.trim(),
      );

      await FirebaseAuth.instance.signInWithCredential(credential);

      String formattedPhone = _identController.text.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = "+91$formattedPhone";
      }

      // Dispatch event to fetch profiles from the backend now that OTP is valid
      if (context.mounted) {
        context.read<AuthBloc>().add(
              LoginRequested(
                schoolId: '',
                identifier: formattedPhone,
                password: '',
              ),
            );
      }
    } on FirebaseAuthException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Invalid OTP: ${e.message}")),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: $e")),
      );
    }
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
                  SnackBar(
                      content: Text(state.message),
                      backgroundColor: Colors.redAccent),
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
                                  const Icon(Icons.group,
                                      size: 80, color: AppTheme.lightText),
                                  const SizedBox(height: 16),
                                  const Text(
                                    "Select Profile",
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                        fontSize: 32,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.lightText),
                                  ),
                                  const SizedBox(height: 24),
                                  if (profiles.isEmpty)
                                    const Text("No profile found.",
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                            color: AppTheme.lightText)),
                                  ...profiles.map((p) {
                                    final profile = p as Map<String, dynamic>;
                                    return Card(
                                      color: AppTheme.whiteGlass,
                                      margin: const EdgeInsets.only(bottom: 12),
                                      shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(12)),
                                      child: ListTile(
                                        leading: CircleAvatar(
                                          backgroundColor:
                                              profile['user_type'] == 'employee'
                                                  ? AppTheme.deepPurple
                                                  : AppTheme.darkBlue,
                                          child: Icon(
                                              profile['user_type'] == 'employee'
                                                  ? Icons.work
                                                  : Icons.school,
                                              color: AppTheme.lightText),
                                        ),
                                        title: Text(
                                            profile['name'] ?? 'Unknown',
                                            style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.lightText)),
                                        subtitle: Text(
                                            "${profile['user_type'].toString().toUpperCase()} • ${profile['class_name'] ?? ''}",
                                            style: TextStyle(
                                                color: AppTheme.lightText
                                                    .withOpacity(0.7))),
                                        trailing: const Icon(
                                            Icons.arrow_forward_ios,
                                            color: AppTheme.lightText,
                                            size: 16),
                                        onTap: isLoading
                                            ? null
                                            : () {
                                                context.read<AuthBloc>().add(
                                                    ProfileSelected(
                                                        profile: profile,
                                                        identifier:
                                                            state.identifier));
                                              },
                                      ),
                                    );
                                  }).toList(),
                                  const SizedBox(height: 16),
                                  TextButton(
                                    onPressed: () {
                                      setState(() => _isOtpSent = false);
                                      context
                                          .read<AuthBloc>()
                                          .add(LogoutRequested());
                                    },
                                    child: const Text("Back To Login",
                                        style: TextStyle(
                                            color: AppTheme.lightText)),
                                  )
                                ]))));
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
                        const Icon(Icons.badge,
                            size: 80, color: AppTheme.lightText),
                        const SizedBox(height: 16),
                        const Text(
                          "Adhyapak",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.lightText),
                        ),
                        const Text(
                          "Employee Login",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 16,
                              color: AppTheme.lightText,
                              fontWeight: FontWeight.w300,
                              letterSpacing: 1.2),
                        ),
                        const SizedBox(height: 48),
                        if (!_isOtpSent) ...[
                          TextField(
                            controller: _identController,
                            keyboardType: TextInputType.phone,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(10),
                            ],
                            style: const TextStyle(
                                color: AppTheme.lightText,
                                fontSize: 18,
                                letterSpacing: 2),
                            decoration: InputDecoration(
                              labelText: "Mobile Number",
                              hintText: "10-digit number",
                              prefixIcon: Icon(Icons.phone_iphone,
                                  color: AppTheme.lightText.withOpacity(0.7)),
                              prefixText: "+91 ",
                              prefixStyle: const TextStyle(
                                  color: AppTheme.lightText,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 18),
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed:
                                isLoading ? null : () => _sendOtp(context),
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                        color: AppTheme.lightText,
                                        strokeWidth: 2))
                                : const Text("Verify"),
                          ),
                        ] else ...[
                          TextField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: AppTheme.lightText),
                            decoration: InputDecoration(
                              labelText: "Enter OTP (1234)",
                              prefixIcon: Icon(Icons.lock,
                                  color: AppTheme.lightText.withOpacity(0.7)),
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed:
                                isLoading ? null : () => _verifyOtp(context),
                            child: isLoading
                                ? const CircularProgressIndicator(
                                    color: AppTheme.lightText)
                                : const Text("Secure Login"),
                          ),
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: isLoading
                                ? null
                                : () => setState(() => _isOtpSent = false),
                            child: const Text("Use a different identifier",
                                style: TextStyle(color: AppTheme.lightText)),
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
