import 'dart:convert';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../api_service.dart';
import 'live_stream_event.dart';
import 'live_stream_state.dart';

class LiveStreamBloc extends Bloc<LiveStreamEvent, LiveStreamState> {
  final ApiService apiService;
  WebSocketChannel? _channel;

  LiveStreamBloc({required this.apiService}) : super(LiveStreamIdle()) {
    on<LiveWatchStarted>(_onWatchStarted);
    on<LiveDataReceived>(_onDataReceived);
    on<LiveStreamEnded>(_onStreamEnded);
  }

  Future<void> _onWatchStarted(LiveWatchStarted event, Emitter<LiveStreamState> emit) async {
    emit(LiveStreamConnecting());
    try {
      final token = await apiService.storage.read(key: 'jwt_token');
      if (token == null) { emit(const LiveStreamOffline("Unauthorized")); return; }

      final wsUrl = ApiService.wsUrl;
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      // Auth handshake — subscribe to the class live channel
      _channel!.sink.add(jsonEncode({
        'token': token,
        'school_id': event.schoolId,
        // The server routes "school:{id}:live:{classId}" channel if vehicle_id absent
      }));

      _channel!.stream.listen(
        (msg) {
          if (msg is String && msg != "Authenticated successfully") {
            try {
              final data = jsonDecode(msg) as Map<String, dynamic>;
              if (data['type'] == 'live_started' || data['type'] == 'live_ended') {
                add(LiveDataReceived(data));
              }
            } catch (_) {}
          }
        },
        onDone: () => add(LiveStreamEnded()),
        onError: (_) => add(LiveStreamEnded()),
      );

      // Stay idle until a live_started event comes in
      emit(LiveStreamIdle());
    } catch (e) {
      emit(LiveStreamOffline("$e"));
    }
  }

  void _onDataReceived(LiveDataReceived event, Emitter<LiveStreamState> emit) {
    final type = event.data['type'];
    if (type == 'live_started') {
      emit(LiveStreamActive(
        teacherName: event.data['teacher'] ?? 'Teacher',
        subject: event.data['subject'] ?? 'Class',
        classId: event.data['class_id'] ?? '',
        startedAt: DateTime.now(),
      ));
    } else if (type == 'live_ended') {
      emit(const LiveStreamOffline("Class ended"));
    }
  }

  void _onStreamEnded(LiveStreamEnded event, Emitter<LiveStreamState> emit) {
    _channel?.sink.close();
    _channel = null;
    emit(const LiveStreamOffline());
  }

  @override
  Future<void> close() {
    _channel?.sink.close();
    return super.close();
  }
}
