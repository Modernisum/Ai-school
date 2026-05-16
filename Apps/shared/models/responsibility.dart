class Responsibility {
  final String responsibilityId;
  final String name;
  final String? description;
  final String? employeeType;
  final double monthlyPrice;
  final double perDayPrice;
  final double studentFee;
  final List<String> spaceIds;
  final DateTime? createdAt;

  const Responsibility({
    required this.responsibilityId,
    required this.name,
    this.description,
    this.employeeType,
    this.monthlyPrice = 0.0,
    this.perDayPrice = 0.0,
    this.studentFee = 0.0,
    this.spaceIds = const [],
    this.createdAt,
  });

  factory Responsibility.fromJson(Map<String, dynamic> json) {
    return Responsibility(
      responsibilityId: json['responsibilityId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      employeeType: json['employeeType']?.toString() ?? json['employee_type']?.toString(),
      monthlyPrice: _toDouble(json['monthlyPrice'] ?? json['monthly_price']),
      perDayPrice: _toDouble(json['perDayPrice'] ?? json['per_day_price']),
      studentFee: _toDouble(json['studentFee'] ?? json['student_fee']),
      spaceIds: _toStringList(json['spaceIds'] ?? json['space_ids'] ?? json['assignedSpaceIds']),
      createdAt: _parseDate(json['createdAt'] ?? json['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
    'responsibilityId': responsibilityId,
    'name': name,
    'description': description,
    'employeeType': employeeType,
    'monthlyPrice': monthlyPrice,
    'perDayPrice': perDayPrice,
    'studentFee': studentFee,
    'spaceIds': spaceIds,
    'createdAt': createdAt?.toIso8601String(),
  };

  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static List<String> _toStringList(dynamic value) {
    if (value == null) return [];
    if (value is List) return value.map((e) => e.toString()).toList();
    return [];
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  Responsibility copyWith({
    String? responsibilityId,
    String? name,
    String? description,
    String? employeeType,
    double? monthlyPrice,
    double? perDayPrice,
    double? studentFee,
    List<String>? spaceIds,
    DateTime? createdAt,
  }) {
    return Responsibility(
      responsibilityId: responsibilityId ?? this.responsibilityId,
      name: name ?? this.name,
      description: description ?? this.description,
      employeeType: employeeType ?? this.employeeType,
      monthlyPrice: monthlyPrice ?? this.monthlyPrice,
      perDayPrice: perDayPrice ?? this.perDayPrice,
      studentFee: studentFee ?? this.studentFee,
      spaceIds: spaceIds ?? this.spaceIds,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class ResponsibilityAssignment {
  final String employeeId;
  final String? employeeName;
  final String responsibilityId;
  final String? responsibilityName;
  final List<String> spaceIds;

  const ResponsibilityAssignment({
    required this.employeeId,
    this.employeeName,
    required this.responsibilityId,
    this.responsibilityName,
    this.spaceIds = const [],
  });

  factory ResponsibilityAssignment.fromJson(Map<String, dynamic> json) {
    return ResponsibilityAssignment(
      employeeId: json['employeeId']?.toString() ?? json['employee_id']?.toString() ?? '',
      employeeName: json['employeeName']?.toString() ?? json['employee_name']?.toString(),
      responsibilityId: json['responsibilityId']?.toString() ?? json['responsibility_id']?.toString() ?? '',
      responsibilityName: json['responsibilityName']?.toString() ?? json['name']?.toString(),
      spaceIds: Responsibility._toStringList(json['spaceIds'] ?? json['space_ids'] ?? json['assignedSpaceIds']),
    );
  }
}
