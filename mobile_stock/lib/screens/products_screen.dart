import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/stock_services.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final currency = NumberFormat.currency(symbol: '\$');

  List<Product> _products = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _page = 1;
  final int _limit = 20;
  bool _hasMore = true;
  String _searchTerm = '';
  bool _lowStockOnly = false;

  @override
  void initState() {
    super.initState();
    _loadProducts(reset: true);
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoadingMore && _hasMore) {
        _loadProducts();
      }
    }
  }

  Future<void> _loadProducts({bool reset = false}) async {
    try {
      if (reset) {
        setState(() {
          _isLoading = true;
          _page = 1;
          _hasMore = true;
          _products = [];
        });
      } else {
        setState(() { _isLoadingMore = true; });
      }

      final products = await ProductService.getProducts(
        page: _page,
        limit: _limit,
        search: _searchTerm.isEmpty ? null : _searchTerm,
        lowStock: _lowStockOnly ? true : null,
      );

      setState(() {
        if (reset) {
          _products = products;
        } else {
          _products.addAll(products);
        }
        _hasMore = products.length == _limit;
        _page += 1;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load products: $e')),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
        _isLoadingMore = false;
      });
    }
  }

  Future<void> _onRefresh() async {
    await _loadProducts(reset: true);
  }

  Future<void> _showProductForm({Product? product}) async {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController(text: product?.name ?? '');
    final skuCtrl = TextEditingController(text: product?.sku ?? '');
    final barcodeCtrl = TextEditingController(text: product?.barcode ?? '');
    final descCtrl = TextEditingController(text: product?.description ?? '');
    final costCtrl = TextEditingController(text: product?.costPrice.toString() ?? '');
    final priceCtrl = TextEditingController(text: product?.sellingPrice.toString() ?? '');
    final minStockCtrl = TextEditingController(text: product?.minStockLevel.toString() ?? '');
    final initialStockCtrl = TextEditingController(text: '');

    final isEditing = product != null;
    
    // Load categories for dropdown
    List<Category> categories = [];
    Category? selectedCategory;
    
    try {
      categories = await CategoryService.getCategories();
      
      if (isEditing && product != null) {
        selectedCategory = categories.where((c) => c.id == product.categoryId).firstOrNull;
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load categories: $e')),
        );
        return;
      }
    }

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
                left: 16,
                right: 16,
                top: 16,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(isEditing ? Iconsax.edit : Iconsax.add, color: const Color(0xFF3B82F6)),
                          const SizedBox(width: 8),
                          Text(
                            isEditing ? 'Edit Product' : 'Add Product',
                            style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      
                      // Essential Fields Only
                      _textField(controller: nameCtrl, label: 'Product Name', validator: (v) => v!.isEmpty ? 'Required' : null),
                      const SizedBox(height: 16),
                      _textField(controller: skuCtrl, label: 'SKU', validator: (v) => v!.isEmpty ? 'Required' : null),
                      const SizedBox(height: 16),
                      
                      // Simple Category Dropdown with error handling
                      categories.isNotEmpty
                          ? DropdownButtonFormField<Category>(
                              value: selectedCategory,
                              decoration: InputDecoration(
                                labelText: 'Category',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              items: categories.map((category) => DropdownMenuItem(
                                value: category,
                                child: Text(category.name),
                              )).toList(),
                              onChanged: (Category? newCategory) {
                                setModalState(() {
                                  selectedCategory = newCategory;
                                });
                              },
                              validator: (value) => value == null ? 'Please select a category' : null,
                            )
                          : Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red.shade50,
                                border: Border.all(color: Colors.red.shade300),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                'Categories failed to load. Please try again.',
                                style: TextStyle(color: Colors.red),
                              ),
                            ),
                      const SizedBox(height: 16),
                      
                      // Simple Price Fields
                      Row(children: [
                        Expanded(child: _textField(
                          controller: costCtrl, 
                          label: 'Cost Price', 
                          keyboardType: const TextInputType.numberWithOptions(decimal: true), 
                          validator: (v) {
                            if (v!.isEmpty) return 'Required';
                            final price = double.tryParse(v);
                            if (price == null || price <= 0) return 'Must be positive number';
                            return null;
                          }
                        )),
                        const SizedBox(width: 12),
                        Expanded(child: _textField(
                          controller: priceCtrl, 
                          label: 'Selling Price', 
                          keyboardType: const TextInputType.numberWithOptions(decimal: true), 
                          validator: (v) {
                            if (v!.isEmpty) return 'Required';
                            final price = double.tryParse(v);
                            if (price == null || price <= 0) return 'Must be positive number';
                            return null;
                          }
                        )),
                      ]),
                      const SizedBox(height: 16),
                      
                      // Optional Fields (Collapsed)
                      ExpansionTile(
                        title: const Text('Optional Fields'),
                        initiallyExpanded: false,
                        children: [
                          _textField(controller: barcodeCtrl, label: 'Barcode (Optional)'),
                          const SizedBox(height: 12),
                          _textField(controller: descCtrl, label: 'Description (Optional)', maxLines: 2),
                          const SizedBox(height: 12),
                          _textField(
                            controller: minStockCtrl, 
                            label: 'Min Stock Level (Optional)', 
                            keyboardType: TextInputType.number,
                            validator: (v) {
                              if (v!.isNotEmpty) {
                                final value = int.tryParse(v);
                                if (value == null || value < 0) return 'Must be valid number';
                              }
                              return null;
                            }
                          ),
                          if (!isEditing) ...[
                            const SizedBox(height: 12),
                            _textField(
                              controller: initialStockCtrl, 
                              label: 'Initial Stock (Optional)', 
                              keyboardType: TextInputType.number,
                              validator: (v) {
                                if (v!.isNotEmpty) {
                                  final value = int.tryParse(v);
                                  if (value == null || value < 0) return 'Must be valid number';
                                }
                                return null;
                              }
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          icon: Icon(isEditing ? Iconsax.save_2 : Iconsax.add),
                          label: Text(isEditing ? 'Save Changes' : 'Create Product'),
                          onPressed: () async {
                            if (!formKey.currentState!.validate()) return;
                            
                            // Check if categories loaded
                            if (categories.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Categories failed to load. Please close and try again.')),
                              );
                              return;
                            }
                            
                            if (selectedCategory == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Please select a category')),
                              );
                              return;
                            }
                            
                            try {
                              // Data structure matching backend requirements (camelCase)
                              final productData = {
                                'name': nameCtrl.text.trim(),
                                'sku': skuCtrl.text.trim(),
                                'categoryId': selectedCategory!.id, // Backend expects camelCase
                                'costPrice': double.parse(costCtrl.text.trim()),
                                'sellingPrice': double.parse(priceCtrl.text.trim()),
                              };
                              
                              // Add optional fields only if they have values
                              if (barcodeCtrl.text.trim().isNotEmpty) {
                                productData['barcode'] = barcodeCtrl.text.trim();
                              }
                              if (descCtrl.text.trim().isNotEmpty) {
                                productData['description'] = descCtrl.text.trim();
                              }
                              if (minStockCtrl.text.trim().isNotEmpty) {
                                productData['minStockLevel'] = int.parse(minStockCtrl.text.trim());
                              }
                              if (!isEditing && initialStockCtrl.text.trim().isNotEmpty) {
                                productData['initialStock'] = int.parse(initialStockCtrl.text.trim());
                              }
                              
                              if (isEditing) {
                                await ProductService.updateProduct(product!.id, productData);
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Product updated successfully!'), backgroundColor: Colors.green),
                                  );
                                }
                              } else {
                                await ProductService.createProduct(productData);
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Product created successfully!'), backgroundColor: Colors.green),
                                  );
                                }
                              }
                              
                              if (mounted) {
                                Navigator.pop(context);
                                _loadProducts(reset: true);
                              }
                              
                            } catch (e) {
                              if (mounted) {
                                String errorMessage = 'Error: $e';
                                
                                // Parse backend validation errors for better user feedback
                                if (e.toString().contains('Valid category ID is required')) {
                                  errorMessage = 'Please select a valid category';
                                } else if (e.toString().contains('Cost price must be a positive number')) {
                                  errorMessage = 'Cost price must be a valid positive number';
                                } else if (e.toString().contains('Selling price must be a positive number')) {
                                  errorMessage = 'Selling price must be a valid positive number';
                                } else if (e.toString().contains('SKU already exists')) {
                                  errorMessage = 'This SKU already exists. Please use a different SKU.';
                                } else if (e.toString().contains('Name is required')) {
                                  errorMessage = 'Product name is required';
                                }
                                
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(errorMessage),
                                    backgroundColor: Colors.red,
                                    duration: const Duration(seconds: 4),
                                  ),
                                );
                              }
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }
        );
      },
    );
  }

  Future<void> _confirmDelete(Product product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Product'),
        content: Text('Are you sure you want to delete ${product.name}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        await ProductService.deleteProduct(product.id);
        _loadProducts(reset: true);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Delete failed: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _products.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _products.length + (_isLoadingMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index >= _products.length) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final product = _products[index];
                return _buildProductItem(product).animate().fadeIn().slideY(begin: 0.1, end: 0);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      color: Colors.white,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search by name, SKU, or barcode',
                    prefixIcon: const Icon(Iconsax.search_normal),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    isDense: true,
                  ),
                  onSubmitted: (value) {
                    setState(() { _searchTerm = value.trim(); });
                    _loadProducts(reset: true);
                  },
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: Icon(_lowStockOnly ? Iconsax.warning_25 : Iconsax.warning_2, color: _lowStockOnly ? const Color(0xFFF59E0B) : const Color(0xFF94A3B8)),
                onPressed: () {
                  setState(() { _lowStockOnly = !_lowStockOnly; });
                  _loadProducts(reset: true);
                },
                tooltip: 'Toggle low stock filter',
              ),
              const SizedBox(width: 4),
              IconButton(
                icon: const Icon(Iconsax.refresh, color: Color(0xFF94A3B8)),
                onPressed: () => _loadProducts(reset: true),
                tooltip: 'Refresh',
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Iconsax.add),
              label: const Text('Add Product'),
              onPressed: () => _showProductForm(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductItem(Product product) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Iconsax.box, color: Color(0xFF334155)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        product.name,
                        style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
                      ),
                    ),
                    _stockChip(product),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'SKU: ${product.sku}${product.barcode != null ? '  |  Barcode: ${product.barcode}' : ''}',
                  style: GoogleFonts.poppins(fontSize: 12, color: const Color(0xFF64748B)),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text('Stock: ', style: GoogleFonts.poppins(fontSize: 12, color: const Color(0xFF64748B))),
                    Text('${product.currentStock}', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 12),
                    Text('Price: ', style: GoogleFonts.poppins(fontSize: 12, color: const Color(0xFF64748B))),
                    Text(currency.format(product.sellingPrice), style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    OutlinedButton.icon(
                      icon: const Icon(Iconsax.edit, size: 16),
                      label: const Text('Edit'),
                      onPressed: () => _showProductForm(product: product),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      icon: const Icon(Iconsax.trash, size: 16),
                      label: const Text('Delete'),
                      style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFEF4444)),
                      onPressed: () => _confirmDelete(product),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stockChip(Product product) {
    Color bg;
    Color fg;
    String label;
    if (product.currentStock == 0) {
      bg = const Color(0xFFFEE2E2); fg = const Color(0xFFB91C1C); label = 'Out of stock';
    } else if (product.isLowStock) {
      bg = const Color(0xFFFEF3C7); fg = const Color(0xFF92400E); label = 'Low stock';
    } else {
      bg = const Color(0xFFD1FAE5); fg = const Color(0xFF065F46); label = 'In stock';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: GoogleFonts.poppins(fontSize: 11, color: fg, fontWeight: FontWeight.w600)),
    );
  }

  Widget _textField({
    required TextEditingController controller,
    required String label,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      validator: validator,
    );
  }
}