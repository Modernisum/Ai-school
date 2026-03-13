import 'package:flutter/material.dart';
import '../../core/widgets/glass_card.dart';

class TeacherAiAssistant extends StatefulWidget {
  const TeacherAiAssistant({super.key});

  @override
  State<TeacherAiAssistant> createState() => _TeacherAiAssistantState();
}

class _TeacherAiAssistantState extends State<TeacherAiAssistant> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, String>> _messages = [
    {"role": "assistant", "content": "Hello! I am your Vidhyam AI Assistant. How can I help you manage your classes today?"}
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: BoxDecoration(
        color: const Color(0xFFB298E7).withOpacity(0.9), // Purple theme
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: Colors.white30, borderRadius: BorderRadius.circular(2)),
              ),
              const Padding(
                padding: EdgeInsets.all(20.0),
                child: Row(
                  children: [
                    Icon(Icons.psychology, color: Colors.white, size: 28),
                    SizedBox(width: 12),
                    Text(
                      "AI STUDIO MOBILE",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final msg = _messages[index];
                    final isAi = msg['role'] == 'assistant';
                    return Align(
                      alignment: isAi ? Alignment.centerLeft : Alignment.centerRight,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isAi ? Colors.white.withOpacity(0.1) : Colors.white,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: Radius.circular(isAi ? 0 : 16),
                            bottomRight: Radius.circular(isAi ? 16 : 0),
                          ),
                        ),
                        child: Text(
                          msg['content']!,
                          style: TextStyle(color: isAi ? Colors.white : Colors.black87),
                        ),
                      ),
                    );
                  },
                ),
              ),
              _buildSuggestions(),
              _buildInput(),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSuggestions() {
    final suggestions = ["Attendance Summary", "Daily PDF Report", "Generate Test", "Check Risk Radar"];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Row(
        children: suggestions.map((s) => GestureDetector(
          onTap: () => _sendMessage(s),
          child: Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(s, style: const TextStyle(color: Colors.white, fontSize: 12)),
          ),
        )).toList(),
      ),
    );
  }

  Widget _buildInput() {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(24),
              ),
              child: TextField(
                controller: _controller,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  hintText: "Ask AI Assistant...",
                  hintStyle: TextStyle(color: Colors.white38),
                  border: InputBorder.none,
                ),
                onSubmitted: _sendMessage,
              ),
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => _sendMessage(_controller.text),
            child: const CircleAvatar(
              backgroundColor: Colors.white,
              child: Icon(Icons.send, color: Color(0xFFB298E7)),
            ),
          ),
        ],
      ),
    );
  }

  void _sendMessage(String text) {
    if (text.isEmpty) return;
    setState(() {
      _messages.add({"role": "user", "content": text});
      _controller.clear();
    });

    // Simulated AI Response
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() {
        _messages.add({
          "role": "assistant",
          "content": "Analyzing your request for '\$text'... Connecting to backend AI Studio and generating results. I can summarize any class metrics for you in real-time."
        });
      });
    });
  }
}
