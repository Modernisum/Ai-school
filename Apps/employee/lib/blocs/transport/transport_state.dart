import 'package:equatable/equatable.dart';

abstract class TransportState extends Equatable {
  const TransportState();

  @override
  List<Object> get props => [];
}

class TransportInactive extends TransportState {}

class TransportActive extends TransportState {
  final String routeId;
  final double latitude;
  final double longitude;

  const TransportActive({
    required this.routeId,
    required this.latitude,
    required this.longitude,
  });

  @override
  List<Object> get props => [routeId, latitude, longitude];
}

class TransportError extends TransportState {
  final String message;

  const TransportError(this.message);

  @override
  List<Object> get props => [message];
}
