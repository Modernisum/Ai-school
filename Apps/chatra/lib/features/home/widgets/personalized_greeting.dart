// personalized_greeting.dart - Personalized greeting widget
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';

class PersonalizedGreeting extends StatelessWidget {
  final Map<String, dynamic>? profile;

  const PersonalizedGreeting({super.key, this.profile});

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    String greeting;
    String timeOfDay;

    if (hour >= 5 && hour < 12) {
      greeting = 'Good Morning';
      timeOfDay = '☀️';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good Afternoon';
      timeOfDay = '🌤️';
    } else {
      greeting = 'Good Evening';
      timeOfDay = '🌙️';
    }

    final studentName = profile?['name']?.toString() ?? 'Student';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 125, 16, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Text('$timeOfDay ', style: const TextStyle(fontSize: 32)),
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
    ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.3, end: 0);
  }
}
