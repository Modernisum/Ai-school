import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/network/api_service.dart';
import '../../../core/network/api_response.dart';

class FeeBreakdownScreen extends StatefulWidget {
  final String responsibilityId;
  final String responsibilityName;

  const FeeBreakdownScreen({
    super.key,
    required this.responsibilityId,
    required this.responsibilityName,
  });

  @override
  State<FeeBreakdownScreen> createState() => _FeeBreakdownScreenState();
}

class _FeeBreakdownScreenState extends State<FeeBreakdownScreen> {
  final ApiService _apiService = ApiService();
  final storage = const FlutterSecureStorage();
  Map<String, dynamic>? _feeBreakdown;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadFeeBreakdown();
  }

  Future<void> _loadFeeBreakdown() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _apiService.getFeeBreakdownByResponsibility(widget.responsibilityId);

    setState(() {
      _isLoading = false;
      if (result is ApiSuccess) {
        _feeBreakdown = (result as ApiSuccess).data as Map<String, dynamic>;
      } else if (result is ApiError) {
        _errorMessage = (result as ApiError).message;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Fee Breakdown - ${widget.responsibilityName}'),
        backgroundColor: const Color(0xFFB298E7),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFFB298E7)),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_errorMessage!),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadFeeBreakdown,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB298E7),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_feeBreakdown == null) {
      return const Center(
        child: Text('No fee data available'),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSummaryCard(),
          const SizedBox(height: 16),
          _buildDetailsCard(),
          const SizedBox(height: 16),
          _buildPaymentScheduleCard(),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    final totalFees = _feeBreakdown!['total_fees'] ?? 0;
    final paidFees = _feeBreakdown!['paid_fees'] ?? 0;
    final pendingFees = _feeBreakdown!['pending_fees'] ?? 0;
    final dueDate = _feeBreakdown!['due_date'];

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Fee Summary',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildFeeRow('Total Fees', totalFees, Colors.black),
            const SizedBox(height: 8),
            _buildFeeRow('Paid Amount', paidFees, Colors.green),
            const SizedBox(height: 8),
            _buildFeeRow('Pending Amount', pendingFees, Colors.orange),
            const Divider(height: 24),
            if (dueDate != null)
              Row(
                children: [
                  const Icon(Icons.calendar_today, color: Color(0xFFB298E7)),
                  const SizedBox(width: 8),
                  Text(
                    'Due Date: $dueDate',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeeRow(String label, dynamic amount, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label),
        Text(
          '₹$amount',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: color,
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailsCard() {
    final feeComponents = _feeBreakdown!['fee_components'] as List<dynamic>? ?? [];

    if (feeComponents.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Fee Components',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...feeComponents.map((component) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          component['name'] ?? 'Unknown',
                          style: const TextStyle(fontSize: 14),
                        ),
                      ),
                      Text(
                        '₹${component['amount'] ?? 0}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentScheduleCard() {
    final schedule = _feeBreakdown!['payment_schedule'] as List<dynamic>? ?? [];

    if (schedule.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Payment Schedule',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...schedule.map((payment) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: payment['status'] == 'paid'
                              ? Colors.green
                              : Colors.orange,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              payment['description'] ?? 'Payment',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '${payment['date']} - ₹${payment['amount']}',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: payment['status'] == 'paid'
                              ? Colors.green.withOpacity(0.1)
                              : Colors.orange.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          payment['status']?.toUpperCase() ?? 'PENDING',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: payment['status'] == 'paid'
                                ? Colors.green
                                : Colors.orange,
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }
}
