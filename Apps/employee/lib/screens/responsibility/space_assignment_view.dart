import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../api_service.dart';

class SpaceAssignmentView extends StatefulWidget {
  final String responsibilityId;
  final String responsibilityName;
  final List<String> assignedSpaces;

  const SpaceAssignmentView({
    super.key,
    required this.responsibilityId,
    required this.responsibilityName,
    required this.assignedSpaces,
  });

  @override
  State<SpaceAssignmentView> createState() => _SpaceAssignmentViewState();
}

class _SpaceAssignmentViewState extends State<SpaceAssignmentView> {
  final ApiService _apiService = ApiService();
  final storage = const FlutterSecureStorage();
  List<dynamic> _spaces = [];
  Set<String> _selectedSpaces = {};
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedSpaces = widget.assignedSpaces.toSet();
    _loadSpaces();
  }

  Future<void> _loadSpaces() async {
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

    final result = await _apiService.getSpaces(schoolId);

    setState(() {
      _isLoading = false;
      if (result != null) {
        _spaces = result;
      } else {
        _errorMessage = 'Failed to load spaces';
      }
    });
  }

  Future<void> _saveAssignments() async {
    final schoolId = await storage.read(key: 'school_id');
    if (schoolId == null) return;

    final success = await _apiService.updateResponsibilitySpaces(
      schoolId,
      widget.responsibilityId,
      _selectedSpaces.toList(),
    );

    if (success && mounted) {
      Navigator.pop(context, _selectedSpaces.toList());
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Space assignments updated')),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update assignments')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Assign Spaces'),
        backgroundColor: const Color(0xFFB298E7),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _saveAssignments,
            child: const Text(
              'Save',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
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
              onPressed: _loadSpaces,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB298E7),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_spaces.isEmpty) {
      return const Center(
        child: Text('No spaces available'),
      );
    }

    return Column(
      children: [
        _buildHeader(),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _spaces.length,
            itemBuilder: (context, index) {
              final space = _spaces[index];
              final spaceId = space['id']?.toString() ?? '';
              final isSelected = _selectedSpaces.contains(spaceId);
              return _buildSpaceCard(space, isSelected);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: const Color(0xFFB298E7).withOpacity(0.1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.responsibilityName,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${_selectedSpaces.length} space(s) selected',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpaceCard(dynamic space, bool isSelected) {
    final spaceId = space['id']?.toString() ?? '';
    final spaceName = space['name'] ?? 'Unknown Space';
    final spaceType = space['space_type'] ?? '';
    final capacity = space['capacity'];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isSelected ? 4 : 2,
      color: isSelected ? const Color(0xFFB298E7).withOpacity(0.1) : null,
      child: CheckboxListTile(
        value: isSelected,
        onChanged: (value) {
          setState(() {
            if (value == true) {
              _selectedSpaces.add(spaceId);
            } else {
              _selectedSpaces.remove(spaceId);
            }
          });
        },
        title: Text(
          spaceName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (spaceType.isNotEmpty)
              Text(
                'Type: $spaceType',
                style: const TextStyle(fontSize: 12),
              ),
            if (capacity != null)
              Text(
                'Capacity: $capacity',
                style: const TextStyle(fontSize: 12),
              ),
          ],
        ),
        secondary: Icon(
          isSelected ? Icons.check_circle : Icons.circle_outlined,
          color: isSelected ? const Color(0xFFB298E7) : Colors.grey,
        ),
      ),
    );
  }
}
