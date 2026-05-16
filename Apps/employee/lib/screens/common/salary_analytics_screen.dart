import "dart:convert";
import "package:flutter/material.dart";
import "package:fl_chart/fl_chart.dart";
import "package:flutter_secure_storage/flutter_secure_storage.dart";
import "../../api_service.dart";
import "../../core/widgets/animated_gradient_bg.dart";
import "../../core/widgets/glass_card.dart";

class SalaryAnalyticsScreen extends StatefulWidget {
  const SalaryAnalyticsScreen({super.key});

  @override
  State<SalaryAnalyticsScreen> createState() => _SalaryAnalyticsScreenState();
}

class _SalaryAnalyticsScreenState extends State<SalaryAnalyticsScreen> {
  final _storage = const FlutterSecureStorage();
  final _api = ApiService();
  
  // API data
  Map<String, dynamic>? _breakdownData;
  Map<String, dynamic>? _generateResult;
  List<dynamic>? _responsibilities;
  
  bool _loading = true;
  bool _generating = false;
  String? _error;
  String? _successMsg;

  // Month picker
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; _error = null; });
    try {
      final schoolId = await _storage.read(key: "school_id");
      final employeeId = await _storage.read(key: "user_id");
      if (schoolId == null || employeeId == null) {
        setState(() { _loading = false; _error = "Session not found"; });
        return;
      }
      // Load salary breakdown + responsibilities in parallel
      final results = await Future.wait([
        _api.getSalaryBreakdown(schoolId, employeeId),
        _api.getEmployeeResponsibilities(schoolId, employeeId),
      ]);
      if (!mounted) return;
      setState(() {
        _breakdownData = results[0] as Map<String, dynamic>?;
        _responsibilities = results[1] as List<dynamic>?;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _generateSalary() async {
    setState(() { _generating = true; _successMsg = null; _error = null; });
    try {
      final schoolId = await _storage.read(key: "school_id");
      if (schoolId == null) return;
      final result = await _api.generateSalaries(schoolId, _selectedMonth, _selectedYear);
      if (!mounted) return;
      if (result != null) {
        setState(() {
          _generateResult = result;
          _generating = false;
          _successMsg = "Salary generated for $_selectedMonth/$_selectedYear";
        });
        _loadData();
      } else {
        setState(() { _generating = false; _error = "Salary generation failed"; });
      }
    } catch (e) {
      if (mounted) setState(() { _generating = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedGradientBg(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text("Financial Insights")),
        body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFB298E7)))
          : _error != null && _breakdownData == null
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _loadData,
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFB298E7)),
                      child: const Text("Retry"),
                    ),
                  ],
                ),
              )
            : ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildGenerateSection(),
                  const SizedBox(height: 16),
                  _buildQuickSummary(),
                  const SizedBox(height: 24),
                  const Text("EARNINGS HISTORY", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                  const SizedBox(height: 12),
                  _buildMainChart(),
                  const SizedBox(height: 24),
                  const Text("RESPONSIBILITY BREAKDOWN", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                  const SizedBox(height: 12),
                  _buildResponsibilityBreakdown(),
                  const SizedBox(height: 24),
                  const Text("DEDUCTIONS & SUMMARY", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                  const SizedBox(height: 12),
                  _buildDeductionList(),
                ],
              ),
      ),
    );
  }

  Widget _buildGenerateSection() {
    return GlassCard(
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _selectedMonth,
                  decoration: const InputDecoration(labelText: "Month", border: InputBorder.none),
                  dropdownColor: const Color(0xFF2A2A4A),
                  items: List.generate(12, (i) => DropdownMenuItem(value: i + 1, child: Text(_monthName(i + 1)))),
                  onChanged: (v) { if (v != null) setState(() => _selectedMonth = v); },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _selectedYear,
                  decoration: const InputDecoration(labelText: "Year", border: InputBorder.none),
                  dropdownColor: const Color(0xFF2A2A4A),
                  items: List.generate(5, (i) => DropdownMenuItem(value: 2022 + i, child: Text("${2022 + i}"))),
                  onChanged: (v) { if (v != null) setState(() => _selectedYear = v); },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _generating ? null : _generateSalary,
              icon: _generating
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.calculate),
              label: Text(_generating ? "Generating..." : "Generate Salary for $_selectedMonth/$_selectedYear"),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB298E7),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          if (_successMsg != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_successMsg!, style: const TextStyle(color: Colors.greenAccent, fontSize: 12)),
            ),
        ],
      ),
    );
  }

  Widget _buildQuickSummary() {
    // Calculate from breakdown data
    final totalEarnings = _calculateTotalEarnings();
    final respCount = _responsibilities?.length ?? 0;
    final totalFee = _breakdownData?["total_fee"] ?? _breakdownData?["total_salary"] ?? 0;
    
    return GlassCard(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem("Monthly Salary", "₹${_formatAmount(totalFee.toDouble())}", Icons.account_balance_wallet, Colors.greenAccent),
          _buildStatItem("Responsibilities", "$respCount", Icons.assignment, Colors.amberAccent),
          _buildStatItem("Total Earnings", "₹${_formatAmount(totalEarnings)}", Icons.trending_up, Colors.blueAccent),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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
                  "${_monthName(group.x + 1)}\n",
                  const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  children: [
                    TextSpan(
                      text: "₹${(rod.toY * 1000).toInt()}",
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
                  return Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(_monthName(value.toInt() + 1).substring(0, 3),
                      style: const TextStyle(color: Colors.white54, fontSize: 10)),
                  );
                },
              ),
            ),
          ),
          borderData: FlBorderData(show: false),
          barGroups: List.generate(12, (i) {
            // Use actual data if available, otherwise use base value
            final monthlySalary = _breakdownData?["monthly_${i + 1}"] ?? 40 + (i % 3) * 5.0;
            return BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: monthlySalary is num ? monthlySalary.toDouble() / 1000 : 40 + (i % 3) * 5.0,
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

  Widget _buildResponsibilityBreakdown() {
    if (_responsibilities == null || _responsibilities!.isEmpty) {
      return GlassCard(
        child: const Padding(
          padding: EdgeInsets.all(20),
          child: Center(child: Text("No responsibilities assigned", style: TextStyle(color: Colors.white54))),
        ),
      );
    }

    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: _responsibilities!.map((resp) {
          final name = resp["name"] ?? "Unknown";
          final monthlyPrice = (resp["monthly_price"] ?? 0).toDouble();
          final spaces = resp["space_ids"];
          final spaceCount = spaces is List ? spaces.length : 0;
          final totalSalary = monthlyPrice * spaceCount;
          return Column(
            children: [
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFFB298E7).withOpacity(0.2),
                  child: Text(name.toString().substring(0, 1).toUpperCase(),
                    style: const TextStyle(color: Color(0xFFB298E7), fontWeight: FontWeight.bold)),
                ),
                title: Text(name.toString(), style: const TextStyle(fontWeight: FontWeight.w500)),
                subtitle: Text("$spaceCount spaces × ₹${_formatAmount(monthlyPrice)}/mo"),
                trailing: Text("₹${_formatAmount(totalSalary)}",
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent)),
              ),
              if (resp != _responsibilities!.last) const Divider(height: 1, color: Colors.white10),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildDeductionList() {
    final totalEarnings = _calculateTotalEarnings();
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _buildDetailItem("Gross Salary", "₹${_formatAmount(totalEarnings)}", Icons.account_balance, Colors.blue),
          const Divider(height: 1, color: Colors.white10),
          _buildDetailItem("Net Payable", "₹${_formatAmount(totalEarnings)}", Icons.money, Colors.greenAccent),
        ],
      ),
    );
  }

  Widget _buildDetailItem(String label, String value, IconData icon, Color color) {
    return ListTile(
      leading: Icon(icon, color: color, size: 20),
      title: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
      trailing: Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: value.startsWith("-") ? Colors.redAccent : Colors.white)),
    );
  }

  double _calculateTotalEarnings() {
    if (_responsibilities == null) return 0;
    double total = 0;
    for (final resp in _responsibilities!) {
      final price = (resp["monthly_price"] ?? 0).toDouble();
      final spaces = resp["space_ids"];
      final count = spaces is List ? spaces.length : 0;
      total += price * count;
    }
    return total;
  }

  String _formatAmount(double amount) {
    if (amount >= 100000) return "${(amount / 100000).toStringAsFixed(1)}L";
    if (amount >= 1000) return "${(amount / 1000).toStringAsFixed(1)}K";
    return amount.toStringAsFixed(0);
  }

  String _monthName(int m) {
    const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return names[m - 1];
  }
}
