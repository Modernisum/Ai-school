import 'dart:convert';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../api_service.dart';
import 'notice_event.dart';
import 'notice_state.dart';

class NoticeBloc extends Bloc<NoticeEvent, NoticeState> {
  final ApiService apiService;
  WebSocketChannel? _channel;

  NoticeBloc({required this.apiService}) : super(NoticeInitial()) {
    on<NoticeStreamStarted>(_onStreamStarted);
    on<NoticeReceived>(_onNoticeReceived);
    on<NoticeDismissed>(_onNoticeDismissed);
  }

  Future<void> _onStreamStarted(NoticeStreamStarted event, Emitter<NoticeState> emit) async {
    emit(NoticeConnecting());
    try {
      final token = await apiService.storage.read(key: 'jwt_token');
      if (token == null) {
        emit(const NoticeError("Unauthorized"));
        return;
      }

      final wsUrl = await apiService.getSocketUrl();
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));


      // Auth handshake — no vehicle_id, subscribe to user channel for notices
      _channel!.sink.add(jsonEncode({
        'token': token,
        'school_id': event.schoolId,
      }));

      _channel!.stream.listen(
        (message) {
          if (message is String && message != "Authenticated successfully") {
            try {
              final data = jsonDecode(message) as Map<String, dynamic>;
              if (data['type'] == 'announcement') {
                add(NoticeReceived(data));
              }
            } catch (_) {}
          }
        },
        onDone: () => emit(const NoticeError("Connection closed")),
        onError: (_) => emit(const NoticeError("Connection error")),
      );

      emit(const NoticeConnected(notices: []));
    } catch (e) {
      emit(NoticeError("$e"));
    }
  }

  void _onNoticeReceived(NoticeReceived event, Emitter<NoticeState> emit) {
    if (state is NoticeConnected) {
      final current = state as NoticeConnected;
      final updated = [event.notice, ...current.notices];
      emit(current.copyWith(notices: updated, latestUnread: event.notice));
    }
  }

  void _onNoticeDismissed(NoticeDismissed event, Emitter<NoticeState> emit) {
    if (state is NoticeConnected) {
      final current = state as NoticeConnected;
      emit(current.copyWith(clearLatest: true));
    }
  }

  @override
  Future<void> close() {
    _channel?.sink.close();
    return super.close();
  }
}
