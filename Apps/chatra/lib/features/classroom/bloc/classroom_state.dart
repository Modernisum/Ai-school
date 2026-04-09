abstract class ClassroomState {}

class ClassroomInitial extends ClassroomState {}

class ClassroomLoading extends ClassroomState {}

class ClassroomLoaded extends ClassroomState {
  final List<Map<String, dynamic>> classrooms;

  ClassroomLoaded(this.classrooms);
}

class ClassroomError extends ClassroomState {
  final String message;

  ClassroomError(this.message);
}
