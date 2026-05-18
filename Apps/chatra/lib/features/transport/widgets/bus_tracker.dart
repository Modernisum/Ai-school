import 'package:flutter/material.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/theme/app_theme.dart';

class BusTrackerWidget extends StatefulWidget {
  final String schoolId;
  final String vehicleId;
  final String driverName;

  const BusTrackerWidget({
    super.key,
    required this.schoolId,
    required this.vehicleId,
    this.driverName = 'Driver',
  });

  @override
  State<BusTrackerWidget> createState() => _BusTrackerWidgetState();
}

class _BusTrackerWidgetState extends State<BusTrackerWidget> {
  Map<String, dynamic>? _location;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchLocation();
  }

  Future<void> _fetchLocation() async {
    try {
      // Would call the actual API in production
      await Future.delayed(const Duration(milliseconds: 800));
      if (mounted) setState(() { _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.directions_bus, color: AppColors.accentTeal, size: 20),
              ),
              const SizedBox(width: 12),
              const Text("Bus Tracker", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              const Spacer(),
              Container(
                width: 10, height: 10,
                decoration: BoxDecoration(
                  color: _location != null ? Colors.green : Colors.orange,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(_location != null ? "Live" : "Pending", style: const TextStyle(color: Colors.white54, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)))
          else if (_error != null)
            Text("GPS unavailable", style: const TextStyle(color: Colors.white38, fontSize: 12))
          else
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                height: 120,
                decoration: BoxDecoration(
                  color: Colors.black26,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Icon(Icons.map, color: Colors.white24, size: 48),
                ),
              ),
              const SizedBox(height: 8),
              Text("Driver: ${widget.driverName}", style: const TextStyle(fontSize: 12, color: Colors.white54)),
            ]),
        ],
      ),
    );
  }
}
