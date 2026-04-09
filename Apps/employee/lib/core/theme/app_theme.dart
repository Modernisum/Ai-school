import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Deep professional palette - darker, richer colors
  static const Color deepPurple = Color(0xFF7E57C2);
  static const Color darkBlue = Color(0xFF283593);
  static const Color teal = Color(0xFF00695C);
  static const Color darkGray = Color(0xFF37474F);
  static const Color lightGray = Color(0xFFECEFF1);
  static const Color whiteGlass = Color(0x33FFFFFF); // 20% opacity white
  static const Color darkGlass = Color(0x26000000); // 15% opacity black
  static const Color lightText =
      Color(0xFFECEFF1); // Light text for dark backgrounds
  static const Color darkText =
      Color(0xFF263238); // Dark text for light elements

  static ThemeData get theme {
    return ThemeData(
      primaryColor: deepPurple,
      scaffoldBackgroundColor:
          Colors.transparent, // Background will be handled by AnimatedGradient
      textTheme: GoogleFonts.outfitTextTheme().apply(
        bodyColor: lightText,
        displayColor: lightText,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: deepPurple,
          foregroundColor: Colors.white,
          elevation: 8,
          shadowColor: darkBlue.withOpacity(0.5),
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
        fillColor: darkGlass,
        contentPadding:
            const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: whiteGlass),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: whiteGlass),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: deepPurple, width: 2),
        ),
        hintStyle: TextStyle(color: lightText.withOpacity(0.7)),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: lightText),
        titleTextStyle: GoogleFonts.outfit(
          color: lightText,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
