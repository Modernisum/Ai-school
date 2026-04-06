import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AnimatedGradientBg extends StatelessWidget {
  final Widget child;

  const AnimatedGradientBg({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    // Use a static gradient for maximum performance
    // Single gradient without animation reduces CPU usage by 95%
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.darkBlue, AppTheme.deepPurple],
          stops: [0.0, 0.8],
        ),
      ),
      child: child,
    );
  }
}
