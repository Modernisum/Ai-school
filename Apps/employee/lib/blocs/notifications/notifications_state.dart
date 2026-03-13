import 'package:equatable/equatable.dart';

class NotificationItem extends Equatable {
  final String id;
  final String title;
  final String body;
  final DateTime timestamp;
  final bool isRead;

  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.timestamp,
    this.isRead = false,
  });

  NotificationItem copyWith({bool? isRead}) {
    return NotificationItem(
      id: id,
      title: title,
      body: body,
      timestamp: timestamp,
      isRead: isRead ?? this.isRead,
    );
  }

  @override
  List<Object> get props => [id, title, body, timestamp, isRead];
}

abstract class NotificationsState extends Equatable {
  const NotificationsState();

  @override
  List<Object> get props => [];
}

class NotificationsInitial extends NotificationsState {}

class NotificationsConnected extends NotificationsState {
  final List<NotificationItem> notifications;

  const NotificationsConnected({this.notifications = const []});

  int get unreadCount => notifications.where((n) => !n.isRead).length;

  @override
  List<Object> get props => [notifications];
}

class NotificationsDisconnected extends NotificationsState {}
