import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';
import 'smart_scanner_screen.dart';

class CheckerExamListScreen extends StatefulWidget {
  const CheckerExamListScreen({super.key});

  @override
  State<CheckerExamListScreen> createState() => _CheckerExamListScreenState();
}

class _CheckerExamListScreenState extends State<CheckerExamListScreen> {
  List<dynamic> _exams = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadExams();
  }

  Future<void> _loadExams() async {
    setState(() => _loading = true);
    final api = context.read<ApiService>();
    final exams = await api.getCheckerPendingExams();
    if (mounted) setState(() { _exams = exams ?? []; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text("Exam Checker")),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: Colors.white))
            : _exams.isEmpty
                ? const Center(child: Text("No pending exams for checking", style: TextStyle(color: Colors.white54)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _exams.length,
                    itemBuilder: (context, i) {
                      final exam = _exams[i];
                      return _ExamCard(
                        exam: exam,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => SmartScannerScreen(
                              examId: exam['id'].toString(),
                              examName: exam['name'] ?? 'Exam',
                              strictnessLevel: exam['strictnessLevel'] ?? 'medium',
                            ),
                          ),
                        ),
                      );
                    },
                  ),
        floatingActionButton: FloatingActionButton(
          onPressed: _loadExams,
          child: const Icon(Icons.refresh),
        ),
      ),
    );
  }
}

class _ExamCard extends StatelessWidget {
  final Map<String, dynamic> exam;
  final VoidCallback onTap;

  const _ExamCard({required this.exam, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        margin: EdgeInsets.zero,
        padding: const EdgeInsets.all(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.assignment, color: Colors.indigoAccent, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(exam['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(exam['strictnessLevel'] ?? 'medium',
                        style: const TextStyle(fontSize: 10, color: Colors.amber, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  if (exam['subjectId'] != null) ...[
                    const Icon(Icons.book, size: 14, color: Colors.white38),
                    const SizedBox(width: 4),
                    Text(exam['subjectId'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.white54)),
                    const SizedBox(width: 16),
                  ],
                  if (exam['classId'] != null) ...[
                    const Icon(Icons.group, size: 14, color: Colors.white38),
                    const SizedBox(width: 4),
                    Text('Class ${exam['classId']}', style: const TextStyle(fontSize: 12, color: Colors.white54)),
                  ],
                ],
              ),
              if (exam['quarter'] != null) ...[
                const SizedBox(height: 4),
                Text('Quarter: ${exam['quarter']}  |  Status: ${exam['status']}',
                    style: const TextStyle(fontSize: 11, color: Colors.white38)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
