import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:camera/camera.dart';
import 'package:flutter/services.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';
import 'unassigned_vault_screen.dart';

class SmartScannerScreen extends StatefulWidget {
  final String examId;
  final String examName;
  final String strictnessLevel;

  const SmartScannerScreen({
    super.key,
    required this.examId,
    required this.examName,
    this.strictnessLevel = 'medium',
  });

  @override
  State<SmartScannerScreen> createState() => _SmartScannerScreenState();
}

class _SmartScannerScreenState extends State<SmartScannerScreen> {
  CameraController? _cameraController;
  bool _isCameraInitialized = false;
  bool _isScanning = false;
  bool _isAutoScan = false;
  bool _isProcessingFrame = false;
  Timer? _scanTimer;
  int _autoCount = 0;
  String? _capturedImagePath;
  List<Offset>? _detectedEdges; // For AR overlay

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return;

    _cameraController = CameraController(
      cameras.first,
      ResolutionPreset.high,
      enableAudio: false,
    );

    try {
      await _cameraController!.initialize();
      if (!mounted) return;
      
      setState(() => _isCameraInitialized = true);
      
      // Start processing frames for edge detection
      _cameraController!.startImageStream((image) {
        if (!_isProcessingFrame && _isAutoScan) {
          _processCameraFrame(image);
        }
      });
    } catch (e) {
      debugPrint("Camera Init Error: $e");
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _scanTimer?.cancel();
    super.dispose();
  }

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
    if (!_isCameraInitialized) {
      return const Center(child: CircularProgressIndicator(color: Colors.white));
    }

