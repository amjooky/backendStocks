import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';

import '../models/models.dart';
import '../services/stock_services.dart';
import '../theme/app_colors.dart';
import 'barcode_scanner_widget.dart';

enum AdjustmentType {
  stockIn(value: 'in', label: 'Stock In', icon: Iconsax.arrow_up_2),
  stockOut(value: 'out', label: 'Stock Out', icon: Iconsax.arrow_down_2),
  adjustment(value: 'adjustment', label: 'Adjust', icon: Iconsax.arrow_right_3);

  final String value;
  final String label;
  final IconData icon;

  const AdjustmentType({
    required this.value,
    required this.label,
    required this.icon,
  });
}

class StockAdjustmentForm extends StatefulWidget {
  final Product? initialProduct;
  final AdjustmentType? initialType;
  final VoidCallback? onSuccess;

  const StockAdjustmentForm({
    super.key,
    this.initialProduct,
    this.initialType,
    this.onSuccess,
  });

  @override
  State<StockAdjustmentForm> createState() => _StockAdjustmentFormState();
}

class _StockAdjustmentFormState extends State<StockAdjustmentForm> {
  final _formKey = GlobalKey<FormState>();
  final _barcodeCtrl = TextEditingController();
  final _quantityCtrl = TextEditingController();
  final _newStockCtrl = TextEditingController();
  final _referenceCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  
  AdjustmentType _adjustmentType = AdjustmentType.stockIn;
  bool _isLoading = false;
  bool _isLoadingProducts = false;
  Product? _selectedProduct;
  List<Product> _products = [];

  @override
  void initState() {
    super.initState();
    _loadProducts();
    if (widget.initialProduct != null) {
      _selectedProduct = widget.initialProduct;
      _barcodeCtrl.text = widget.initialProduct!.barcode ?? '';
    }
    if (widget.initialType != null) {
      _adjustmentType = widget.initialType!;
    }
  }

  @override
  void dispose() {
    _barcodeCtrl.dispose();
    _quantityCtrl.dispose();
    _newStockCtrl.dispose();
    _referenceCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    setState(() { _isLoadingProducts = true; });
    
    try {
      final products = await ProductService.getProducts(limit: 100); // Load more products for better selection
      setState(() {
        _products = products;
        
        // If we have an initial product, ensure it's properly referenced from the loaded list
        if (_selectedProduct != null) {
          final matchingProduct = _products.firstWhere(
            (p) => p.id == _selectedProduct!.id,
            orElse: () => _selectedProduct!, // Keep original if not found in list
          );
          
          // If the initial product is not in the loaded list, add it
          if (!_products.any((p) => p.id == _selectedProduct!.id)) {
            _products.insert(0, _selectedProduct!);
          } else {
            // Use the matching product from the list to ensure object equality
            _selectedProduct = matchingProduct;
          }
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load products: $e')),
        );
      }
    } finally {
      setState(() { _isLoadingProducts = false; });
    }
  }

  Future<void> _openBarcodeScanner() async {
    try {
      final barcode = await showBarcodeScanner(
        context,
        title: 'Scan Product Barcode',
        subtitle: 'Scan a barcode to quickly find and select a product',
      );
      
      if (barcode != null && barcode.trim().isNotEmpty) {
        _barcodeCtrl.text = barcode.trim();
        await _searchProductByBarcode();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Scanner error: $e')),
        );
      }
    }
  }

