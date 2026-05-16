import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import 'space_assignment_view.dart';
import '../../blocs/tasks/tasks_bloc.dart';
import '../../blocs/tasks/tasks_event.dart';
import '../../blocs/tasks/tasks_state.dart';

class ResponsibilityDetailScreen extends StatefulWidget {
  final String responsibilityId;
  final String responsibilityName;

  const ResponsibilityDetailScreen({
    super.key,
    required this.responsibilityId,
    required this.responsibilityName,
  });

  @override
  State<ResponsibilityDetailScreen> createState() => _ResponsibilityDetailScreenState();
}

class _ResponsibilityDetailScreenState extends State<ResponsibilityDetailScreen> {
  final ApiService _apiService = ApiService();
  final storage = const FlutterSecureStorage();
  Map<String, dynamic>? _responsibility;
  bool _isLoading = true;
  String? _errorMessage;
  String? _schoolId;

  @override
  void initState() {
    super.initState();
    _loadResponsibilityDetail();
  }

  Future<void> _loadResponsibilityDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    _schoolId = await storage.read(key: 'school_id');
    if (_schoolId == null) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'School ID not found';
      });
      return;
    }

    final result = await _apiService.getResponsibilityDetail(_schoolId!, widget.responsibilityId);

    setState(() {
      _isLoading = false;
      if (result != null) {
        _responsibility = result;
      } else {
        _errorMessage = 'Failed to load responsibility details';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.responsibilityName),
        backgroundColor: const Color(0xFFB298E7),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFFB298E7)),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_errorMessage!),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadResponsibilityDetail,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB298E7),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_responsibility == null) {
      return const Center(
        child: Text('Responsibility not found'),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(),
          const SizedBox(height: 24),
          _buildDescription(),
          const SizedBox(height: 24),
          _buildSpacesSection(),
          const SizedBox(height: 24),
          _buildEmployeeTypeSection(),
          const SizedBox(height: 24),
          _buildRevenueSection(),
          const SizedBox(height: 24),
          _buildAssignSpacesButton(),
          const SizedBox(height: 24),
          _buildTasksSection(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: const Color(0xFFB298E7).withOpacity(0.2),
              radius: 30,
              child: Icon(
                _getIconForResponsibility(widget.responsibilityName),
                color: const Color(0xFFB298E7),
                size: 30,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.responsibilityName,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'ID: ${widget.responsibilityId}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDescription() {
    final description = _responsibility!['description'];
    if (description == null || description.toString().isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Description',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(description.toString()),
          ],
        ),
      ),
    );
  }

  Widget _buildSpacesSection() {
    final spaces = _responsibility!['space_ids'];
    if (spaces == null || (spaces is List && spaces.isEmpty)) {
      return const SizedBox.shrink();
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Assigned Spaces',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            if (spaces is List)
              ...spaces.map((space) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on, size: 16, color: Color(0xFFB298E7)),
                        const SizedBox(width: 8),
                        Expanded(child: Text(space.toString())),
                      ],
                    ),
                  )),
          ],
        ),
      ),
    );
  }

  Widget _buildEmployeeTypeSection() {
    final empType = _responsibility!['employee_type'];
    if (empType == null) {
      return const SizedBox.shrink();
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.person, color: Color(0xFFB298E7)),
            const SizedBox(width: 12),
            const Text(
              'Employee Type:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(width: 8),
            Text(empType.toString()),
          ],
        ),
      ),
    );
  }

  Widget _buildRevenueSection() {
    final revenue = _responsibility!['revenue'];
    if (revenue == null) {
      return const SizedBox.shrink();
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.currency_rupee, color: Color(0xFFB298E7)),
            const SizedBox(width: 12),
            const Text(
              'Revenue:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(width: 8),
            Text('₹${revenue.toString()}'),
          ],
        ),
      ),
    );
  }

  Widget _buildAssignSpacesButton() {
    final spaces = _responsibility!['space_ids'];
    if (spaces == null) return const SizedBox.shrink();

    return Card(
      elevation: 2,
      child: ListTile(
        leading: const Icon(Icons.edit_location, color: Color(0xFFB298E7)),
        title: const Text('Manage Space Assignments'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => SpaceAssignmentView(
                responsibilityId: widget.responsibilityId,
                responsibilityName: widget.responsibilityName,
                assignedSpaces: spaces is List ? List<String>.from(spaces) : [],
              ),
            ),
          );
          if (result != null) {
            _loadResponsibilityDetail();
          }
        },
      ),
    );
  }

  IconData _getIconForResponsibility(String name) {
    final lowerName = name.toLowerCase();
    if (lowerName.contains('clean')) return Icons.cleaning_services;
    if (lowerName.contains('security')) return Icons.security;
    if (lowerName.contains('transport')) return Icons.directions_bus;
    if (lowerName.contains('maintain')) return Icons.build;
    if (lowerName.contains('inventory')) return Icons.inventory_2;
    return Icons.assignment;
  }

  Widget _buildTasksSection() {
    final sid = _schoolId ?? '';
    return BlocProvider(
      create: (context) => TasksBloc(apiService: _apiService)..add(LoadTasks(
        schoolId: sid,
        responsibilityId: widget.responsibilityId,
      )),
      child: Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Related Tasks',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      context.read<TasksBloc>().add(LoadTasks());
                    },
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Refresh'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              BlocBuilder<TasksBloc, TasksState>(
                builder: (context, state) {
                  if (state is TasksLoading) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: CircularProgressIndicator(color: Color(0xFFB298E7)),
                      ),
                    );
                  }
                  if (state is TasksError) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            Text(state.message, style: const TextStyle(color: Colors.red)),
                            const SizedBox(height: 8),
                            ElevatedButton(
                              onPressed: () {
                                context.read<TasksBloc>().add(LoadTasks());
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFB298E7),
                              ),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  if (state is TasksLoaded) {
                    if (state.duties.isEmpty) {
                      return const Padding(
                        padding: EdgeInsets.all(20),
                        child: Center(
                          child: Text('No tasks assigned'),
                        ),
                      );
                    }
                    return ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: state.duties.length,
                      separatorBuilder: (context, index) => const Divider(),
                      itemBuilder: (context, index) {
                        final task = state.duties[index];
                        return _buildTaskItem(task);
                      },
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTaskItem(DutyItem task) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: task.isCompleted
            ? Colors.green.withOpacity(0.2)
            : const Color(0xFFB298E7).withOpacity(0.2),
        child: Icon(
          _getTaskIcon(task.type),
          color: task.isCompleted ? Colors.green : const Color(0xFFB298E7),
        ),
      ),
      title: Text(
        task.title,
        style: TextStyle(
          decoration: task.isCompleted ? TextDecoration.lineThrough : null,
          color: task.isCompleted ? Colors.grey : null,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (task.subtitle.isNotEmpty)
            Text(task.subtitle),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                task.isCompleted ? Icons.check_circle : Icons.pending,
                size: 14,
                color: task.isCompleted ? Colors.green : Colors.orange,
              ),
              const SizedBox(width: 4),
              Text(
                task.isCompleted ? 'Completed' : 'Pending',
                style: TextStyle(
                  fontSize: 12,
                  color: task.isCompleted ? Colors.green : Colors.orange,
                ),
              ),
            ],
          ),
        ],
      ),
      trailing: !task.isCompleted
          ? ElevatedButton(
              onPressed: () {
                final sid = _schoolId;
                if (sid != null) {
                  context.read<TasksBloc>().add(CompleteTask(
                    schoolId: sid,
                    taskId: task.id,
                  ));
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB298E7),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              child: const Text('Complete'),
            )
          : const Icon(Icons.check_circle, color: Colors.green),
    );
  }

  IconData _getTaskIcon(String type) {
    final lowerType = type.toLowerCase();
    if (lowerType.contains('clean')) return Icons.cleaning_services;
    if (lowerType.contains('inventory')) return Icons.inventory_2;
    if (lowerType.contains('deliver')) return Icons.local_shipping;
    if (lowerType.contains('setup')) return Icons.settings;
    if (lowerType.contains('check')) return Icons.checklist;
    return Icons.task;
  }
}
