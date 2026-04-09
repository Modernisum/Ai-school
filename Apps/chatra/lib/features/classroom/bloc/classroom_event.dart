abstract class ClassroomEvent {}

class ClassroomFetchStarted extends ClassroomEvent {
  final String schoolId;
  final String studentId;

  ClassroomFetchStarted({required this.schoolId, required this.studentId});
}

class ClassroomRefreshRequested extends ClassroomEvent {}
