import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../api_service.dart';
import '../../blocs/attendance/attendance_bloc.dart';
import '../../blocs/attendance/attendance_event.dart';
import '../../blocs/attendance/attendance_state.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class AttendanceScreen extends StatelessWidget {
  final String classId;

  const AttendanceScreen({super.key, required this.classId});

  bool _isHoliday() {
    final now = DateTime.now();
    // Logic: Sundays are holidays. In production, this would check a list from the backend.
    return now.weekday == DateTime.sunday;
  }

  @override
  Widget build(BuildContext context) {
    final isHoliday = _isHoliday();
    final today = DateFormat('EEEE, d MMMM').format(DateTime.now());

    return BlocProvider(
      create: (context) => AttendanceBloc(apiService: context.read<ApiService>())..add(LoadStudents(classId)),
      child: AnimatedGradientBg(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            title: const Text('Live Attendance'),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 16.0),
                child: Center(
                  child: Text(
                    today,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ),
              ),
            ],
          ),
          body: BlocBuilder<AttendanceBloc, AttendanceState>(
            builder: (context, state) {
              return Stack(
                children: [
                  // Main Content
                  if (state is AttendanceLoading)
                    const Center(child: CircularProgressIndicator(color: Colors.white))
                  else if (state is AttendanceError)
                    Center(child: Text(state.message, style: const TextStyle(color: Colors.white)))
                  else if (state is AttendanceSubmitting)
                    const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CircularProgressIndicator(color: Colors.white),
                          SizedBox(height: 16),
                          Text("Securing records...", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                        ],
                      ),
                    )
                  else if (state is AttendanceLoaded)
                    Column(
                      children: [
                        Expanded(
                          child: GridView.builder(
                            padding: const EdgeInsets.all(20),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                              childAspectRatio: 0.85,
                            ),
                            itemCount: state.students.length,
                            itemBuilder: (context, index) {
                              final student = state.students[index];
                              final isPresent = state.attendanceMap[student['id']] ?? false;

                              return GestureDetector(
                                onTap: (isHoliday || (!state.isClassTeacher && !state.isOverrideEnabled))
                                    ? null
                                    : () {
                                        context.read<AttendanceBloc>().add(
                                              ToggleStudentAttendance(student['id'], !isPresent),
                                            );
                                      },
                                child: Opacity(
                                  opacity: (isHoliday || (!state.isClassTeacher && !state.isOverrideEnabled)) ? 0.6 : 1.0,
                                  child: GlassCard(
                                    padding: const EdgeInsets.all(12),
                                    borderColor: isPresent ? Colors.green.withOpacity(0.5) : Colors.white24,
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Stack(
                                          children: [
                                            CircleAvatar(
                                              radius: 30,
                                              backgroundColor: Theme.of(context).primaryColor.withOpacity(0.3),
                                              child: Text(
                                                student['name'][0],
                                                style: const TextStyle(fontSize: 24, color: Colors.white, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                            if (isPresent)
                                              const Positioned(
                                                right: 0,
                                                bottom: 0,
                                                child: CircleAvatar(
                                                  radius: 10,
                                                  backgroundColor: Colors.green,
                                                  child: Icon(Icons.check, size: 12, color: Colors.white),
                                                ),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          student['name'],
                                          textAlign: TextAlign.center,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          "Roll: ${student['rollNumber']}",
                                          style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.6)),
                                        ),
                                        const SizedBox(height: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isPresent
                                                ? Colors.green.withOpacity(0.2)
                                                : Colors.red.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(20),
                                          ),
                                          child: Text(
                                            isPresent ? "PRESENT" : "ABSENT",
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: isPresent ? Colors.green[800] : Colors.red[800],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        if (!isHoliday && (state.isClassTeacher || state.isOverrideEnabled))
                          Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.indigoAccent,
                                minimumSize: const Size.fromHeight(56),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                elevation: 8,
                              ),
                              icon: const Icon(Icons.cloud_upload),
                              label: const Text('SUBMIT ATTENDANCE', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                              onPressed: () {
                                context.read<AttendanceBloc>().add(SubmitAttendance(classId));
                              },
                            ),
                          ),
                      ],
                    )
                  else
                    const Center(child: Text("Initializing session...", style: TextStyle(color: Colors.white))),

                  // Overlays
                  if (isHoliday)
                    _buildOverlay(
                      context,
                      Icons.calendar_today,
                      "Holiday Guard Active",
                      "Today is a scheduled holiday or Sunday. Attendance marking is disabled.",
                    ),
                  if (state is AttendanceLoaded && !state.isClassTeacher && !state.isOverrideEnabled)
                    _buildOverlay(
                      context,
                      Icons.lock_person,
                      "Access Restricted",
                      "Only the designated Class Teacher can mark attendance. No backup override detected today.",
                      isDismissible: true,
                    ),
                  if (state is AttendanceLoaded && state.isOverrideEnabled)
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        color: Colors.amber.withOpacity(0.9),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.auto_fix_high, size: 14, color: Colors.black),
                            SizedBox(width: 8),
                            Text(
                              "SMART OVERRIDE ACTIVE: Class Teacher is on leave.",
                              style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildOverlay(BuildContext context, IconData icon, String title, String subtitle, {bool isDismissible = false}) {
    return Positioned.fill(
      child: Container(
        color: Colors.black.withOpacity(0.4),
        child: Center(
          child: GlassCard(
            margin: const EdgeInsets.symmetric(horizontal: 40),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 64, color: Colors.white),
                const SizedBox(height: 20),
                Text(
                  title,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 12),
                Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.2),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: Text(isDismissible ? "GO BACK" : "CLOSE"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