    return Container(
      margin: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white24, width: 2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          fit: StackFit.expand,
          children: [
            CameraPreview(_cameraController!),
            if (_detectedEdges != null)
              CustomPaint(
                painter: EdgePainter(_detectedEdges!),
              ),
            if (_isAutoScan)
               Positioned(
                 top: 16,
                 right: 16,
                 child: Column(
                   children: [
                     const CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                     const SizedBox(height: 16),
                     Text("AUTO: $_autoCount", style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
                   ],
                 ),
               ),
            Align(
              alignment: Alignment.center,
              child: Container(
                width: 250,
                height: 350,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white38, width: 2),
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
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
            Image.file(File(_capturedImagePath!), fit: BoxFit.cover),
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
                onTap: _captureImage,
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

  Future<void> _captureImage() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;
    
    try {
      final XFile image = await _cameraController!.takePicture();
      setState(() {
        _capturedImagePath = image.path;
      });
      HapticFeedback.mediumImpact();
    } catch (e) {
      debugPrint("Capture Error: $e");
    }
  }

  Future<void> _processCameraFrame(CameraImage image) async {
    if (_isProcessingFrame) return;
    _isProcessingFrame = true;

    try {
      // Logic for real-time edge detection using ML Kit Document Scanner
      // In this version, we provide the visual feedback
      // Real ML Kit frame processing requires converting CameraImage to InputImage
      // which is typically done via a utility. For MVP phase 1, we simulate 
      // the alignment scan.
      
      await Future.delayed(const Duration(milliseconds: 100)); // Simulate processing
      
      // Feedback alignment logic would go here
      // For now, we clear edges if not auto-scanning
      if (!_isAutoScan) {
        setState(() => _detectedEdges = null);
      }
    } finally {
      _isProcessingFrame = false;
    }
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
      final api = context.read<ApiService>();
      
      // Upload scanned image (if captured) and send to grading API
      final payload = {
        "examId": widget.examId,
        "studentId": "auto",  // Would be detected via roll number OCR
        "submissionType": "exam",
        "isOmr": false,
        "strictness": widget.strictnessLevel,
        "answers": [
          {
            "questionIndex": 0,
            "answerText": "OCR_RESULT_PLACEHOLDER: Scanned page content would be here"
          }
        ]
      };
      
      final result = await api.gradeTestSubmission(payload);
      
      if (result != null && result['success'] == true) {
        final score = result['overallScore']?.toDouble() ?? 0.0;
        final feedback = result['feedback'] ?? '';
        final criteria = result['criteriaScores'] as List? ?? [];
        
        _showGradingResult(
          submissionId: result['submissionId']?.toString(),
          marks: score,
          criteriaScores: criteria,
          feedback: feedback,
        );
      } else {
        throw Exception(result?['message'] ?? "Grading failed");
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("AI Grading Failed: $e")));
    } finally {
      setState(() => _isScanning = false);
    }
  }

  String? _reviewSubmissionId;

  void _showGradingResult({
    String? submissionId,
    double? marks,
    List<dynamic>? criteriaScores,
    String? feedback,
  }) {
    _reviewSubmissionId = submissionId;
    double currentMarks = marks ?? 0.0;
    bool showReasoning = true;
    final reasoningList = (criteriaScores as List?)
            ?.map((c) => "Q${c['question_index'] ?? '?'}: Score ${c['score'] ?? 0} — ${c['feedback'] ?? ''}")
            .toList() ??
        [feedback ?? 'No detailed feedback'];

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
                  Row(
                    children: [
                      const Icon(Icons.auto_awesome, color: Color(0xFFF5B8D5), size: 24),
                      const SizedBox(width: 8),
                      Text(widget.examName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  IconButton(
                    icon: Icon(showReasoning ? Icons.visibility_off : Icons.visibility, size: 20, color: Colors.indigoAccent),
                    onPressed: () => setModalState(() => showReasoning = !showReasoning),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildResultRow("Exam", widget.examName),
              const Divider(color: Colors.white10),
              
              if (showReasoning) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("AI REASONING & FEEDBACK", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 10)),
                        const SizedBox(height: 8),
                        ...reasoningList.map((r) => Text("• $r", style: const TextStyle(fontSize: 11, color: Colors.white70))).toList(),
                      ],
                    ),
                  ),
                 const SizedBox(height: 16),
              ],

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("AI SCORE", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(color: Colors.amber.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                    child: Text("${currentMarks.toStringAsFixed(1)}", style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.amber)),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text("CHECKER OVERRIDE", style: TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold)),
              Slider(
                value: currentMarks.clamp(0, 100),
                min: 0,
                max: 100,
                divisions: 100,
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
                      "SUBMIT REVIEW", 
                      Icons.check_circle, 
                      Colors.green, 
                      onTap: () async {
                        if (_reviewSubmissionId == null) return;
                        final api = context.read<ApiService>();
                        final result = await api.submitCheckerReview(
                          widget.examId,
                          _reviewSubmissionId!,
                          {
                            "adjustedScore": currentMarks,
                            "checkerNotes": "Checker reviewed AI grading; score adjusted to $currentMarks",
                            "strictnessUsed": widget.strictnessLevel,
                          },
                        );
                        if (result?['success'] == true) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text("Review submitted for $submissionId")),
                          );
                          Navigator.pop(context);
                          Navigator.pop(context); // Go back to exam list
                        }
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

class EdgePainter extends CustomPainter {
  final List<Offset> points;
  EdgePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.greenAccent.withOpacity(0.5)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    if (points.length >= 4) {
      final path = Path()
        ..moveTo(points[0].dx, points[0].dy)
        ..lineTo(points[1].dx, points[1].dy)
        ..lineTo(points[2].dx, points[2].dy)
        ..lineTo(points[3].dx, points[3].dy)
        ..close();
      canvas.drawPath(path, paint);
      
      final fillPaint = Paint()
        ..color = Colors.greenAccent.withOpacity(0.1)
        ..style = PaintingStyle.fill;
      canvas.drawPath(path, fillPaint);
    }
  }

  @override
  bool shouldRepaint(EdgePainter oldDelegate) => oldDelegate.points != points;
}
