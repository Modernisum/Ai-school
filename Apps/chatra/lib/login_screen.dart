import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'api_service.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/auth/auth_event.dart';
import 'widgets/glass_card.dart';
import 'theme/app_theme.dart';
import 'package:lottie/lottie.dart';

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
    if (_identController.text.trim().isEmpty) {
       ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please enter your Phone, Email, or Aadhaar.")),
      );
      return;
    }
    setState(() => _isLoading = true);
    
    final apiService = context.read<ApiService>();
    final success = await apiService.login(_identController.text.trim());
    
    setState(() {
      _isLoading = false;
      if (success) {
        _currentStep = LoginStep.otp;
      }
    });

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("OTP Sent! (Use 1234 for testing)")),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Failed to send OTP. Check connection.")),
      );
    }
  }

  void _verifyOtp() async {
    if (_otpController.text.isEmpty) return;
    setState(() => _isLoading = true);

    final apiService = context.read<ApiService>();
    final profiles = await apiService.verifyOtp(_identController.text.trim(), _otpController.text);

    setState(() => _isLoading = false);

    if (profiles != null) {
      setState(() {
         _profiles = profiles;
         _currentStep = LoginStep.profileSelect;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Invalid OTP or No Profiles Found")),
      );
    }
  }

  void _selectProfile(Map<String, dynamic> profile) async {
    setState(() => _isLoading = true);
    final apiService = context.read<ApiService>();
    final success = await apiService.selectProfile(
      profile['schoolId'].toString(),
      _identController.text.trim(),
      profile['userId'].toString(),
      profile['userType'].toString()
    );

    setState(() => _isLoading = false);

    if (success) {
      final token = await apiService.storage.read(key: 'jwt_token');
      final role = await apiService.storage.read(key: 'user_role');
      if (context.mounted) {
        context.read<AuthBloc>().add(LoggedIn(token: token!, role: role!));
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Failed to login with this profile.")),
      );
    }
  }

  Widget _buildStepContent() {
    if (_currentStep == LoginStep.identifier) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Welcome Back",
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Login with Phone, Email, or Aadhaar",
            style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 13),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _identController,
            keyboardType: TextInputType.text,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: "Identifier",
              labelStyle: const TextStyle(color: AppColors.accentTeal),
              hintText: "Phone / Email / Aadhaar",
              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
              prefixIcon: const Icon(Icons.person_outline, color: AppColors.accentTeal),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.05),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accentTeal)),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _isLoading ? null : _sendOtp,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentTeal,
              foregroundColor: Colors.white,
            ),
            child: _isLoading 
              ? const CircularProgressIndicator(color: Colors.white)
              : const Text("Send OTP", style: TextStyle(fontSize: 16)),
          ),
        ],
      );
    } else if (_currentStep == LoginStep.otp) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Verify OTP",
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: "Enter OTP (1234)",
              labelStyle: const TextStyle(color: AppColors.accentTeal),
              prefixIcon: const Icon(Icons.lock, color: AppColors.accentTeal),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.05),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accentTeal)),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _isLoading ? null : _verifyOtp,
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentSage),
            child: _isLoading 
              ? const CircularProgressIndicator(color: Colors.white)
              : const Text("Verify", style: TextStyle(fontSize: 16, color: AppColors.primaryBrand)),
          ),
          TextButton(
             onPressed: () => setState(() => _currentStep = LoginStep.identifier),
             child: const Text("Change Identifier", style: TextStyle(color: AppColors.accentTeal)),
          )
        ],
      );
    } else {
       return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Select Profile",
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          if (_profiles.isEmpty)
             const Text("No profiles found.", style: TextStyle(color: Colors.white)),
          ..._profiles.map((p) {
             final profile = p as Map<String, dynamic>;
             final isStudent = profile['userType'] == 'student';
             return Card(
               margin: const EdgeInsets.only(bottom: 12),
               color: Colors.white.withValues(alpha: 0.05),
               elevation: 0,
               shape: RoundedRectangleBorder(
                 borderRadius: BorderRadius.circular(12),
                 side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
               ),
               child: ListTile(
                 leading: CircleAvatar(
                   backgroundColor: isStudent ? AppColors.accentTeal : AppColors.accentSage,
                   child: Icon(
                     isStudent ? Icons.school : Icons.work, 
                     color: isStudent ? Colors.white : AppColors.primaryBrand,
                   ),
                 ),
                 title: Text(profile['name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                 subtitle: Text(
                   "${profile['userType'].toString().toUpperCase()} • ${profile['className'] ?? ''}",
                   style: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                 ),
                 trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.white24),
                 onTap: _isLoading ? null : () => _selectProfile(profile),
               ),
             );
          }).toList(),
          const SizedBox(height: 16),
          TextButton(
             onPressed: () => setState(() => _currentStep = LoginStep.identifier),
             child: const Text("Back to Login", style: TextStyle(color: AppColors.accentTeal)),
          )
        ],
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBrand,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.primaryBrand,
              Color(0xFF1E1440),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Lottie.network(
                    'https://assets9.lottiefiles.com/packages/lf20_mr6l9jjt.json',
                    height: 150,
                    errorBuilder: (context, error, stackTrace) => const Icon(Icons.school, size: 80, color: AppColors.accentTeal),
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
                    style: TextStyle(fontSize: 18, color: Colors.white.withValues(alpha: 0.7)),
                  ),
                  const SizedBox(height: 40),
                  GlassCard(
                    padding: const EdgeInsets.all(24),
                    child: _buildStepContent()
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
