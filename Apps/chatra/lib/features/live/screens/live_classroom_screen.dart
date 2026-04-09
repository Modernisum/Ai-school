import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/features/live/bloc/live_stream_bloc.dart';
import 'package:chatra/features/live/bloc/live_stream_event.dart';
import 'package:chatra/features/live/bloc/live_stream_state.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/widgets/animated_gradient_bg.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/core/network/api_service.dart';

class LiveClassroomScreen extends StatelessWidget {
  final String schoolId;
  final String classId;

  const LiveClassroomScreen({
    super.key,
    required this.schoolId,
    required this.classId,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (ctx) => LiveStreamBloc(apiService: ctx.read<ApiService>())
        ..add(LiveWatchStarted(schoolId: schoolId, classId: classId)),
      child: Scaffold(
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text("Live Classroom", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        body: AnimatedGradientBg(
          child: BlocBuilder<LiveStreamBloc, LiveStreamState>(
            builder: (context, state) {
              if (state is LiveStreamConnecting) return _buildConnecting();
              if (state is LiveStreamActive) return _buildLiveView(state);
              if (state is LiveStreamOffline) return _buildOffline(state.reason);
              return _buildWaiting();
            },
          ),
        ),
      ),
    );
  }

  Widget _buildConnecting() {
    return const Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        CircularProgressIndicator(color: Colors.white),
        SizedBox(height: 16),
        Text("Connecting to classroom...", style: TextStyle(color: Colors.white70)),
      ]),
    );
  }

  Widget _buildWaiting() {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.cast_connected, color: Colors.white38, size: 80),
        const SizedBox(height: 24),
        const Text("Waiting for teacher to go live...",
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text("You'll be notified the moment class starts.",
            style: TextStyle(color: Colors.white.withOpacity(0.6))),
      ]).animate().fadeIn(duration: 600.ms),
    );
  }

  Widget _buildLiveView(LiveStreamActive state) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildLiveBadgeHeader(state),
            const SizedBox(height: 24),
            _buildTeacherCard(state),
            const SizedBox(height: 24),
            _buildStreamPlaceholder(),
            const Spacer(),
            _buildLeaveButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildLiveBadgeHeader(LiveStreamActive state) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.red,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Row(children: [
            Icon(Icons.fiber_manual_record, color: Colors.white, size: 14),
            SizedBox(width: 6),
            Text("LIVE", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.5)),
          ]),
        ).animate(onPlay: (c) => c.repeat(reverse: true)).fadeOut(begin: 0.3, duration: 800.ms),
        const SizedBox(width: 12),
        Flexible(
          child: Text(state.subject,
              style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis),
        ),
      ],
    );
  }

  Widget _buildTeacherCard(LiveStreamActive state) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: AppColors.primaryBrand.withOpacity(0.4),
            child: Text(
              state.teacherName.isNotEmpty ? state.teacherName[0].toUpperCase() : "T",
              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 16),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(state.teacherName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
            Text("Now teaching: ${state.subject}", style: TextStyle(color: Colors.white.withOpacity(0.7))),
            const SizedBox(height: 4),
            Text("Started at ${_formatTime(state.startedAt)}",
                style: const TextStyle(color: Colors.white54, fontSize: 12)),
          ]),
        ],
      ),
    ).animate().slideY(begin: 0.3, end: 0, duration: 500.ms);
  }

  Widget _buildStreamPlaceholder() {
    return GlassCard(
      padding: EdgeInsets.zero,
      borderRadius: 20,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              colors: [Colors.black87, AppColors.primaryBrand.withOpacity(0.4)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.videocam, color: Colors.white54, size: 60),
            SizedBox(height: 12),
            Text("Live video stream will appear here",
                style: TextStyle(color: Colors.white54, fontSize: 13)),
            Text("(WebRTC / HLS integration ready)",
                style: TextStyle(color: Colors.white30, fontSize: 11)),
          ]),
        ),
      ),
    );
  }

  Widget _buildLeaveButton() {
    return Builder(
      builder: (ctx) => SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () => Navigator.of(ctx).pop(),
          icon: const Icon(Icons.call_end),
          label: const Text("Leave Class"),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red.shade700,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ),
    );
  }

  Widget _buildOffline(String reason) {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.wifi_off, color: Colors.white38, size: 80),
        const SizedBox(height: 24),
        const Text("Class Ended", style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text(reason, style: const TextStyle(color: Colors.white54)),
      ]).animate().fadeIn(duration: 500.ms),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return "$h:$m";
  }
}
