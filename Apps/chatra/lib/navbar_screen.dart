import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/features/home/screens/home_screen.dart';
import 'package:chatra/features/classroom/screens/classroom_screen.dart';
import 'package:chatra/features/announcement/screens/announcement_screen.dart';
import 'package:chatra/features/dashboard/screens/account_screen.dart';

class NavbarScreen extends StatefulWidget {
  const NavbarScreen({super.key});

  @override
  State<NavbarScreen> createState() => _NavbarScreenState();
}

class _NavbarScreenState extends State<NavbarScreen> {
  int _selectedIndex = 0;
  final Map<int, Widget> _cachedScreens = {};

  Widget _buildScreen(int index) {
    switch (index) {
      case 0:
        return const HomeScreen();
      case 1:
        return const ClassroomScreen();
      case 2:
        return const AnnouncementScreen();
      case 3:
        return const AccountScreen();
      default:
        return const HomeScreen();
    }
  }

  void _onItemTapped(int index) {
    if (_selectedIndex == index) return;
    setState(() {
      _selectedIndex = index;
      if (!_cachedScreens.containsKey(index)) {
        _cachedScreens[index] = _buildScreen(index);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBrand,
      extendBody: true,
      body: _cachedScreens[_selectedIndex] ?? _buildScreen(0),
      bottomNavigationBar: _buildFloatingBottomNav(),
    );
  }

  Widget _buildFloatingBottomNav() {
    return Container(
      margin: const EdgeInsets.only(bottom: 25, left: 20, right: 20),
      child: RepaintBoundary(
        child: Container(
          height: 75,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: const Color(0xCC1E1440),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: Colors.white.withOpacity(0.12),
              width: 1,
            ),
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
    )
    .animate()
    .slideY(
      begin: 0.5,
      end: 0,
      curve: Curves.easeOutQuart,
      duration: 800.ms,
    )
    .fadeIn();
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
              size: isActive ? 28 : 26,
            ),
            const SizedBox(height: 4),
            if (isActive)
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.accentTeal,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
