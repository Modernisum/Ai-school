import 'package:equatable/equatable.dart';

abstract class BusTrackingState extends Equatable {
  const BusTrackingState();

  @override
  List<Object?> get props => [];
}

class TrackingInitial extends BusTrackingState {}

class TrackingLoading extends BusTrackingState {}

class TrackingActive extends BusTrackingState {
  final double lat;
  final double lng;
  final double speed;
  final DateTime lastUpdated;

  const TrackingActive({
    required this.lat,
    required this.lng,
    required this.speed,
    required this.lastUpdated,
  });

  @override
  List<Object?> get props => [lat, lng, speed, lastUpdated];
}

class TrackingOffline extends BusTrackingState {
  final String reason;
  const TrackingOffline(this.reason);

  @override
  List<Object?> get props => [reason];
}
