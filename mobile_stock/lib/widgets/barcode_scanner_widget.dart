import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';

import '../theme/app_colors.dart';

class BarcodeScannerWidget extends StatefulWidget {
  final Function(String) onBarcodeDetected;
  final String title;
  final String? subtitle;

  const BarcodeScannerWidget({
    super.key,
    required this.onBarcodeDetected,
    this.title = 'Scan Barcode',
    this.subtitle,
  });

  @override
  State<BarcodeScannerWidget> createState() => _BarcodeScannerWidgetState();
}

class _BarcodeScannerWidgetState extends State<BarcodeScannerWidget> {
  MobileScannerController controller = MobileScannerController();
  bool hasScanned = false;
  String? detectedBarcode;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (hasScanned) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final barcode = barcodes.first.rawValue;
      if (barcode != null && barcode.trim().isNotEmpty) {
        setState(() {
          hasScanned = true;
          detectedBarcode = barcode.trim();
        });
        
        // Immediate callback and close
        widget.onBarcodeDetected(barcode.trim());
        
        if (mounted) {
          Navigator.of(context).pop(barcode.trim());
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          widget.title,
          style: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Iconsax.arrow_left_2),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Iconsax.flash),
            onPressed: () => controller.toggleTorch(),
          ),
        ],
      ),
      body: _buildScannerView(),
    );
  }

  Widget _buildScannerView() {
    return Stack(
      children: [
        // Full screen camera
        MobileScanner(
          controller: controller,
          onDetect: _onDetect,
        ),
        
        // Simple overlay
        Container(
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.5),
          ),
          child: Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: hasScanned ? AppColors.success : AppColors.primaryBlue, width: 3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: hasScanned
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Iconsax.tick_circle,
                            color: AppColors.success,
                            size: 48,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Scanned!',
                            style: GoogleFonts.poppins(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.success,
                            ),
                          ),
                          if (detectedBarcode != null)
                            Text(
                              detectedBarcode!,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
                            ),
                        ],
                      ),
                    )
                  : null,
            ),
          ),
        ),
        
        // Instructions at top
        Positioned(
          top: 50,
          left: 20,
          right: 20,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.7),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              widget.subtitle ?? 'Point your camera at a barcode to scan',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 16,
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// Simple helper function to show barcode scanner
Future<String?> showBarcodeScanner(
  BuildContext context, {
  String title = 'Scan Barcode',
  String? subtitle,
}) async {
  return Navigator.of(context).push<String>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (context) => BarcodeScannerWidget(
        title: title,
        subtitle: subtitle,
        onBarcodeDetected: (barcode) {
          // Scanner will handle the navigation itself
        },
      ),
    ),
  );
}
