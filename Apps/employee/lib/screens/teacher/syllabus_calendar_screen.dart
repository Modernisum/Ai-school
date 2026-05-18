import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class SyllabusCalendarScreen extends StatefulWidget {
  const SyllabusCalendarScreen({super.key});

  @override
  State<SyllabusCalendarScreen> createState() => _SyllabusCalendarScreenState();
}

class _SyllabusCalendarScreenState extends State<SyllabusCalendarScreen> {
  List<dynamic> _syllabus = [];
  bool _loading = true;
  String? _activeQuarter = 'Q1';
  final _quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  @override
  void initState() {
    super.initState();
    _loadSyllabus();
  }

  Future<void> _loadSyllabus() async {
    setState(() => _loading = true);
    final api = context.read<ApiService>();
    final res = await api.getQuarterReport(_activeQuarter!);
    if (mounted) setState(() { _syllabus = res ?? []; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text("Syllabus Calendar")),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(
                children: _quarters.map((q) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(q), selected: _activeQuarter == q,
                    onSelected: (v) { setState(() => _activeQuarter = q); _loadSyllabus(); },
                    selectedColor: Colors.indigoAccent, labelStyle: TextStyle(color: _activeQuarter == q ? Colors.white : Colors.white70),
                  ),
                )).toList(),
              )),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: Colors.white))
                  : _syllabus.isEmpty
                      ? const Center(child: Text("No chapters in this quarter", style: TextStyle(color: Colors.white54)))
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _syllabus.length,
                          itemBuilder: (_, i) {
                            final c = _syllabus[i] as Map<String, dynamic>;
                            final status = c['status'] ?? 'pending';
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: GlassCard(
                                margin: EdgeInsets.zero,
                                padding: const EdgeInsets.all(14),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                        Text(c['chapterName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                        const SizedBox(height: 4),
                                        Text("${c['plannedStartDate'] ?? 'TBD'} → ${c['plannedEndDate'] ?? ''}",
                                            style: const TextStyle(fontSize: 11, color: Colors.white54)),
                                      ]),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: status == 'completed' ? Colors.green.withOpacity(0.2) : status == 'in_progress' ? Colors.blue.withOpacity(0.2) : Colors.amber.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(status.replaceAll('_', ' ').toUpperCase(),
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: status == 'completed' ? Colors.greenAccent : status == 'in_progress' ? Colors.blueAccent : Colors.amber)),
                                    ),
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
