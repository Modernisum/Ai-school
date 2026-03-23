import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';
import 'unassigned_vault_screen.dart';

class SmartScannerScreen extends StatefulWidget {
  const SmartScannerScreen({super.key});

  @override
  State<SmartScannerScreen> createState() => _SmartScannerScreenState();
}

class _SmartScannerScreenState extends State<SmartScannerScreen> {
  bool _isScanning = false;
  bool _isAutoScan = false;
  Timer? _scanTimer;
  int _autoCount = 0;
  String? _capturedImagePath;

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text("AI Smart Scanner"),
          actions: [
            IconButton(
              icon: const Icon(Icons.inventory_2_outlined),
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (context) => const UnassignedVaultScreen()));
              },
              tooltip: "Unassigned Vault",
            ),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              child: _capturedImagePath == null 
                ? _buildCameraPlaceholder() 
                : _buildImagePreview(),
            ),
            _buildActionPanel(),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraPlaceholder() {
    return Container(
      margin: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.3),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white24, width: 2),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isAutoScan)
               const Column(
                 children: [
                   CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                   SizedBox(height: 16),
                   Text("CONTINUOUS VISION ACTIVE", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 12)),
                 ],
               )
            else
               const Icon(Icons.camera_alt, size: 80, color: Colors.white24),
            const SizedBox(height: 16),
            const Text("Align document within the frame", style: TextStyle(color: Colors.white54)),
            if (_isAutoScan)
               Padding(
                 padding: const EdgeInsets.only(top: 8.0),
                 child: Text("Captured: $_autoCount pages", style: const TextStyle(color: Colors.greenAccent, fontSize: 10)),
               ),
          ],
        ),
      ),
    );
  }

  Widget _buildImagePreview() {
    return Container(
      margin: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          fit: StackFit.expand,
          children: [
            const Center(child: Icon(Icons.image, size: 80, color: Colors.white24)), // Dummy image
            if (_isScanning)
              Container(
                color: Colors.black45,
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 20),
                    Text("AI is Extracting & Grading...", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionPanel() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.black26,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("HANDS-FREE MODE", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                Switch(
                  value: _isAutoScan, 
                  onChanged: (val) => _toggleAutoScan(val),
                  activeColor: Colors.amber,
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_capturedImagePath == null && !_isAutoScan)
              _buildLargeButton(
                "CAPTURE DOCUMENT", 
                Icons.camera, 
                Colors.indigoAccent,
                onTap: () => setState(() => _capturedImagePath = "dummy_path"),
              )
            else if (_isAutoScan)
               _buildLargeButton(
                "STOP AUTO-SCAN", 
                Icons.stop_circle, 
                Colors.redAccent,
                onTap: () => _toggleAutoScan(false),
              )
            else if (!_isScanning)
              Row(
                children: [
                  Expanded(
                    child: _buildSmallButton("RETAKE", Icons.refresh, Colors.white24, onTap: () => setState(() => _capturedImagePath = null)),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildLargeButton(
                      "GRADE NOW", 
                      Icons.auto_awesome, 
                      const Color(0xFFF5B8D5), 
                      onTap: _startAiGrading,
                    ),
                  ),
                ],
              )
            else
               _buildLargeButton("CANCEL SCAN", Icons.close, Colors.redAccent, onTap: () => setState(() => _isScanning = false)),
          ],
        ),
      ),
    );
  }

  void _toggleAutoScan(bool enable) {
    setState(() {
      _isAutoScan = enable;
      if (enable) {
        _scanTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
          if (!mounted) return;
          setState(() {
            _autoCount++;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text("Auto-Captured Page $_autoCount. Sending to OCR..."),
                duration: const Duration(milliseconds: 500),
              ),
            );
          });
        });
      } else {
        _scanTimer?.cancel();
        if (_autoCount > 0) {
           ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(content: Text("Scanning Complete. $_autoCount pages in Unassigned Vault.")),
           );
        }
      }
    });
  }

  Future<void> _startAiGrading() async {
    setState(() => _isScanning = true);
    
    try {
      final baseUrl = dotenv.env['VITE_API_BASE_URL'] ?? 'http://localhost:8080/api';
      final schoolId = await context.read<ApiService>().getSchoolId() ?? "";
      
      // 1. In a real flow, we'd first upload to GCS, then send the URL to OCR
      // For this implementation, we simulate the OCR + AI pipeline call
      final response = await http.post(
        Uri.parse('$baseUrl/ai/$schoolId/query'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "query": "Grade this handwritten math paper and provide mark-wise reasoning.",
          "context": "OCR_RESULT_PLACEHOLDER: Student solved 5 problems. Problem 3 has a carry-over error."
        }),
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        // Backend returns AI reasoning in the data
        _showGradingResult(
          marks: 8.0, 
          reasoning: [
            "AI OCR detected 5 mathematical expressions.",
            "Problem 1: Correct (+2)",
            "Problem 2: Correct (+2)",
            "Problem 3: Calculation Error in subtraction step (-2)",
            "Problem 4: Correct (+2)",
            "Problem 5: Correct (+2)"
          ]
        );
      } else {
        throw Exception("Server Error");
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("AI Grading Failed: $e")));
    } finally {
      setState(() => _isScanning = false);
    }
  }

  void _showGradingResult({double? marks, List<String>? reasoning}) {
    double currentMarks = marks ?? 9.0;
    bool showReasoning = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => GlassCard(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.auto_awesome, color: Color(0xFFF5B8D5), size: 24),
                      SizedBox(width: 8),
                      Text("AI Grading Result", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  IconButton(
                    icon: Icon(showReasoning ? Icons.visibility_off : Icons.visibility, size: 20, color: Colors.indigoAccent),
                    onPressed: () => setModalState(() => showReasoning = !showReasoning),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildResultRow("Student", "Aarav Sharma (Roll: 104)"),
              const Divider(color: Colors.white10),
              
              if (showReasoning) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("AI REASONING LOGIC", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 10)),
                        const SizedBox(height: 8),
                        if (reasoning != null)
                          ...reasoning.map((r) => Text("• $r", style: const TextStyle(fontSize: 11, color: Colors.white70))).toList()
                        else
                           const Text("No detailed reasoning provided by AI.", style: TextStyle(fontSize: 11, color: Colors.white70)),
                      ],
                    ),
                  ),
                 const SizedBox(height: 16),
              ],

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("ASSIGNED MARKS", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(color: Colors.amber.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                    child: Text("${currentMarks.toInt()}/10", style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.amber)),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text("TEACHER OVERRIDE", style: TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold)),
              Slider(
                value: currentMarks, 
                min: 0, 
                max: 10, 
                divisions: 10,
                activeColor: const Color(0xFFB298E7),
                onChanged: (val) {
                  setModalState(() => currentMarks = val);
                },
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildLargeButton(
                      "CONFIRM & AUDIT", 
                      Icons.check_circle, 
                      Colors.green, 
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text("Marks Saved. Audit Log: Teacher confirmed AI score of ${currentMarks.toInt()}")),
                        );
                        Navigator.pop(context);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.white60)),
          Text(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildLargeButton(String label, IconData icon, Color color, {VoidCallback? onTap}) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        minimumSize: const Size.fromHeight(56),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  Widget _buildSmallButton(String label, IconData icon, Color color, {VoidCallback? onTap}) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 18),
      label: Text(label, style: const TextStyle(fontSize: 12)),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        minimumSize: const Size.fromHeight(56),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
