import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:ui';
import 'theme/app_theme.dart';
import 'home_screen.dart';
import 'classroom_screen.dart';
import 'announcement_screen.dart';
import 'account_screen.dart';

class NavbarScreen extends StatefulWidget {
  const NavbarScreen({super.key});

  @override
  State<NavbarScreen> createState() => _NavbarScreenState();
}

class _NavbarScreenState extends State<NavbarScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const ClassroomScreen(),
    const AnnouncementScreen(),
    const AccountScreen(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBrand,
      extendBody: true,
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: _buildFloatingBottomNav(),
    );
  }

  Widget _buildFloatingBottomNav() {
    return Container(
      margin: const EdgeInsets.only(bottom: 25, left: 20, right: 20),
      child: RepaintBoundary(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(30),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
            child: Container(
              height: 75,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 1),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                   _buildNavItem(0, Icons.home_filled, "Home"),
                   _buildNavItem(1, Icons.school_rounded, "Classroom"),
                   _buildNavItem(2, Icons.notifications_active_rounded, "Notices"),
                   _buildNavItem(3, Icons.person_rounded, "Account"),
                ],
              ),
            ),
          ),
        ),
      ),
    ).animate().slideY(begin: 0.5, end: 0, curve: Curves.easeOutQuart, duration: 800.ms).fadeIn();
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    bool isActive = _selectedIndex == index;
    return GestureDetector(
      onTap: () => _onItemTapped(index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 70,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon, 
              color: isActive ? AppColors.accentTeal : Colors.white38, 
              size: 26
            ).animate(target: isActive ? 1 : 0).scale(duration: 300.ms, begin: const Offset(1,1), end: const Offset(1.2,1.2)),
            const SizedBox(height: 4),
            if (isActive) 
              Container(
                width: 4, 
                height: 4, 
                decoration: const BoxDecoration(color: AppColors.accentTeal, shape: BoxShape.circle)
              ).animate().scale().fadeIn(),
          ],
        ),
      ),
    );
  }
}
