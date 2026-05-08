import 'package:flutter/material.dart';

class AppColors {
  static const Color primaryBrand = Color(0xFF281C59);
  static const Color accentTeal = Color(0xFF4E8D9C);
  static const Color accentSage = Color(0xFF85C79A);
  static const Color accentCream = Color(0xFFEDF7BD);

  static const Color navy = Color(0xFF0F172A);
  static const Color glassWhite = Color(0x1AFFFFFF);
  static const Color glassBorder = Color(0x33FFFFFF);
}

class AppTextStyles {
  static const String _family = 'Outfit';

  static const TextStyle displayLarge = TextStyle(fontFamily: _family, fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white);
  static const TextStyle displayMedium = TextStyle(fontFamily: _family, fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white);
  static const TextStyle displaySmall = TextStyle(fontFamily: _family, fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white);

  static const TextStyle headlineMedium = TextStyle(fontFamily: _family, fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white);
  static const TextStyle headlineSmall = TextStyle(fontFamily: _family, fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white);

  static const TextStyle titleLarge = TextStyle(fontFamily: _family, fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white);
  static const TextStyle titleMedium = TextStyle(fontFamily: _family, fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white70);
  static const TextStyle titleSmall = TextStyle(fontFamily: _family, fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white60);

  static const TextStyle bodyLarge = TextStyle(fontFamily: _family, fontSize: 16, fontWeight: FontWeight.normal, color: Colors.white);
  static const TextStyle bodyMedium = TextStyle(fontFamily: _family, fontSize: 14, fontWeight: FontWeight.normal, color: Colors.white70);
  static const TextStyle bodySmall = TextStyle(fontFamily: _family, fontSize: 12, fontWeight: FontWeight.normal, color: Colors.white54);

  static const TextStyle labelLarge = TextStyle(fontFamily: _family, fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white70);
  static const TextStyle labelMedium = TextStyle(fontFamily: _family, fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white60);
  static const TextStyle labelSmall = TextStyle(fontFamily: _family, fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white38);

  static const TextStyle caption = TextStyle(fontFamily: _family, fontSize: 11, fontWeight: FontWeight.normal, color: Colors.white38);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      primaryColor: AppColors.primaryBrand,
      scaffoldBackgroundColor: AppColors.primaryBrand,
      useMaterial3: true,
      fontFamily: 'Outfit',

      textTheme: const TextTheme(
        displayLarge: AppTextStyles.displayLarge,
        displayMedium: AppTextStyles.displayMedium,
        displaySmall: AppTextStyles.displaySmall,
        headlineMedium: AppTextStyles.headlineMedium,
        headlineSmall: AppTextStyles.headlineSmall,
        titleLarge: AppTextStyles.titleLarge,
        titleMedium: AppTextStyles.titleMedium,
        titleSmall: AppTextStyles.titleSmall,
        bodyLarge: AppTextStyles.bodyLarge,
        bodyMedium: AppTextStyles.bodyMedium,
        bodySmall: AppTextStyles.bodySmall,
        labelLarge: AppTextStyles.labelLarge,
        labelMedium: AppTextStyles.labelMedium,
        labelSmall: AppTextStyles.labelSmall,
      ),

      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primaryBrand,
        primary: AppColors.primaryBrand,
        secondary: AppColors.accentTeal,
        tertiary: AppColors.accentSage,
        surface: AppColors.primaryBrand,
        brightness: Brightness.dark,
      ),

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
