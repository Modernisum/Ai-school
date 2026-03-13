import 'package:flutter/material.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class SalarySlipScreen extends StatelessWidget {
  const SalarySlipScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Salary Slip'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.pop(context),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.download),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Downloading PDF...')),
                );
              },
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GlassCard(
                child: Column(
                  children: [
                    const CircleAvatar(
                      radius: 30,
                      backgroundColor: Colors.white24,
                      child: Icon(Icons.person, size: 40, color: Colors.white),
                    ),
                    const SizedBox(height: 12),
                    const Text('Employee Name', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
                    Text('EMP-10042 • Teacher', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                    const SizedBox(height: 24),
                    const Divider(color: Colors.white30),
                    const SizedBox(height: 16),
                    _buildSalaryRow('Basic Pay', '₹ 45,000'),
                    _buildSalaryRow('HRA Allowance', '₹ 12,000'),
                    _buildSalaryRow('Transport Allowance', '₹ 3,500'),
                    const SizedBox(height: 16),
                    const Divider(color: Colors.white30),
                    const SizedBox(height: 16),
                    _buildSalaryRow('PF Deduction', '- ₹ 3,600', isDeduction: true),
                    _buildSalaryRow('Professional Tax', '- ₹ 200', isDeduction: true),
                    const SizedBox(height: 16),
                    const Divider(color: Colors.white30, thickness: 2),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('Net Payable', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                        Text('₹ 56,700', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Colors.greenAccent)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.history, color: Colors.white),
                label: const Text('View Previous Months', style: TextStyle(color: Colors.white)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.white54),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSalaryRow(String label, String amount, {bool isDeduction = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 16, color: Colors.white)),
          Text(
            amount,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDeduction ? Colors.redAccent : Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
