import 'package:flutter/material.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:go_router/go_router.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

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
      childAspectRatio: 1.0,
      children: [
        _buildActionItem(
          Icons.gps_fixed_rounded,
          "Track Bus",
          AppColors.accentSage,
          () => _navigateToTracking(context),
        ),
        _buildActionItem(
          Icons.calendar_month_rounded,
          "History",
          AppColors.accentTeal,
          () => _navigateToAttendance(context),
        ),
        _buildActionItem(
          Icons.inventory_2_rounded,
          "Vault",
          AppColors.accentCream,
          () => _navigateToVault(context),
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

  void _navigateToTracking(BuildContext context) async {
    final api = context.read<ApiService>();
    final schoolId = await api.storage.read(key: 'school_id') ?? '';
    final vehicleId = await api.storage.read(key: 'vehicle_id') ?? '';
    if (schoolId.isNotEmpty && vehicleId.isNotEmpty) {
      context.go('/tracking/$schoolId/$vehicleId');
    }
  }

  void _navigateToAttendance(BuildContext context) async {
    final api = context.read<ApiService>();
    final schoolId = await api.storage.read(key: 'school_id') ?? '';
    final studentId = await api.storage.read(key: 'student_id') ?? '';
    if (schoolId.isNotEmpty && studentId.isNotEmpty) {
      context.go('/attendance/$schoolId/$studentId');
    }
  }

  void _navigateToVault(BuildContext context) async {
    final api = context.read<ApiService>();
    final schoolId = await api.storage.read(key: 'school_id') ?? '';
    final studentId = await api.storage.read(key: 'student_id') ?? '';
    if (schoolId.isNotEmpty && studentId.isNotEmpty) {
      context.go('/vault/$schoolId/$studentId');
    }
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
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
