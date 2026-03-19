import 'package:flutter_bloc/flutter_bloc.dart';
import '../../api_service.dart';
import 'fees_event.dart';
import 'fees_state.dart';

class FeesBloc extends Bloc<FeesEvent, FeesState> {
  final ApiService apiService;

  FeesBloc({required this.apiService}) : super(FeesInitial()) {
    on<FeesFetchStarted>(_onFetchStarted);
    on<FeesSelectionChanged>(_onSelectionChanged);
    on<FeesPaymentInitiated>(_onPaymentInitiated);
    on<FeesPaymentCompleted>(_onPaymentCompleted);
    on<FeesPaymentFailed>(_onPaymentFailed);
  }

  Future<void> _onFetchStarted(FeesFetchStarted event, Emitter<FeesState> emit) async {
    emit(FeesLoading());
    try {
      final res = await apiService.getStudentFees(event.studentId);
      if (res != null && res['data'] != null) {
        emit(FeesLoaded(
          feeData: res['data'],
          selectedFees: const [],
          totalToPay: 0.0,
        ));
      } else {
        emit(const FeesError("Failed to fetch fees."));
      }
    } catch (e) {
      emit(FeesError("Error: $e"));
    }
  }

  void _onSelectionChanged(FeesSelectionChanged event, Emitter<FeesState> emit) {
    if (state is FeesLoaded) {
      final currentState = state as FeesLoaded;
      double total = 0.0;
      for (var f in event.selectedFees) {
        total += (f['amount'] as num).toDouble();
      }
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
    try {
      // For multi-selection, we'll use the first fee's ID and total amount for the order
      // In a more complex setup, the backend would accept a list of fee IDs
      final orderRes = await apiService.createRazorpayOrder({
        'amount': event.totalAmount,
        'student_id': event.studentId,
        'fee_id': event.feeIds.join(','),
        'fee_type': 'combined', 
      });

      if (orderRes != null && orderRes['success'] == true) {
        emit(FeesPaymentProcessing(
          orderId: orderRes['orderId'],
          razorpayKey: orderRes['key'],
          amount: event.totalAmount,
        ));
      } else {
        emit(const FeesError("Failed to initialize payment gateway."));
        // Re-emit loaded state so user can try again
        if (currentState is FeesLoaded) emit(currentState);
      }
    } catch (e) {
      emit(FeesError("Payment Initialization Error: $e"));
      if (currentState is FeesLoaded) emit(currentState);
    }
  }

  void _onPaymentCompleted(FeesPaymentCompleted event, Emitter<FeesState> emit) {
    emit(FeesPaymentSuccess(event.response['payment_id'] ?? "SUCCESS"));
  }

  void _onPaymentFailed(FeesPaymentFailed event, Emitter<FeesState> emit) {
    emit(FeesError("Payment Failed: ${event.message}"));
  }
}
