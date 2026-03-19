import 'package:equatable/equatable.dart';

abstract class NoticeEvent extends Equatable {
  const NoticeEvent();
  @override
  List<Object?> get props => [];
}

class NoticeStreamStarted extends NoticeEvent {
  final String schoolId;
  final String studentId;
  const NoticeStreamStarted({required this.schoolId, required this.studentId});
  @override
  List<Object?> get props => [schoolId, studentId];
}

class NoticeReceived extends NoticeEvent {
  final Map<String, dynamic> notice;
  const NoticeReceived(this.notice);
  @override
  List<Object?> get props => [notice];
}

class NoticeDismissed extends NoticeEvent {
  final String noticeId;
  const NoticeDismissed(this.noticeId);
  @override
  List<Object?> get props => [noticeId];
}
