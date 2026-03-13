import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AnimatedGradientBg extends StatefulWidget {
  final Widget child;

  const AnimatedGradientBg({super.key, required this.child});

  @override
  State<AnimatedGradientBg> createState() => _AnimatedGradientBgState();
}

class _AnimatedGradientBgState extends State<AnimatedGradientBg> {
  // Cotton Candy Skies palettes
  final List<List<Color>> _gradientLists = [
    [AppTheme.lightPink, AppTheme.cyan],
    [AppTheme.cyan, AppTheme.purple],
    [AppTheme.purple, AppTheme.darkPink],
    [AppTheme.darkPink, AppTheme.lightPink],
  ];

  int _currentIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // Shift gradients every 4 seconds
    _timer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (mounted) {
        setState(() {
          _currentIndex = (_currentIndex + 1) % _gradientLists.length;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(seconds: 4),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: _gradientLists[_currentIndex],
        ),
      ),
      child: widget.child,
    );
  }
}
