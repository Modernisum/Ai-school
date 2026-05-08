import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:chatra/features/transport/bloc/bus_tracking_bloc.dart';
import 'package:chatra/features/transport/bloc/bus_tracking_event.dart';
import 'package:chatra/features/transport/bloc/bus_tracking_state.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/core/network/api_service.dart';

class BusTrackingScreen extends StatefulWidget {
  final String schoolId;
  final String vehicleId;

  const BusTrackingScreen({
    super.key,
    required this.schoolId,
    required this.vehicleId,
  });

  @override
  State<BusTrackingScreen> createState() => _BusTrackingScreenState();
}

class _BusTrackingScreenState extends State<BusTrackingScreen> {
  GoogleMapController? _mapController;
  LatLng _currentPos = const LatLng(28.6139, 77.2090);
  double _currentHeading = 0.0;
  Set<Marker> _markers = {};

  @override
  void initState() {
    super.initState();
    _updateMarkers();
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
    _setMapStyle();
  }

  void _setMapStyle() {
    const String darkStyle = '''
    [
      {"elementType": "geometry", "stylers": [{"color": "#212121"}]},
      {"elementType": "labels.icon", "stylers": [{"visibility": "off"}]},
      {"elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
      {"elementType": "labels.text.stroke", "stylers": [{"color": "#212121"}]},
      {"featureType": "administrative", "elementType": "geometry", "stylers": [{"color": "#757575"}]},
      {"featureType": "poi", "elementType": "geometry", "stylers": [{"color": "#181818"}]},
      {"featureType": "road", "elementType": "geometry.fill", "stylers": [{"color": "#2c2c2c"}]},
      {"featureType": "water", "elementType": "geometry", "stylers": [{"color": "#000000"}]}
    ]
    ''';
    _mapController?.setMapStyle(darkStyle);
  }

  void _updateMarkers() {
    _markers = {
      Marker(
        markerId: const MarkerId("bus_marker"),
        position: _currentPos,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueCyan),
        anchor: const Offset(0.5, 0.5),
        rotation: _currentHeading,
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => BusTrackingBloc(apiService: context.read<ApiService>())
        ..add(TrackingStarted(schoolId: widget.schoolId, vehicleId: widget.vehicleId)),
      child: BlocListener<BusTrackingBloc, BusTrackingState>(
        listener: (context, state) {
          if (state is TrackingActive) {
            setState(() {
              _currentPos = LatLng(state.lat, state.lng);
              _updateMarkers();
            });
            _mapController?.animateCamera(CameraUpdate.newLatLng(_currentPos));
          }
        },
        child: Scaffold(
          extendBodyBehindAppBar: true,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: const Text("Transport Radar", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            iconTheme: const IconThemeData(color: Colors.white),
          ),
          body: Stack(
            children: [
              GoogleMap(
                initialCameraPosition: CameraPosition(target: _currentPos, zoom: 15),
                onMapCreated: _onMapCreated,
                myLocationButtonEnabled: false,
                zoomControlsEnabled: false,
                markers: _markers,
              ),
              _buildTopStatus(),
              _buildBottomPanel(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopStatus() {
    return Positioned(
      top: 100,
      left: 20,
      right: 20,
      child: Center(
        child: GlassCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          borderRadius: 30,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: Colors.greenAccent, shape: BoxShape.circle),
              ).animate(onPlay: (c) => c.repeat()).scale(begin: const Offset(1, 1), end: const Offset(1.5, 1.5), duration: 800.ms).then().fadeOut(),
              const SizedBox(width: 8),
              const Text("LIVE TRACKING ACTIVE", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomPanel() {
    return Positioned(
      bottom: 40,
      left: 20,
      right: 20,
      child: BlocBuilder<BusTrackingBloc, BusTrackingState>(
        builder: (context, state) {
          double speed = 0.0;
          if (state is TrackingActive) speed = state.speed;

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              GlassCard(
                padding: const EdgeInsets.all(20),
                borderRadius: 24,
                child: Column(
                  children: [
                    Row(
                      children: [
                        _buildStatItem("Current Speed", "${speed.toInt()} km/h", Icons.speed),
                        const Spacer(),
                        _buildStatItem("Status", state is TrackingActive ? "On Trip" : "Stopped", Icons.info_outline),
                      ],
                    ),
                    const Divider(color: Colors.white12, height: 32),
                    Row(
                      children: [
                        const CircleAvatar(
                          backgroundColor: Colors.white10,
                          child: Icon(Icons.person, color: Colors.white70),
                        ),
                        const SizedBox(width: 12),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("Rajesh Kumar (Driver)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            Text("Vehicle: UP16 DT 4022", style: TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                        const Spacer(),
                        IconButton(
                          onPressed: () {},
                          icon: const Icon(Icons.phone, color: Colors.greenAccent),
                          style: IconButton.styleFrom(backgroundColor: Colors.green.withOpacity(0.2)),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().slideY(begin: 1.0, end: 0.0, curve: Curves.easeOutCubic, duration: 600.ms),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.accentTeal, size: 20),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10)),
            Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
      ],
    );
  }
}
