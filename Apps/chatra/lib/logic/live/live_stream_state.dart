import 'package:equatable/equatable.dart';

abstract class LiveStreamState extends Equatable {
  const LiveStreamState();
  @override
  List<Object?> get props => [];
}

class LiveStreamIdle extends LiveStreamState {}

class LiveStreamConnecting extends LiveStreamState {}

/// A teacher is actively broadcasting — dashboard shows LIVE badge.
class LiveStreamActive extends LiveStreamState {
  final String teacherName;
  final String subject;
  final String classId;
  final DateTime startedAt;

  const LiveStreamActive({
    required this.teacherName,
    required this.subject,
    required this.classId,
    required this.startedAt,
  });

  @override
  List<Object?> get props => [teacherName, subject, classId, startedAt];
}

class LiveStreamOffline extends LiveStreamState {
  final String reason;
  const LiveStreamOffline([this.reason = "Stream ended"]);
  @override
  List<Object?> get props => [reason];
}
