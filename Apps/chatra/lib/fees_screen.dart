import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'api_service.dart';
import 'logic/fees/fees_bloc.dart';
import 'logic/fees/fees_event.dart';
import 'logic/fees/fees_state.dart';
import 'widgets/glass_card.dart';
import 'widgets/animated_gradient_bg.dart';
import 'theme/app_theme.dart';

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
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
    _loadStudentId();
  }

  Future<void> _loadStudentId() async {
    final apiService = context.read<ApiService>();
    final id = await apiService.storage.read(key: 'student_id');
    if (id != null && id.isNotEmpty) {
      if (mounted) {
        setState(() => _studentId = id);
        // Safely fetch fees once the ID is ready
        context.read<FeesBloc>().add(FeesFetchStarted(id));
      }
    }
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) {
    context.read<FeesBloc>().add(FeesPaymentCompleted({'payment_id': response.paymentId}));
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    context.read<FeesBloc>().add(FeesPaymentFailed(response.message ?? "Payment Cancelled"));
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    debugPrint("External Wallet: ${response.walletName}");
  }

  void _openRazorpay(FeesPaymentProcessing state) {
    var options = {
      'key': state.razorpayKey,
      'amount': (state.amount * 100).toInt(),
      'name': 'Vidhyam School',
      'order_id': state.orderId,
      'description': 'Fee Payment',
      'timeout': 60,
      'prefill': {'contact': '9999999999', 'email': 'student@example.com'},
    };

    try {
      _razorpay.open(options);
    } catch (e) {
      debugPrint('Error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => FeesBloc(apiService: context.read<ApiService>()),
      child: Builder(
        builder: (context) {
          // Initialize load after the bloc is available in the tree
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_studentId.isEmpty) _loadStudentId();
          });
          
          return BlocListener<FeesBloc, FeesState>(
        listener: (context, state) {
          if (state is FeesPaymentProcessing) {
            _openRazorpay(state);
          }
          if (state is FeesError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        child: Scaffold(
          extendBodyBehindAppBar: true,
          appBar: AppBar(
            title: const Text("Fees & Payments", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            backgroundColor: Colors.transparent,
            elevation: 0,
            iconTheme: const IconThemeData(color: Colors.white),
          ),
          body: AnimatedGradientBg(
            child: BlocBuilder<FeesBloc, FeesState>(
              builder: (context, state) {
                if (state is FeesLoading) {
                  return const Center(child: CircularProgressIndicator(color: Colors.white));
                }
                if (state is FeesPaymentSuccess) {
                  return _buildSuccessUI(state.transactionId);
                }
                if (state is FeesLoaded) {
                  return _buildFeesList(context, state);
                }
                return const Center(child: Text("Initialising Ledger...", style: TextStyle(color: Colors.white)));
              },
            ),
          ),
          bottomNavigationBar: _buildBottomAction(),
        ),
      );
     },
    ),
   );
  }

  Widget _buildFeesList(BuildContext context, FeesLoaded state) {
    final pending = state.feeData['pendingFees'] as List? ?? [];
    final custom = state.feeData['customFees'] as List? ?? [];

    return SafeArea(
      child: Column(
        children: [
          _buildSummaryCard(state.totalToPay),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 0, vertical: 8),
              children: [
                if (pending.isNotEmpty) _buildSectionTitle("Pending Fees"),
                ...pending.map((f) => _buildFeeItem(context, state, f, 'regular')),
                const SizedBox(height: 20),
                if (custom.isNotEmpty) _buildSectionTitle("Custom Fees"),
                ...custom.map((f) => _buildFeeItem(context, state, f, 'custom')),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(double totalToPay) {
    return GlassCard(
      blur: 8,
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Text("Total Selected", style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 16)),
          const SizedBox(height: 8),
          Text("₹${totalToPay.toStringAsFixed(2)}",
              style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold))
              .animate()
              .scale(duration: 200.ms, curve: Curves.easeOut),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8.0),
      child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
    );
  }

  Widget _buildFeeItem(BuildContext context, FeesLoaded state, Map<String, dynamic> fee, String type) {
    final double amount = (fee['amount'] as num).toDouble();
    final String title = fee['title'] ?? fee['fee_name'] ?? 'School Fee';
    final String id = fee['id']?.toString() ?? fee['fee_id']?.toString() ?? '';
    final bool isLate = fee['isLate'] ?? false;

    final isSelected = state.selectedFees.any((f) => f['id'] == id);

    return GlassCard(
      padding: const EdgeInsets.all(8),
      borderRadius: 16,
      child: CheckboxListTile(
        value: isSelected,
        activeColor: AppColors.accentTeal,
        checkColor: Colors.black,
        onChanged: (val) {
          final List<Map<String, dynamic>> newList = List.from(state.selectedFees);
          if (val == true) {
            newList.add({'id': id, 'amount': amount, 'title': title, 'type': type});
          } else {
            newList.removeWhere((f) => f['id'] == id);
          }
          context.read<FeesBloc>().add(FeesSelectionChanged(newList));
        },
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Due: ${fee['dueDate'] ?? 'N/A'}", style: TextStyle(color: Colors.white.withOpacity(0.7))),
            if (isLate)
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: Colors.red.withOpacity(0.3), borderRadius: BorderRadius.circular(4)),
                child: const Text("LATE PENALTY APPLIED", style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
              ).animate().shake(),
          ],
        ),
        secondary: Text("₹${amount.toInt()}",
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
    );
  }

  Widget _buildBottomAction() {
    return BlocBuilder<FeesBloc, FeesState>(
      builder: (context, state) {
        if (state is FeesLoaded && state.selectedFees.isNotEmpty) {
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: ElevatedButton(
                onPressed: () {
                  context.read<FeesBloc>().add(FeesPaymentInitiated(
                    totalAmount: state.totalToPay,
                    studentId: _studentId,
                    feeIds: state.selectedFees.map((e) => e['id'].toString()).toList(),
                  ));
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentTeal,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text("Proceed to Payment", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ).animate().slideY(begin: 1.0, end: 0.0),
            ),
          );
        }
        return const SizedBox();
      },
    );
  }

  Widget _buildSuccessUI(String txId) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.2),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: Colors.green.withOpacity(0.3), blurRadius: 40, spreadRadius: 10)
              ],
            ),
            child: const Icon(Icons.check_circle, size: 100, color: Colors.greenAccent),
          ).animate().scale(duration: 600.ms, curve: Curves.elasticOut).then().shimmer(duration: 2.seconds),
          const SizedBox(height: 32),
          const Text("Payment Successful!",
              style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Text("TxID: $txId", style: TextStyle(color: Colors.white.withOpacity(0.7))),
          const SizedBox(height: 48),
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.download),
            label: const Text("Download Receipt"),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white.withOpacity(0.1),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              side: const BorderSide(color: Colors.white24),
            ),
          ).animate().fadeIn(delay: 800.ms),
          TextButton(
            onPressed: () => context.read<FeesBloc>().add(FeesFetchStarted(_studentId)),
            child: const Text("Back to Ledger", style: TextStyle(color: AppColors.accentTeal)),
          ),
        ],
      ),
    );
  }
}
