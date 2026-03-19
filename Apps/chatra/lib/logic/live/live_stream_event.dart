import 'package:equatable/equatable.dart';

abstract class LiveStreamEvent extends Equatable {
  const LiveStreamEvent();
  @override
  List<Object?> get props => [];
}

/// Start watching for live broadcast signals for a given class.
class LiveWatchStarted extends LiveStreamEvent {
  final String schoolId;
  final String classId;
  const LiveWatchStarted({required this.schoolId, required this.classId});
  @override
  List<Object?> get props => [schoolId, classId];
}

/// Raw WS data received — BLoC will parse and decide if it's a live event.
class LiveDataReceived extends LiveStreamEvent {
  final Map<String, dynamic> data;
  const LiveDataReceived(this.data);
  @override
  List<Object?> get props => [data];
}

/// Teacher ended the live session.
class LiveStreamEnded extends LiveStreamEvent {}
