import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:go_router/go_router.dart';

class QuickActionGrid extends StatelessWidget {
  const QuickActionGrid({super.key});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 1.0, // Updated to 1.0 per architectural guidelines
      children: [
        _buildActionItem(
          Icons.gps_fixed_rounded,
          "Track Bus",
          AppColors.accentSage,
          () => context.go('/tracking'),
        ),
        _buildActionItem(
          Icons.calendar_month_rounded,
          "History",
          AppColors.accentTeal,
          () => context.go('/attendance'),
        ),
        _buildActionItem(
          Icons.inventory_2_rounded,
          "Vault",
          AppColors.accentCream,
          () => context.go('/vault'),
        ),
        _buildActionItem(
          Icons.support_agent_rounded,
          "Help",
          AppColors.accentTeal,
          () => context.go('/profile'),
        ),
        _buildActionItem(
          Icons.school_rounded,
          "My Teachers",
          AppColors.accentSage,
          () => context.go('/teachers'),
        ),
      ],
    );
  }

  Widget _buildActionItem(IconData icon, String label, Color color, [VoidCallback? onTap]) {
    return InkWell(
      onTap: onTap,
      child: GlassCard(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: GoogleFonts.outfit(
                color: Colors.white70,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ).animate().fadeIn(delay: 200.ms),
    );
  }
}
