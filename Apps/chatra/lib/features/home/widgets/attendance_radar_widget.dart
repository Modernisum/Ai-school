import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/theme/app_theme.dart';

/// Displays a radial attendance overview card.
class AttendanceRadarWidget extends StatelessWidget {
  final Map<String, dynamic> attendance;

  const AttendanceRadarWidget({super.key, required this.attendance});

  @override
  Widget build(BuildContext context) {
    final data = attendance['data'] as List? ?? [];
    int present = 0;
    for (var r in data) {
      if (r['status']?.toString().toLowerCase() == 'present') present++;
    }
    final double pct = data.isEmpty ? 0 : (present / data.length) * 100;

    return GlassCard(
      height: 180,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Attendance',
            style: GoogleFonts.outfit(
              color: Colors.white70,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 80,
                  height: 80,
                  child: CircularProgressIndicator(
                    value: data.isEmpty ? 0 : present / data.length,
                    strokeWidth: 8,
                    backgroundColor: Colors.white10,
                    color: AppColors.accentTeal,
                  ),
                ),
                Text(
                  '${pct.toStringAsFixed(0)}%',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          Center(
            child: Text(
              '${data.length} total days',
              style: GoogleFonts.outfit(color: Colors.white38, fontSize: 12),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms);
  }
}
