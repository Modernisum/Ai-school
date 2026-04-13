import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/notifications/notifications_bloc.dart';
import '../../blocs/notifications/notifications_state.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';
import '../teacher/attendance_screen.dart';
import '../teacher/leave_management_screen.dart';
import '../teacher/timetable_screen.dart';
import '../common/salary_analytics_screen.dart';
import '../teacher/classroom_hub_screen.dart';
import '../community/staff_room_screen.dart';
import '../ai/teacher_ai_assistant.dart';
import '../responsibility/responsibility_list_screen.dart';

class TeacherDashboard extends StatefulWidget {
  const TeacherDashboard({super.key});

  @override
  State<TeacherDashboard> createState() => _TeacherDashboardState();
}

class _TeacherDashboardState extends State<TeacherDashboard> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(_currentIndex == 0 ? 'Teacher Hub' : 'Staff Community'),
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
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Notifications opened')));
                      },
                    ),
                    if (count > 0)
                      Positioned(
                        right: 8,
                        top: 8,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.redAccent,
                            shape: BoxShape.circle,
                          ),
                          child: Text('$count', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      )
                  ],
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () {
                context.read<AuthBloc>().add(LogoutRequested());
              },
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
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.1),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            backgroundColor: Colors.transparent,
            elevation: 0,
            selectedItemColor: Colors.white,
            unselectedItemColor: Colors.white60,
            onTap: (index) => setState(() => _currentIndex = index),
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.badge), label: 'LMS Hub'),
              BottomNavigationBarItem(icon: Icon(Icons.forum), label: 'Community'),
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
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        GlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Instructor HQ', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              const Text('Unified classroom management & AI-powered tools.'),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text("MY CLASSES (2026 Isolation)", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
        const SizedBox(height: 12),
        _buildClassCard(context, "Class 10-A", "Physics • Mathematics", "Class Teacher"),
        _buildClassCard(context, "Class 11-B", "Advanced Physics", "Subject Teacher"),
        const SizedBox(height: 24),
        
        // Responsibility Analytics Section
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
            _buildActionCard(context, Icons.how_to_reg, 'Live Attendance', onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen(classId: "10-A")));
            }),
            _buildActionCard(context, Icons.calendar_month, 'My Routine', onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const TimetableScreen()));
            }),
            _buildActionCard(context, Icons.beach_access, 'Leave Panel', onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaveManagementScreen()));
            }),
            _buildActionCard(
                  context,
                  Icons.assignment,
                  "Responsibilities",
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => const ResponsibilityListScreen()));
                  },
                ),
            _buildActionCard(
                  context,
                  Icons.receipt_long,
                  "Salary Analytics",
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => const SalaryAnalyticsScreen()));
                  },
                ),
          ],
        )
      ],
    );
  }

  Widget _buildClassCard(BuildContext context, String className, String subjects, String role) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ClassroomHubScreen(className: className, role: role),
            ),
          );
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
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(role.toUpperCase(), style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 8),
                  const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.white70),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResponsibilityAnalyticsSection(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        // Total Responsibilities Card
        GlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.blueAccent.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.assignment, size: 24, color: Colors.blueAccent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Total", style: TextStyle(fontSize: 12, color: Colors.white70)),
                        Text("5", style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        )),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text("Responsibilities", style: TextStyle(fontSize: 12, color: Colors.white70)),
            ],
          ),
        ),
        
        // Assigned Spaces Card
        GlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.greenAccent.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.location_on, size: 24, color: Colors.greenAccent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Spaces", style: TextStyle(fontSize: 12, color: Colors.white70)),
                        Text("3", style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        )),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text("Assigned", style: TextStyle(fontSize: 12, color: Colors.white70)),
            ],
          ),
        ),
        
        // Revenue Impact Card
        GlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.attach_money, size: 24, color: Colors.amber),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Revenue", style: TextStyle(fontSize: 12, color: Colors.white70)),
                        Text("₹12.5K", style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        )),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text("Monthly Impact", style: TextStyle(fontSize: 12, color: Colors.white70)),
            ],
          ),
        ),
        
        // Workload Distribution Card
        GlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.purpleAccent.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.pie_chart, size: 24, color: Colors.purpleAccent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Workload", style: TextStyle(fontSize: 12, color: Colors.white70)),
                        Text("65%", style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        )),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text("Utilization", style: TextStyle(fontSize: 12, color: Colors.white70)),
            ],
          ),
        ),
      ],
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
}

