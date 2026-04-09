import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../api_service.dart';
import 'responsibility_detail_screen.dart';

class ResponsibilityListScreen extends StatefulWidget {
  const ResponsibilityListScreen({super.key});

  @override
  State<ResponsibilityListScreen> createState() => _ResponsibilityListScreenState();
}

class _ResponsibilityListScreenState extends State<ResponsibilityListScreen> {
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

    final schoolId = await storage.read(key: 'school_id');
    if (schoolId == null) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'School ID not found';
      });
      return;
    }

    final result = await _apiService.getResponsibilities(schoolId);

    setState(() {
      _isLoading = false;
      if (result != null) {
        _responsibilities = result;
      } else {
        _errorMessage = 'Failed to load responsibilities';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Responsibilities'),
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
        child: Text('No responsibilities assigned'),
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
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFB298E7).withOpacity(0.2),
          child: Icon(
            _getIconForResponsibility(responsibility['name'] ?? ''),
            color: const Color(0xFFB298E7),
          ),
        ),
        title: Text(
          responsibility['name'] ?? 'Unknown',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (responsibility['description'] != null)
              Text(responsibility['description']),
            const SizedBox(height: 4),
            Text(
              'Spaces: ${_getSpacesCount(responsibility)}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ResponsibilityDetailScreen(
                responsibilityId: responsibility['id']?.toString() ?? '',
                responsibilityName: responsibility['name'] ?? 'Unknown',
              ),
            ),
          );
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

  int _getSpacesCount(dynamic responsibility) {
    final spaces = responsibility['space_ids'];
    if (spaces is List) {
      return spaces.length;
    }
    return 0;
  }
}
