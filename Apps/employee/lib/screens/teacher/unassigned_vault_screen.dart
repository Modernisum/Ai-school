import 'package:flutter/material.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class UnassignedVaultScreen extends StatefulWidget {
  const UnassignedVaultScreen({super.key});

  @override
  State<UnassignedVaultScreen> createState() => _UnassignedVaultScreenState();
}

class _UnassignedVaultScreenState extends State<UnassignedVaultScreen> {
  final List<Map<String, String>> _unassignedPages = [
    {"id": "1", "thumbnail": "Page 1", "timestamp": "10:45 AM"},
    {"id": "2", "thumbnail": "Page 2", "timestamp": "10:46 AM"},
    {"id": "3", "thumbnail": "Page 3", "timestamp": "10:48 AM"},
  ];

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text("Unassigned Vault"),
          actions: [
            IconButton(
              icon: const Icon(Icons.help_outline),
              onPressed: () {}, // Tips on OCR tagging
            ),
          ],
        ),
        body: Column(
          children: [
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: GlassCard(
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.amber),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        "These pages have illegible Roll Numbers. Please assign them manually.",
                        style: TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 0.8,
                ),
                itemCount: _unassignedPages.length,
                itemBuilder: (context, index) {
                  final page = _unassignedPages[index];
                  return _buildPageCard(page);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPageCard(Map<String, String> page) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white10,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.description, color: Colors.white24, size: 40),
                    Text(page['thumbnail']!, style: const TextStyle(color: Colors.white54, fontSize: 10)),
                    Text(page['timestamp']!, style: const TextStyle(color: Colors.white24, fontSize: 8)),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB298E7),
                minimumSize: const Size.fromHeight(32),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _showAssignDialog(page['id']!),
              child: const Text("ASSIGN ID", style: TextStyle(fontSize: 10)),
            ),
          ),
        ],
      ),
    );
  }

  void _showAssignDialog(String pageId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: const Text("Select Student", style: TextStyle(color: Colors.white)),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: 5,
            itemBuilder: (context, index) {
              return ListTile(
                leading: CircleAvatar(child: Text("${index + 1}")),
                title: Text("Student Name ${index + 1}", style: const TextStyle(color: Colors.white)),
                onTap: () {
                  setState(() {
                    _unassignedPages.removeWhere((p) => p['id'] == pageId);
                  });
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Page Assigned Successfully!")),
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }
}
