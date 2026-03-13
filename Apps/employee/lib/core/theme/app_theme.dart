import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Cotton candy skies palette
  static const Color purple = Color(0xFFB298E7);
  static const Color cyan = Color(0xFFB8E3E9);
  static const Color darkPink = Color(0xFFF5B8D5);
  static const Color lightPink = Color(0xFFF9BEDD);
  static const Color whiteGlass = Color(0x26FFFFFF); // 15% opacity white
  static const Color darkGlass = Color(0x1A000000); // 10% opacity black
  static const Color solidText = Color(0xFF2D3748); // Dark slate for contrast

  static ThemeData get theme {
    return ThemeData(
      primaryColor: purple,
      scaffoldBackgroundColor: Colors.transparent, // Background will be handled by AnimatedGradient
      textTheme: GoogleFonts.outfitTextTheme().apply(
        bodyColor: solidText,
        displayColor: solidText,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: purple,
          foregroundColor: Colors.white,
          elevation: 8,
          shadowColor: purple.withValues(alpha: 0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.4),
        contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.5)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.5)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: purple, width: 2),
        ),
        hintStyle: TextStyle(color: solidText.withValues(alpha: 0.5)),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: solidText),
        titleTextStyle: GoogleFonts.outfit(
          color: solidText,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
