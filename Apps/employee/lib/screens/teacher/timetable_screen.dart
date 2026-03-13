import 'package:flutter/material.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class TimetableScreen extends StatelessWidget {
  const TimetableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Today's Date
    final today = DateTime.now();
    
    // Mock Timetable Data from GET /api/school/:schoolId/timetable
    final List<Map<String, dynamic>> todayRoutine = [
      {"time": "08:00 AM", "subject": "Mathematics", "class": "10-A", "room": "Room 101", "isCompleted": true},
      {"time": "09:00 AM", "subject": "Physics", "class": "11-B", "room": "Lab 2", "isCompleted": true},
      {"time": "10:00 AM", "subject": "Free Period", "class": "-", "room": "Staff Room", "isCompleted": false},
      {"time": "11:00 AM", "subject": "Mathematics", "class": "10-B", "room": "Room 102", "isCompleted": false},
      {"time": "12:00 PM", "subject": "Lunch Break", "class": "-", "room": "Cafeteria", "isCompleted": false},
      {"time": "01:00 PM", "subject": "Chemistry", "class": "12-C", "room": "Lab 1", "isCompleted": false},
    ];

    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text("Today's Routine"),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(left: 8, bottom: 20),
                child: Text(
                  "Vertical Timeline View",
                  style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500),
                ),
              ),
              ...todayRoutine.asMap().entries.map((entry) {
                int index = entry.key;
                var period = entry.value;
                bool isLast = index == todayRoutine.length - 1;
                bool isCurrent = !_isTimePassed(period['time']) && (index == 0 || _isTimePassed(todayRoutine[index-1]['time']));

                return IntrinsicHeight(
                  child: Row(
                    children: [
                      // Timeline Path
                      Column(
                        children: [
                          Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              color: period['isCompleted'] ? Colors.green : (isCurrent ? Colors.amber : Colors.white24),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: isCurrent ? [const BoxShadow(color: Colors.amber, blurRadius: 10)] : [],
                            ),
                          ),
                          if (!isLast)
                            Expanded(
                              child: Container(
                                width: 2,
                                color: Colors.white24,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(width: 20),
                      // Content Card
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 24),
                          child: GestureDetector(
                            onTap: () {
                               // Detail view of the period
                            },
                            child: GlassCard(
                              padding: const EdgeInsets.all(16),
                              borderColor: isCurrent ? Colors.amber.withOpacity(0.4) : Colors.white10,
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              period['time'],
                                              style: TextStyle(
                                                color: isCurrent ? Colors.amber : Colors.white70,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                            ),
                                            if (isCurrent) ...[
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.amber.withOpacity(0.2),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Text("ONGOING", style: TextStyle(color: Colors.amber, fontSize: 8, fontWeight: FontWeight.bold)),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          period['subject'],
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          period['class'] == '-' ? "Rest / Break" : "Class: ${period['class']} • ${period['room']}",
                                          style: TextStyle(color: Colors.black.withOpacity(0.6), fontSize: 13),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (period['isCompleted'])
                                    const Icon(Icons.check_circle, color: Colors.green),
                                  if (period['subject'] == 'Free Period')
                                     const Icon(Icons.self_improvement, color: Colors.indigoAccent),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  bool _isTimePassed(String timeStr) {
    // Simple mock logic for demonstration. In production, this parses DateTime.
    // Let's assume everything before 10:00 AM is passed for the sake of presentation.
    if (timeStr.contains("08:00") || timeStr.contains("09:00")) return true;
    return false;
  }
}

