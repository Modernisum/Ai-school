import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';
import 'api_service.dart';
import 'logic/dashboard/dashboard_bloc.dart';
import 'logic/dashboard/dashboard_event.dart';
import 'logic/dashboard/dashboard_state.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/auth/auth_event.dart';
import 'logic/notices/notice_bloc.dart';
import 'logic/notices/notice_event.dart';
import 'logic/notices/notice_state.dart';
import 'logic/live/live_stream_bloc.dart';
import 'logic/live/live_stream_event.dart';
import 'logic/live/live_stream_state.dart';
import 'widgets/glass_card.dart';
import 'widgets/animated_gradient_bg.dart';
import 'theme/app_theme.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // 🧠 ON-DEMAND LAZY INJECTION — BLoCs start only here, not in main()
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (ctx) {
            final bloc = DashboardBloc(apiService: ctx.read<ApiService>());
            _initDashboard(ctx, bloc);
            return bloc;
          },
        ),
        BlocProvider(
          create: (ctx) => NoticeBloc(apiService: ctx.read<ApiService>())
            ..add(const NoticeStreamStarted(schoolId: 'SCH001', studentId: 'STU12345')),
        ),
        BlocProvider(
          create: (ctx) => LiveStreamBloc(apiService: ctx.read<ApiService>())
            ..add(const LiveWatchStarted(schoolId: 'SCH001', classId: 'CLS10A')),
        ),
      ],
      child: BlocListener<LiveStreamBloc, LiveStreamState>(
        listener: (ctx, state) {
          if (state is LiveStreamActive) {
            ScaffoldMessenger.of(ctx).showSnackBar(
              SnackBar(
                backgroundColor: Colors.red.shade800,
                duration: const Duration(seconds: 8),
                content: Row(children: [
                  const Icon(Icons.fiber_manual_record, color: Colors.white, size: 14),
                  const SizedBox(width: 8),
                  Expanded(child: Text('${state.teacherName} is LIVE — ${state.subject}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                ]),
                action: SnackBarAction(
                  label: 'Join Class',
                  textColor: Colors.yellow,
                  onPressed: () => ctx.push('/live/SCH001/${state.classId}'),
                ),
              ),
            );
          }
        },
        child: Scaffold(
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          title: const Text("Student Hub", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          backgroundColor: Colors.transparent,
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.logout, color: Colors.white),
              onPressed: () => context.read<AuthBloc>().add(LoggedOut()),
            )
          ],
        ),
        body: AnimatedGradientBg(
          child: SafeArea(
            child: BlocBuilder<DashboardBloc, DashboardState>(
              builder: (context, state) {
                if (state is DashboardLoading || state is DashboardInitial) {
                  return const Center(child: CircularProgressIndicator(color: Colors.white));
                }
                if (state is DashboardError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(state.message, style: const TextStyle(color: Colors.white)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => _initDashboard(context, context.read<DashboardBloc>()),
                          child: const Text("Retry"),
                        )
                      ],
                    ),
                  );
                }
                if (state is DashboardLoaded) {
                  return SingleChildScrollView(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildIdentityHeader(context, state.profile),
                        const SizedBox(height: 20),
                        _buildNoticeBoardSection(context),
                        const SizedBox(height: 24),
                        const Text("Quick Actions", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 16),
                        _buildQuickActionGrid(context),
                        const SizedBox(height: 24),
                        _buildAttendanceRadar(context, state.attendance),
                        const SizedBox(height: 24),
                        const Text("Today's Routine", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 16),
                        _buildVerticalTimetable(context, state.timetable),
                        const SizedBox(height: 20),
                      ],
                    ),
                  );
                }
                return const SizedBox();
              },
            ),
          ),
        ),
      ),
    ),
  );
}

  void _initDashboard(BuildContext context, DashboardBloc bloc) async {
    final apiService = context.read<ApiService>();
    final studentId = await apiService.storage.read(key: 'student_id');
    if (studentId != null) {
      bloc.add(DashboardFetchStarted(studentId: studentId));
    } else {
      // Fallback for demo STU12345
      bloc.add(const DashboardFetchStarted(studentId: "STU12345"));
    }
  }

  Widget _buildIdentityHeader(BuildContext context, Map<String, dynamic> profile) {
    final bool isPaid = profile['fees_status'] == 'paid';
    return GlassCard(
      child: Row(
        children: [
          CircleAvatar(
            radius: 35,
            backgroundColor: Colors.white.withOpacity(0.3),
            child: const Icon(Icons.person, size: 40, color: Colors.white),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile['name'] ?? "Student Name",
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                Text(
                  "Class: ${profile['class_name'] ?? 'Class 10A'} | Roll: ${profile['roll_no'] ?? '12'}",
                  style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isPaid ? Colors.green.withOpacity(0.3) : Colors.red.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isPaid ? Colors.green : Colors.red, width: 0.5),
                  ),
                  child: Text(
                    isPaid ? "FEES PAID" : "FEES PENDING",
                    style: TextStyle(color: isPaid ? Colors.greenAccent : Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoticeBoardSection(BuildContext context) {
    return BlocBuilder<NoticeBloc, NoticeState>(
      builder: (context, state) {
        if (state is! NoticeConnected || state.notices.isEmpty) return const SizedBox.shrink();
        final latest = state.notices.first;
        return GlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.greenAccent, shape: BoxShape.circle))
                    .animate(onPlay: (c) => c.repeat()).scale(begin: const Offset(1,1), end: const Offset(1.5,1.5), duration: 600.ms).then().fadeOut(),
                const SizedBox(width: 8),
                const Text("📢 LIVE NOTICE", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1)),
              ]),
              const SizedBox(height: 8),
              Text(latest['title'] ?? 'New Announcement', style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
              if (latest['content'] != null) ...[const SizedBox(height: 4), Text(latest['content'], style: TextStyle(color: Colors.white.withOpacity(0.75), fontSize: 13))],
            ],
          ),
        ).animate().slideY(begin: -0.3, end: 0, curve: Curves.easeOut);
      },
    );
  }

  Widget _buildQuickActionGrid(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 4,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 0.80,
      children: [
        _buildActionItem(context, Icons.payment, "Pay Fees", AppColors.primaryPurple, () => context.push('/fees')),
        _buildActionItem(context, Icons.directions_bus, "Track Bus", AppColors.cyanBlue, () => context.push('/tracking/SCH001/BUS102')),
        _buildActionItem(context, Icons.calendar_month, "Attendance", AppColors.darkPink, () => context.push('/attendance/SCH001/STU12345')),
        _buildActionItem(context, Icons.school, "Vault", AppColors.lightPink, () => context.push('/vault/SCH001/STU12345')),
      ],
    );
  }

  Widget _buildActionItem(BuildContext context, IconData icon, String label, Color color, VoidCallback onTap) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 28),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceRadar(BuildContext context, Map<String, dynamic> attendance) {
    final double percentage = (attendance['percentage'] ?? 85.0).toDouble();
    return GlassCard(
      child: Row(
        children: [
          SizedBox(
            height: 80,
            width: 80,
            child: PieChart(
              PieChartData(
                sectionsSpace: 0,
                centerSpaceRadius: 28,
                sections: [
                  PieChartSectionData(
                    color: AppColors.cyanBlue,
                    value: percentage,
                    title: '',
                    radius: 8,
                  ),
                  PieChartSectionData(
                    color: Colors.white.withOpacity(0.1),
                    value: 100 - percentage,
                    title: '',
                    radius: 8,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 24),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Monthly Attendance", style: TextStyle(color: Colors.white70, fontSize: 14)),
              Text("${percentage.toInt()}% Present", style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVerticalTimetable(BuildContext context, Map<String, dynamic> timetable) {
    // Demo data if timetable is empty
    return GlassCard(
      child: Column(
        children: [
           _buildTimetableRow("09:00 AM", "Mathematics", "Room 101", true),
           _buildTimetableRow("10:00 AM", "Physics", "Lab 2", false),
           _buildTimetableRow("11:00 AM", "English Lit", "Room 105", false),
        ],
      ),
    );
  }

  Widget _buildTimetableRow(String time, String subject, String room, bool isOngoing) {
     return Container(
       margin: const EdgeInsets.symmetric(vertical: 6),
       padding: const EdgeInsets.all(12),
       decoration: BoxDecoration(
         borderRadius: BorderRadius.circular(12),
         border: isOngoing ? Border.all(color: AppColors.cyanBlue, width: 1.5) : null,
         color: isOngoing ? AppColors.cyanBlue.withOpacity(0.1) : Colors.white.withOpacity(0.05),
       ),
       child: Row(
         children: [
           Text(time, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
           const SizedBox(width: 16),
           Expanded(
             child: Column(
               crossAxisAlignment: CrossAxisAlignment.start,
               children: [
                 Text(subject, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                 Text(room, style: const TextStyle(color: Colors.white60, fontSize: 12)),
               ],
             ),
           ),
           if (isOngoing)
             Container(
               padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
               decoration: BoxDecoration(color: AppColors.cyanBlue, borderRadius: BorderRadius.circular(6)),
               child: const Text("ONGOING", style: TextStyle(color: Colors.black, fontSize: 8, fontWeight: FontWeight.bold)),
             ),
         ],
       ),
     );
  }
}
