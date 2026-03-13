import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class SalaryAnalyticsScreen extends StatefulWidget {
  const SalaryAnalyticsScreen({super.key});

  @override
  State<SalaryAnalyticsScreen> createState() => _SalaryAnalyticsScreenState();
}

class _SalaryAnalyticsScreenState extends State<SalaryAnalyticsScreen> {
  int touchedIndex = -1;

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text("Financial Insights"),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _buildQuickSummary(),
            const SizedBox(height: 24),
            const Text("EARNINGS HISTORY (12 MONTHS)", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 12),
            _buildMainChart(),
            const SizedBox(height: 24),
            const Text("BREAKDOWN", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            const SizedBox(height: 12),
            _buildDeductionList(),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickSummary() {
    return GlassCard(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem("Total Yearly", "₹12.4L", Icons.account_balance_wallet, Colors.greenAccent),
          _buildStatItem("Avg. Bonus", "₹12,500", Icons.star, Colors.amberAccent),
          _buildStatItem("Deductions", "₹8,400", Icons.trending_down, Colors.redAccent),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.white60)),
      ],
    );
  }

  Widget _buildMainChart() {
    return GlassCard(
      height: 300,
      padding: const EdgeInsets.only(top: 24, bottom: 12, right: 24, left: 12),
      child: BarChart(
        BarChartData(
          barTouchData: BarTouchData(
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (_) => Colors.blueGrey.withOpacity(0.8),
              tooltipRoundedRadius: 8,
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                return BarTooltipItem(
                  'Month ${group.x}\n',
                  const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  children: [
                    TextSpan(
                      text: '₹${(rod.toY * 1000).toInt()}',
                      style: const TextStyle(color: Colors.amberAccent, fontSize: 16, fontWeight: FontWeight.w500),
                    ),
                  ],
                );
              },
            ),
          ),
          titlesData: FlTitlesData(
            show: true,
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
                  return Padding(
                    padding: const EdgeInsets.top(8.0),
                    child: Text(months[value.toInt() % 12], style: const TextStyle(color: Colors.white54, fontSize: 10)),
                  );
                },
              ),
            ),
          ),
          borderData: FlBorderData(show: false),
          barGroups: List.generate(12, (i) {
            return BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: 45 + (i % 3) * 5.0,
                  gradient: const LinearGradient(colors: [Color(0xFFB298E7), Color(0xFFF5B8D5)]),
                  width: 12,
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            );
          }),
          gridData: const FlGridData(show: true, drawVerticalLine: false, horizontalInterval: 10),
        ),
      ),
    );
  }

  Widget _buildDeductionList() {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _buildDetailItem("Basic Pay", "₹85,000", Icons.money, Colors.blue),
          const Divider(height: 1, color: Colors.white10),
          _buildDetailItem("HRA", "₹12,400", Icons.home, Colors.purple),
          const Divider(height: 1, color: Colors.white10),
          _buildDetailItem("Professional Tax", "-₹200", Icons.gavel, Colors.red),
        ],
      ),
    );
  }

  Widget _buildDetailItem(String label, String value, IconData icon, Color color) {
    return ListTile(
      leading: Icon(icon, color: color, size: 20),
      title: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
      trailing: Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: value.startsWith('-') ? Colors.redAccent : Colors.white)),
    );
  }
}
