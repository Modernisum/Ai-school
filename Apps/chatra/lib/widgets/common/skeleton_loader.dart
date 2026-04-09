// skeleton_loader.dart - Core reusable skeleton loading component
import 'package:flutter/material.dart';

class SkeletonLoader extends StatelessWidget {
  final double? height;
  final double? width;
  final BorderRadius? borderRadius;
  final Color? baseColor;
  final Color? highlightColor;

  const SkeletonLoader({
    super.key,
    this.height,
    this.width,
    this.borderRadius,
    this.baseColor,
    this.highlightColor,
  });

  @override
  Widget build(BuildContext context) {
    return _Shimmer(
      height: height,
      width: width,
      borderRadius: borderRadius,
      baseColor: baseColor,
      highlightColor: highlightColor,
    );
  }
}

class _Shimmer extends StatefulWidget {
  final double? height;
  final double? width;
  final BorderRadius? borderRadius;
  final Color? baseColor;
  final Color? highlightColor;

  const _Shimmer({
    super.key,
    this.height,
    this.width,
    this.borderRadius,
    this.baseColor,
    this.highlightColor,
  });

  @override
  State<_Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<_Shimmer> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutSine),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = widget.baseColor ?? Colors.grey[300]!;
    final highlight = widget.highlightColor ?? Colors.grey[100]!;

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          height: widget.height,
          width: widget.width,
          decoration: BoxDecoration(
            borderRadius: widget.borderRadius ?? BorderRadius.circular(8),
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [base, highlight, base],
              stops: [
                0.0,
                _animation.value - 0.3,
                _animation.value,
                _animation.value + 0.3,
                1.0,
              ],
            ),
          ),
        );
      },
    );
  }
}
