import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class ScheduleChangeScreen extends StatefulWidget {
  const ScheduleChangeScreen({super.key});

  @override
  State<ScheduleChangeScreen> createState() => _ScheduleChangeScreenState();
}

class _ScheduleChangeScreenState extends State<ScheduleChangeScreen> {
  String _type = 'block_merge';
  final _reasonController = TextEditingController();
  bool _submitting = false;
  int _tabIndex = 0;

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final api = context.read<ApiService>();
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final result = await api.requestScheduleChange({
      'type': _type,
      'reason': _reasonController.text,
      'dateFrom': today,
      'dateTo': today,
    });
    if (mounted) {
      setState(() => _submitting = false);
      if (result?['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Request submitted for admin approval"), backgroundColor: Colors.green));
        _reasonController.clear();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text("Schedule Change"),
          bottom: TabBar(
            onTap: (i) => setState(() => _tabIndex = i),
            tabs: const [
              Tab(text: "Request"),
              Tab(text: "My Requests"),
            ],
          ),
        ),
        body: _tabIndex == 0 ? _buildRequestForm() : _buildMyRequests(),
      ),
    );
  }

  Widget _buildRequestForm() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          GlassCard(
            margin: EdgeInsets.zero,
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text("Request Type", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(spacing: 8, children: [
                ChoiceChip(label: const Text("Block Merge"), selected: _type == 'block_merge',
                  onSelected: (_) => setState(() => _type = 'block_merge'),
                  selectedColor: Colors.indigoAccent),
                ChoiceChip(label: const Text("Topic Skip"), selected: _type == 'skip',
                  onSelected: (_) => setState(() => _type = 'skip'),
                  selectedColor: Colors.amber),
                ChoiceChip(label: const Text("Substitute"), selected: _type == 'substitute',
                  onSelected: (_) => setState(() => _type = 'substitute'),
                  selectedColor: Colors.purpleAccent),
              ]),
              const SizedBox(height: 16),
              TextField(
                controller: _reasonController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: "Reason for this change request...",
                  hintStyle: TextStyle(color: Colors.white38),
                  border: OutlineInputBorder(), filled: true, fillColor: Colors.white10,
                ),
                style: const TextStyle(color: Colors.white),
              ),
              const SizedBox(height: 12),
              SizedBox(width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _submitting ? null : _submit,
                  icon: _submitting ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2) : const Icon(Icons.send),
                  label: const Text("Submit Request"),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.indigoAccent, foregroundColor: Colors.white, padding: const EdgeInsets.all(16)),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _buildMyRequests() {
    return FutureBuilder<List<dynamic>?>(
      future: context.read<ApiService>().getPendingChanges(),
      builder: (_, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Colors.white));
        }
        final list = snapshot.data ?? [];
        if (list.isEmpty) return const Center(child: Text("No requests", style: TextStyle(color: Colors.white54)));
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: list.length,
          itemBuilder: (_, i) {
            final r = list[i] as Map<String, dynamic>;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                margin: EdgeInsets.zero,
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Icon(r['type'] == 'block_merge' ? Icons.merge_type : r['type'] == 'skip' ? Icons.skip_next : Icons.swap_horiz, size: 18, color: Colors.indigoAccent),
                    const SizedBox(width: 8),
                    Text(r['type'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: r['status'] == 'approved' ? Colors.green.withOpacity(0.2) : r['status'] == 'rejected' ? Colors.red.withOpacity(0.2) : Colors.amber.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text((r['status'] ?? '').toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: r['status'] == 'approved' ? Colors.greenAccent : r['status'] == 'rejected' ? Colors.redAccent : Colors.amber)),
                    ),
                  ]),
                  if (r['reason'] != null) ...[const SizedBox(height: 4), Text(r['reason'], style: const TextStyle(fontSize: 11, color: Colors.white54))],
                ]),
              ),
            );
          },
        );
      },
    );
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }
}
