import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'api_service.dart';

class FeesScreen extends StatefulWidget {
  const FeesScreen({super.key});

  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

class _FeesScreenState extends State<FeesScreen> {
  late Razorpay _razorpay;
  bool _isLoading = true;
  Map<String, dynamic>? _feeData;
  String _studentId = "STU12345"; // Default demo ID

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
    _fetchFees();
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  Future<void> _fetchFees() async {
    final apiService = Provider.of<ApiService>(context, listen: false);
    final res = await apiService.getStudentFees(_studentId);
    if (mounted) {
      setState(() {
        _feeData = res?['data'];
        _isLoading = false;
      });
    }
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Payment Successful!"), backgroundColor: Colors.green),
    );
    _fetchFees(); // Refresh data
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Payment Failed: ${response.message}"), backgroundColor: Colors.red),
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("External Wallet: ${response.walletName}")),
    );
  }

  Future<void> _startPayment(double amount, String feeId, String type) async {
    final apiService = Provider.of<ApiService>(context, listen: false);
    final orderRes = await apiService.createRazorpayOrder({
      'amount': amount,
      'student_id': _studentId,
      'fee_id': feeId,
      'fee_type': type,
    });

    if (orderRes != null && orderRes['success'] == true) {
      var options = {
        'key': orderRes['key'],
        'amount': (amount * 100).toInt(),
        'name': 'Vidhyam School',
        'order_id': orderRes['orderId'],
        'description': 'Fee Payment',
        'timeout': 60,
        'prefill': {'contact': '9999999999', 'email': 'student@example.com'},
      };

      try {
        _razorpay.open(options);
      } catch (e) {
        debugPrint('Error: e');
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Failed to initialize payment"), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Fees & Payments"),
        backgroundColor: Colors.teal[700],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _feeData == null
              ? const Center(child: Text("No data found"))
              : Column(
                  children: [
                    _buildSummaryCard(),
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _buildSectionTitle("Pending Fees"),
                          ...(_feeData!['pendingFees'] as List).map((f) => _buildFeeItem(f, 'regular')),
                          const SizedBox(height: 20),
                          _buildSectionTitle("Custom Fees"),
                          ...(_feeData!['customFees'] as List).map((f) => _buildFeeItem(f, 'custom')),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildSummaryCard() {
    double total = (_feeData!['totalPending'] as num).toDouble();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.teal[700],
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: Column(
        children: [
          const Text("Total Outstanding", style: TextStyle(color: Colors.white70, fontSize: 16)),
          const SizedBox(height: 8),
          Text("₹${total.toStringAsFixed(2)}",
              style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
    );
  }

  Widget _buildFeeItem(Map<String, dynamic> fee, String type) {
    double amount = (fee['amount'] as num).toDouble();
    String title = fee['title'] ?? fee['fee_name'] ?? 'School Fee';
    String id = fee['id']?.toString() ?? fee['fee_id']?.toString() ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangle4(),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text("Due: ${fee['dueDate'] ?? 'N/A'}", style: const TextStyle(color: Colors.grey)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text("₹${amount.toStringAsFixed(2)}",
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.teal)),
            const SizedBox(height: 4),
            ElevatedButton(
              onPressed: () => _startPayment(amount, id, type),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                minimumSize: const Size(60, 30),
              ),
              child: const Text("Pay", style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  RoundedRectangleBorder RoundedRectangle4() => RoundedRectangleBorder(borderRadius: BorderRadius.circular(12));
}
