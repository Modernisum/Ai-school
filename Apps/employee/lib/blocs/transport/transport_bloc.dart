import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'transport_event.dart';
import 'transport_state.dart';

class TransportBloc extends Bloc<TransportEvent, TransportState> {
  Timer? _gpsTimer;
  double _currentLat = 28.7041;
  double _currentLng = 77.1025;

  TransportBloc() : super(TransportInactive()) {
    on<StartTrip>(_onStartTrip);
    on<StopTrip>(_onStopTrip);
    on<UpdateLocation>(_onUpdateLocation);
  }

  void _onStartTrip(StartTrip event, Emitter<TransportState> emit) {
    emit(TransportActive(
      routeId: event.routeId,
      latitude: _currentLat,
      longitude: _currentLng,
    ));

    // Mocking WebSocket live push to Redis via periodic timer
    _gpsTimer?.cancel();
    _gpsTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (isClosed) {
        timer.cancel();
        return;
      }
      // Vibrate GPS slightly to simulate movement
      _currentLat += 0.0001;
      _currentLng += 0.0001;
      add(UpdateLocation(latitude: _currentLat, longitude: _currentLng));
    });
  }

  void _onStopTrip(StopTrip event, Emitter<TransportState> emit) {
    _gpsTimer?.cancel();
    emit(TransportInactive());
  }

  void _onUpdateLocation(UpdateLocation event, Emitter<TransportState> emit) {
    if (state is TransportActive) {
      final currentState = state as TransportActive;
      emit(TransportActive(
        routeId: currentState.routeId,
        latitude: event.latitude,
        longitude: event.longitude,
      ));
    }
  }

  @override
  Future<void> close() {
    _gpsTimer?.cancel();
    return super.close();
  }
}
