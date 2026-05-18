import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';
import 'daily_report_screen.dart';

class PeriodPlanScreen extends StatefulWidget {
  const PeriodPlanScreen({super.key});

  @override
  State<PeriodPlanScreen> createState() => _PeriodPlanScreenState();
}

class _PeriodPlanScreenState extends State<PeriodPlanScreen> {
  List<dynamic> _plans = [];
  bool _loading = true;
  bool _missedReport = false;
  int? _completingIdx;

  @override
  void initState() {
    super.initState();
    _loadToday();
  }

  Future<void> _loadToday() async {
    setState(() => _loading = true);
    final api = context.read<ApiService>();
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final earlier = DateTime.now().subtract(const Duration(days: 1)).toIso8601String().substring(0, 10);
    final plans = await api.getDailyTodo(teacherId: '', date: today);
    final missedList = await api.getMissedReports();
    if (mounted) {
      setState(() {
        _plans = plans ?? [];
        _missedReport = (missedList ?? []).isNotEmpty;
        _loading = false;
      });
    }
  }

  Future<void> _markComplete(int planId, int idx) async {
    setState(() => _completingIdx = idx);
    final api = context.read<ApiService>();
    await api.updatePeriodStatus(planId, 'completed');
    if (mounted) { setState(() { _completingIdx = null; }); _loadToday(); }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text("Daily Plan"),
          actions: [
            IconButton(icon: const Icon(Icons.assignment_turned_in), onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const DailyReportScreen()));
            }, tooltip: "Submit Report"),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: Colors.white))
            : Column(
                children: [
                  if (_missedReport)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      color: Colors.redAccent.withOpacity(0.3),
                      child: const Text("Yesterday's report was not submitted. Please submit now.",
                          style: TextStyle(color: Colors.white, fontSize: 12)),
                    ),
                  Expanded(
                    child: _plans.isEmpty
                        ? const Center(child: Text("No periods today", style: TextStyle(color: Colors.white54)))
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _plans.length,
                            itemBuilder: (_, i) {
                              final p = _plans[i] as Map<String, dynamic>;
                              final status = p['status'] ?? 'pending';
                              final isCompleted = status == 'completed';
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: GlassCard(
                                  margin: EdgeInsets.zero,
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    children: [
                                      Container(width: 4, height: 50, decoration: BoxDecoration(
                                        color: isCompleted ? Colors.green : Colors.indigoAccent,
                                        borderRadius: BorderRadius.circular(2),
                                      )),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                          Text("Period ${p['periodNumber'] ?? '?'} · ${p['subjectId'] ?? ''} · ${p['classId'] ?? ''}",
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                          const SizedBox(height: 2),
                                          Text(p['topicName'] ?? '', style: const TextStyle(fontSize: 11, color: Colors.white54)),
                                        ]),
                                      ),
                                      if (!isCompleted)
                                        IconButton(
                                          icon: _completingIdx == i
                                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                              : const Icon(Icons.check_circle_outline, color: Colors.greenAccent),
                                          onPressed: () => _markComplete(p['id'] as int, i),
                                        )
                                      else
                                        const Icon(Icons.check_circle, color: Colors.green, size: 28),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
      ),
    );
  }
}
