import 'package:flutter/material.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/theme/app_theme.dart';

class TimetableWidget extends StatelessWidget {
  final Map<String, dynamic>? timetable;

  const TimetableWidget({super.key, required this.timetable});

  @override
  Widget build(BuildContext context) {
    if (timetable == null || timetable!.isEmpty) {
      return _buildEmptyTimetable();
    }

    return _buildTimetableContent();
  }

  Widget _buildEmptyTimetable() {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.calendar_today_rounded,
                  color: AppColors.accentTeal,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                "Timetable",
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            "No timetable available for today.",
            style: TextStyle(color: Colors.white38, fontSize: 14),
          ),
          const SizedBox(height: 8),
          const Text(
            "Check back later or contact your school.",
            style: TextStyle(color: Colors.white24, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildTimetableContent() {
    List<Map<String, dynamic>> classes = [];
    final data = timetable!['data'];

    if (data is List) {
      classes = data.map((e) => e as Map<String, dynamic>).toList();
    } else if (data is Map<String, dynamic>) {
      if (data['classes'] is List) {
        classes = (data['classes'] as List).map((e) => e as Map<String, dynamic>).toList();
      } else if (data['slots'] is List) {
        classes = (data['slots'] as List).map((e) => e as Map<String, dynamic>).toList();
      } else if (data['timetable'] is List) {
        classes = (data['timetable'] as List).map((e) => e as Map<String, dynamic>).toList();
      }
    }

    if (classes.isEmpty) {
      return _buildEmptyTimetable();
    }

    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.calendar_today_rounded,
                  color: AppColors.accentTeal,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                "Today's Classes",
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              Text(
                "${classes.length} classes",
                style: const TextStyle(color: Colors.white38, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...classes.take(3).map((cls) => _buildClassItem(cls)).toList(),
          if (classes.length > 3)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                "+ ${classes.length - 3} more classes",
                style: const TextStyle(color: Colors.white38, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildClassItem(Map<String, dynamic> cls) {
    final subject = cls['subject']?.toString() ?? 'Unknown';
    final time = cls['time']?.toString() ?? '--:--';
    final teacher = cls['teacher']?.toString() ?? 'Staff';
    final room = cls['room']?.toString() ?? '--';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.accentTeal,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject,
                  style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500),
                ),
                Text(
                  "$time • Room $room",
                  style: const TextStyle(color: Colors.white38, fontSize: 12),
                ),
              ],
            ),
          ),
          Text(
            teacher,
            style: const TextStyle(color: Colors.white38, fontSize: 11),
          ),
        ],
      ),
    );
  }
}
