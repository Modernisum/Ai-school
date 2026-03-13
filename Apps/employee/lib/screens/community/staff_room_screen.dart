import 'package:flutter/material.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class StaffRoomScreen extends StatelessWidget {
  const StaffRoomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text("Staff Community"),
          actions: [
            IconButton(icon: const Icon(Icons.search), onPressed: () {}),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                   _buildSystemNotice(context, "Welcome to the Digital Staff Room. All school employees can communicate here real-time."),
                   const SizedBox(height: 16),
                   _buildChatMessage("Principal", "Good morning everyone! Reminder about the board meeting at 2 PM.", true),
                   _buildChatMessage("Admin", "The salary slips for March have been uploaded. Please check your dashboards.", false),
                   _buildChatMessage("Coach", "Football trials at 4 PM today.", false),
                ],
              ),
            ),
            _buildChatInput(context),
          ],
        ),
      ),
    );
  }

  Widget _buildSystemNotice(BuildContext context, String text) {
    return GlassCard(
      color: Colors.white.withOpacity(0.05),
      padding: const EdgeInsets.all(12),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 12, color: Colors.white60, fontStyle: FontStyle.italic),
      ),
    );
  }

  Widget _buildChatMessage(String sender, String message, bool isImportant) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            backgroundColor: isImportant ? Colors.amber.withOpacity(0.3) : Colors.white10,
            child: Text(sender[0], style: TextStyle(color: isImportant ? Colors.amber : Colors.white)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(sender, style: TextStyle(fontWeight: FontWeight.bold, color: isImportant ? Colors.amber : Colors.white)),
                    const SizedBox(width: 8),
                    const Text("10:30 AM", style: TextStyle(fontSize: 10, color: Colors.white38)),
                  ],
                ),
                const SizedBox(height: 4),
                GlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Text(message),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatInput(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.2),
        border: const Border(top: BorderSide(color: Colors.white10)),
      ),
      child: SafeArea(
        child: Row(
          children: [
            IconButton(icon: const Icon(Icons.add_circle_outline), onPressed: () {}),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const TextField(
                  decoration: InputDecoration(
                    hintText: "Type a message...",
                    border: InputBorder.none,
                    hintStyle: TextStyle(color: Colors.white38),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            CircleAvatar(
              backgroundColor: Theme.of(context).primaryColor,
              child: const Icon(Icons.send, color: Colors.white, size: 20),
            ),
          ],
        ),
      ),
    );
  }
}
