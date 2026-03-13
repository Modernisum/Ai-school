import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class LeaveManagementScreen extends StatefulWidget {
  const LeaveManagementScreen({super.key});

  @override
  State<LeaveManagementScreen> createState() => _LeaveManagementScreenState();
}

class _LeaveManagementScreenState extends State<LeaveManagementScreen> {
  String _selectedLeaveType = 'Casual Leave';
  final TextEditingController _reasonController = TextEditingController();
  DateTimeRange? _selectedDateRange;

  Future<void> _fetchProxySuggestions(String leaveId) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator(color: Colors.white)),
    );

    try {
      // In a real app, we'd fetch from: GET /api/dashboard/:schoolId/leaves/proxy-suggestions?leaveId=$leaveId
      await Future.delayed(const Duration(seconds: 1)); // Simulate API call
      Navigator.pop(context); // Close loader

      // Mock data based on backend generator
      final suggestions = [
        {"name": "Vikram Singh", "relevance": "Mathematics Expert", "reason": "Free during Periods 2, 4, 5. High subject alignment."},
        {"name": "Anjali Mehta", "relevance": "General Science", "reason": "No classes today. Available for full-day cover."},
      ];

      _showProxyModal(suggestions);
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Failed to fetch suggestions")));
    }
  }

  void _showProxyModal(List<Map<String, String>> suggestions) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => GlassCard(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.auto_awesome, color: Color(0xFFF5B8D5)),
                SizedBox(width: 8),
                Text("AI Proxy Suggestions", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
              ],
            ),
            const SizedBox(height: 16),
            ...suggestions.map((s) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text(s['name']!, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.indigoAccent)),
                   Text(s['relevance']!, style: const TextStyle(fontSize: 10, color: Colors.white54)),
                   const SizedBox(height: 6),
                   Text(s['reason']!, style: const TextStyle(fontSize: 12, color: Colors.white70)),
                ],
              ),
            )).toList(),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white10, minimumSize: const Size.fromHeight(48)),
              child: const Text("CLOSE", style: TextStyle(color: Colors.white70)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openPdf(String leaveId) async {
    // In a real app, this would be: GET /api/leave/:schoolId/:leaveId/pdf
    // For demonstration, we use a placeholder PDF URL from a known source
    const schoolId = "demo_school";
    final url = Uri.parse('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf?school_id=$schoolId&leave_id=$leaveId');
    
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open PDF viewer. Please ensure a PDF reader is installed.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Leave Management'),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    "Apply for Leave",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 20),
                  
                  // Leave Type Dropdown
                  DropdownButtonFormField<String>(
                    value: _selectedLeaveType,
                    style: const TextStyle(color: Colors.white),
                    dropdownColor: const Color(0xFFB298E7),
                    decoration: const InputDecoration(
                      labelText: "Leave Type",
                      prefixIcon: Icon(Icons.category, color: Colors.white70),
                    ),
                    items: ['Casual Leave', 'Sick Leave', 'Duty Leave', 'Paternity/Maternity'].map((String value) {
                      return DropdownMenuItem<String>(
                        value: value,
                        child: Text(value),
                      );
                    }).toList(),
                    onChanged: (newValue) {
                      setState(() {
                        _selectedLeaveType = newValue!;
                      });
                    },
                  ),
                  const SizedBox(height: 16),

                  TextField(
                    controller: _reasonController,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: "Reason for leave...",
                      prefixIcon: Icon(Icons.edit_note, color: Colors.white70),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),

                  // Date Range Picker
                  InkWell(
                    onTap: () async {
                      final picked = await showDateRangePicker(
                        context: context,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() {
                          _selectedDateRange = picked;
                        });
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white24),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.date_range, color: Colors.white70),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _selectedDateRange == null
                                  ? "Select Date Range"
                                  : "${_selectedDateRange!.start.toString().split(' ')[0]} - ${_selectedDateRange!.end.toString().split(' ')[0]}",
                              style: const TextStyle(color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  ElevatedButton.icon(
                    onPressed: () {
                      if (_selectedDateRange == null || _reasonController.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please fill all details and select dates.')),
                        );
                        return;
                      }
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Leave Request Submitted Successfully'), backgroundColor: Colors.green),
                      );
                    },
                    icon: const Icon(Icons.send),
                    label: const Text("SUBMIT APPLICATION", style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      minimumSize: const Size.fromHeight(50),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            const Padding(
              padding: EdgeInsets.only(left: 8.0, bottom: 16.0),
              child: Text("Previous Leaves", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            
            // Success Leave Item with PDF
            _buildLeaveItem(
              title: "Sick Leave - Approved",
              date: "Oct 10, 2026 - Oct 12, 2026",
              status: "Approved",
              icon: Icons.check_circle,
              iconColor: Colors.green,
              hasPdf: true,
              leaveId: "LV-1001",
            ),
            const SizedBox(height: 12),
            
            // Pending Leave Item
            _buildLeaveItem(
              title: "Personal Leave - Pending",
              date: "Dec 01, 2026 - Dec 05, 2026",
              status: "Pending",
              icon: Icons.pending,
              iconColor: Colors.orange,
              hasPdf: false,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaveItem({
    required String title,
    required String date,
    required String status,
    required IconData icon,
    required Color iconColor,
    bool hasPdf = false,
    String? leaveId,
  }) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: iconColor.withOpacity(0.2),
          child: Icon(icon, color: iconColor),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(date, style: const TextStyle(fontSize: 12)),
        trailing: Wrap(
          spacing: 8,
          children: [
            if (status == "Pending")
              IconButton(
                icon: const Icon(Icons.auto_awesome, color: Color(0xFFF5B8D5), size: 20),
                onPressed: () => _fetchProxySuggestions(leaveId ?? ""),
                tooltip: "AI Suggestions",
              ),
            if (hasPdf)
              IconButton(
                icon: const Icon(Icons.picture_as_pdf, color: Colors.redAccent, size: 20),
                onPressed: () => _openPdf(leaveId ?? ""),
              )
            else
              const Padding(
                padding: EdgeInsets.only(top: 8.0),
                child: Icon(Icons.hourglass_empty, size: 20, color: Colors.white24),
              ),
          ],
        ),
      ),
    );
  }
}
