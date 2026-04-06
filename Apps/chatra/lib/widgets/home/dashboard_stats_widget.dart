import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../widgets/glass_card.dart';
import '../../theme/app_theme.dart';

class DashboardStatsWidget extends StatelessWidget {
  final Map<String, dynamic>? dashboardData;

  const DashboardStatsWidget({super.key, required this.dashboardData});

  @override
  Widget build(BuildContext context) {
    if (dashboardData == null || dashboardData!.isEmpty) {
      return _buildEmptyStats();
    }

    final profile = dashboardData!['profile'] as Map<String, dynamic>? ?? {};
    final attendance =
        dashboardData!['attendance'] as Map<String, dynamic>? ?? {};
    final timetable =
        dashboardData!['timetable'] as Map<String, dynamic>? ?? {};

    return Column(
      children: [
        _buildWelcomeHeader(profile),
        const SizedBox(height: 20),
        _buildStatsGrid(attendance, timetable),
      ],
    );
  }

  Widget _buildEmptyStats() {
    return Column(
      children: [
        GlassCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Welcome!",
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                "Loading your dashboard...",
                style: GoogleFonts.outfit(color: Colors.white38, fontSize: 14),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        GlassCard(
          padding: const EdgeInsets.all(20),
          child: Center(
            child: CircularProgressIndicator(color: AppColors.accentTeal),
          ),
        ),
      ],
    );
  }

  Widget _buildWelcomeHeader(Map<String, dynamic> profile) {
    final name = profile['name']?.toString() ?? 'Student';
    final className = profile['className']?.toString() ?? 'Class';
    final rollNumber = profile['rollNumber']?.toString() ?? '--';

    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.person_rounded,
                  color: AppColors.accentTeal,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Hello, $name!",
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      "$className • Roll: $rollNumber",
                      style: GoogleFonts.outfit(
                        color: Colors.white38,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            "Here's your daily overview",
            style: GoogleFonts.outfit(color: Colors.white60, fontSize: 14),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 50.ms);
  }

  Widget _buildStatsGrid(
    Map<String, dynamic> attendance,
    Map<String, dynamic> timetable,
  ) {
    final attendancePercent = attendance['percentage']?.toString() ?? '0';
    final attendanceStatus = attendance['status']?.toString() ?? 'Unknown';
    final totalClasses = timetable['totalClasses']?.toString() ?? '0';
    final todayClasses = timetable['todayClasses']?.toString() ?? '0';

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 1.4,
      children: [
        _buildStatCard(
          "Attendance",
          "$attendancePercent%",
          attendanceStatus,
          Icons.check_circle_outline_rounded,
          AppColors.accentTeal,
        ),
        _buildStatCard(
          "Today's Classes",
          todayClasses,
          "of $totalClasses total",
          Icons.calendar_today_rounded,
          AppColors.accentSage,
        ),
        _buildStatCard(
          "Pending Fees",
          "₹2,500",
          "Due tomorrow",
          Icons.payment_rounded,
          AppColors.accentCream,
        ),
        _buildStatCard(
          "Notifications",
          "3",
          "Unread",
          Icons.notifications_active_rounded,
          AppColors.accentTeal,
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    String subtitle,
    IconData icon,
    Color color,
  ) {
    return GlassCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 18),
                ),
                const Spacer(),
                Text(
                  title,
                  style: GoogleFonts.outfit(
                    color: Colors.white38,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
                letterSpacing: -1,
              ),
            ),
            Text(
              subtitle,
              style: GoogleFonts.outfit(color: Colors.white38, fontSize: 11),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 150.ms);
  }
}
