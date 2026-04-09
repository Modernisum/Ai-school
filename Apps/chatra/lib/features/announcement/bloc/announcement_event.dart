abstract class AnnouncementEvent {}

class AnnouncementFetchStarted extends AnnouncementEvent {
  final String schoolId;

  AnnouncementFetchStarted(this.schoolId);
}

class AnnouncementRefreshRequested extends AnnouncementEvent {}
