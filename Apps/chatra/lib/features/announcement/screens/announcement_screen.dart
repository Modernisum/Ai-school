import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/features/announcement/bloc/announcement_bloc.dart';
import 'package:chatra/features/announcement/bloc/announcement_event.dart';
import 'package:chatra/features/announcement/bloc/announcement_state.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/widgets/animated_gradient_bg.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/widgets/common/pull_to_refresh.dart';
import 'package:chatra/widgets/common/empty_state.dart';

class AnnouncementScreen extends StatelessWidget {
  const AnnouncementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (ctx) {
        final apiService = ctx.read<ApiService>();
        final bloc = AnnouncementBloc(apiService: apiService);
        apiService.storage.read(key: 'school_id').then((schoolId) {
          if (schoolId != null) {
            bloc.add(AnnouncementFetchStarted(schoolId));
          }
        });
        return bloc;
      },
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text(
            "Announcements",
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        body: AnimatedGradientBg(
          child: BlocConsumer<AnnouncementBloc, AnnouncementState>(
            listener: (context, state) {
              if (state is AnnouncementError) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(state.message),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            builder: (context, state) {
              if (state is AnnouncementLoading) {
                return const Center(child: CircularProgressIndicator(color: Colors.white));
              }
              if (state is AnnouncementLoaded) {
                return _buildLoadedState(context, state);
              }
              return const Center(child: CircularProgressIndicator(color: Colors.white));
            },
          ),
        ),
      ),
    );
  }

  Widget _buildLoadedState(BuildContext context, AnnouncementLoaded state) {
    if (state.announcements.isEmpty) {
      return EmptyState(
        icon: Icons.campaign_rounded,
        title: "No announcements available",
        subtitle: "Check back later for updates",
      );
    }

    return PullToRefresh(
      onRefresh: () async {
        context.read<AnnouncementBloc>().add(AnnouncementRefreshRequested());
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: state.announcements.length,
        itemBuilder: (context, index) {
          final announcement = state.announcements[index];
          return _buildAnnouncementCard(announcement)
              .animate()
              .fadeIn(duration: 500.ms)
              .slideY(begin: 0.1, end: 0);
        },
      ),
    );
  }

  Widget _buildAnnouncementCard(Map<String, dynamic> announcement) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.campaign_rounded,
                  color: AppColors.accentTeal,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  announcement['title'] ?? 'No Title',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            announcement['message'] ?? 'No message content',
            style: GoogleFonts.outfit(
              color: Colors.white.withOpacity(0.8),
              fontSize: 14,
            ),
          ),
          if (announcement['date'] != null) ...[
            const SizedBox(height: 12),
            Text(
              _formatDate(announcement['date']),
              style: GoogleFonts.outfit(
                color: Colors.white.withOpacity(0.5),
                fontSize: 12,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(dynamic date) {
    if (date is String) {
      try {
        final dateTime = DateTime.parse(date);
        return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
      } catch (e) {
        return date;
      }
    }
    return date.toString();
  }
}
