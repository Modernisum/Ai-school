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

enum LoginStep { phone, otp, profileSelect }

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController(text: "+91 ");
  final _otpController = TextEditingController();
  LoginStep _currentStep = LoginStep.phone;
  bool _isLoading = false;
  List<dynamic> _profiles = [];

  void _sendOtp() async {
    if (_phoneController.text.isEmpty) return;
    setState(() => _isLoading = true);
    
    final apiService = context.read<ApiService>();
    final success = await apiService.login(_phoneController.text, 'student');
    
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
    final profiles = await apiService.verifyOtp(_phoneController.text, 'student', _otpController.text);

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
      _phoneController.text,
      profile['id'].toString(),
      profile['user_type'].toString()
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
    if (_currentStep == LoginStep.phone) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
        ],
      );
    } else if (_currentStep == LoginStep.otp) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
              : const Text("Verify", style: TextStyle(fontSize: 16)),
          ),
          TextButton(
             onPressed: () => setState(() => _currentStep = LoginStep.phone),
             child: const Text("Change Phone Number"),
          )
        ],
      );
    } else {
       return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Select Profile",
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          if (_profiles.isEmpty)
             const Text("No profiles found for this number."),
          ..._profiles.map((p) {
             final profile = p as Map<String, dynamic>;
             return Card(
               margin: const EdgeInsets.only(bottom: 12),
               elevation: 2,
               shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
               child: ListTile(
                 leading: CircleAvatar(
                   backgroundColor: profile['user_type'] == 'student' ? AppColors.primaryPurple : Colors.indigo,
                   child: Icon(
                     profile['user_type'] == 'student' ? Icons.school : Icons.work, 
                     color: Colors.white
                   ),
                 ),
                 title: Text(profile['name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
                 subtitle: Text("${profile['user_type'].toString().toUpperCase()} • ${profile['class_name'] ?? ''}"),
                 trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                 onTap: _isLoading ? null : () => _selectProfile(profile),
               ),
             );
          }).toList(),
          const SizedBox(height: 16),
          TextButton(
             onPressed: () => setState(() => _currentStep = LoginStep.phone),
             child: const Text("Back to Login"),
          )
        ],
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
