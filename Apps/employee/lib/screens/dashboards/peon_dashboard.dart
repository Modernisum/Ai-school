import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/tasks/tasks_bloc.dart';
import '../../blocs/tasks/tasks_event.dart';
import '../../blocs/tasks/tasks_state.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class PeonDashboard extends StatelessWidget {
  const PeonDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => TasksBloc()..add(LoadTasks()),
      child: AnimatedGradientBg(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            title: const Text('Staff Dashboard'),
            actions: [
              IconButton(
                icon: const Icon(Icons.logout),
                onPressed: () => context.read<AuthBloc>().add(LogoutRequested()),
              ),
            ],
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: GlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Active Duties', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 10),
                      const Text('Assigned tasks and inventory deliveries.'),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: BlocBuilder<TasksBloc, TasksState>(
                  builder: (context, state) {
                    if (state is TasksLoading) {
                      return const Center(child: CircularProgressIndicator(color: Colors.white));
                    }
                    if (state is TasksError) {
                      return Center(child: Text(state.message, style: const TextStyle(color: Colors.red)));
                    }
                    if (state is TasksLoaded) {
                      return ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        itemCount: state.duties.length,
                        itemBuilder: (context, index) {
                          final duty = state.duties[index];
                          final isCleaning = duty.type == 'cleaning';
                          final isCompleted = duty.isCompleted;

                          return Opacity(
                            opacity: isCompleted ? 0.6 : 1.0,
                            child: GlassCard(
                              padding: EdgeInsets.zero,
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                leading: Icon(
                                  isCleaning ? Icons.assignment : Icons.inventory_2,
                                  color: isCleaning ? Colors.blueAccent : Colors.orangeAccent,
                                ),
                                title: Text(
                                  duty.title,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    decoration: isCompleted ? TextDecoration.lineThrough : null,
                                  ),
                                ),
                                subtitle: Text(duty.subtitle),
                                trailing: IconButton(
                                  icon: Icon(
                                    isCompleted ? Icons.check_circle : Icons.check_circle_outline,
                                    color: isCompleted ? Colors.green : Colors.grey,
                                  ),
                                  onPressed: isCompleted
                                      ? null
                                      : () {
                                          context.read<TasksBloc>().add(CompleteTask(duty.id));
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(content: Text('Duty Marked Complete!'), backgroundColor: Colors.green),
                                          );
                                        },
                                ),
                              ),
                            ),
                          );
                        },
                      );
                    }
                    return const SizedBox.shrink();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

