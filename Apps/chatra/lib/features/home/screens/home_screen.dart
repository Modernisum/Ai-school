import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/features/dashboard/bloc/dashboard_bloc.dart';
import 'package:chatra/features/dashboard/bloc/dashboard_event.dart';
import 'package:chatra/features/dashboard/bloc/dashboard_state.dart';
import 'package:chatra/features/auth/bloc/auth_bloc.dart';
import 'package:chatra/features/auth/bloc/auth_event.dart';
import 'package:chatra/features/notices/bloc/notice_bloc.dart';
import 'package:chatra/features/notices/bloc/notice_state.dart';
import 'package:chatra/features/notices/bloc/notice_event.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/features/home/widgets/spotlight_search_widget.dart';
import 'package:chatra/features/home/widgets/timetable_widget.dart';
import 'package:chatra/features/home/widgets/dashboard_stats_widget.dart';
import 'package:chatra/features/home/widgets/quick_action_grid.dart';
import 'package:chatra/features/home/widgets/attendance_radar_widget.dart';
import 'package:chatra/features/home/widgets/fees_preview_widget.dart';
import 'package:chatra/features/home/widgets/home_greeting_widget.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isSearchOpen = false;
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  String _searchQuery = '';

  static const List<Map<String, dynamic>> _searchItems = [
    {'title': 'Pay Fees', 'icon': Icons.payment_rounded, 'route': '/fees', 'keywords': 'pay money fees transaction'},
    {'title': 'Track Bus', 'icon': Icons.gps_fixed_rounded, 'route': '/bus-tracking', 'keywords': 'gps bus transport live'},
    {'title': 'Timetable', 'icon': Icons.calendar_today_rounded, 'route': '/dashboard', 'keywords': 'schedule class time'},
    {'title': 'Attendance', 'icon': Icons.check_circle_outline_rounded, 'route': '/attendance', 'keywords': 'absent present record'},
    {'title': 'Leave Request', 'icon': Icons.airplane_ticket_rounded, 'route': '/leave', 'keywords': 'leave holiday vacation absence'},
    {'title': 'Vault', 'icon': Icons.inventory_2_rounded, 'route': '/vault', 'keywords': 'documents reports storage'},
    {'title': 'Profile', 'icon': Icons.person_outline_rounded, 'route': '/profile', 'keywords': 'me account settings'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Future.delayed(const Duration(milliseconds: 300), () {
          if (mounted) _refreshDashboard();
        });
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _refreshDashboard() async {
    try {
      final studentId = await context.read<ApiService>().storage.read(key: 'student_id');
      if (studentId != null && studentId.isNotEmpty && mounted) {
        context.read<DashboardBloc>().add(DashboardFetchStarted(studentId: studentId));
      }
    } catch (e) {
      debugPrint('_refreshDashboard error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBrand,
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          RepaintBoundary(
            child: BlocListener<NoticeBloc, NoticeState>(
              listener: (context, state) {
                if (state is NoticeConnected && state.latestUnread != null) {
                  final notice = state.latestUnread!;
                  _showNoticePopup(
                    notice['title'] ?? 'New Announcement',
                    notice['message'] ?? 'Check the notice board for details.',
                  );
                  context.read<NoticeBloc>().add(const NoticeDismissed(''));
                }
              },
              child: BlocBuilder<DashboardBloc, DashboardState>(
                builder: (context, state) {
                  if (state is DashboardLoading || state is DashboardInitial) {
                    return Center(child: CircularProgressIndicator(color: AppColors.accentTeal));
                  }
                  if (state is DashboardError) {
                    return Center(child: Text(state.message, style: const TextStyle(color: Colors.white)));
                  }
                  if (state is DashboardLoaded) {
                    return _buildContent(state);
                  }
                  return const SizedBox.shrink();
                },
              ),
            ),
          ),
          _buildAppBar(),
          if (_isSearchOpen)
            SpotlightSearchWidget(
              isSearchOpen: _isSearchOpen,
              searchController: _searchController,
              searchFocusNode: _searchFocusNode,
              searchQuery: _searchQuery,
              searchItems: _searchItems,
              onSearchToggle: (v) => setState(() => _isSearchOpen = v),
              onSearchQueryChanged: (v) => setState(() => _searchQuery = v),
            ),
        ],
      ),
    );
  }

  Widget _buildAppBar() {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: RepaintBoundary(
        child: Container(
          height: 110,
          padding: const EdgeInsets.fromLTRB(20, 50, 20, 10),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.3),
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05))),
          ),
          child: GestureDetector(
            onTap: () {
              setState(() => _isSearchOpen = true);
              _searchFocusNode.requestFocus();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.search_rounded, color: Colors.white60, size: 20),
                  SizedBox(width: 10),
                  Text('Spotlight Search', style: TextStyle(color: Colors.white38, fontSize: 15)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(DashboardLoaded state) {
    final dashboardData = {
      'profile': state.profile,
      'attendance': state.attendance,
      'timetable': state.timetable,
      'fees': state.fees,
    };
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 125, 16, 120),
      child: RepaintBoundary(
        child: Column(
          children: [
            HomeGreetingWidget(profile: state.profile),
            const SizedBox(height: 16),
            DashboardStatsWidget(dashboardData: dashboardData),
            const SizedBox(height: 16),
            TimetableWidget(timetable: state.timetable),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: AttendanceRadarWidget(attendance: state.attendance)),
                const SizedBox(width: 16),
                Expanded(child: FeesPreviewWidget(fees: state.fees)),
              ],
            ),
            const SizedBox(height: 16),
            const QuickActionGrid(),
          ],
        ),
      ),
    );
  }

  void _showNoticePopup(String title, String message) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Notice',
      pageBuilder: (_, __, ___) => const SizedBox(),
      transitionBuilder: (context, anim1, anim2, child) {
        return Transform.scale(
          scale: anim1.value,
          child: Opacity(
            opacity: anim1.value,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: GlassCard(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.campaign_rounded, color: AppColors.accentTeal, size: 48),
                      const SizedBox(height: 16),
                      Text(title, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70, fontSize: 14)),
                      const SizedBox(height: 24),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text('Got it', style: TextStyle(color: AppColors.accentTeal)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
