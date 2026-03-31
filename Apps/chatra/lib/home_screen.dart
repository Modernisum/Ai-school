import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'dart:ui';

import 'api_service.dart';
import 'logic/dashboard/dashboard_bloc.dart';
import 'logic/dashboard/dashboard_event.dart';
import 'logic/dashboard/dashboard_state.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/auth/auth_event.dart';
import 'logic/notices/notice_bloc.dart';
import 'logic/notices/notice_state.dart';
import 'logic/notices/notice_event.dart';
import 'widgets/glass_card.dart';
import 'theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isSearchOpen = false;
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  String _searchQuery = "";

  final List<Map<String, dynamic>> _searchItems = [
    {"title": "Pay Fees", "icon": Icons.payment_rounded, "route": "/fees", "keywords": "pay, money, fees, transaction"},
    {"title": "Track Bus", "icon": Icons.gps_fixed_rounded, "route": "/bus-tracking", "keywords": "gps, bus, transport, live"},
    {"title": "Timetable", "icon": Icons.calendar_today_rounded, "route": "/dashboard", "keywords": "schedule, class, time"},
    {"title": "Attendance", "icon": Icons.check_circle_outline_rounded, "route": "/attendance", "keywords": "absent, present, record"},
    {"title": "Vault", "icon": Icons.inventory_2_rounded, "route": "/vault", "keywords": "documents, reports, storage"},
    {"title": "Profile", "icon": Icons.person_outline_rounded, "route": "/profile", "keywords": "me, account, settings"},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _refreshDashboard();
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
    final apiService = context.read<ApiService>();
    final bloc = context.read<DashboardBloc>();
    
    try {
      final studentId = await apiService.storage.read(key: 'student_id');
      if (studentId != null && studentId.isNotEmpty) {
        bloc.add(DashboardFetchStarted(studentId: studentId));
      } else {
        debugPrint("No student_id found in secure storage. Skipping dashboard fetch.");
      }
    } catch (e) {
      debugPrint("Error in _refreshDashboard: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBrand,
      extendBodyBehindAppBar: true,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.primaryBrand,
              Color(0xFF1E1440), // Darker shade for depth
              AppColors.primaryBrand,
            ],
          ),
        ),
        child: Stack(
          children: [
            // 1. Main Scrollable Content
            BlocListener<NoticeBloc, NoticeState>(
              listener: (context, state) {
                if (state is NoticeConnected && state.latestUnread != null) {
                  final notice = state.latestUnread!;
                  _showNoticePopup(
                    notice['title'] ?? 'New Announcement',
                    notice['message'] ?? 'Check the notice board for details.',
                  );
                  context.read<NoticeBloc>().add(const NoticeDismissed(""));
                }
              },
              child: RefreshIndicator(
                onRefresh: () async {
                  _refreshDashboard();
                  await Future.delayed(const Duration(seconds: 1));
                },
                color: AppColors.accentTeal,
                backgroundColor: AppColors.primaryBrand,
                child: BlocBuilder<DashboardBloc, DashboardState>(
                  builder: (context, state) {
                    if (state is DashboardLoading || state is DashboardInitial) {
                      return _buildLoadingState();
                    }
                    if (state is DashboardError) {
                      return _buildErrorState(state.message);
                    }
                    if (state is DashboardLoaded) {
                      return _buildBentoContent(state);
                    }
                    return const SizedBox.shrink();
                  },
                ),
              ),
            ),

            // 2. Custom Glass AppBar
            _buildGlassAppBar(),

            // 3. Spotlight Search Overlay
            if (_isSearchOpen) _buildSpotlightOverlay(),
          ],
        ),
      ),
    );
  }

  Widget _buildGlassAppBar() {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: RepaintBoundary(
        child: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
            child: Container(
              height: 110,
              padding: const EdgeInsets.fromLTRB(20, 50, 20, 10),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.2),
                border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.05))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _isSearchOpen = true);
                        _searchFocusNode.requestFocus();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search_rounded, color: Colors.white60, size: 20),
                            const SizedBox(width: 10),
                            Text("Spotlight Search", style: GoogleFonts.outfit(color: Colors.white38, fontSize: 15)),
                          ],
                        ),
                      ),
                    ).animate().fadeIn(duration: 400.ms),
                  ),
                  const SizedBox(width: 15),
                  _buildActionButton(Icons.logout_rounded, () => context.read<AuthBloc>().add(LoggedOut())).animate().fadeIn(duration: 400.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSpotlightOverlay() {
    final filtered = _searchItems.where((item) {
      final query = _searchQuery.toLowerCase();
      return item['title'].toString().toLowerCase().contains(query) || 
             item['keywords'].toString().toLowerCase().contains(query);
    }).toList();

    return Positioned.fill(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: GestureDetector(
          onTap: () => setState(() => _isSearchOpen = false),
          child: Container(
            color: Colors.black.withValues(alpha: 0.7),
            padding: const EdgeInsets.fromLTRB(20, 60, 20, 0),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  focusNode: _searchFocusNode,
                  style: GoogleFonts.outfit(color: Colors.white, fontSize: 20),
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: "Search anything...",
                    hintStyle: GoogleFonts.outfit(color: Colors.white38),
                    prefixIcon: const Icon(Icons.search_rounded, color: AppColors.accentTeal),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white38),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {
                          _searchQuery = "";
                          _isSearchOpen = false;
                        });
                      },
                    ),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.05),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: AppColors.accentTeal)),
                  ),
                  ).animate().fadeIn(duration: 200.ms),
                
                const SizedBox(height: 20),

                Expanded(
                  child: ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      return GlassCard(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                        child: ListTile(
                          leading: Icon(item['icon'], color: AppColors.accentTeal),
                          title: Text(item['title'], style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                          trailing: const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white24, size: 14),
                          onTap: () {
                            setState(() => _isSearchOpen = false);
                            context.push(item['route']);
                          },
                        ),
                      ).animate().fadeIn(delay: (30 * index).ms);
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }


  Widget _buildBentoContent(DashboardLoaded state) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 125, 16, 120),
      child: Column(
        children: [
          _buildTimetableWidget(state.timetable),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildAttendanceRadar(state.attendance)),
              const SizedBox(width: 16),
              Expanded(child: _buildFeesWidget(state.fees)),
            ],
          ),
          const SizedBox(height: 16),
          _buildQuickActionGrid(),
        ],
      ),
    );
  }

  Widget _buildActionButton(IconData icon, VoidCallback onTap) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white10),
      ),
      child: IconButton(
        icon: Icon(icon, color: Colors.white, size: 20),
        onPressed: onTap,
      ),
    );
  }

  void _showNoticePopup(String title, String message) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: "Notice",
      pageBuilder: (context, anim1, anim2) => const SizedBox(),
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
                      const Icon(Icons.campaign_rounded, color: AppColors.accentTeal, size: 48),
                      const SizedBox(height: 16),
                      Text(title, style: GoogleFonts.outfit(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text(message, textAlign: TextAlign.center, style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14)),
                      const SizedBox(height: 24),
                      TextButton(onPressed: () => Navigator.pop(context), 
                        child: const Text("Got it", style: TextStyle(color: AppColors.accentTeal))),
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

  Widget _buildTimetableWidget(Map<String, dynamic> timetable) {
    final classes = (timetable['data'] as List?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];

    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Today's Timeline", style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: AppColors.accentSage.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.accentSage.withValues(alpha: 0.2))),
                child: Row(
                  children: [
                    const Icon(Icons.circle, color: AppColors.accentSage, size: 8).animate(onPlay: (c) => c.repeat()).scale(duration: 2.seconds, begin: const Offset(0.8, 0.8), end: const Offset(1.2, 1.2)).fadeOut(),
                    const SizedBox(width: 6),
                    Text("LIVE TIMETABLE", style: GoogleFonts.outfit(color: AppColors.accentSage, fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (classes.isEmpty)
            Text("No classes scheduled for today.", style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14)),
          for (var c in classes.take(4))
            _buildTimelineItem(
              "${c['start_time'] ?? ''} - ${c['end_time'] ?? ''}",
              c['subject_name']?.toString() ?? "Unknown Subject",
              c['teacher_name']?.toString() ?? "Teacher",
              false,
            ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildTimelineItem(String time, String subject, String teacher, bool isActive) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          SizedBox(width: 70, child: Text(time, style: GoogleFonts.outfit(color: isActive ? Colors.white : Colors.white24, fontSize: 12, fontWeight: FontWeight.bold))),
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(color: isActive ? AppColors.accentTeal : Colors.white10, shape: BoxShape.circle, border: Border.all(color: isActive ? Colors.white24 : Colors.transparent)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(subject, style: GoogleFonts.outfit(color: isActive ? Colors.white : Colors.white38, fontSize: 15, fontWeight: FontWeight.w600)),
                Text(teacher, style: GoogleFonts.outfit(color: Colors.white24, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceRadar(Map<String, dynamic> attendance) {
    final data = attendance['data'] as List? ?? [];
    int present = 0;
    for (var r in data) {
      if (r['status']?.toString().toLowerCase() == 'present') present++;
    }
    double pct = data.isEmpty ? 0 : (present / data.length) * 100;

    return GlassCard(
      height: 180,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Attendance", style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold)),
          const Spacer(),
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 80,
                  height: 80,
                  child: CircularProgressIndicator(
                    value: data.isEmpty ? 0 : present / data.length,
                    strokeWidth: 8,
                    backgroundColor: Colors.white10,
                    color: AppColors.accentTeal,
                  ),
                ),
                Text("${pct.toStringAsFixed(0)}%", style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          const Spacer(),
          Center(
            child: Text("${data.length} total days", style: GoogleFonts.outfit(color: Colors.white38, fontSize: 12)),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms);
  }

  Widget _buildFeesWidget(Map<String, dynamic> fees) {
    final data = fees['data'];
    double pending = 0;
    if (data is List) {
      for (var f in data) {
        if (f['status'] != 'paid') pending += (f['amount'] as num?)?.toDouble() ?? 0;
      }
    } else if (data is Map) {
      pending = (data['pending_amount'] as num?)?.toDouble() ?? 0;
    }

    return GlassCard(
      height: 180,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Wallet/Fees", style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold)),
          const Spacer(),
          Text("₹${pending.toStringAsFixed(0)}", style: GoogleFonts.outfit(color: AppColors.accentCream, fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: -1)),
          Text("Pending Balance", style: GoogleFonts.outfit(color: Colors.redAccent.withValues(alpha: 0.6), fontSize: 11)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: AppColors.accentTeal.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text("Pay Now", style: GoogleFonts.outfit(color: AppColors.accentTeal, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_forward_ios_rounded, color: AppColors.accentTeal, size: 10),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 150.ms);
  }

  Widget _buildQuickActionGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 1.4,
      children: [
        _buildActionItem(Icons.gps_fixed_rounded, "Track Bus", AppColors.accentSage),
        _buildActionItem(Icons.calendar_month_rounded, "History", AppColors.accentTeal),
        _buildActionItem(Icons.inventory_2_rounded, "Vault", AppColors.accentCream),
        _buildActionItem(Icons.support_agent_rounded, "Help", AppColors.accentTeal),
      ],
    );
  }

  Widget _buildActionItem(IconData icon, String label, Color color) {
    return GlassCard(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(label, style: GoogleFonts.outfit(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms);
  }

  Widget _buildLoadingState() {
    return Center(child: const CircularProgressIndicator(color: AppColors.accentTeal));
  }

  Widget _buildErrorState(String message) {
    return Center(child: Text(message, style: const TextStyle(color: Colors.white)));
  }
}
