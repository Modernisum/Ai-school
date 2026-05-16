import "package:flutter/material.dart";
import "package:flutter_bloc/flutter_bloc.dart";
import "package:go_router/go_router.dart";
import "package:flutter_secure_storage/flutter_secure_storage.dart";
import "../../api_service.dart";
import "../../blocs/auth/auth_bloc.dart";
import "../../blocs/auth/auth_event.dart";
import "../../blocs/notifications/notifications_bloc.dart";
import "../../blocs/notifications/notifications_state.dart";
import "../../core/widgets/animated_gradient_bg.dart";
import "../../core/widgets/glass_card.dart";
import "../teacher/attendance_screen.dart";
import "../teacher/leave_management_screen.dart";
import "../teacher/timetable_screen.dart";
import "../common/salary_analytics_screen.dart";
import "../teacher/classroom_hub_screen.dart";
import "../community/staff_room_screen.dart";
import "../ai/teacher_ai_assistant.dart";
import "../responsibility/responsibility_list_screen.dart";

class TeacherDashboard extends StatefulWidget {
  const TeacherDashboard({super.key});

  @override
  State<TeacherDashboard> createState() => _TeacherDashboardState();
}

class _TeacherDashboardState extends State<TeacherDashboard> {
  final _storage = const FlutterSecureStorage();
  final _api = ApiService();
  
  int _currentIndex = 0;

  // Real responsibility analytics data
  List<dynamic>? _responsibilities;
  Map<String, dynamic>? _overviewData;
  bool _loadingOverview = true;
  String? _overviewError;

  @override
  void initState() {
    super.initState();
    _loadOverview();
  }

  Future<void> _loadOverview() async {
    try {
      final schoolId = await _storage.read(key: "school_id");
      final employeeId = await _storage.read(key: "user_id");
      if (schoolId == null || employeeId == null) return;

      final results = await Future.wait([
        _api.getEmployeeResponsibilities(schoolId, employeeId),
        _api.getTeacherResponsibilityOverview(schoolId, employeeId),
      ]);

      if (!mounted) return;
      setState(() {
        _responsibilities = results[0] as List<dynamic>?;
        _overviewData = results[1] as Map<String, dynamic>?;
        _loadingOverview = false;
      });
    } catch (e) {
      if (mounted) setState(() { _loadingOverview = false; _overviewError = e.toString(); });
    }
  }

  // ── Computed analytics from real data ──
  int get _totalResponsibilities => _responsibilities?.length ?? 0;
  
  int get _totalSpaces {
    if (_responsibilities == null) return 0;
    final spaceSet = <String>{};
    for (final r in _responsibilities!) {
      final spaces = r["space_ids"];
      if (spaces is List) spaceSet.addAll(spaces.cast<String>());
    }
    return spaceSet.length;
  }

  double get _totalRevenue {
    if (_responsibilities == null) return 0;
    double total = 0;
    for (final r in _responsibilities!) {
      final price = (r["monthly_price"] ?? 0).toDouble();
      final spaces = r["space_ids"];
      total += price * (spaces is List ? spaces.length : 0);
    }
    return total;
  }

