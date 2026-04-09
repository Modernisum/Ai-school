import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:chatra/theme/app_theme.dart';
import 'package:chatra/widgets/glass_card.dart';

class FeesSummaryCard extends StatelessWidget {
  final double totalToPay;

  const FeesSummaryCard({super.key, required this.totalToPay});

  @override
  Widget build(BuildContext context) {
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
}

class FeeItemWidget extends StatelessWidget {
  final Map<String, dynamic> fee;
  final bool isSelected;
  final String type;
  final Function(bool?) onChanged;

  const FeeItemWidget({
    super.key,
    required this.fee,
    required this.isSelected,
    required this.type,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final double amount = (fee['amount'] as num).toDouble();
    final String title = fee['title'] ?? fee['fee_name'] ?? 'School Fee';
    final bool isLate = fee['isLate'] ?? false;

    return GlassCard(
      padding: const EdgeInsets.all(8),
      margin: const EdgeInsets.only(bottom: 8),
      borderRadius: 16,
      child: CheckboxListTile(
        value: isSelected,
        activeColor: AppColors.accentTeal,
        checkColor: Colors.black,
        onChanged: onChanged,
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
}

class PaymentSuccessUI extends StatelessWidget {
  final String transactionId;
  final VoidCallback onBack;

  const PaymentSuccessUI({super.key, required this.transactionId, required this.onBack});

  @override
  Widget build(BuildContext context) {
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
          Text("TxID: $transactionId", style: TextStyle(color: Colors.white.withOpacity(0.7))),
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
            onPressed: onBack,
            child: Text("Back to Ledger", style: TextStyle(color: AppColors.accentTeal)),
          ),
        ],
      ),
    );
  }
}
