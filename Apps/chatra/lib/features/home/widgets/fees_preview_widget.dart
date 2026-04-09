import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:chatra/widgets/glass_card.dart';
import 'package:chatra/theme/app_theme.dart';

/// Displays pending fees summary card on the home screen.
class FeesPreviewWidget extends StatelessWidget {
  final Map<String, dynamic> fees;

  const FeesPreviewWidget({super.key, required this.fees});

  @override
  Widget build(BuildContext context) {
    final data = fees['data'];
    double pending = 0;
    if (data is List) {
      for (var f in data) {
        if (f['status'] != 'paid') {
          pending += (f['amount'] as num?)?.toDouble() ?? 0;
        }
      }
    } else if (data is Map) {
      pending = (data['pending_amount'] as num?)?.toDouble() ?? 0;
    }

    return GlassCard(
      height: 180,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Wallet/Fees',
            style: GoogleFonts.outfit(
              color: Colors.white70,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          Text(
            '₹${pending.toStringAsFixed(0)}',
            style: GoogleFonts.outfit(
              color: AppColors.accentCream,
              fontSize: 24,
              fontWeight: FontWeight.bold,
              letterSpacing: -1,
            ),
          ),
          Text(
            'Pending Balance',
            style: GoogleFonts.outfit(
              color: Colors.redAccent.withOpacity(0.6),
              fontSize: 11,
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.accentTeal.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Pay Now',
                  style: GoogleFonts.outfit(
                    color: AppColors.accentTeal,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward_ios_rounded, color: AppColors.accentTeal, size: 10),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 150.ms);
  }
}
