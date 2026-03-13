import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/transport/transport_bloc.dart';
import '../../blocs/transport/transport_event.dart';
import '../../blocs/transport/transport_state.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class DriverDashboard extends StatelessWidget {
  const DriverDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => TransportBloc(),
      child: AnimatedGradientBg(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            title: const Text('Transport Dashboard'),
            actions: [
              IconButton(
                icon: const Icon(Icons.logout),
                onPressed: () => context.read<AuthBloc>().add(LogoutRequested()),
              ),
            ],
          ),
          body: Padding(
            padding: const EdgeInsets.all(24.0),
            child: BlocBuilder<TransportBloc, TransportState>(
              builder: (context, state) {
                final isActive = state is TransportActive;
                final statusText = isActive ? 'Streaming Live Map Data...' : 'Parents will be able to track the vehicle live on the map once started.';
                final color = isActive ? Colors.greenAccent : Colors.blueAccent;

                return Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GlassCard(
                      child: Column(
                        children: [
                          Icon(Icons.directions_bus, size: 80, color: color),
                          const SizedBox(height: 20),
                          Text(isActive ? 'Trip in Progress' : 'Live GPS Streaming', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 10),
                          Text(statusText, textAlign: TextAlign.center),
                          if (isActive) ...[
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8)),
                              child: Text(
                                "LAT: \${(state).latitude.toStringAsFixed(5)}\nLNG: \${(state).longitude.toStringAsFixed(5)}",
                                style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', color: Colors.greenAccent),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 48),
                    if (!isActive)
                      ElevatedButton.icon(
                        icon: const Icon(Icons.play_arrow, size: 28),
                        label: const Text('START TRIP', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade600,
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        ),
                        onPressed: () {
                          context.read<TransportBloc>().add(const StartTrip('route_123'));
                        },
                      )
                    else
                      ElevatedButton.icon(
                        icon: const Icon(Icons.stop, size: 28),
                        label: const Text('END TRIP', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red.shade600,
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        ),
                        onPressed: () {
                          context.read<TransportBloc>().add(StopTrip());
                        },
                      ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