  int get _workloadPercent {
    if (_totalResponsibilities == 0) return 0;
    // If teacher has > 0 responsibilities, show proportional utilization
    final maxExpected = 8; // reasonable max responsibilities per teacher
    return ((_totalResponsibilities / maxExpected) * 100).round().clamp(0, 100);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(_currentIndex == 0 ? "Teacher Hub" : "Staff Community"),
          actions: [
            BlocBuilder<NotificationsBloc, NotificationsState>(
              builder: (context, state) {
                int count = 0;
                if (state is NotificationsConnected) count = state.unreadCount;
                return Stack(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.notifications),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Notifications opened")));
                      },
                    ),
                    if (count > 0)
                      Positioned(
                        right: 8,
                        top: 8,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                          child: Text("$count", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      )
                  ],
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () => context.read<AuthBloc>().add(LogoutRequested()),
            ),
          ],
        ),
        body: IndexedStack(
          index: _currentIndex,
          children: [
            _buildLmsHub(context),
            _buildCommunitySpace(),
          ],
        ),
        bottomNavigationBar: Container(
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), borderRadius: const BorderRadius.vertical(top: Radius.circular(20))),
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            backgroundColor: Colors.transparent,
            elevation: 0,
            selectedItemColor: Colors.white,
            unselectedItemColor: Colors.white60,
            onTap: (index) => setState(() => _currentIndex = index),
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.badge), label: "LMS Hub"),
              BottomNavigationBarItem(icon: Icon(Icons.forum), label: "Community"),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton(
          backgroundColor: Colors.white.withOpacity(0.2),
          elevation: 0,
          child: Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(colors: [Color(0xFFB298E7), Color(0xFFF5B8D5)]),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, spreadRadius: 2)],
            ),
            child: const Icon(Icons.psychology, color: Colors.white),
          ),
          onPressed: () {
            showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.transparent,
              builder: (context) => const TeacherAiAssistant(),
            );
          },
        ),
      ),
    );
  }

  Widget _buildLmsHub(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadOverview,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Instructor HQ", style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                const Text("Unified classroom management & AI-powered tools."),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text("MY CLASSES (2026 Isolation)", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
          const SizedBox(height: 12),
          // Dynamic class cards from real data
          if (_responsibilities != null)
            ..._buildClassCardsFromResponsibilities()
          else
            _buildClassCard(context, "Class 10-A", "Physics • Mathematics", "Class Teacher"),
          const SizedBox(height: 24),
          
          // Real Responsibility Analytics Section
          const Text("RESPONSIBILITY ANALYTICS", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
          const SizedBox(height: 12),
          _buildResponsibilityAnalyticsSection(context),
          const SizedBox(height: 24),
          
          const Text("QUICK ACCESS", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 1.2,
            children: [
              _buildActionCard(context, Icons.how_to_reg, "Live Attendance", onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen(classId: "10-A")));
              }),
              _buildActionCard(context, Icons.calendar_month, "My Routine", onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const TimetableScreen()));
              }),
              _buildActionCard(context, Icons.beach_access, "Leave Panel", onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaveManagementScreen()));
              }),
              _buildActionCard(context, Icons.assignment, "Responsibilities", onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (context) => const ResponsibilityListScreen()));
              }),
              _buildActionCard(context, Icons.receipt_long, "Salary Analytics", onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (context) => const SalaryAnalyticsScreen()));
              }),
            ],
          )
        ],
      ),
    );
  }

  /// Builds class cards from assigned responsibilities + spaces
  List<Widget> _buildClassCardsFromResponsibilities() {
    final cards = <Widget>[];
    if (_responsibilities == null || _responsibilities!.isEmpty) {
      cards.add(_buildClassCard(context, "No classes assigned", "Talk to admin", ""));
      return cards;
    }
    // Get unique spaces from all responsibilities
    final spaceMap = <String, List<String>>{};
    for (final r in _responsibilities!) {
      final name = r["name"] ?? "Unknown";
      final spaces = r["space_ids"];
      if (spaces is List) {
        for (final s in spaces) {
          spaceMap.putIfAbsent(s.toString(), () => []).add(name.toString());
        }
      }
    }
    if (spaceMap.isEmpty) {
      cards.add(_buildClassCard(context, "No spaces assigned", "Talk to admin", ""));
      return cards;
    }
    for (final entry in spaceMap.entries) {
      final subjects = entry.value.join(" • ");
      cards.add(_buildClassCard(context, entry.key, subjects, "Assigned"));
    }
    return cards;
  }

  Widget _buildClassCard(BuildContext context, String className, String subjects, String role) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: className.contains("No ") ? null : () {
          Navigator.push(context, MaterialPageRoute(
            builder: (_) => ClassroomHubScreen(className: className, role: role),
          ));
        },
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: role == "Class Teacher" ? Colors.amber : Colors.indigoAccent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.groups, color: Colors.white),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(className, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    Text(subjects, style: const TextStyle(fontSize: 12, color: Colors.black54)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                    child: Text(role.toUpperCase(), style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold)),
                  ),
                  if (!className.contains("No "))
                    ...[
                      const SizedBox(height: 8),
                      const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.white70),
                    ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResponsibilityAnalyticsSection(BuildContext context) {
    if (_loadingOverview) {
      return GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.5,
        children: List.generate(4, (_) => GlassCard(
          padding: const EdgeInsets.all(16),
          child: const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFB298E7))),
        )),
      );
    }

    if (_overviewError != null && _responsibilities == null) {
      return GlassCard(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const Text("Failed to load analytics", style: TextStyle(color: Colors.redAccent)),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _loadOverview,
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFB298E7)),
                child: const Text("Retry"),
              ),
            ],
          ),
        ),
      );
    }

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildMetricCard("Total", "$_totalResponsibilities", Icons.assignment, Colors.blueAccent, "Responsibilities"),
        _buildMetricCard("Spaces", "$_totalSpaces", Icons.location_on, Colors.greenAccent, "Assigned"),
        _buildMetricCard("Revenue", "₹${_formatAmount(_totalRevenue)}", Icons.attach_money, Colors.amber, "Monthly Impact"),
        _buildMetricCard("Workload", "$_workloadPercent%", Icons.pie_chart, Colors.purpleAccent, "Utilization"),
      ],
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color, String subtitle) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: color.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, size: 24, color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 12, color: Colors.white70)),
                    Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold, color: Colors.white)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.white70)),
        ],
      ),
    );
  }

  Widget _buildCommunitySpace() {
    return const StaffRoomScreen();
  }

  Widget _buildActionCard(BuildContext context, IconData icon, String label, {VoidCallback? onTap}) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap ?? () {},
        borderRadius: BorderRadius.circular(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: Theme.of(context).primaryColor),
            const SizedBox(height: 8),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  String _formatAmount(double amount) {
    if (amount >= 100000) return "${(amount / 100000).toStringAsFixed(1)}L";
    if (amount >= 1000) return "${(amount / 1000).toStringAsFixed(1)}K";
    return amount.toStringAsFixed(0);
  }
}
