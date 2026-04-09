import 'package:equatable/equatable.dart';

abstract class FeesState extends Equatable {
  const FeesState();

  @override
  List<Object?> get props => [];
}

class FeesInitial extends FeesState {}

class FeesLoading extends FeesState {}

class FeesLoaded extends FeesState {
  final Map<String, dynamic> feeData;
  final List<Map<String, dynamic>> selectedFees;
  final double totalToPay;

  const FeesLoaded({
    required this.feeData,
    required this.selectedFees,
    required this.totalToPay,
  });

  @override
  List<Object?> get props => [feeData, selectedFees, totalToPay];
}

class FeesPaymentProcessing extends FeesState {
  final String orderId;
  final String razorpayKey;
  final double amount;

  const FeesPaymentProcessing({
    required this.orderId,
    required this.razorpayKey,
    required this.amount,
  });

  @override
  List<Object?> get props => [orderId, razorpayKey, amount];
}

class FeesPaymentSuccess extends FeesState {
  final String transactionId;
  const FeesPaymentSuccess(this.transactionId);

  @override
  List<Object?> get props => [transactionId];
}

class FeesError extends FeesState {
  final String message;
  const FeesError(this.message);

  @override
  List<Object?> get props => [message];
}
