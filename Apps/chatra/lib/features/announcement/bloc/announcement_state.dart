abstract class AnnouncementState {}

class AnnouncementInitial extends AnnouncementState {}

class AnnouncementLoading extends AnnouncementState {}

class AnnouncementLoaded extends AnnouncementState {
  final List<Map<String, dynamic>> announcements;

  AnnouncementLoaded(this.announcements);
}

class AnnouncementError extends AnnouncementState {
  final String message;

  AnnouncementError(this.message);
}
