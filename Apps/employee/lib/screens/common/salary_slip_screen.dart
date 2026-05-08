import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../api_service.dart';
import '../../core/widgets/animated_gradient_bg.dart';
import '../../core/widgets/glass_card.dart';

class SalarySlipScreen extends StatefulWidget {
  const SalarySlipScreen({super.key});

  @override
  State<SalarySlipScreen> createState() => _SalarySlipScreenState();
}

class _SalarySlipScreenState extends State<SalarySlipScreen> {
  final _storage = const FlutterSecureStorage();
  final _api = ApiService();
  Map<String, dynamic>? _salaryData;
  Map<String, dynamic>? _employeeData;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final schoolId = await _storage.read(key: 'school_id') ?? '';
      final employeeId = await _storage.read(key: 'employee_id') ?? '';

      final salary = await _api.getSalaryBreakdown(schoolId, employeeId);
      if (salary == null) {
        setState(() { _error = 'Failed to load salary data'; _loading = false; });
        return;
      }

      final empResp = await _api.getEmployeeResponsibilities(schoolId, employeeId);
      final empName = empResp?.isNotEmpty == true ? empResp!.first['name'] ?? 'Employee' : 'Employee';

      setState(() {
        _salaryData = salary;
        _employeeData = {'name': empName, 'id': employeeId};
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

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
              icon: const Icon(Icons.refresh),
              onPressed: () {
                setState(() { _loading = true; _error = null; });
                _loadData();
              },
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, style: const TextStyle(color: Colors.white70)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
                      ],
                    ),
                  )
                : SingleChildScrollView(
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
                              Text(
                                _employeeData?['name'] ?? 'Employee',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                              ),
                              Text(
                                '${_employeeData?['id'] ?? ''}',
                                style: TextStyle(color: Colors.white.withOpacity(0.8)),
                              ),
                              const SizedBox(height: 24),
                              const Divider(color: Colors.white30),
                              const SizedBox(height: 16),
                              _buildSalaryRow('Base Salary', '₹ ${_salaryData?['baseSalary'] ?? 0}'),
                              _buildSalaryRow('Spaces Component', '₹ ${_salaryData?['spacesComponent'] ?? 0}'),
                              _buildSalaryRow('Experience Component', '₹ ${_salaryData?['experienceComponent'] ?? 0}'),
                              _buildSalaryRow('Tenure Component', '₹ ${_salaryData?['tenureComponent'] ?? 0}'),
                              _buildSalaryRow('Bonus', '₹ ${_salaryData?['bonus'] ?? 0}'),
                              _buildSalaryRow('Aid', '₹ ${_salaryData?['aid'] ?? 0}'),
                              const SizedBox(height: 8),
                              _buildSalaryRow('Gross Salary', '₹ ${_salaryData?['grossSalary'] ?? 0}', bold: true),
                              const SizedBox(height: 16),
                              const Divider(color: Colors.white30),
                              const SizedBox(height: 16),
                              _buildSalaryRow('Deductions (${_salaryData?['absentDays'] ?? 0} absent days)',
                                  '- ₹ ${_salaryData?['deductions'] ?? 0}', isDeduction: true),
                              const SizedBox(height: 16),
                              const Divider(color: Colors.white30, thickness: 2),
                              const SizedBox(height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Net Payable',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                                  Text('₹ ${_salaryData?['netMonthlySalary'] ?? 0}',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold, fontSize: 22, color: Colors.greenAccent)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildSalaryRow(String label, String amount,
      {bool isDeduction = false, bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 16,
                  color: Colors.white,
                  fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text(
            amount,
            style: TextStyle(
              fontSize: 16,
              fontWeight: bold ? FontWeight.bold : FontWeight.w600,
              color: isDeduction ? Colors.redAccent : Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
