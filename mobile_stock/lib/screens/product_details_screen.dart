import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';

import '../models/models.dart';
import '../theme/app_colors.dart';
import '../widgets/stock_adjustment_form.dart';
import 'package:flutter/services.dart';

class ProductDetailsScreen extends StatelessWidget {
  final Product product;

  const ProductDetailsScreen({
    super.key,
    required this.product,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        title: Text(
          'Product Details',
          style: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Iconsax.arrow_left_2),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Iconsax.box_add),
            onPressed: () => _showStockOperationForm(context, AdjustmentType.adjustment),
            tooltip: 'Stock Adjustment',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Header Card
            _buildHeaderCard(),
            const SizedBox(height: 16),

            // Stock Status Card
            _buildStockStatusCard(),
            const SizedBox(height: 16),

            // Product Information Card
            _buildProductInfoCard(),
            const SizedBox(height: 16),

            // Financial Information Card
            _buildFinancialInfoCard(),
            const SizedBox(height: 16),

            // Category & Supplier Card
            _buildCategorySupplierCard(),
            const SizedBox(height: 16),

            // Actions Card
            _buildActionsCard(context),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primaryBlue, AppColors.primaryBlue.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryBlue.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Iconsax.box_1,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'SKU: ${product.sku}',
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (product.description != null && product.description!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              product.description!,
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Colors.white.withOpacity(0.9),
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStockStatusCard() {
    final stockColor = _getStockColor();
    final stockStatus = _getStockStatus();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _getStockIcon(),
                color: stockColor,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Stock Status',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildStockItem(
                  'Current Stock',
                  '${product.currentStock} units',
                  stockColor,
                ),
              ),
              if (product.minStockLevel > 0)
                Expanded(
                  child: _buildStockItem(
                    'Min Level',
                    '${product.minStockLevel} units',
                    AppColors.textSecondary,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: stockColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _getStockIcon(),
                  color: stockColor,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  stockStatus,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: stockColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStockItem(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildProductInfoCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Product Information',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          if (product.barcode != null && product.barcode!.isNotEmpty)
            _buildInfoRow('Barcode', product.barcode!),
          _buildInfoRow('SKU', product.sku),
          _buildInfoRow('Created', DateFormat('MMM dd, yyyy').format(product.createdAt)),
          _buildInfoRow('Last Updated', DateFormat('MMM dd, yyyy').format(product.updatedAt)),
        ],
      ),
    );
  }

  Widget _buildFinancialInfoCard() {
    final currency = NumberFormat.currency(symbol: '\$');
    final profit = product.sellingPrice - product.costPrice;
    final profitMargin = product.sellingPrice > 0
        ? ((profit / product.sellingPrice) * 100)
        : 0.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Financial Information',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildFinancialItem(
                  'Cost Price',
                  currency.format(product.costPrice),
                  AppColors.error,
                ),
              ),
              Expanded(
                child: _buildFinancialItem(
                  'Selling Price',
                  currency.format(product.sellingPrice),
                  AppColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildFinancialItem(
                  'Profit',
                  currency.format(profit),
                  profit >= 0 ? AppColors.success : AppColors.error,
                ),
              ),
              Expanded(
                child: _buildFinancialItem(
                  'Margin',
                  '${profitMargin.toStringAsFixed(1)}%',
                  profitMargin >= 0 ? AppColors.success : AppColors.error,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFinancialItem(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildCategorySupplierCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Category & Supplier',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          if (product.categoryName != null)
            _buildInfoRow('Category', product.categoryName!),
          if (product.supplierName != null)
            _buildInfoRow('Supplier', product.supplierName!)
          else
            _buildInfoRow('Supplier', 'No supplier assigned'),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionsCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick Operations',
            style: GoogleFonts.poppins(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          
          // Stock Operations Row
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  'Stock In',
                  Iconsax.arrow_up_2,
                  AppColors.success,
                  () => _showStockOperationForm(context, AdjustmentType.stockIn),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionButton(
                  'Stock Out',
                  Iconsax.arrow_down_2,
                  AppColors.error,
                  () => _showStockOperationForm(context, AdjustmentType.stockOut),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Full width Stock Adjustment button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _showStockOperationForm(context, AdjustmentType.adjustment),
              icon: const Icon(Iconsax.arrow_right_3),
              label: const Text('Stock Adjustment'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryBlue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Additional Actions
          Text(
            'Other Actions',
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _shareProductInfo(context),
                  icon: const Icon(Iconsax.share, size: 18),
                  label: const Text('Share'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _editProduct(context),
                  icon: const Icon(Iconsax.edit, size: 18),
                  label: const Text('Edit'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildActionButton(
    String label,
    IconData icon,
    Color color,
    VoidCallback onPressed,
  ) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        elevation: 1,
      ),
    );
  }

  void _showStockOperationForm(BuildContext context, AdjustmentType adjustmentType) {
    showModalBottomSheet(
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
        ),
      ),
    );
  }

  void _shareProductInfo(BuildContext context) {
    // Create a formatted product information string
    final String productInfo = '''
Product Information:

Name: ${product.name}
SKU: ${product.sku}
Barcode: ${product.barcode ?? 'N/A'}
Current Stock: ${product.currentStock} units
Cost Price: \$${product.costPrice.toStringAsFixed(2)}
Selling Price: \$${product.sellingPrice.toStringAsFixed(2)}
Category: ${product.categoryName ?? 'N/A'}
Supplier: ${product.supplierName ?? 'N/A'}

Generated from Stock Management App''';

    // Copy to clipboard
    Clipboard.setData(ClipboardData(text: productInfo));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Product information copied to clipboard'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _editProduct(BuildContext context) {
    // Placeholder for future product editing feature
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Product editing feature coming soon!'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  Color _getStockColor() {
    if (product.currentStock == 0) return AppColors.error;
    if (product.currentStock <= product.minStockLevel) return AppColors.warning;
    return AppColors.success;
  }

  IconData _getStockIcon() {
    if (product.currentStock == 0) return Iconsax.close_circle;
    if (product.currentStock <= product.minStockLevel) return Iconsax.warning_2;
    return Iconsax.tick_circle;
  }

  String _getStockStatus() {
    if (product.currentStock == 0) return 'Out of Stock';
    if (product.currentStock <= product.minStockLevel) return 'Low Stock';
    return 'In Stock';
  }
}