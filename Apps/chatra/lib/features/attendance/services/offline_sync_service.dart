import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:chatra/core/network/api_service.dart';

/// Model for an offline attendance record.
class OfflineAttendanceRecord {
  final int? id;
  final String userId;
  final String role;
  final String date;
  final String status;
  final String? inTime;
  final String? outTime;
  final String? remarks;
  final double? latitude;
  final double? longitude;
  final String schoolId;
  final int createdAt;
  final bool synced;

  const OfflineAttendanceRecord({
    this.id,
    required this.userId,
    required this.role,
    required this.date,
    required this.status,
    this.inTime,
    this.outTime,
    this.remarks,
    this.latitude,
    this.longitude,
    required this.schoolId,
    required this.createdAt,
    this.synced = false,
  });

  Map<String, dynamic> toMap() => {
    if (id != null) 'id': id,
    'user_id': userId,
    'role': role,
    'date': date,
    'status': status,
    'in_time': inTime,
    'out_time': outTime,
    'remarks': remarks,
    'latitude': latitude,
    'longitude': longitude,
    'school_id': schoolId,
    'created_at': createdAt,
    'synced': synced ? 1 : 0,
  };

  factory OfflineAttendanceRecord.fromMap(Map<String, dynamic> map) =>
      OfflineAttendanceRecord(
        id: map['id'] as int?,
        userId: map['user_id'] as String,
        role: map['role'] as String,
        date: map['date'] as String,
        status: map['status'] as String,
        inTime: map['in_time'] as String?,
        outTime: map['out_time'] as String?,
        remarks: map['remarks'] as String?,
        latitude: map['latitude'] as double?,
        longitude: map['longitude'] as double?,
        schoolId: map['school_id'] as String,
        createdAt: map['created_at'] as int,
        synced: (map['synced'] as int) == 1,
      );

  Map<String, dynamic> toApiPayload() => {
    'user_id': userId,
    'role': role,
    'date': date,
    'status': status,
    if (inTime != null) 'in_time': inTime,
    if (outTime != null) 'out_time': outTime,
    if (remarks != null) 'remarks': remarks,
    if (latitude != null && longitude != null)
      'location': {'latitude': latitude, 'longitude': longitude},
    'sync_timestamp': createdAt,
  };
}

/// Offline Sync Service for attendance.
/// Stores attendance records locally when offline and syncs when connectivity is restored.
class OfflineSyncService {
  static const _dbName = 'chatra_offline.db';
  static const _tableName = 'offline_attendance';
  static OfflineSyncService? _instance;

  Database? _db;
  final _storage = const FlutterSecureStorage();

  OfflineSyncService._();

  static OfflineSyncService get instance {
    _instance ??= OfflineSyncService._();
    return _instance!;
  }

  // ── Database ───────────────────────────────────────────────────────────────

  Future<Database> get db async {
    _db ??= await _openDb();
    return _db!;
  }

  Future<Database> _openDb() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, _dbName);

    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE $_tableName (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            in_time TEXT,
            out_time TEXT,
            remarks TEXT,
            latitude REAL,
            longitude REAL,
            school_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
          )
        ''');
      },
    );
  }

  // ── Save Offline ───────────────────────────────────────────────────────────

  /// Save an attendance record locally for later sync.
  Future<int> saveOfflineRecord(OfflineAttendanceRecord record) async {
    final database = await db;
    return await database.insert(
      _tableName,
      record.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Get all unsynced records.
  Future<List<OfflineAttendanceRecord>> getPendingRecords() async {
    final database = await db;
    final maps = await database.query(
      _tableName,
      where: 'synced = ?',
      whereArgs: [0],
      orderBy: 'created_at ASC',
    );
    return maps.map(OfflineAttendanceRecord.fromMap).toList();
  }

  /// Get count of unsynced records.
  Future<int> getPendingCount() async {
    final database = await db;
    final result = await database.rawQuery(
      'SELECT COUNT(*) as count FROM $_tableName WHERE synced = 0',
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  /// Mark a record as synced.
  Future<void> markSynced(int id) async {
    final database = await db;
    await database.update(
      _tableName,
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Delete synced records older than 7 days.
  Future<void> cleanOldSynced() async {
    final database = await db;
    final cutoff = DateTime.now().subtract(const Duration(days: 7));
    await database.delete(
      _tableName,
      where: 'synced = 1 AND created_at < ?',
      whereArgs: [cutoff.millisecondsSinceEpoch],
    );
  }

  // ── Sync ──────────────────────────────────────────────────────────────────

  /// Attempt to sync all pending records to the server.
  /// Returns (synced, failed) counts.
  Future<(int, int)> syncPending() async {
    final pending = await getPendingRecords();
    if (pending.isEmpty) return (0, 0);

    final token = await _storage.read(key: 'jwt_token');
    final schoolId = await _storage.read(key: 'school_id') ?? '';
    final deviceId = 'flutter_offline_${schoolId}';

    // Group by school_id (currently same school)
    final payloads = pending.map((r) => r.toApiPayload()).toList();

    int synced = 0;
    int failed = 0;

    try {
      final response = await http.post(
        Uri.parse('${ApiService.apiBase}/operations/attendance/$schoolId/offline-sync'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'records': payloads,
          'device_id': deviceId,
          'sync_timestamp': DateTime.now().millisecondsSinceEpoch,
        }),
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        final results = body['results'] as List<dynamic>? ?? [];

        // Mark synced based on results
        for (int i = 0; i < results.length && i < pending.length; i++) {
          final result = results[i] as Map<String, dynamic>;
          final record = pending[i];
          if (result['success'] == true) {
            if (record.id != null) await markSynced(record.id!);
            synced++;
          } else {
            failed++;
            debugPrint('[OfflineSync] Failed to sync record ${record.id}: ${result['error']}');
          }
        }

        // Clean old synced
        await cleanOldSynced();

        debugPrint('[OfflineSync] Sync complete: $synced synced, $failed failed');
      } else {
        failed = pending.length;
        debugPrint('[OfflineSync] Server error: ${response.statusCode}');
      }
    } catch (e) {
      failed = pending.length;
      debugPrint('[OfflineSync] Network error: $e');
    }

    return (synced, failed);
  }
}
