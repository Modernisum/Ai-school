import 'package:equatable/equatable.dart';

abstract class NotificationsEvent extends Equatable {
  const NotificationsEvent();

  @override
  List<Object> get props => [];
}

class ConnectWebSocket extends NotificationsEvent {}

class DisconnectWebSocket extends NotificationsEvent {}

class NotificationReceived extends NotificationsEvent {
  final Map<String, dynamic> payload;

  const NotificationReceived(this.payload);

  @override
  List<Object> get props => [payload];
}

class MarkAllRead extends NotificationsEvent {}
