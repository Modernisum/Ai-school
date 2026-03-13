import 'package:equatable/equatable.dart';

abstract class TransportEvent extends Equatable {
  const TransportEvent();

  @override
  List<Object> get props => [];
}

class StartTrip extends TransportEvent {
  final String routeId;

  const StartTrip(this.routeId);

  @override
  List<Object> get props => [routeId];
}

class StopTrip extends TransportEvent {}

class UpdateLocation extends TransportEvent {
  final double latitude;
  final double longitude;

  const UpdateLocation({required this.latitude, required this.longitude});

  @override
  List<Object> get props => [latitude, longitude];
}
