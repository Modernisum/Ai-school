import 'package:flutter/material.dart';

class TeacherContactCard extends StatelessWidget {
  final dynamic teacher;
  final String responsibilityName;

  const TeacherContactCard({
    super.key,
    required this.teacher,
    required this.responsibilityName,
  });

  @override
  Widget build(BuildContext context) {
    final teacherName = teacher['name'] ?? 'Unknown Teacher';
    final teacherPhone = teacher['phone'] ?? '';
    final teacherEmail = teacher['email'] ?? '';
    final subject = teacher['subject'] ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 1,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFB298E7).withOpacity(0.2),
          child: Text(
            teacherName.isNotEmpty ? teacherName[0].toUpperCase() : '?',
            style: const TextStyle(
              color: Color(0xFFB298E7),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          teacherName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (subject.isNotEmpty)
              Text(
                subject,
                style: const TextStyle(fontSize: 12),
              ),
            if (teacherPhone.isNotEmpty)
              Row(
                children: [
                  const Icon(Icons.phone, size: 14, color: Color(0xFFB298E7)),
                  const SizedBox(width: 4),
                  Text(
                    teacherPhone,
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (teacherPhone.isNotEmpty)
              IconButton(
                icon: const Icon(Icons.call, color: Color(0xFFB298E7)),
                onPressed: () {
                  // Call functionality
                },
                tooltip: 'Call',
              ),
            if (teacherEmail.isNotEmpty)
              IconButton(
                icon: const Icon(Icons.email, color: Color(0xFFB298E7)),
                onPressed: () {
                  // Email functionality
                },
                tooltip: 'Email',
              ),
          ],
        ),
      ),
    );
  }
}
