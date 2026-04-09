import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:chatra/core/network/api_service.dart';
import 'package:chatra/features/fees/bloc/fees_bloc.dart';
import 'package:chatra/features/fees/bloc/fees_event.dart';
import 'package:chatra/features/fees/bloc/fees_state.dart';
import 'package:chatra/widgets/animated_gradient_bg.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/features/fees/screens/widgets/fee_widgets.dart';
import 'package:chatra/core/network/fees_api.dart';

class FeesScreen extends StatefulWidget {
  const FeesScreen({super.key});
  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

class _FeesScreenState extends State<FeesScreen> {
  late Razorpay _razorpay;
  String _studentId = "";

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (resp) => context.read<FeesBloc>().add(FeesPaymentCompleted({'payment_id': resp.paymentId})));
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (resp) => context.read<FeesBloc>().add(FeesPaymentFailed(resp.message ?? "Payment Cancelled")));
    _loadStudentId();
  }

  Future<void> _loadStudentId() async {
    final id = await context.read<ApiService>().storage.read(key: 'student_id');
    if (id != null && id.isNotEmpty && mounted) {
      setState(() => _studentId = id);
      context.read<FeesBloc>().add(FeesFetchStarted(id));
    }
  }

  void _openRazorpay(FeesPaymentProcessing state) {
    try {
      _razorpay.open({
        'key': state.razorpayKey, 'amount': (state.amount * 100).toInt(),
        'name': 'Vidhyam School', 'order_id': state.orderId, 'description': 'Fee Payment',
        'timeout': 60, 'prefill': {'contact': '9999999999', 'email': 'student@example.com'},
      });
    } catch (e) { debugPrint('Razorpay Error: $e'); }
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => FeesBloc(feesApi: FeesApi(storage: context.read<ApiService>().storage)),
      child: Builder(builder: (context) {
        WidgetsBinding.instance.addPostFrameCallback((_) { if (_studentId.isEmpty) _loadStudentId(); });
        return BlocListener<FeesBloc, FeesState>(
          listener: (context, state) {
            if (state is FeesPaymentProcessing) _openRazorpay(state);
            if (state is FeesError) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message), backgroundColor: Colors.red));
          },
          child: Scaffold(
            extendBodyBehindAppBar: true,
            appBar: AppBar(title: const Text("Fees & Payments", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), backgroundColor: Colors.transparent, elevation: 0, iconTheme: const IconThemeData(color: Colors.white)),
            body: AnimatedGradientBg(
              child: BlocBuilder<FeesBloc, FeesState>(
                builder: (context, state) {
                  if (state is FeesLoading) return const Center(child: CircularProgressIndicator(color: Colors.white));
                  if (state is FeesPaymentSuccess) return PaymentSuccessUI(transactionId: state.transactionId, onBack: () => context.read<FeesBloc>().add(FeesFetchStarted(_studentId)));
                  if (state is FeesLoaded) return _buildFeesContent(context, state);
                  return const Center(child: Text("Initialising Ledger...", style: TextStyle(color: Colors.white)));
                },
              ),
            ),
            bottomNavigationBar: _buildBottomAction(),
          ),
        );
      }),
    );
  }

  Widget _buildFeesContent(BuildContext context, FeesLoaded state) {
    final pending = state.feeData['pendingFees'] as List? ?? [];
    final custom = state.feeData['customFees'] as List? ?? [];
    return SafeArea(child: Column(children: [
      FeesSummaryCard(totalToPay: state.totalToPay),
      Expanded(child: ListView(padding: const EdgeInsets.symmetric(vertical: 8), children: [
        if (pending.isNotEmpty) const _SectionTitle("Pending Fees"),
        ...pending.map((f) => FeeItemWidget(fee: f, isSelected: state.selectedFees.any((sf) => sf['id'] == (f['id']?.toString() ?? f['fee_id']?.toString())), type: 'regular', onChanged: (val) => _toggleFee(context, state, f, val, 'regular'))),
        if (custom.isNotEmpty) const _SectionTitle("Custom Fees"),
        ...custom.map((f) => FeeItemWidget(fee: f, isSelected: state.selectedFees.any((sf) => sf['id'] == (f['id']?.toString() ?? f['fee_id']?.toString())), type: 'custom', onChanged: (val) => _toggleFee(context, state, f, val, 'custom'))),
      ])),
    ]));
  }

  void _toggleFee(BuildContext context, FeesLoaded state, Map<String, dynamic> fee, bool? val, String type) {
    final id = fee['id']?.toString() ?? fee['fee_id']?.toString() ?? '';
    final List<Map<String, dynamic>> newList = List.from(state.selectedFees);
    if (val == true) newList.add({'id': id, 'amount': (fee['amount'] as num).toDouble(), 'title': fee['title'] ?? 'Fee', 'type': type});
    else newList.removeWhere((f) => f['id'] == id);
    context.read<FeesBloc>().add(FeesSelectionChanged(newList));
  }

  Widget _buildBottomAction() {
    return BlocBuilder<FeesBloc, FeesState>(builder: (context, state) {
      if (state is FeesLoaded && state.selectedFees.isNotEmpty) {
        return SafeArea(child: Padding(padding: const EdgeInsets.all(16.0), child: ElevatedButton(
          onPressed: () => context.read<FeesBloc>().add(FeesPaymentInitiated(totalAmount: state.totalToPay, studentId: _studentId, feeIds: state.selectedFees.map((e) => e['id'].toString()).toList())),
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentTeal, foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
          child: const Text("Proceed to Payment", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ).animate().slideY(begin: 1.0, end: 0.0)));
      }
      return const SizedBox();
    });
  }

  @override
  void dispose() { _razorpay.clear(); super.dispose(); }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);
  @override
  Widget build(BuildContext context) {
    return Padding(padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8.0), child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)));
  }
}
