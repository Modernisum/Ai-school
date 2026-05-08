import 'package:flutter/material.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/theme/app_theme.dart';

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
          const Text(
            'Attendance',
            style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold),
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
                  style: const TextStyle(
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
              style: const TextStyle(color: Colors.white38, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
