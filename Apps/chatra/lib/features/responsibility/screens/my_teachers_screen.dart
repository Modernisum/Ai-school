import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/network/api_service.dart';
import '../../../core/network/api_response.dart';
import '../widgets/teacher_contact_card.dart';

class MyTeachersScreen extends StatefulWidget {
  const MyTeachersScreen({super.key});

  @override
  State<MyTeachersScreen> createState() => _MyTeachersScreenState();
}

class _MyTeachersScreenState extends State<MyTeachersScreen> {
  final ApiService _apiService = ApiService();
  final storage = const FlutterSecureStorage();
  List<dynamic> _responsibilities = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadResponsibilities();
  }

  Future<void> _loadResponsibilities() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _apiService.getStudentResponsibilities();

    setState(() {
      _isLoading = false;
      if (result is ApiSuccess) {
        _responsibilities = (result as ApiSuccess).data as List<dynamic>;
      } else if (result is ApiError) {
        _errorMessage = (result as ApiError).message;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Teachers'),
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
              onPressed: _loadResponsibilities,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB298E7),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_responsibilities.isEmpty) {
      return const Center(
        child: Text('No teachers assigned yet'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _responsibilities.length,
      itemBuilder: (context, index) {
        final responsibility = _responsibilities[index];
        return _buildResponsibilityCard(responsibility);
      },
    );
  }

  Widget _buildResponsibilityCard(dynamic responsibility) {
    final responsibilityName = responsibility['name'] ?? 'Unknown';
    final teachers = responsibility['teachers'] as List<dynamic>? ?? [];

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: const Color(0xFFB298E7).withOpacity(0.2),
                  child: Icon(
                    _getIconForResponsibility(responsibilityName),
                    color: const Color(0xFFB298E7),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        responsibilityName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (responsibility['description'] != null)
                        Text(
                          responsibility['description'],
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Assigned Teachers',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Color(0xFFB298E7),
              ),
            ),
            const SizedBox(height: 8),
            if (teachers.isEmpty)
              const Text('No teachers assigned')
            else
              ...teachers.map((teacher) => TeacherContactCard(
                    teacher: teacher,
                    responsibilityName: responsibilityName,
                  )),
          ],
        ),
      ),
    );
  }

  IconData _getIconForResponsibility(String name) {
    final lowerName = name.toLowerCase();
    if (lowerName.contains('teach')) return Icons.school;
    if (lowerName.contains('math')) return Icons.calculate;
    if (lowerName.contains('science')) return Icons.science;
    if (lowerName.contains('english')) return Icons.menu_book;
    if (lowerName.contains('sport')) return Icons.sports_soccer;
    if (lowerName.contains('art')) return Icons.palette;
    if (lowerName.contains('music')) return Icons.music_note;
    return Icons.person;
  }
}
