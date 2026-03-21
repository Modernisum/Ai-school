import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

class AppStarted extends AuthEvent {}

class LoginRequested extends AuthEvent {
  final String schoolId;
  final String identifier; // phone or email
  final String password;

  const LoginRequested({
    required this.schoolId,
    required this.identifier,
    required this.password,
  });

  @override
  List<Object> get props => [schoolId, identifier, password];
}

class ProfileSelected extends AuthEvent {
  final Map<String, dynamic> profile;
  final String identifier;
  
  const ProfileSelected({required this.profile, required this.identifier});
  
  @override
  List<Object> get props => [profile, identifier];
}

class LogoutRequested extends AuthEvent {}
