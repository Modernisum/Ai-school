import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class TeacherApprovalScreen extends StatefulWidget {
  const TeacherApprovalScreen({super.key});

  @override
  State<TeacherApprovalScreen> createState() => _TeacherApprovalScreenState();
}

class _TeacherApprovalScreenState extends State<TeacherApprovalScreen> {
  List<Map<String, dynamic>> _exams = [];
  List<dynamic> _submissions = [];
  String? _selectedExamId;
  String? _selectedExamName;
  bool _loadingExams = true;
  bool _loadingSubs = false;
  int? _approvingIdx;
  int? _rejectingIdx;

  @override
  void initState() {
    super.initState();
    _loadExams();
  }

  Future<void> _loadExams() async {
    setState(() => _loadingExams = true);
    final api = context.read<ApiService>();
    final res = await api.getAllExams();
    if (mounted) {
      final list = (res ?? [])
          .map((e) => e as Map<String, dynamic>)
          .toList();
      setState(() { _exams = list; _loadingExams = false; });
    }
  }

  Future<void> _selectExam(String examId, String examName) async {
    setState(() { _selectedExamId = examId; _selectedExamName = examName; _loadingSubs = true; });
    final api = context.read<ApiService>();
    final res = await api.getExamSubmissionsForChecker(examId);
    if (mounted) setState(() { _submissions = res ?? []; _loadingSubs = false; });
  }

  Future<void> _approve(int idx, String submissionId) async {
    setState(() => _approvingIdx = idx);
    final api = context.read<ApiService>();
    final res = await api.submitTeacherApproval(_selectedExamId!, submissionId, {});
    if (mounted) {
      setState(() => _approvingIdx = null);
      if (res?['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Submission approved"), backgroundColor: Colors.green));
        _selectExam(_selectedExamId!, _selectedExamName!);
      }
    }
  }

  Future<void> _reject(int idx, String submissionId) async {
    setState(() => _rejectingIdx = idx);
    final api = context.read<ApiService>();
    final res = await api.submitTeacherRejection(_selectedExamId!, submissionId, {});
    if (mounted) {
      setState(() => _rejectingIdx = null);
      if (res?['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Submission rejected"), backgroundColor: Colors.redAccent));
        _selectExam(_selectedExamId!, _selectedExamName!);
      }
    }
  }

  Future<void> _publish() async {
    final api = context.read<ApiService>();
    final res = await api.publishExamResults(_selectedExamId!);
    if (mounted && res?['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Results published — students notified"), backgroundColor: Colors.green));
      _loadExams();
      setState(() { _selectedExamId = null; _selectedExamName = null; _submissions = []; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(_selectedExamName ?? "Exam Approval"),
          leading: _selectedExamId != null
              ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() { _selectedExamId = null; _selectedExamName = null; _submissions = []; }))
              : null,
          actions: [
            if (_selectedExamId != null)
              IconButton(icon: const Icon(Icons.publish, color: Colors.greenAccent), onPressed: _publish, tooltip: "Publish Results"),
            IconButton(icon: const Icon(Icons.refresh), onPressed: _selectedExamId != null ? () => _selectExam(_selectedExamId!, _selectedExamName!) : _loadExams),
          ],
        ),
        body: _selectedExamId == null ? _buildExamList() : _buildSubmissionList(),
      ),
    );
  }

  Widget _buildExamList() {
    if (_loadingExams) return const Center(child: CircularProgressIndicator(color: Colors.white));
    if (_exams.isEmpty) return const Center(child: Text("No exams need your approval", style: TextStyle(color: Colors.white54)));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _exams.length,
      itemBuilder: (_, i) {
        final e = _exams[i];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            margin: EdgeInsets.zero,
            padding: const EdgeInsets.all(16),
            child: InkWell(
              onTap: () => _selectExam(e['id'].toString(), e['name'] ?? 'Exam'),
              borderRadius: BorderRadius.circular(16),
              child: Row(
                children: [
                  const Icon(Icons.rate_review, color: Colors.indigoAccent, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(e['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        Text("Status: ${e['status'] ?? 'PENDING'}", style: const TextStyle(fontSize: 12, color: Colors.white54)),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.white38),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSubmissionList() {
    if (_loadingSubs) return const Center(child: CircularProgressIndicator(color: Colors.white));
    if (_submissions.isEmpty) return const Center(child: Text("No submissions for this exam", style: TextStyle(color: Colors.white54)));

    final pending = _submissions.where((s) => s['status'] == 'checker_reviewed').toList();
    final approved = _submissions.where((s) => s['status'] == 'teacher_approved').length;
    final rejected = _submissions.where((s) => s['status'] == 'teacher_rejected').length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Row(
            children: [
              Text("${pending.length} pending  ", style: const TextStyle(color: Colors.amber, fontSize: 12)),
              Text("$approved approved  ", style: const TextStyle(color: Colors.greenAccent, fontSize: 12)),
              Text("$rejected rejected", style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _submissions.length,
            itemBuilder: (_, i) {
              final s = _submissions[i] as Map<String, dynamic>;
              return _buildSubmissionCard(i, s);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSubmissionCard(int idx, Map<String, dynamic> s) {
    final status = s['status'] ?? '';
    final score = s['overallScore']?.toString() ?? '—';
    final grade = s['grade'] ?? '—';
    final isPending = status == 'checker_reviewed';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GlassCard(
        margin: EdgeInsets.zero,
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.person, size: 16, color: Colors.white54),
                const SizedBox(width: 6),
                Text(s['studentId'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isPending ? Colors.amber.withOpacity(0.2) : status == 'teacher_approved' ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(status.replaceAll('_', ' ').toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: isPending ? Colors.amber : status == 'teacher_approved' ? Colors.greenAccent : Colors.redAccent)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildInfoChip("Score", score, Colors.indigoAccent),
                const SizedBox(width: 16),
                _buildInfoChip("Grade", grade, Colors.white),
              ],
            ),
            if (s['feedback'] != null && (s['feedback'] as String).isNotEmpty) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(8)),
                child: Text(s['feedback'], style: const TextStyle(fontSize: 11, color: Colors.white54)),
              ),
            ],
            if (isPending) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildActionButton("APPROVE", Icons.check_circle, Colors.green, idx == _approvingIdx, () => _approve(idx, s['submissionId'])),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionButton("REJECT", Icons.cancel, Colors.redAccent, idx == _rejectingIdx, () => _reject(idx, s['submissionId'])),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoChip(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: Colors.white38)),
        Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  Widget _buildActionButton(String label, IconData icon, Color color, bool loading, VoidCallback onTap) {
    return SizedBox(
      height: 40,
      child: ElevatedButton.icon(
        onPressed: loading ? null : onTap,
        icon: loading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Icon(icon, size: 16),
        label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
        style: ElevatedButton.styleFrom(
          backgroundColor: color.withOpacity(0.15),
          foregroundColor: color,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );
  }
}
