import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/features/classroom/bloc/classroom_bloc.dart';
import 'package:chatra/features/classroom/bloc/classroom_event.dart';
import 'package:chatra/features/classroom/bloc/classroom_state.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/widgets/common/empty_state.dart';
import 'package:chatra/widgets/common/skeleton_loader.dart';

class ClassroomScreen extends StatelessWidget {
  const ClassroomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (ctx) {
        final apiService = ctx.read<ApiService>();
        final bloc = ClassroomBloc(apiService: apiService);
        Future.wait([
          apiService.storage.read(key: 'school_id'),
          apiService.storage.read(key: 'student_id'),
        ]).then((values) {
          final schoolId = values[0];
          final studentId = values[1];
          if (schoolId != null && studentId != null) {
            bloc.add(ClassroomFetchStarted(schoolId: schoolId, studentId: studentId));
          }
        });
        return bloc;
      },
      child: Scaffold(
        backgroundColor: AppColors.primaryBrand,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text(
            "My Classrooms",
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        body: BlocConsumer<ClassroomBloc, ClassroomState>(
          listener: (context, state) {
            if (state is ClassroomError) {
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
            if (state is ClassroomLoading) {
              return _buildLoadingState();
            }
            if (state is ClassroomLoaded) {
              return _buildLoadedState(state);
            }
            return _buildLoadingState();
          },
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(color: Colors.white),
          const SizedBox(height: 16),
          Text(
            "Loading classrooms...",
            style: TextStyle(color: Colors.white.withOpacity(0.7)),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadedState(ClassroomLoaded state) {
    if (state.classrooms.isEmpty) {
      return EmptyState(
        icon: Icons.class_rounded,
        title: "No classrooms available",
        subtitle: "You haven't been assigned to any classroom yet",
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.classrooms.length,
      itemBuilder: (context, index) {
        final classroom = state.classrooms[index];
        return _buildClassroomCard(classroom);
      },
    );
  }

  Widget _buildClassroomCard(Map<String, dynamic> classroom) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.class_rounded,
                  color: AppColors.accentTeal,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      classroom['name'] ?? 'Classroom',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (classroom['subject'] != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        classroom['subject'],
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.7),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow(
            Icons.person_rounded,
            classroom['teacher_name'] ?? 'Not assigned',
          ),
          const SizedBox(height: 8),
          _buildInfoRow(
            Icons.schedule_rounded,
            classroom['schedule'] ?? 'No schedule',
          ),
          if (classroom['room_number'] != null) ...[
            const SizedBox(height: 8),
            _buildInfoRow(
              Icons.door_sliding_rounded,
              'Room ${classroom['room_number']}',
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.white.withOpacity(0.6)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}
