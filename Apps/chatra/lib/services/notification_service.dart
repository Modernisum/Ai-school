import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:chatra/core/network/api_service.dart';

/// Top-level handler required by Firebase for background/terminated state.
/// Must be a top-level function (not a class method).
@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  // Firebase is already initialized before this runs via FlutterFire
  debugPrint('[FCM Background] ${message.notification?.title}');
}

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final _messaging = FirebaseMessaging.instance;
  final _localNotifications = FlutterLocalNotificationsPlugin();

  /// Android notification channel for heads-up banners.
  static const _androidChannel = AndroidNotificationChannel(
    'chatra_high_importance',
    'Chatra Alerts',
    description: 'School notifications, fee reminders, and live class alerts',
    importance: Importance.high,
    playSound: true,
  );

  /// Call once in main() before runApp().
  Future<void> init() async {
    // 1. Register background handler
    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);

    // 2. Request iOS/Android 13+ permission
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: false,
    );

    // 3. Configure local notifications plugin
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    await _localNotifications.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // 4. Create the Android channel (no-op on iOS)
    if (Platform.isAndroid) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_androidChannel);
    }

    // 5. Handle foreground messages — show as local heads-up notification
    FirebaseMessaging.onMessage.listen(_showForegroundNotification);

    // 6. Handle tap when app is in background (not terminated)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageTap);

    // 7. Handle tap when app was terminated
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) _handleMessageTap(initialMessage);

    // 8. Log the FCM token (register with backend in production)
    final token = await _messaging.getToken();
    debugPrint('[FCM Token] $token');
  }

  void _showForegroundNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id,
          _androidChannel.name,
          channelDescription: _androidChannel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(presentAlert: true, presentBadge: true, presentSound: true),
      ),
      // Encode route for tap handler
      payload: message.data['route'],
    );
  }

  /// Called when user taps a local notification.
  void _onNotificationTap(NotificationResponse response) {
    _navigateToRoute(response.payload);
  }

  /// Called when user taps an FCM notification while app is running.
  void _handleMessageTap(RemoteMessage message) {
    _navigateToRoute(message.data['route']);
  }

  /// Global navigator key — set in main.dart and used here to push routes.
  static GlobalKey<NavigatorState>? navigatorKey;

  void _navigateToRoute(String? route) {
    if (route == null || route.isEmpty) return;
    debugPrint('[FCM Navigate] → $route');
    if (router != null) {
      router!.push(route);
    } else {
      navigatorKey?.currentState?.pushNamed(route);
    }
  }

  static GoRouter? router;

  Future<void> registerWithBackend(ApiService apiService) async {
    try {
      final token = await _messaging.getToken();
      if (token != null) {
        debugPrint('[FCM] Registering token with backend...');
        await apiService.registerDevice(token);
        
        // Also subscribe to current school topic for broadcasts
        final sid = await apiService.storage.read(key: 'school_id');
        if (sid != null) {
          await _messaging.subscribeToTopic('${sid}_general');
          // Admins would subscribe to ${sid}_admins
        }
      }
    } catch (e) {
      debugPrint('[FCM Error] Registration failed: $e');
    }
  }
}
