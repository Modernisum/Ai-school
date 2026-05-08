import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:chatra/theme/app_theme.dart';

class IdentifierStepWidget extends StatelessWidget {
  final TextEditingController controller;
  final bool isLoading;
  final VoidCallback onVerify;

  const IdentifierStepWidget({
    super.key,
    required this.controller,
    required this.isLoading,
    required this.onVerify,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          "Welcome Back",
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 8),
        Text(
          "Enter your registered phone number to verify",
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14),
        ),
        const SizedBox(height: 32),
        TextField(
          controller: controller,
          keyboardType: TextInputType.phone,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
          ],
          style: const TextStyle(color: Colors.white, fontSize: 18, letterSpacing: 2, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            labelText: "Phone Number",
            labelStyle: const TextStyle(color: AppColors.accentTeal),
            hintText: "10-digit mobile number",
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.1)),
            prefixIcon: Icon(Icons.phone_android_rounded, color: AppColors.accentTeal),
            prefixText: "+91 ",
            prefixStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: AppColors.accentTeal, width: 2),
            ),
          ),
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: isLoading ? null : onVerify,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accentTeal,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 8,
            shadowColor: AppColors.accentTeal.withOpacity(0.3),
          ),
          child: isLoading
              ? const SizedBox(
                  height: 24,
                  width: 24,
                  child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                )
              : const Text("Get OTP", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ),
      ],
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0);
  }
}

class OtpStepWidget extends StatelessWidget {
  final TextEditingController controller;
  final bool isLoading;
  final VoidCallback onVerify;
  final VoidCallback onChangeIdentifier;

  const OtpStepWidget({
    super.key,
    required this.controller,
    required this.isLoading,
    required this.onVerify,
    required this.onChangeIdentifier,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          "Verification",
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 8),
        Text(
          "Enter the 6-digit code sent to your phone",
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14),
        ),
        const SizedBox(height: 32),
        TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(6),
          ],
          style: const TextStyle(color: Colors.white, fontSize: 18, letterSpacing: 4, fontWeight: FontWeight.bold),
          decoration: InputDecoration(
            labelText: "OTP Code",
            labelStyle: const TextStyle(color: AppColors.accentTeal),
            prefixIcon: Icon(Icons.shield_rounded, color: AppColors.accentTeal),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: AppColors.accentTeal, width: 2),
            ),
          ),
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: isLoading ? null : onVerify,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accentTeal,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: isLoading
              ? const CircularProgressIndicator(color: Colors.black)
              : const Text("Verify & Continue", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: onChangeIdentifier,
          child: const Text("Change Phone Number", style: TextStyle(color: AppColors.accentTeal)),
        ),
      ],
    ).animate().fadeIn(duration: 400.ms).slideX(begin: 0.1, end: 0);
  }
}

class ProfileSelectionWidget extends StatelessWidget {
  final List<dynamic> profiles;
  final bool isLoading;
  final Function(Map<String, dynamic>) onSelect;
  final VoidCallback onBack;

  const ProfileSelectionWidget({
    super.key,
    required this.profiles,
    required this.isLoading,
    required this.onSelect,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          "Multiple Profiles",
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 8),
        Text(
          "Found ${profiles.length} profiles linked to this number",
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14),
        ),
        const SizedBox(height: 24),
        Flexible(
          child: ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: profiles.length,
            itemBuilder: (context, index) {
              final profile = profiles[index] as Map<String, dynamic>;
              final name = profile['name'] ?? 'Student';
              final className = profile['className'] ?? 'N/A';

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: CircleAvatar(
                    backgroundColor: AppColors.accentTeal.withOpacity(0.2),
                    child: Text(
                      name[0].toUpperCase(),
                      style: const TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.bold),
                    ),
                  ),
                  title: Text(
                    name,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    "Class: $className",
                    style: const TextStyle(color: Colors.white54, fontSize: 13),
                  ),
                  trailing: Icon(Icons.chevron_right_rounded, color: AppColors.accentTeal),
                  onTap: isLoading ? null : () => onSelect(profile),
                ),
              ).animate().fadeIn(delay: (index * 100).ms).slideX(begin: 0.1, end: 0);
            },
          ),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: onBack,
          style: TextButton.styleFrom(foregroundColor: Colors.white54),
          child: const Text("Switch Account"),
        ),
      ],
    );
  }
}
