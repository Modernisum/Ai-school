import 'package:flutter/material.dart';
import 'package:chatra/theme/app_theme.dart';

class HomeGreetingWidget extends StatelessWidget {
  final Map<String, dynamic>? profile;

  const HomeGreetingWidget({super.key, required this.profile});

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final String greeting;
    final String timeEmoji;

    if (hour >= 5 && hour < 12) {
      greeting = 'Good Morning';
      timeEmoji = '☀️';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good Afternoon';
      timeEmoji = '🌤️';
    } else {
      greeting = 'Good Evening';
      timeEmoji = '🌙️';
    }

    final studentName = profile?['name']?.toString() ?? 'Student';

    return Container(
      margin: const EdgeInsets.fromLTRB(0, 16, 0, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Text('$timeEmoji ', style: const TextStyle(fontSize: 32)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  greeting,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Welcome back, $studentName!',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
