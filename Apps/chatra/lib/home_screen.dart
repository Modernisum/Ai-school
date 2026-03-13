import 'package:flutter/material.dart';
import 'fees_screen.dart';

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Student Dashboard"),
        backgroundColor: Colors.blue[800],
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              // TODO: Implement logout call if needed
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          children: [
            _buildDashboardItem(context, Icons.account_balance_wallet, "Fees & Payments", Colors.teal, () {
              Navigator.push(context, MaterialPageRoute(builder: (context) => const FeesScreen()));
            }),
            _buildDashboardItem(context, Icons.calendar_today, "Attendance", Colors.orange, () {}),
            _buildDashboardItem(context, Icons.assignment, "Exams", Colors.blue, () {}),
            _buildDashboardItem(context, Icons.library_books, "Materials", Colors.purple, () {}),
            _buildDashboardItem(context, Icons.notifications, "Notifications", Colors.red, () {}),
            _buildDashboardItem(context, Icons.person, "Profile", Colors.green, () {}),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboardItem(BuildContext context, IconData icon, String label, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: color),
            const SizedBox(height: 12),
            Text(label, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
