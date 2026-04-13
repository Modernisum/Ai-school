import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:chatra/features/attendance/bloc/attendance_history_bloc.dart';
import 'package:chatra/features/attendance/bloc/attendance_history_event.dart';
import 'package:chatra/features/attendance/bloc/attendance_history_state.dart';
import 'package:chatra/features/attendance/screens/qr_scanner_screen.dart';
import 'package:chatra/features/attendance/services/offline_sync_service.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/widgets/animated_gradient_bg.dart';
import 'package:chatra/core/network/api_service.dart';

class AttendanceCalendarScreen extends StatefulWidget {
  final String schoolId;
  final String studentId;

  const AttendanceCalendarScreen({
    super.key,
    required this.schoolId,
    required this.studentId,
  });

  @override
  State<AttendanceCalendarScreen> createState() => _AttendanceCalendarScreenState();
}

class _AttendanceCalendarScreenState extends State<AttendanceCalendarScreen> {
  DateTime _focusedMonth = DateTime.now();
  int _pendingCount = 0;

  @override
  void initState() {
    super.initState();
    _loadPendingCount();
  }

  Future<void> _loadPendingCount() async {
    final count = await OfflineSyncService.instance.getPendingCount();
    if (mounted) setState(() => _pendingCount = count);
  }

  Future<void> _syncOffline() async {
    final (synced, failed) = await OfflineSyncService.instance.syncPending();
    await _loadPendingCount();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(synced > 0
              ? '$synced records synced${failed > 0 ? ', $failed failed' : ''}'
              : 'No records to sync'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (ctx) => AttendanceHistoryBloc(apiService: ctx.read<ApiService>())
        ..add(AttendanceHistoryFetchStarted(schoolId: widget.schoolId, studentId: widget.studentId)),
      child: Scaffold(
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text("Attendance Record", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          iconTheme: const IconThemeData(color: Colors.white),
          actions: [
            // Offline sync indicator
            if (_pendingCount > 0)
              IconButton(
                icon: Stack(
                  children: [
                    const Icon(Icons.sync_rounded, color: Colors.amberAccent),
                    Positioned(
                      right: 0, top: 0,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                        child: Text('$_pendingCount', style: const TextStyle(color: Colors.white, fontSize: 9)),
                      ),
                    )
                  ],
                ),
                tooltip: 'Sync offline records',
                onPressed: _syncOffline,
              ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () async {
            final result = await Navigator.push<bool>(
              context,
              MaterialPageRoute(builder: (_) => const QrAttendanceScreen()),
            );
            if (result == true) {
              // Refresh attendance after successful scan
              if (context.mounted) {
                context.read<AttendanceHistoryBloc>().add(
                  AttendanceHistoryFetchStarted(
                    schoolId: widget.schoolId,
                    studentId: widget.studentId,
                  ),
                );
              }
            }
          },
          icon: const Icon(Icons.qr_code_scanner_rounded),
          label: const Text('Scan QR'),
          backgroundColor: Colors.indigoAccent,
        ),
        body: AnimatedGradientBg(
          child: BlocBuilder<AttendanceHistoryBloc, AttendanceHistoryState>(
            builder: (context, state) {
              if (state is AttendanceHistoryLoading) {
                return const Center(child: CircularProgressIndicator(color: Colors.white));
              }
              if (state is AttendanceHistoryLoaded) {
                return SafeArea(
                  child: Column(
                    children: [
                      _buildRadarHeader(state).animate().fadeIn(duration: 500.ms),
                      _buildMonthNav(),
                      Expanded(child: _buildCalendarGrid(state.records)),
                      _buildLegend(),
                    ],
                  ),
                );
              }
              return const Center(child: Text("Loading your record...", style: TextStyle(color: Colors.white)));
            },
          ),
        ),
      ),
    );
  }

  Widget _buildRadarHeader(AttendanceHistoryLoaded state) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          SizedBox(
            height: 80, width: 80,
            child: PieChart(PieChartData(
              sectionsSpace: 0,
              centerSpaceRadius: 28,
              sections: [
                PieChartSectionData(color: Colors.greenAccent, value: state.percentage, title: '', radius: 10),
                PieChartSectionData(color: Colors.white.withOpacity(0.1), value: 100 - state.percentage, title: '', radius: 10),
              ],
            )),
          ),
          const SizedBox(width: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("${state.percentage.toInt()}% Present",
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
              Text("${state.totalPresent} / ${state.totalDays} Days",
                  style: TextStyle(color: Colors.white.withOpacity(0.7))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMonthNav() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left, color: Colors.white),
            onPressed: () => setState(() => _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1)),
          ),
          Text(
            "${_monthName(_focusedMonth.month)} ${_focusedMonth.year}",
            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right, color: Colors.white),
            onPressed: () => setState(() => _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1)),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarGrid(Map<String, String> records) {
    final firstDay = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final daysInMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;
    final weekdayOffset = firstDay.weekday % 7; // Sunday = 0

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 7,
          mainAxisSpacing: 6,
          crossAxisSpacing: 6,
        ),
        itemCount: weekdayOffset + daysInMonth,
        itemBuilder: (context, index) {
          if (index < weekdayOffset) return const SizedBox();
          final day = index - weekdayOffset + 1;
          final dateStr = "${_focusedMonth.year}-${_focusedMonth.month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}";
          final status = records[dateStr] ?? 'unknown';
          return _buildDayCell(day, status);
        },
      ),
    );
  }

  Widget _buildDayCell(int day, String status) {
    Color dotColor;
    Color bgColor;
    switch (status) {
      case 'present':
        dotColor = Colors.greenAccent;
        bgColor = Colors.green.withOpacity(0.15);
        break;
      case 'absent':
        dotColor = Colors.redAccent;
        bgColor = Colors.red.withOpacity(0.15);
        break;
      case 'holiday':
        dotColor = Colors.grey;
        bgColor = Colors.white.withOpacity(0.05);
        break;
      default:
        dotColor = Colors.transparent;
        bgColor = Colors.white.withOpacity(0.05);
    }

    return Container(
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text("$day", style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Container(width: 6, height: 6, decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
        ],
      ),
    );
  }

  Widget _buildLegend() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _legendDot(Colors.greenAccent, "Present"),
          _legendDot(Colors.redAccent, "Absent"),
          _legendDot(Colors.grey, "Holiday"),
        ],
      ),
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(children: [
      Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      const SizedBox(width: 6),
      Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
    ]);
  }

  String _monthName(int month) {
    const names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return names[month];
  }
}
