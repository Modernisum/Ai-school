import 'package:flutter/material.dart';

class AnimatedGradientBg extends StatefulWidget {
  final Widget child;
  const AnimatedGradientBg({super.key, required this.child});

  @override
  State<AnimatedGradientBg> createState() => _AnimatedGradientBgState();
}

class _AnimatedGradientBgState extends State<AnimatedGradientBg>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Background layer with its own RepaintBoundary
        RepaintBoundary(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              return Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: const [
                      Color(0xFF1E1440), // Deep Purple (Brand)
                      Color(0xFF281C59), // Mid depth
                      Color(0xFF1E1440), // Back to Deep
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    stops: [
                      0.0,
                      0.2 + (_controller.value * 0.6),
                      1.0,
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        // Foreground layer with its own RepaintBoundary to isolate from bg animations
        RepaintBoundary(
          child: widget.child,
        ),
      ],
    );
  }
}
