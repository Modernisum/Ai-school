import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class PickupAttendanceScreen extends StatefulWidget {
  const PickupAttendanceScreen({super.key});

  @override
  State<PickupAttendanceScreen> createState() => _PickupAttendanceScreenState();
}

class _PickupAttendanceScreenState extends State<PickupAttendanceScreen> {
  List<dynamic> _students = [];
  Set<String> _selected = {};
  bool _loading = true;
  bool _submitting = false;
  bool _allPickedUp = false;

  @override
  void initState() {
    super.initState();
    _loadStudents();
  }

  Future<void> _loadStudents() async {
    setState(() => _loading = true);
    final api = context.read<ApiService>();
    final res = await api.getDriverStudents();
    if (mounted) setState(() { _students = res ?? []; _loading = false; });
  }

  Future<void> _markAll() async {
    setState(() => _submitting = true);
    final api = context.read<ApiService>();
    final ids = _students.map((s) => s['studentId'] as String).toList();
    final status = _allPickedUp ? 'dropped_off' : 'picked_up';
    final res = await api.markPickupAttendance(ids, status, 'vehicle-001');
    if (mounted) {
      setState(() { _submitting = false; _allPickedUp = !_allPickedUp; _selected.clear(); });
      if (res?['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text("$status ${res['marked']} students"),
          backgroundColor: Colors.green,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text("Pickup Attendance"),
          actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadStudents)],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: Colors.white))
            : Column(children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  color: Colors.indigoAccent.withOpacity(0.3),
                  child: Text("${_students.length} students assigned · ${_selected.length} selected",
                      style: const TextStyle(color: Colors.white, fontSize: 12)),
                ),
                Expanded(
                  child: _students.isEmpty
                      ? const Center(child: Text("No students assigned", style: TextStyle(color: Colors.white54)))
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _students.length,
                          itemBuilder: (_, i) {
                            final s = _students[i] as Map<String, dynamic>;
                            final id = s['studentId'] as String;
                            final sel = _selected.contains(id);
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: GlassCard(
                                margin: EdgeInsets.zero,
                                padding: const EdgeInsets.all(14),
                                child: Row(children: [
                                  Checkbox(
                                    value: sel,
                                    onChanged: (v) => setState(() => v == true ? _selected.add(id) : _selected.remove(id)),
                                    activeColor: Colors.green,
                                  ),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(s['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    Text("Class: ${s['className'] ?? ''}", style: const TextStyle(fontSize: 11, color: Colors.white54)),
                                  ])),
                                  if (s['parentPhone'] != null)
                                    IconButton(icon: const Icon(Icons.phone, color: Colors.green, size: 18), onPressed: () {}),
                                ]),
                              ),
                            );
                          },
                        ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: _submitting ? null : _markAll,
                      icon: _submitting
                          ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                          : Icon(_allPickedUp ? Icons.arrow_downward : Icons.arrow_upward),
                      label: Text(_submitting ? "Processing..." : _allPickedUp ? "MARK ALL DROPPED OFF" : "MARK ALL PICKED UP"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _allPickedUp ? Colors.redAccent : Colors.green,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
      ),
    );
  }
}
