import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';

import '../models/models.dart';
import '../services/stock_services.dart';
import '../theme/app_colors.dart';
import '../screens/product_details_screen.dart';
import 'barcode_scanner_widget.dart';
import 'stock_adjustment_form.dart';
import 'add_product_dialog.dart';

class QuickStockOperations extends StatefulWidget {
  final VoidCallback? onOperationComplete;

  const QuickStockOperations({
    super.key,
    this.onOperationComplete,
  });

  @override
  State<QuickStockOperations> createState() => _QuickStockOperationsState();
}

class _QuickStockOperationsState extends State<QuickStockOperations> {
  bool _isLoading = false;

  Future<void> _showProductDetails(Product product) async {
    // Close the current modal first
    Navigator.of(context).pop();
    
    // Small delay to ensure modal is closed
    await Future.delayed(const Duration(milliseconds: 200));
    
    // Navigate to product details screen
    if (mounted) {
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => ProductDetailsScreen(product: product),
        ),
      );
    }
  }

  Future<void> _scanAndShowProduct() async {
    try {
      final barcode = await showBarcodeScanner(
        context,
        title: 'Scan Product',
        subtitle: 'Scan a barcode to view product details',
      );

      if (barcode != null && barcode.trim().isNotEmpty) {
        if (mounted) {
          setState(() { _isLoading = true; });
        }

        try {
          final product = await ProductService.findByBarcode(barcode.trim());
          if (product != null) {
            await _showProductDetails(product);
          } else {
            // Product not found, show add product dialog
            if (mounted) {
              final shouldRetry = await showAddProductDialog(
                context,
                barcode: barcode.trim(),
                onProductCreated: () {
                  widget.onOperationComplete?.call();
                },
              );
              
              // If product was created, try to find it and show details
              if (shouldRetry == true && mounted) {
                try {
                  final newProduct = await ProductService.findByBarcode(barcode.trim());
                  if (newProduct != null) {
                    await _showProductDetails(newProduct);
                  }
                } catch (e) {
                  // If still fails, show error
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error loading new product: $e'),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              }
            }
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error finding product: $e')),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Scanner error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() { _isLoading = false; });
      }
    }
  }

  Future<void> _scanAndAdjustStock(AdjustmentType adjustmentType) async {
    try {
      final barcode = await showBarcodeScanner(
        context,
        title: 'Scan for ${adjustmentType.label}',
        subtitle: 'Scan a barcode to quickly ${adjustmentType.label.toLowerCase()}',
      );

      if (barcode != null && barcode.trim().isNotEmpty) {
        if (mounted) {
          setState(() { _isLoading = true; });
        }

        try {
          final product = await ProductService.findByBarcode(barcode.trim());
          if (product != null) {
            // Show stock adjustment form with the scanned product
            await showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.transparent,
              builder: (context) => Container(
                height: MediaQuery.of(context).size.height * 0.9,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: StockAdjustmentForm(
                  initialProduct: product,
                  initialType: adjustmentType,
                  onSuccess: () {
                    widget.onOperationComplete?.call();
                  },
                ),
              ),
            );
          } else {
            // Product not found, show add product dialog
            if (mounted) {
              final shouldRetry = await showAddProductDialog(
                context,
                barcode: barcode.trim(),
                onProductCreated: () {
                  widget.onOperationComplete?.call();
                },
              );
              
              // If product was created, try to find it and show stock adjustment
              if (shouldRetry == true && mounted) {
                try {
                  final newProduct = await ProductService.findByBarcode(barcode.trim());
                  if (newProduct != null) {
                    await showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (context) => Container(
                        height: MediaQuery.of(context).size.height * 0.9,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                        ),
                        child: StockAdjustmentForm(
                          initialProduct: newProduct,
                          initialType: adjustmentType,
                          onSuccess: () {
                            widget.onOperationComplete?.call();
                          },
                        ),
                      ),
                    );
                  }
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error loading new product: $e'),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              }
            }
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error finding product: $e')),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Scanner error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() { _isLoading = false; });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.7,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          // Content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8), // Reduced padding
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      const Icon(Iconsax.scan_barcode, color: AppColors.primaryBlue, size: 22),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          'Quick Barcode Operations',
                          style: GoogleFonts.poppins(
                            fontSize: 16, // Smaller title
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4), // Less spacing
                  Text(
                    'Scan barcodes to quickly perform stock operations',
                    style: GoogleFonts.poppins(
                      fontSize: 12, // Smaller subtitle
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 16), // Less spacing

                  // Operations Grid - Compact layout
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                    childAspectRatio: 1.6, // Even more compact ratio
                    children: [
                      _buildOperationCard(
                        title: 'View Product',
                        subtitle: 'Scan to see details',
                        icon: Iconsax.search_normal,
                        color: AppColors.primaryBlue,
                        onTap: _scanAndShowProduct,
                      ),
                      _buildOperationCard(
                        title: 'Stock In',
                        subtitle: 'Scan to add stock',
                        icon: Iconsax.arrow_up_2,
                        color: AppColors.success,
                        onTap: () => _scanAndAdjustStock(AdjustmentType.stockIn),
                      ),
                      _buildOperationCard(
                        title: 'Stock Out',
                        subtitle: 'Scan to remove stock',
                        icon: Iconsax.arrow_down_2,
                        color: AppColors.error,
                        onTap: () => _scanAndAdjustStock(AdjustmentType.stockOut),
                      ),
                      _buildOperationCard(
                        title: 'Adjust Stock',
                        subtitle: 'Scan to adjust level',
                        icon: Iconsax.arrow_right_3,
                        color: AppColors.warning,
                        onTap: () => _scanAndAdjustStock(AdjustmentType.adjustment),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 8), // Minimal bottom spacing
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOperationCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.all(2), // Reduced margin
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: _isLoading ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12), // Reduced padding
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                color.withOpacity(0.1),
                color.withOpacity(0.05),
              ],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min, // Important: minimize size
            children: [
              Container(
                padding: const EdgeInsets.all(8), // Smaller icon container
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 20, // Smaller icon
                ),
              ),
              const SizedBox(height: 6), // Less spacing
              Text(
                title,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.poppins(
                  fontSize: 12, // Smaller font
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2), // Less spacing
              Text(
                subtitle,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.poppins(
                  fontSize: 10, // Smaller font
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


// Helper function to show quick operations
Future<void> showQuickStockOperations(
  BuildContext context, {
  VoidCallback? onOperationComplete,
}) async {
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: QuickStockOperations(
        onOperationComplete: onOperationComplete,
      ),
    ),
  );
}