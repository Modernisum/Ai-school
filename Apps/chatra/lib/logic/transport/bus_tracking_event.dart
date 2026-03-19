import 'package:equatable/equatable.dart';

abstract class BusTrackingEvent extends Equatable {
  const BusTrackingEvent();

  @override
  List<Object?> get props => [];
}

class TrackingStarted extends BusTrackingEvent {
  final String schoolId;
  final String vehicleId;
  const TrackingStarted({required this.schoolId, required this.vehicleId});

  @override
  List<Object?> get props => [schoolId, vehicleId];
}

class LocationUpdated extends BusTrackingEvent {
  final Map<String, dynamic> locationData;
  const LocationUpdated(this.locationData);

  @override
  List<Object?> get props => [locationData];
}

class TrackingStopped extends BusTrackingEvent {}
