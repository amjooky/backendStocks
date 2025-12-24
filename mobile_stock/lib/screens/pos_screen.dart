import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';

import '../models/models.dart';
import '../models/pos_models.dart';
import '../services/pos_service.dart';
import '../services/stock_services.dart';
import '../theme/app_colors.dart';
import '../widgets/barcode_scanner_widget.dart';
import '../widgets/add_product_dialog.dart';
import 'pos_payment_screen.dart';
import 'enhanced_pos_payment_screen.dart';
import 'pos_customer_screen.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final TextEditingController _searchController = TextEditingController();
  final currency = NumberFormat.currency(symbol: '\$');
  
  List<SaleItem> _cartItems = [];
  List<Product> _searchResults = [];
  List<Product> _allProducts = [];
  List<Category> _categories = [];
  Customer? _selectedCustomer;
  Category? _selectedCategory;
  
  bool _isLoading = false;
  bool _isSearching = false;
  bool _isLoadingCategories = false;
  String _searchTerm = '';
  double _defaultTaxRate = 0.0; // Can be configured
  
  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() { _isLoading = true; });
    
    try {
      // Load categories and all products in parallel
      final results = await Future.wait([
        CategoryService.getCategories(),
        ProductService.getProducts(),
      ]);
      
      final categories = results[0] as List<Category>;
      final products = results[1] as List<Product>;
      
      setState(() {
        _categories = categories;
        _allProducts = products;
        _searchResults = products;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load data: $e')),
        );
      }
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  Future<void> _loadRecentProducts() async {
    setState(() { _isLoading = true; });
    
    try {
      // Load recent/popular products for quick access
      final products = await ProductService.getProducts(limit: 20);
      setState(() {
        _allProducts = products;
        _searchResults = products;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load products: $e')),
        );
      }
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  void _filterByCategory(Category? category) {
    setState(() {
      _selectedCategory = category;
      _searchController.clear();
      
      if (category == null) {
        // Show all products
        _searchResults = _allProducts;
      } else {
        // Filter products by category
        _searchResults = _allProducts
            .where((product) => product.categoryId == category.id)
            .toList();
      }
    });
  }

  Future<void> _searchProducts(String query) async {
    if (query.trim().isEmpty) {
      _loadRecentProducts();
      return;
    }

    setState(() { 
      _isSearching = true;
      _searchTerm = query;
    });

    try {
      final products = await PosService.searchProductsForPos(query);
      setState(() {
        _searchResults = products;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Search failed: $e')),
        );
      }
    } finally {
      setState(() { _isSearching = false; });
    }
  }

  Future<void> _scanBarcode() async {
    try {
      final barcode = await showBarcodeScanner(
        context,
        title: 'Scan Product',
        subtitle: 'Scan a barcode to add product to cart',
      );

      if (barcode != null && barcode.trim().isNotEmpty) {
        setState(() { _isLoading = true; });

        try {
          final product = await PosService.getProductByBarcode(barcode.trim());

          if (product != null) {
            _addToCart(product);
          } else {
            // Product not found, show add product dialog
            if (mounted) {
              final shouldRetry = await showAddProductDialog(
                context,
                barcode: barcode.trim(),
                onProductCreated: () {
                  _loadRecentProducts();
                },
              );
              
              if (shouldRetry == true && mounted) {
                // Try to find the newly created product
                final newProduct = await PosService.getProductByBarcode(barcode.trim());
                if (newProduct != null) {
                  _addToCart(newProduct);
                }
              }
            }
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
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Scanner error: $e')),
      );
    }
  }

  void _addToCart(Product product, {int quantity = 1}) {
    if (product.currentStock <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Product is out of stock'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() {
      final existingIndex = _cartItems.indexWhere((item) => item.productId == product.id);
      
      if (existingIndex >= 0) {
        // Update existing item
        final existingItem = _cartItems[existingIndex];
        final newQuantity = existingItem.quantity + quantity;
        
        if (newQuantity > product.currentStock) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Only ${product.currentStock} units available'),
              backgroundColor: AppColors.warning,
            ),
          );
          return;
        }
        
        _cartItems[existingIndex] = existingItem.copyWith(quantity: newQuantity);
      } else {
        // Add new item
        if (quantity > product.currentStock) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Only ${product.currentStock} units available'),
              backgroundColor: AppColors.warning,
            ),
          );
          return;
        }
        
        _cartItems.add(SaleItem(
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitPrice: product.sellingPrice,
          quantity: quantity,
          tax: _defaultTaxRate,
        ));
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} added to cart'),
        backgroundColor: AppColors.success,
        duration: const Duration(seconds: 1),
      ),
    );
  }

  void _updateCartItemQuantity(int index, int newQuantity) {
    if (newQuantity <= 0) {
      _removeFromCart(index);
      return;
    }

    final item = _cartItems[index];
    // Find the product to check stock
    final product = _searchResults.firstWhere(
      (p) => p.id == item.productId,
      orElse: () => Product(
        id: item.productId,
        name: item.productName,
        sku: item.productSku ?? '',
        categoryId: 1,
        costPrice: 0,
        sellingPrice: item.unitPrice,
        price: item.unitPrice,
        currentStock: newQuantity, // Allow the change for now
        reservedStock: 0,
        minStockLevel: 0,
        isLowStock: false,
        isActive: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );

    if (newQuantity > product.currentStock) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Only ${product.currentStock} units available'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    setState(() {
      _cartItems[index] = item.copyWith(quantity: newQuantity);
    });
  }

  void _removeFromCart(int index) {
    setState(() {
      _cartItems.removeAt(index);
    });
  }

  void _clearCart() {
    setState(() {
      _cartItems.clear();
      _selectedCustomer = null;
    });
  }

  // Calculate cart totals
  double get _subtotal => _cartItems.fold(0.0, (sum, item) => sum + item.subtotal);
  double get _totalDiscount => _cartItems.fold(0.0, (sum, item) => sum + item.discountAmount);
  double get _totalTax => _cartItems.fold(0.0, (sum, item) => sum + item.taxAmount);
  double get _total => _cartItems.fold(0.0, (sum, item) => sum + item.total);

  Future<void> _proceedToPayment() async {
    if (_cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cart is empty')),
      );
      return;
    }

    setState(() { _isLoading = true; });

    try {
      // Navigate directly to enhanced payment screen with cart items
      final result = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (context) => EnhancedPosPaymentScreen(
            items: _cartItems,
            customer: _selectedCustomer,
            onPaymentComplete: () {
              // Refresh any necessary data
              _loadRecentProducts();
            },
          ),
        ),
      );

      if (result == true) {
        // Payment was successful, clear the cart
        _clearCart();
        // Success message is handled by the payment screen
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to proceed to payment: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() { _isLoading = false; });
      }
    }
  }

  Future<void> _selectCustomer() async {
    final customer = await Navigator.of(context).push<Customer>(
      MaterialPageRoute(
        builder: (context) => const PosCustomerScreen(),
      ),
    );

    if (customer != null) {
      setState(() {
        _selectedCustomer = customer;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Point of Sale',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        backgroundColor: Colors.blue,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _scanBarcode,
            icon: const Icon(Iconsax.scan_barcode),
            tooltip: 'Scan Barcode',
          ),
          IconButton(
            onPressed: _cartItems.isNotEmpty ? _clearCart : null,
            icon: const Icon(Iconsax.trash),
            tooltip: 'Clear Cart',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Rechercher produits...',
                prefixIcon: _isSearching 
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : const Icon(Iconsax.search_normal),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_searchController.text.isNotEmpty)
                      IconButton(
                        icon: const Icon(Iconsax.close_circle),
                        onPressed: () {
                          _searchController.clear();
                          _filterByCategory(_selectedCategory);
                        },
                      ),
                    IconButton(
                      icon: const Icon(Iconsax.scan_barcode),
                      onPressed: _scanBarcode,
                    ),
                  ],
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
              ),
              onSubmitted: _searchProducts,
              onChanged: (value) {
                if (value.isEmpty) {
                  _filterByCategory(_selectedCategory);
                }
              },
            ),
          ),

          // Categories Row
          Container(
            height: 80,
            color: Colors.white,
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length + 1, // +1 for "All" category
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        // "All" category
                        return _buildMobileCategoryCard(
                          null,
                          'Tous',
                          Iconsax.category,
                          _selectedCategory == null,
                        );
                      }
                      final category = _categories[index - 1];
                      return _buildMobileCategoryCard(
                        category,
                        category.name,
                        _getCategoryIcon(category.name),
                        _selectedCategory?.id == category.id,
                      );
                    },
                  ),
          ),

          const Divider(height: 1),

          // Product Grid - Main Content
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : _searchResults.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Iconsax.search_normal,
                          size: 48,
                          color: Color(0xFF94A3B8),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _selectedCategory == null
                              ? 'Aucun produit disponible'
                              : 'Aucun produit dans "${_selectedCategory!.name}"',
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            color: const Color(0xFF64748B),
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadInitialData,
                    child: GridView.builder(
                      padding: const EdgeInsets.all(8),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2, // 2 products per row for mobile
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                        childAspectRatio: 0.8,
                      ),
                      itemCount: _searchResults.length,
                      itemBuilder: (context, index) {
                        final product = _searchResults[index];
                        return _buildMobileProductCard(product);
                      },
                    ),
                  ),
          ),

          // Cart Summary Bottom Bar - Always visible when cart has items
          if (_cartItems.isNotEmpty) _buildCartSummaryBar(),
        ],
      ),
    );
  }

  Widget _buildProductCard(Product product) {
    final isOutOfStock = product.currentStock <= 0;
    final isLowStock = product.isLowStock && !isOutOfStock;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: isOutOfStock ? null : () => _addToCart(product),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Image Placeholder
              Container(
                height: 80,
                decoration: BoxDecoration(
                  color: isOutOfStock 
                    ? Colors.grey.shade200
                    : AppColors.primaryBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Icon(
                    Iconsax.box,
                    size: 32,
                    color: isOutOfStock 
                      ? Colors.grey
                      : AppColors.primaryBlue,
                  ),
                ),
              ),
              const SizedBox(height: 8),

              // Product Name
              Text(
                product.name,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isOutOfStock 
                    ? Colors.grey
                    : const Color(0xFF1E293B),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),

              // SKU
              Text(
                'SKU: ${product.sku}',
                style: GoogleFonts.poppins(
                  fontSize: 11,
                  color: const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 4),

              // Price and Stock
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    currency.format(product.sellingPrice),
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isOutOfStock 
                        ? Colors.grey
                        : AppColors.primaryBlue,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isOutOfStock
                        ? AppColors.error.withOpacity(0.1)
                        : isLowStock
                          ? AppColors.warning.withOpacity(0.1)
                          : AppColors.success.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      isOutOfStock 
                        ? 'Out'
                        : '${product.currentStock}',
                      style: GoogleFonts.poppins(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isOutOfStock
                          ? AppColors.error
                          : isLowStock
                            ? AppColors.warning
                            : AppColors.success,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn().scale(delay: 100.ms);
  }

  Widget _buildCartItem(SaleItem item, int index) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.productName,
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (item.productSku != null) ...[
                      Text(
                        'SKU: ${item.productSku}',
                        style: GoogleFonts.poppins(
                          fontSize: 11,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                    Text(
                      currency.format(item.unitPrice),
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => _removeFromCart(index),
                icon: const Icon(Iconsax.trash, size: 16, color: AppColors.error),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Quantity Controls
              Row(
                children: [
                  IconButton(
                    onPressed: () => _updateCartItemQuantity(index, item.quantity - 1),
                    icon: const Icon(Iconsax.minus_cirlce, size: 20),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.error.withOpacity(0.1),
                      foregroundColor: AppColors.error,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: Text(
                      '${item.quantity}',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => _updateCartItemQuantity(index, item.quantity + 1),
                    icon: const Icon(Iconsax.add_circle, size: 20),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.success.withOpacity(0.1),
                      foregroundColor: AppColors.success,
                    ),
                  ),
                ],
              ),
              // Total Price
              Text(
                currency.format(item.total),
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryBlue,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, double amount, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.w600 : FontWeight.w400,
              color: isTotal ? const Color(0xFF1E293B) : const Color(0xFF64748B),
            ),
          ),
          Text(
            currency.format(amount.abs()),
            style: GoogleFonts.poppins(
              fontSize: isTotal ? 18 : 14,
              fontWeight: FontWeight.bold,
              color: isTotal 
                ? AppColors.primaryBlue 
                : amount < 0 
                  ? AppColors.success
                  : const Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryCard(Category? category, String name, IconData icon, bool isSelected) {
    return GestureDetector(
      onTap: () => _filterByCategory(category),
      child: Container(
        width: 80,
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryBlue : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primaryBlue : const Color(0xFFE2E8F0),
            width: 2,
          ),
          boxShadow: isSelected ? [
            BoxShadow(
              color: AppColors.primaryBlue.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ] : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.white : AppColors.primaryBlue,
              size: 28,
            ),
            const SizedBox(height: 4),
            Text(
              name,
              style: GoogleFonts.poppins(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF1E293B),
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    ).animate().scale(delay: 100.ms);
  }

  IconData _getCategoryIcon(String categoryName) {
    final name = categoryName.toLowerCase();
    if (name.contains('electronics') || name.contains('électronique')) {
      return Iconsax.mobile;
    } else if (name.contains('clothing') || name.contains('vêtements') || name.contains('textile')) {
      return Iconsax.bag_2;
    } else if (name.contains('food') || name.contains('nourriture') || name.contains('alimentation')) {
      return Iconsax.coffee;
    } else if (name.contains('books') || name.contains('livres')) {
      return Iconsax.book;
    } else if (name.contains('home') || name.contains('maison') || name.contains('furniture')) {
      return Iconsax.home;
    } else if (name.contains('beauty') || name.contains('beauté') || name.contains('cosmetic')) {
      return Iconsax.heart;
    } else if (name.contains('sports') || name.contains('fitness')) {
      return Iconsax.activity;
    } else if (name.contains('automotive') || name.contains('auto') || name.contains('car')) {
      return Iconsax.car;
    } else if (name.contains('health') || name.contains('santé') || name.contains('medical')) {
      return Iconsax.health;
    } else if (name.contains('toy') || name.contains('jouet')) {
      return Iconsax.game;
    } else if (name.contains('office') || name.contains('bureau')) {
      return Iconsax.briefcase;
    } else if (name.contains('garden') || name.contains('jardin')) {
      return Iconsax.tree;
    } else {
      return Iconsax.box; // Default icon
    }
  }

  // Mobile-specific widgets
  Widget _buildMobileCategoryCard(Category? category, String name, IconData icon, bool isSelected) {
    return GestureDetector(
      onTap: () => _filterByCategory(category),
      child: Container(
        width: 60,
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryBlue : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.primaryBlue : const Color(0xFFE2E8F0),
            width: 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.white : AppColors.primaryBlue,
              size: 20,
            ),
            const SizedBox(height: 4),
            Text(
              name,
              style: GoogleFonts.poppins(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF1E293B),
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileProductCard(Product product) {
    final isOutOfStock = product.currentStock <= 0;
    final isLowStock = product.isLowStock && !isOutOfStock;
    final isInCart = _cartItems.any((item) => item.productId == product.id);

    return Card(
      elevation: isInCart ? 4 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: isInCart ? const BorderSide(color: AppColors.primaryBlue, width: 2) : BorderSide.none,
      ),
      child: InkWell(
        onTap: isOutOfStock ? null : () => _addToCart(product),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Image Placeholder
              Container(
                height: 60,
                decoration: BoxDecoration(
                  color: isOutOfStock 
                    ? Colors.grey.shade200
                    : AppColors.primaryBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Icon(
                    isInCart ? Iconsax.tick_circle : Iconsax.box,
                    size: 24,
                    color: isOutOfStock 
                      ? Colors.grey
                      : isInCart 
                        ? AppColors.success
                        : AppColors.primaryBlue,
                  ),
                ),
              ),
              const SizedBox(height: 6),

              // Product Name
              Text(
                product.name,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isOutOfStock ? Colors.grey : const Color(0xFF1E293B),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),

              // Price and Stock Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Text(
                      currency.format(product.sellingPrice),
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isOutOfStock ? Colors.grey : AppColors.primaryBlue,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: isOutOfStock
                        ? AppColors.error.withOpacity(0.1)
                        : isLowStock
                          ? AppColors.warning.withOpacity(0.1)
                          : AppColors.success.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(
                      isOutOfStock ? 'Épuisé' : '${product.currentStock}',
                      style: GoogleFonts.poppins(
                        fontSize: 8,
                        fontWeight: FontWeight.w600,
                        color: isOutOfStock
                          ? AppColors.error
                          : isLowStock
                            ? AppColors.warning
                            : AppColors.success,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCartSummaryBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Cart Summary
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_cartItems.length} article(s)',
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                    Text(
                      currency.format(_total),
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryBlue,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    // View Cart Button
                    IconButton(
                      onPressed: _showCartModal,
                      icon: const Icon(Iconsax.shopping_cart),
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.primaryBlue.withOpacity(0.1),
                        foregroundColor: AppColors.primaryBlue,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Checkout Button
                    ElevatedButton(
                      onPressed: _proceedToPayment,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryBlue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Text(
                        'Payer',
                        style: GoogleFonts.poppins(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showCartModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          children: [
            // Handle
            Container(
              margin: const EdgeInsets.only(top: 8),
              height: 4,
              width: 32,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    'Panier (${_cartItems.length})',
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  if (_cartItems.isNotEmpty)
                    TextButton(
                      onPressed: () {
                        _clearCart();
                        Navigator.pop(context);
                      },
                      child: Text(
                        'Vider',
                        style: GoogleFonts.poppins(
                          color: AppColors.error,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Cart Items
            Expanded(
              child: _cartItems.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Iconsax.shopping_cart,
                          size: 48,
                          color: Color(0xFF94A3B8),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Panier vide',
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: _cartItems.length,
                    itemBuilder: (context, index) {
                      final item = _cartItems[index];
                      return _buildMobileCartItem(item, index);
                    },
                  ),
            ),
            // Summary and Actions
            if (_cartItems.isNotEmpty) _buildMobileCartSummary(),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileCartItem(SaleItem item, int index) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  currency.format(item.unitPrice),
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          // Quantity Controls
          Row(
            children: [
              IconButton(
                onPressed: () => _updateCartItemQuantity(index, item.quantity - 1),
                icon: const Icon(Iconsax.minus_cirlce, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.error.withOpacity(0.1),
                  foregroundColor: AppColors.error,
                  minimumSize: const Size(32, 32),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  '${item.quantity}',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => _updateCartItemQuantity(index, item.quantity + 1),
                icon: const Icon(Iconsax.add_circle, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.success.withOpacity(0.1),
                  foregroundColor: AppColors.success,
                  minimumSize: const Size(32, 32),
                ),
              ),
            ],
          ),
          // Total
          SizedBox(
            width: 60,
            child: Text(
              currency.format(item.total),
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.primaryBlue,
              ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileCartSummary() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            _buildSummaryRow('Total', _total, isTotal: true),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(
                      'Continuer',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _proceedToPayment();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryBlue,
                      foregroundColor: Colors.white,
                    ),
                    child: Text(
                      'Payer ${currency.format(_total)}',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
