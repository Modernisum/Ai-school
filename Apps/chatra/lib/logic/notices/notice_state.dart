import 'package:equatable/equatable.dart';

abstract class NoticeState extends Equatable {
  const NoticeState();
  @override
  List<Object?> get props => [];
}

class NoticeInitial extends NoticeState {}

class NoticeConnecting extends NoticeState {}

class NoticeConnected extends NoticeState {
  final List<Map<String, dynamic>> notices;
  final Map<String, dynamic>? latestUnread;

  const NoticeConnected({required this.notices, this.latestUnread});

  @override
  List<Object?> get props => [notices, latestUnread];

  NoticeConnected copyWith({
    List<Map<String, dynamic>>? notices,
    Map<String, dynamic>? latestUnread,
    bool clearLatest = false,
  }) {
    return NoticeConnected(
      notices: notices ?? this.notices,
      latestUnread: clearLatest ? null : (latestUnread ?? this.latestUnread),
    );
  }
}

class NoticeError extends NoticeState {
  final String message;
  const NoticeError(this.message);
  @override
  List<Object?> get props => [message];
}