  Future<void> _searchProductByBarcode() async {
    final barcode = _barcodeCtrl.text.trim();
    if (barcode.isEmpty) return;

    setState(() { _isLoading = true; });

    try {
      final product = await ProductService.findByBarcode(barcode);
      if (product != null) {
        setState(() {
          // Check if the found product exists in our current products list
          final existingProduct = _products.firstWhere(
            (p) => p.id == product.id,
            orElse: () => product,
          );
          
          // If not in the list, add it
          if (!_products.any((p) => p.id == product.id)) {
            _products.insert(0, product);
            _selectedProduct = product;
          } else {
            // Use the existing product from the list for dropdown consistency
            _selectedProduct = existingProduct;
          }
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No product found with this barcode')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error searching product: $e')),
        );
      }
    } finally {
      setState(() { _isLoading = false; });
    }
  }


  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedProduct == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a product')),
      );
      return;
    }

    setState(() { _isLoading = true; });

    try {
      final productId = _selectedProduct!.id;
      final reference = _referenceCtrl.text.trim().isEmpty ? null : _referenceCtrl.text.trim();
      final notes = _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim();

      switch (_adjustmentType) {
        case AdjustmentType.stockIn:
          await InventoryService.stockIn(
            productId: productId,
            quantity: int.parse(_quantityCtrl.text.trim()),
            reference: reference,
            notes: notes,
          );
          break;
        case AdjustmentType.stockOut:
          await InventoryService.stockOut(
            productId: productId,
            quantity: int.parse(_quantityCtrl.text.trim()),
            reference: reference,
            notes: notes,
          );
          break;
        case AdjustmentType.adjustment:
          await InventoryService.adjustStock(
            productId: productId,
            newStock: int.parse(_newStockCtrl.text.trim()),
            reference: reference,
            notes: notes,
          );
          break;
      }

      if (mounted) {
        Navigator.pop(context);
        widget.onSuccess?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Row(
              children: [
                const Icon(Iconsax.box_add, color: AppColors.success),
                const SizedBox(width: 8),
                Text(
                  'Stock Adjustment',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Selected Product Info
          if (_selectedProduct != null)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primaryBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Iconsax.box_1, color: AppColors.primaryBlue),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _selectedProduct!.name,
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          'Current Stock: ${_selectedProduct!.currentStock}',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Product Selection
                  _isLoadingProducts
                      ? Container(
                          height: 60,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Center(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                                SizedBox(width: 12),
                                Text('Loading products...'),
                              ],
                            ),
                          ),
                        )
                      : DropdownButtonFormField<Product>(
                          decoration: InputDecoration(
                            labelText: 'Select Product',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          value: _selectedProduct != null && _products.any((p) => p.id == _selectedProduct!.id) 
                              ? _products.firstWhere((p) => p.id == _selectedProduct!.id)
                              : null,
                          hint: const Text('Choose a product'),
                          isExpanded: true,
                          items: _products.map((product) => DropdownMenuItem<Product>(
                                value: product,
                                child: Text(
                                  '${product.name} (${product.sku}) - Stock: ${product.currentStock}',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              )).toList(),
                          onChanged: (Product? value) {
                            setState(() {
                              _selectedProduct = value;
                              if (value != null) {
                                _barcodeCtrl.text = value.barcode ?? '';
                              } else {
                                _barcodeCtrl.clear();
                              }
                            });
                          },
                          validator: (value) {
                            if (value == null) {
                              return 'Please select a product';
                            }
                            return null;
                          },
                        ),
                  const SizedBox(height: 12),
                  
                  // Barcode Search (Optional)
                  TextFormField(
                    controller: _barcodeCtrl,
                    decoration: InputDecoration(
                      labelText: 'Barcode (Optional)',
                      hintText: 'Scan or enter barcode to find product',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      suffixIcon: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_barcodeCtrl.text.isNotEmpty)
                            IconButton(
                              icon: const Icon(Iconsax.search_normal_1),
                              onPressed: _searchProductByBarcode,
                              tooltip: 'Search',
                            ),
                          IconButton(
                            icon: const Icon(Iconsax.scan_barcode),
                            onPressed: _openBarcodeScanner,
                            tooltip: 'Scan Barcode',
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Adjustment Type Selector
                  Text(
                    'Adjustment Type',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: AdjustmentType.values.map((type) {
                        final isSelected = _adjustmentType == type;
                        final color = switch (type) {
                          AdjustmentType.stockIn => AppColors.success,
                          AdjustmentType.stockOut => AppColors.error,
                          AdjustmentType.adjustment => AppColors.primaryBlue,
                        };

                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: TextButton.icon(
                              onPressed: () => setState(() => _adjustmentType = type),
                              icon: Icon(type.icon),
                              label: Text(type.label),
                              style: TextButton.styleFrom(
                                backgroundColor: isSelected ? color.withOpacity(0.1) : null,
                                foregroundColor: isSelected ? color : AppColors.textSecondary,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Quantity Input
                  if (_adjustmentType != AdjustmentType.adjustment)
                    TextFormField(
                      controller: _quantityCtrl,
                      decoration: InputDecoration(
                        labelText: _adjustmentType == AdjustmentType.stockIn 
                          ? 'Quantity to Add' 
                          : 'Quantity to Remove',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      validator: (v) {
                        if (v!.isEmpty) return 'Required';
                        final quantity = int.tryParse(v);
                        if (quantity == null || quantity <= 0) {
                          return 'Must be a positive number';
                        }
                        if (_adjustmentType == AdjustmentType.stockOut && 
                            _selectedProduct != null && 
                            quantity > _selectedProduct!.currentStock) {
                          return 'Cannot remove more than current stock';
                        }
                        return null;
                      },
                    )
                  else
                    TextFormField(
                      controller: _newStockCtrl,
                      decoration: InputDecoration(
                        labelText: 'New Stock Level',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      validator: (v) {
                        if (v!.isEmpty) return 'Required';
                        final quantity = int.tryParse(v);
                        if (quantity == null || quantity < 0) {
                          return 'Must be zero or positive';
                        }
                        return null;
                      },
                    ),
                  const SizedBox(height: 12),

                  // Reference & Notes
                  TextFormField(
                    controller: _referenceCtrl,
                    decoration: InputDecoration(
                      labelText: 'Reference (optional)',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _notesCtrl,
                    decoration: InputDecoration(
                      labelText: 'Notes (optional)',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    maxLines: 2,
                  ),
                ],
              ),
            ),
          ),

          // Submit Button
          Padding(
            padding: EdgeInsets.fromLTRB(
              16, 8, 16,
              MediaQuery.of(context).viewInsets.bottom + 16,
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _submit,
                icon: _isLoading 
                  ? const SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Iconsax.save_2),
                label: Text(_isLoading ? 'Processing...' : 'Apply Adjustment'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}