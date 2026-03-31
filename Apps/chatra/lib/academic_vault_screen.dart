import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'logic/academic/academic_bloc.dart';
import 'logic/academic/academic_event.dart';
import 'logic/academic/academic_state.dart';
import 'widgets/glass_card.dart';
import 'widgets/animated_gradient_bg.dart';
import 'theme/app_theme.dart';
import 'api_service.dart';

class AcademicVaultScreen extends StatelessWidget {
  final String schoolId;
  final String studentId;

  const AcademicVaultScreen({
    super.key,
    required this.schoolId,
    required this.studentId,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (ctx) => AcademicBloc(apiService: ctx.read<ApiService>())
        ..add(AcademicFetchStarted(schoolId: schoolId, studentId: studentId)),
      child: Scaffold(
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text("Academic Vault", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        body: AnimatedGradientBg(
          child: BlocBuilder<AcademicBloc, AcademicState>(
            builder: (context, state) {
              if (state is AcademicLoading) {
                return const Center(child: CircularProgressIndicator(color: Colors.white));
              }
              if (state is AcademicLoaded) {
                return SafeArea(
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildSectionHeader("📅  Upcoming Exams"),
                      const SizedBox(height: 8),
                      if (state.upcomingExams.isEmpty)
                        _buildEmpty("No upcoming exams scheduled")
                      else
                        ...state.upcomingExams.asMap().entries.map(
                          (e) => _buildExamCard(e.value).animate().slideX(
                              begin: 0.3, delay: Duration(milliseconds: e.key * 80)),
                        ),
                      const SizedBox(height: 24),
                      _buildSectionHeader("📂  Report Cards & Documents"),
                      const SizedBox(height: 8),
                      if (state.reportCards.isEmpty)
                        _buildEmpty("No documents available yet")
                      else
                        ...state.reportCards.asMap().entries.map(
                          (e) => _buildDocCard(context, e.value).animate().fadeIn(
                              delay: Duration(milliseconds: e.key * 100)),
                        ),
                    ],
                  ),
                );
              }
              if (state is AcademicError) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(state.message, style: const TextStyle(color: Colors.redAccent), textAlign: TextAlign.center),
                  ),
                );
              }
              return const Center(child: CircularProgressIndicator(color: Colors.white));
            },
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(title, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold));
  }

  Widget _buildEmpty(String msg) {
    return GlassCard(
      child: Text(msg, style: const TextStyle(color: Colors.white54, fontSize: 14)),
    );
  }

  Widget _buildExamCard(Map<String, dynamic> exam) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      borderRadius: 16,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primaryBrand.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.assignment, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(exam['exam_name'] ?? 'Exam', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              Text(exam['subject'] ?? 'All Subjects', style: TextStyle(color: Colors.white.withValues(alpha: 0.7))),
              const SizedBox(height: 4),
              Row(children: [
                const Icon(Icons.calendar_today, color: Colors.white54, size: 12),
                const SizedBox(width: 4),
                Text(exam['date'] ?? 'TBD', style: const TextStyle(color: Colors.white54, fontSize: 12)),
                const SizedBox(width: 12),
                const Icon(Icons.timer, color: Colors.white54, size: 12),
                const SizedBox(width: 4),
                Text(exam['duration'] ?? '3 Hours', style: const TextStyle(color: Colors.white54, fontSize: 12)),
              ]),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _buildDocCard(BuildContext context, Map<String, dynamic> doc) {
    final hasUrl = (doc['document_url'] ?? '').toString().isNotEmpty;
    return GlassCard(
      padding: const EdgeInsets.all(16),
      borderRadius: 16,
      child: Row(
        children: [
          const Icon(Icons.picture_as_pdf, color: Colors.redAccent, size: 36),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(doc['title'] ?? 'Document', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              Text(doc['uploaded_at'] ?? '', style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 12)),
            ]),
          ),
          ElevatedButton.icon(
            onPressed: hasUrl ? () {} : null,
            icon: const Icon(Icons.download, size: 16),
            label: const Text("Download"),
            style: ElevatedButton.styleFrom(
              backgroundColor: hasUrl ? AppColors.accentTeal : Colors.white12,
              foregroundColor: hasUrl ? Colors.black : Colors.white38,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
          ),
        ],
      ),
    );
  }
}
