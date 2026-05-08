import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';
import '../management/leave_approvals_screen.dart';
import '../management/broadcast_notice_screen.dart';
import '../management/salary_management_screen.dart';

class ManagementDashboard extends StatelessWidget {
  const ManagementDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Admin Dashboard'),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () => context.read<AuthBloc>().add(LogoutRequested()),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Welcome, Principal', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  const Text('Manage staff, view approvals, and broadcast notices.'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
              children: [
                _buildActionCard(context, Icons.approval, 'Leave Approvals', Colors.orange, onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaveApprovalsScreen()));
                }),
                _buildActionCard(context, Icons.campaign, 'Broadcast Notice', Colors.redAccent, onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const BroadcastNoticeScreen()));
                }),
                _buildActionCard(context, Icons.people, 'All Staff', Colors.blueAccent),
                _buildActionCard(context, Icons.receipt_long, 'Payroll Overview', Colors.green, onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const SalaryManagementScreen()));
                }),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard(BuildContext context, IconData icon, String label, Color iconColor, {VoidCallback? onTap}) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap ?? () {},
        borderRadius: BorderRadius.circular(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 40, color: iconColor),
            const SizedBox(height: 12),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

