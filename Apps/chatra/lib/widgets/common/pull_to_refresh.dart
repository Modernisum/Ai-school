// pull_to_refresh.dart - Reusable pull-to-refresh widget
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class PullToRefresh extends StatelessWidget {
  final Future<void> Function() onRefresh;
  final Widget child;

  const PullToRefresh({
    super.key,
    required this.onRefresh,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: Colors.white,
      backgroundColor: AppColors.accentTeal,
      child: child,
    );
  }
}
