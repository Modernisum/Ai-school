import 'package:flutter/material.dart';

class AnimatedGradientBg extends StatelessWidget {
  final Widget child;
  const AnimatedGradientBg({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFF281C59), // Deep Purple (Brand)
            Color(0xFF1E1440), // Darker depth
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: child,
    );
  }
}
