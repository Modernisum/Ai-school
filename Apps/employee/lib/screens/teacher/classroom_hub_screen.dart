import 'package:flutter/material.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';
import 'smart_scanner_screen.dart';

class ClassroomHubScreen extends StatelessWidget {
  final String className;
  final String role;

  const ClassroomHubScreen({
    super.key,
    required this.className,
    required this.role,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(className),
          actions: [
            IconButton(
              icon: const Icon(Icons.search, color: Colors.white70),
              onPressed: () => _showSpotlightSearch(context),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: role == "Class Teacher" ? Colors.amber.withOpacity(0.2) : Colors.indigoAccent.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: role == "Class Teacher" ? Colors.amber : Colors.indigoAccent),
                  ),
                  child: Text(
                    role.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: role == "Class Teacher" ? Colors.amber : Colors.indigoAccent,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _buildStatBanner(context),
            const SizedBox(height: 24),
            const Row(
              children: [
                Icon(Icons.radar, color: Colors.redAccent, size: 20),
                SizedBox(width: 8),
                Text("PREDICTIVE RISK RADAR", style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              ],
            ),
            const SizedBox(height: 12),
            _buildRiskRadar(context),
            const SizedBox(height: 24),
            const Text("SMART SYLLABUS TRACKER", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 12),
            _buildSyllabusTracker(context),
            const SizedBox(height: 24),
            const Text("INTERACTION & DISCIPLINE", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 12),
            _buildInteractionTools(context),
            const SizedBox(height: 24),
            const Text("ACADEMIC POWER TOOLS", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 12),
            _buildAcademicTools(context),
            const SizedBox(height: 24),
            const Text("STUDENT ROSTER", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 12),
            _buildStudentQuickList(context),
          ],
        ),
      ),
    );
  }

  Widget _buildRiskRadar(BuildContext context) {
    return GlassCard(
      color: Colors.redAccent.withOpacity(0.05),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("3 Students at high risk of failure", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
              Icon(Icons.warning_amber, color: Colors.orange, size: 20),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildRiskAvatar(context, "stu_1", "SS", 82, "Missed last 3 math tests and attendance is 65%."),
              const SizedBox(width: 12),
              _buildRiskAvatar(context, "stu_2", "PK", 74, "Low scores in Physics (Internal assessment: 35%)."),
              const SizedBox(width: 12),
              _buildRiskAvatar(context, "stu_3", "RV", 68, "Frequent absenteeism during lab hours."),
              const Spacer(),
              TextButton(
                onPressed: () {},
                child: const Text("VIEW ALL", style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRiskAvatar(BuildContext context, String id, String initials, int score, String reason) {
    return GestureDetector(
      onTap: () => _showRiskDiagnosis(context, initials, score, reason),
      child: Column(
        children: [
          Stack(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: score > 80 ? Colors.red.withOpacity(0.3) : Colors.orange.withOpacity(0.3),
                child: Text(initials, style: const TextStyle(fontSize: 10, color: Colors.white)),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                  child: Text("$score", style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.black)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showRiskDiagnosis(BuildContext context, String initials, int score, String reason) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => GlassCard(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(backgroundColor: Colors.redAccent.withOpacity(0.2), child: Text(initials)),
                const SizedBox(width: 16),
                const Text("AI Risk Diagnosis", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 20),
            Text("Risk Score: $score/100", style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Text("Reason: $reason", style: const TextStyle(color: Colors.white70)),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent),
                    onPressed: () {},
                    child: const Text("Notifiy Parents"),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text("Plan Remedial"),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSyllabusTracker(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Physics - Class 10A", style: TextStyle(fontWeight: FontWeight.bold)),
              Text("65% Overall", style: TextStyle(color: Colors.greenAccent, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: 0.65, backgroundColor: Colors.white10, color: Colors.greenAccent, borderRadius: BorderRadius.circular(4)),
          const SizedBox(height: 16),
          _buildTopicItem("Ch-5: Optics", "Light & Reflection", true),
          _buildTopicItem("Ch-5: Optics", "Refraction & Lenses", false),
          _buildTopicItem("Ch-6: Electricity", "Electric Current", false),
        ],
      ),
    );
  }

  Widget _buildTopicItem(String chapter, String topic, bool isCompleted) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          Icon(isCompleted ? Icons.check_circle : Icons.circle_outlined, color: isCompleted ? Colors.greenAccent : Colors.white30, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(topic, style: TextStyle(fontSize: 14, decoration: isCompleted ? TextDecoration.lineThrough : null, color: isCompleted ? Colors.white38 : Colors.white)),
                Text(chapter, style: const TextStyle(fontSize: 10, color: Colors.white38)),
              ],
            ),
          ),
          if (!isCompleted)
             const Icon(Icons.swipe, size: 14, color: Colors.white24),
        ],
      ),
    );
  }

  Widget _buildStatBanner(BuildContext context) {
    return GlassCard(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem("Students", "42", Icons.people),
          _buildStatItem("Avg. Attendance", "94%", Icons.how_to_reg),
          _buildStatItem("Tasks Due", "08", Icons.pending_actions),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 20),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.white60)),
      ],
    );
  }

  Widget _buildInteractionTools(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildHubAction(
                context,
                Icons.chat_bubble_outline,
                "Class Chat",
                "Real-time Feed",
                Colors.blueAccent,
                onTap: () {},
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildHubAction(
                context,
                Icons.report_gmailerrorred,
                "Discipline",
                "Instant Complain",
                Colors.redAccent,
                onTap: () {
                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Filing student complaint to Principle...')));
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _buildHubAction(
          context,
          Icons.videocam,
          "GO LIVE",
          "Broadcast to students via WebSocket",
          Colors.redAccent,
          isWide: true,
          onTap: () {
             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Broadcasting STREAM_START signal to students...')));
          },
        ),
        const SizedBox(height: 12),
        _buildHubAction(
          context,
          Icons.folder_shared,
          "Document Vault",
          "Upload student records directly to GCS",
          Colors.orangeAccent,
          isWide: true,
          onTap: () {
             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Opening Document Box...')));
          },
        ),
      ],
    );
  }

  Widget _buildAcademicTools(BuildContext context) {
    return Column(
      children: [
        _buildHubAction(
          context,
          Icons.camera_enhance,
          "Smart Camera Auto-Grader",
          "Check handwriting & grade via AI OCR",
          const Color(0xFFF5B8D5),
          isWide: true,
          onTap: () {
            Navigator.push(context, MaterialPageRoute(builder: (context) => const SmartScannerScreen()));
          },
        ),
        const SizedBox(height: 12),
        _buildHubAction(
          context,
          Icons.psychology,
          "AI Exam Generator",
          "Create papers using backend AI",
          Colors.purpleAccent,
          isWide: true,
          onTap: () {},
        ),
        const SizedBox(height: 12),
        _buildHubAction(
          context,
          Icons.assignment_turned_in,
          "Homework Tracker",
          "0-100% progress tracking",
          Colors.tealAccent,
          isWide: true,
          onTap: () {},
        ),
      ],
    );
  }

  Widget _buildHubAction(BuildContext context, IconData icon, String title, String subtitle, Color color, {bool isWide = false, VoidCallback? onTap}) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(subtitle, style: const TextStyle(fontSize: 11, color: Colors.black54)),
                  ],
                ),
              ),
              if (isWide) const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.white70),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStudentQuickList(BuildContext context) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: 3,
        separatorBuilder: (_, __) => const Divider(height: 1, color: Colors.white10),
        itemBuilder: (context, index) {
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.white24,
              child: Text("${index + 1}", style: const TextStyle(color: Colors.white70)),
            ),
            title: Text("Student $index", style: const TextStyle(fontWeight: FontWeight.w500)),
            subtitle: const Text("Roll: 1024", style: TextStyle(fontSize: 11)),
            trailing: const Icon(Icons.info_outline, size: 20),
            onTap: () {},
          );
        },
      ),
    );
  void _showSpotlightSearch(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(16),
          child: GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  autofocus: true,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: "Search students, employees, or schools...",
                    hintStyle: const TextStyle(color: Colors.white38),
                    prefixIcon: const Icon(Icons.search, color: Colors.indigoAccent),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.05),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                  onChanged: (val) {
                     // In a real app, call /api/search/global?q=$val
                  },
                ),
                const SizedBox(height: 16),
                const Text("RECENT SEARCHES", style: TextStyle(color: Colors.white24, fontSize: 10, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                _buildSearchItem("Aarav Sharma", "Student • Roll 104", Icons.person),
                _buildSearchItem("Physics Lab", "Space • Floor 2", Icons.room),
                _buildSearchItem("Staff Meeting", "Announcement", Icons.campaign),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text("CLOSE", style: TextStyle(color: Colors.indigoAccent)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSearchItem(String title, String subtitle, IconData icon) {
    return ListTile(
      leading: Icon(icon, color: Colors.white30, size: 18),
      title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 14)),
      subtitle: Text(subtitle, style: const TextStyle(color: Colors.white38, fontSize: 10)),
      dense: true,
      onTap: () {},
    );
  }
}
