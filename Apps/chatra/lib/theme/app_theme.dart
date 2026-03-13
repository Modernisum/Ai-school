import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const Color primaryPurple = Color(0xFFB298E7);
  static const Color cyanBlue = Color(0xFFB8E3E9);
  static const Color darkPink = Color(0xFFF5B8D5);
  static const Color lightPink = Color(0xFFF9BEDD);
  
  static const Color glassWhite = Color(0x33FFFFFF);
  static const Color glassBorder = Color(0x80FFFFFF);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      primaryColor: AppColors.primaryPurple,
      scaffoldBackgroundColor: Colors.transparent, // Background will be handled by AnimatedGradientBg
      textTheme: GoogleFonts.poppinsTextTheme().apply(
        bodyColor: Colors.black87,
        displayColor: Colors.black,
      ),
      colorScheme: const ColorScheme.light(
        primary: AppColors.primaryPurple,
        secondary: AppColors.cyanBlue,
        surface: Colors.white,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryPurple,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
      ),
    );
  }
}
