import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:chatra/core/network/fees_api.dart';
import 'package:chatra/core/network/api_response.dart';
import 'fees_event.dart';
import 'fees_state.dart';

class FeesBloc extends Bloc<FeesEvent, FeesState> {
  final FeesApi feesApi;

  FeesBloc({required this.feesApi}) : super(FeesInitial()) {
    on<FeesFetchStarted>(_onFetchStarted);
    on<FeesSelectionChanged>(_onSelectionChanged);
    on<FeesPaymentInitiated>(_onPaymentInitiated);
    on<FeesPaymentCompleted>(_onPaymentCompleted);
    on<FeesPaymentFailed>(_onPaymentFailed);
  }

  Future<void> _onFetchStarted(FeesFetchStarted event, Emitter<FeesState> emit) async {
    emit(FeesLoading());
    final resp = await feesApi.getStudentFees(event.studentId);
    
    if (resp is ApiSuccess<Map<String, dynamic>>) {
      final data = resp.data;
      if (data['data'] != null) {
        emit(FeesLoaded(
          feeData: data['data'],
          selectedFees: const [],
          totalToPay: 0.0,
        ));
      } else {
        emit(const FeesError("Fees data not found or empty."));
      }
    } else if (resp is ApiError) {
      emit(FeesError("Failed to fetch fees: ${(resp as ApiError).message}"));
    } else {
      emit(const FeesError("Unexpected error occurred while fetching fees."));
    }
  }

  void _onSelectionChanged(FeesSelectionChanged event, Emitter<FeesState> emit) {
    if (state is FeesLoaded) {
      final currentState = state as FeesLoaded;
      double total = event.selectedFees.fold(0.0, (sum, f) => sum + (f['amount'] as num).toDouble());
      emit(FeesLoaded(
        feeData: currentState.feeData,
        selectedFees: event.selectedFees,
        totalToPay: total,
      ));
    }
  }

  Future<void> _onPaymentInitiated(FeesPaymentInitiated event, Emitter<FeesState> emit) async {
    final currentState = state;
    emit(FeesLoading());
    
    final resp = await feesApi.createRazorpayOrder({
      'amount': event.totalAmount,
      'student_id': event.studentId,
      'fee_id': event.feeIds.join(','),
      'fee_type': 'combined', 
    });

    if (resp is ApiSuccess<Map<String, dynamic>>) {
      final data = resp.data;
      if (data['success'] == true) {
        emit(FeesPaymentProcessing(
          orderId: data['orderId'],
          razorpayKey: data['key'],
          amount: event.totalAmount,
        ));
      } else {
        _handleInitiationFailure(emit, currentState, "Payment gateway response invalid.");
      }
    } else if (resp is ApiError) {
      _handleInitiationFailure(emit, currentState, (resp as ApiError).message);
    } else {
      _handleInitiationFailure(emit, currentState, "Unknown payment initiation error.");
    }
  }

  void _handleInitiationFailure(Emitter<FeesState> emit, FeesState? prevState, String message) {
    emit(FeesError("Payment Initiation Error: $message"));
    if (prevState is FeesLoaded) emit(prevState);
  }

  void _onPaymentCompleted(FeesPaymentCompleted event, Emitter<FeesState> emit) {
    emit(FeesPaymentSuccess(event.response['payment_id'] ?? "SUCCESS"));
  }

  void _onPaymentFailed(FeesPaymentFailed event, Emitter<FeesState> emit) {
    emit(FeesError("Payment Failed: ${event.message}"));
  }
}
