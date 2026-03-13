import 'package:flutter/material.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class BroadcastNoticeScreen extends StatefulWidget {
  const BroadcastNoticeScreen({super.key});

  @override
  State<BroadcastNoticeScreen> createState() => _BroadcastNoticeScreenState();
}

class _BroadcastNoticeScreenState extends State<BroadcastNoticeScreen> {
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  String _targetAudience = 'All Staff';

  void _sendNotice() {
    if (_titleController.text.isEmpty || _bodyController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all fields')),
      );
      return;
    }
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    Future.delayed(const Duration(seconds: 1), () {
      if (context.mounted) {
        Navigator.pop(context); // close dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Notice Broadcasted to $_targetAudience successfully!'), backgroundColor: Colors.green),
        );
        Navigator.pop(context); // go back
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Broadcast Notice'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  "Send Push Notification",
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 24),
                DropdownButtonFormField<String>(
                  value: _targetAudience,
                  decoration: const InputDecoration(labelText: 'Target Audience'),
                  dropdownColor: Theme.of(context).primaryColor,
                  style: const TextStyle(color: Colors.white),
                  items: ['All Staff', 'Teachers Only', 'Drivers Only', 'Peons Only']
                      .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _targetAudience = val);
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _titleController,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: "Notice Title",
                    prefixIcon: Icon(Icons.title, color: Colors.white70),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _bodyController,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: "Notice Content...",
                    prefixIcon: Icon(Icons.message, color: Colors.white70),
                  ),
                  maxLines: 5,
                  minLines: 3,
                ),
                const SizedBox(height: 32),
                ElevatedButton.icon(
                  onPressed: _sendNotice,
                  icon: const Icon(Icons.send),
                  label: const Text("BROADCAST NOW", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: Colors.redAccent,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
