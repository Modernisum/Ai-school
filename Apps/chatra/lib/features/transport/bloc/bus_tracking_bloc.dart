import 'dart:convert';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:chatra/core/network/api_service.dart';
import 'bus_tracking_event.dart';
import 'bus_tracking_state.dart';

class BusTrackingBloc extends Bloc<BusTrackingEvent, BusTrackingState> {
  final ApiService apiService;
  WebSocketChannel? _channel;

  BusTrackingBloc({required this.apiService}) : super(TrackingInitial()) {
    on<TrackingStarted>(_onTrackingStarted);
    on<LocationUpdated>(_onLocationUpdated);
    on<TrackingStopped>(_onTrackingStopped);
  }

  Future<void> _onTrackingStarted(TrackingStarted event, Emitter<BusTrackingState> emit) async {
    emit(TrackingLoading());
    try {
      final token = await apiService.storage.read(key: 'jwt_token');
      if (token == null) {
        emit(const TrackingOffline("Unauthorized"));
        return;
      }

      final wsUrl = ApiService.wsUrl;
      
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      // 1. Send authentication and vehicle_id payload
      final authPayload = {
        'token': token,
        'school_id': event.schoolId,
        'vehicle_id': event.vehicleId,
      };
      
      _channel!.sink.add(jsonEncode(authPayload));

      // 2. Listen to the stream
      _channel!.stream.listen(
        (message) {
          try {
            if (message is String) {
              if (message == "Authenticated successfully") return;
              final data = jsonDecode(message);
              if (data['lat'] != null && data['lng'] != null) {
                add(LocationUpdated(data));
              }
            }
          } catch (e) {
            print("WS Parsing Error: $e");
          }
        },
        onError: (err) {
          add(TrackingStopped());
        },
        onDone: () {
          add(TrackingStopped());
        },
      );
    } catch (e) {
      emit(TrackingOffline("Connection Error: $e"));
    }
  }

  void _onLocationUpdated(LocationUpdated event, Emitter<BusTrackingState> emit) {
    emit(TrackingActive(
      lat: (event.locationData['lat'] as num).toDouble(),
      lng: (event.locationData['lng'] as num).toDouble(),
      speed: (event.locationData['speed'] as num).toDouble(),
      lastUpdated: DateTime.now(),
    ));
  }

  void _onTrackingStopped(TrackingStopped event, Emitter<BusTrackingState> emit) {
    _channel?.sink.close();
    _channel = null;
    emit(const TrackingOffline("Trip Ended or Network Lost"));
  }

  @override
  Future<void> close() {
    _channel?.sink.close();
    return super.close();
  }
}
