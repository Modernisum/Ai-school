import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'notifications_event.dart';
import 'notifications_state.dart';

class NotificationsBloc extends Bloc<NotificationsEvent, NotificationsState> {
  Timer? _mockSocketTimer;

  NotificationsBloc() : super(NotificationsInitial()) {
    on<ConnectWebSocket>(_onConnectWebSocket);
    on<DisconnectWebSocket>(_onDisconnectWebSocket);
    on<NotificationReceived>(_onNotificationReceived);
    on<MarkAllRead>(_onMarkAllRead);
  }

  void _onConnectWebSocket(ConnectWebSocket event, Emitter<NotificationsState> emit) {
    emit(const NotificationsConnected());

    // Mocking an incoming server push event every 15 seconds
    _mockSocketTimer?.cancel();
    _mockSocketTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      if (isClosed) {
        timer.cancel();
        return;
      }
      add(NotificationReceived({
        "title": "System Update",
        "body": "A new timetable has been generated for your class.",
      }));
    });
  }

  void _onDisconnectWebSocket(DisconnectWebSocket event, Emitter<NotificationsState> emit) {
    _mockSocketTimer?.cancel();
    emit(NotificationsDisconnected());
  }

  void _onNotificationReceived(NotificationReceived event, Emitter<NotificationsState> emit) {
    if (state is NotificationsConnected) {
      final currentState = state as NotificationsConnected;
      
      final newNotification = NotificationItem(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        title: event.payload['title'] ?? 'New Alert',
        body: event.payload['body'] ?? '',
        timestamp: DateTime.now(),
      );

      // Add to top of list
      final updatedList = [newNotification, ...currentState.notifications];
      emit(NotificationsConnected(notifications: updatedList));
    }
  }

  void _onMarkAllRead(MarkAllRead event, Emitter<NotificationsState> emit) {
    if (state is NotificationsConnected) {
      final currentState = state as NotificationsConnected;
      final updatedList = currentState.notifications.map((n) => n.copyWith(isRead: true)).toList();
      emit(NotificationsConnected(notifications: updatedList));
    }
  }

  @override
  Future<void> close() {
    _mockSocketTimer?.cancel();
    return super.close();
  }
}
