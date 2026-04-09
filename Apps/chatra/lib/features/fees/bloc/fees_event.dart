import 'package:equatable/equatable.dart';

abstract class FeesEvent extends Equatable {
  const FeesEvent();

  @override
  List<Object?> get props => [];
}

class FeesFetchStarted extends FeesEvent {
  final String studentId;
  const FeesFetchStarted(this.studentId);

  @override
  List<Object?> get props => [studentId];
}

class FeesSelectionChanged extends FeesEvent {
  final List<Map<String, dynamic>> selectedFees;
  const FeesSelectionChanged(this.selectedFees);

  @override
  List<Object?> get props => [selectedFees];
}

class FeesPaymentInitiated extends FeesEvent {
  final double totalAmount;
  final String studentId;
  final List<String> feeIds;
  const FeesPaymentInitiated({
    required this.totalAmount,
    required this.studentId,
    required this.feeIds,
  });

  @override
  List<Object?> get props => [totalAmount, studentId, feeIds];
}

class FeesPaymentCompleted extends FeesEvent {
  final Map<String, dynamic> response;
  const FeesPaymentCompleted(this.response);

  @override
  List<Object?> get props => [response];
}

class FeesPaymentFailed extends FeesEvent {
  final String message;
  const FeesPaymentFailed(this.message);

  @override
  List<Object?> get props => [message];
}
