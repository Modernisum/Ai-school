import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // New Brand Palette Phase 5
  static const Color primaryBrand = Color(0xFF281C59); // Deep Purple
  static const Color accentTeal = Color(0xFF4E8D9C);   // Teal
  static const Color accentSage = Color(0xFF85C79A);   // Sage
  static const Color accentCream = Color(0xFFEDF7BD);  // Cream
  
  static const Color navy = Color(0xFF0F172A);
  static const Color glassWhite = Color(0x1AFFFFFF);
  static const Color glassBorder = Color(0x33FFFFFF);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      primaryColor: AppColors.primaryBrand,
      scaffoldBackgroundColor: AppColors.primaryBrand,
      useMaterial3: true,
      
      // Modern Typography using Outfit
      textTheme: GoogleFonts.outfitTextTheme().apply(
        bodyColor: Colors.white,
        displayColor: Colors.white,
      ),
      
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primaryBrand,
        primary: AppColors.primaryBrand,
        secondary: AppColors.accentTeal,
        tertiary: AppColors.accentSage,
        surface: AppColors.primaryBrand,
        brightness: Brightness.dark,
      ),

      // Hardware-accelerated slide-up transitions
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accentTeal,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
    );
  }
}
