import 'package:flutter/material.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class LeaveApprovalsScreen extends StatefulWidget {
  const LeaveApprovalsScreen({super.key});

  @override
  State<LeaveApprovalsScreen> createState() => _LeaveApprovalsScreenState();
}

class _LeaveApprovalsScreenState extends State<LeaveApprovalsScreen> {
  // Mock data for leave approvals
  final List<Map<String, dynamic>> pendingLeaves = [
    {
      "id": "leave_01",
      "name": "Amit Sharma (Teacher)",
      "type": "Casual Leave",
      "dates": "Oct 15 - Oct 16",
      "reason": "Family function out of station",
      "status": "pending",
    },
    {
      "id": "leave_02",
      "name": "Raju (Driver)",
      "type": "Sick Leave",
      "dates": "Oct 12",
      "reason": "Not feeling well",
      "status": "pending",
    }
  ];

  void _updateStatus(int index, String status) {
    setState(() {
      pendingLeaves[index]['status'] = status;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content: Text('Leave \$status successfully'),
          backgroundColor: status == 'approved' ? Colors.green : Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Leave Approvals'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: pendingLeaves.length,
          itemBuilder: (context, index) {
            final leave = pendingLeaves[index];
            if (leave['status'] != 'pending') return const SizedBox.shrink();

            return GlassCard(
              margin: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                          child: Text(leave['name'],
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 18))),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.orangeAccent.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.orangeAccent),
                        ),
                        child: Text(leave['type'],
                            style: const TextStyle(
                                color: Colors.orangeAccent,
                                fontWeight: FontWeight.bold,
                                fontSize: 12)),
                      )
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.date_range,
                          size: 16, color: Colors.white70),
                      const SizedBox(width: 8),
                      Text(leave['dates'],
                          style: const TextStyle(color: Colors.white70)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text("Reason:",
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: Colors.white54)),
                  Text(leave['reason'], style: const TextStyle(fontSize: 14)),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _updateStatus(index, 'rejected'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.redAccent,
                            side: const BorderSide(color: Colors.redAccent),
                          ),
                          child: const Text('Reject'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => _updateStatus(index, 'approved'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                          ),
                          child: const Text('Approve'),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
