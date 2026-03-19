import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AppStarted extends AuthEvent {}

class LoggedIn extends AuthEvent {
  final String token;
  final String role;

  const LoggedIn({required this.token, required this.role});

  @override
  List<Object?> get props => [token, role];
}

class LoggedOut extends AuthEvent {}
class IntroCompleted extends AuthEvent {}
