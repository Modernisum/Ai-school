import 'package:flutter/material.dart';

class AnimatedGradientBg extends StatefulWidget {
  final Widget child;
  final bool animate;

  const AnimatedGradientBg({super.key, required this.child, this.animate = false});

  @override
  State<AnimatedGradientBg> createState() => _AnimatedGradientBgState();
}

class _AnimatedGradientBgState extends State<AnimatedGradientBg>
    with SingleTickerProviderStateMixin {
  AnimationController? _controller;

  static const _staticGradient = LinearGradient(
    colors: [
      Color(0xFF1E1440),
      Color(0xFF281C59),
      Color(0xFF1E1440),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    stops: const [0.0, 0.5, 1.0],
  );

  @override
  void initState() {
    super.initState();
    if (widget.animate) {
      _controller = AnimationController(
        vsync: this,
        duration: const Duration(seconds: 4),
      );
      _controller!.addStatusListener((status) {
        if (status == AnimationStatus.completed && mounted) {
          _controller!.stop();
        }
      });
      _controller!.forward();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        RepaintBoundary(
          child: _controller != null
              ? AnimatedBuilder(
                  animation: _controller!,
                  builder: (context, _) {
                    return Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: const [
                            Color(0xFF1E1440),
                            Color(0xFF281C59),
                            Color(0xFF1E1440),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          stops: [
                            0.0,
                            0.2 + (_controller!.value * 0.6),
                            1.0,
                          ],
                        ),
                      ),
                    );
                  },
                )
              : Container(
                  decoration: const BoxDecoration(gradient: _staticGradient),
                ),
        ),
        RepaintBoundary(
          child: widget.child,
        ),
      ],
    );
  }
}
