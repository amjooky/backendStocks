import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/stock_services.dart';
import '../widgets/quick_stock_operations.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  final currency = NumberFormat.currency(symbol: '\$');
  
  InventoryOverview? _inventoryOverview;
  List<StockMovement> _stockMovements = [];
  List<Product> _lowStockProducts = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _movementsPage = 1;
  final int _movementsLimit = 20;
  bool _hasMoreMovements = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final overview = await InventoryService.getOverview();
      final movements = await InventoryService.getMovements(page: 1, limit: _movementsLimit);
      final lowStock = await InventoryService.getLowStockProducts();
      
      setState(() {
        _inventoryOverview = overview;
        _stockMovements = movements;
        _lowStockProducts = lowStock;
        _hasMoreMovements = movements.length == _movementsLimit;
        _isLoading = false;
      });
    } catch (e) {
      setState(() { _isLoading = false; });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load inventory data: $e')),
        );
      }
    }
  }

  Future<void> _loadMoreMovements() async {
    if (_isLoadingMore || !_hasMoreMovements) return;
    
    setState(() { _isLoadingMore = true; });
    
    try {
      _movementsPage += 1;
      final movements = await InventoryService.getMovements(
        page: _movementsPage, 
        limit: _movementsLimit,
      );
      
      setState(() {
        _stockMovements.addAll(movements);
        _hasMoreMovements = movements.length == _movementsLimit;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load more movements: $e')),
      );
    } finally {
      setState(() { _isLoadingMore = false; });
    }
  }

  Future<void> _showStockAdjustmentForm() async {
    final formKey = GlobalKey<FormState>();
    final productIdCtrl = TextEditingController();
    final quantityCtrl = TextEditingController();
    final newStockCtrl = TextEditingController();
    final referenceCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    String adjustmentType = 'in';

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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Iconsax.box_add, color: Color(0xFF3B82F6)),
                          const SizedBox(width: 8),
                          Text(
                            'Stock Adjustment',
                            style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Adjustment Type Selector
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Adjustment Type',
                              style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                _adjustmentTypeChip(
                                  'Stock In',
                                  'in',
                                  Iconsax.arrow_up_2,
                                  const Color(0xFF10B981),
                                  adjustmentType,
                                  (value) => setModalState(() => adjustmentType = value),
                                ),
                                const SizedBox(width: 8),
                                _adjustmentTypeChip(
                                  'Stock Out',
                                  'out',
                                  Iconsax.arrow_down_2,
                                  const Color(0xFFEF4444),
                                  adjustmentType,
                                  (value) => setModalState(() => adjustmentType = value),
                                ),
                                const SizedBox(width: 8),
                                _adjustmentTypeChip(
                                  'Adjust',
                                  'adjustment',
                                  Iconsax.arrow_right_3,
                                  const Color(0xFF3B82F6),
                                  adjustmentType,
                                  (value) => setModalState(() => adjustmentType = value),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      _textField(
                        controller: productIdCtrl,
                        label: 'Product ID',
                        keyboardType: TextInputType.number,
                        validator: (v) => v!.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      
                      if (adjustmentType != 'adjustment')
                        _textField(
                          controller: quantityCtrl,
                          label: adjustmentType == 'in' ? 'Quantity to Add' : 'Quantity to Remove',
                          keyboardType: TextInputType.number,
                          validator: (v) => v!.isEmpty ? 'Required' : null,
                        ),
                      
                      if (adjustmentType == 'adjustment')
                        _textField(
                          controller: newStockCtrl,
                          label: 'New Stock Level',
                          keyboardType: TextInputType.number,
                          validator: (v) => v!.isEmpty ? 'Required' : null,
                        ),
                      
                      const SizedBox(height: 12),
                      _textField(
                        controller: referenceCtrl,
                        label: 'Reference (optional)',
                      ),
                      const SizedBox(height: 12),
                      _textField(
                        controller: notesCtrl,
                        label: 'Notes (optional)',
                        maxLines: 2,
                      ),
                      const SizedBox(height: 16),
                      
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          icon: const Icon(Iconsax.save_2),
                          label: const Text('Apply Adjustment'),
                          onPressed: () async {
                            if (!formKey.currentState!.validate()) return;
                            
                            try {
                              final productId = int.parse(productIdCtrl.text.trim());
                              final reference = referenceCtrl.text.trim().isEmpty ? null : referenceCtrl.text.trim();
                              final notes = notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim();
                              
                              if (adjustmentType == 'in') {
                                await InventoryService.stockIn(
                                  productId: productId,
                                  quantity: int.parse(quantityCtrl.text.trim()),
                                  reference: reference,
                                  notes: notes,
                                );
                              } else if (adjustmentType == 'out') {
                                await InventoryService.stockOut(
                                  productId: productId,
                                  quantity: int.parse(quantityCtrl.text.trim()),
                                  reference: reference,
                                  notes: notes,
                                );
                              } else {

                              }
                              
                              if (mounted) Navigator.pop(context);
                              _loadData();
                            } catch (e) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error: $e')),
                              );
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        _buildOverviewCard(),
        Container(
          color: Colors.white,
          child: TabBar(
            controller: _tabController,
            labelColor: const Color(0xFF3B82F6),
            unselectedLabelColor: const Color(0xFF64748B),
            indicatorColor: const Color(0xFF3B82F6),
            labelStyle: GoogleFonts.poppins(fontWeight: FontWeight.w600),
            unselectedLabelStyle: GoogleFonts.poppins(fontWeight: FontWeight.w400),
            tabs: const [
              Tab(text: 'Movements'),
              Tab(text: 'Low Stock'),
              Tab(text: 'Actions'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildMovementsTab(),
              _buildLowStockTab(),
              _buildActionsTab(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOverviewCard() {
    final stats = _inventoryOverview?.stats;
    if (stats == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF3B82F6), Color(0xFF1E40AF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Inventory Overview',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _overviewStat('Total', stats.totalProducts.toString()),
                    const SizedBox(width: 16),
_overviewStat('Low Stock', stats.lowStockItems.toString()),
                    const SizedBox(width: 16),
_overviewStat('Value', currency.format(stats.inventoryValue)),
                  ],
                ),
              ],
            ),
          ),
          const Icon(
            Iconsax.chart_21,
            color: Colors.white,
            size: 48,
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.3, end: 0);
  }

  Widget _overviewStat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            color: Colors.white.withOpacity(0.8),
            fontSize: 12,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildMovementsTab() {
    return NotificationListener<ScrollNotification>(
      onNotification: (ScrollNotification scrollInfo) {
        if (scrollInfo.metrics.pixels >= scrollInfo.metrics.maxScrollExtent - 200) {
          _loadMoreMovements();
        }
        return false;
      },
      child: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _stockMovements.length + (_isLoadingMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index >= _stockMovements.length) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            
            final movement = _stockMovements[index];
            return _buildMovementItem(movement).animate().fadeIn().slideY(begin: 0.1, end: 0);
          },
        ),
      ),
    );
  }

  Widget _buildMovementItem(StockMovement movement) {
    IconData icon;
    Color color;
    String prefix;
    
    switch (movement.movementType) {
      case 'in':
        icon = Iconsax.arrow_up_2;
        color = const Color(0xFF10B981);
        prefix = '+';
        break;
      case 'out':
        icon = Iconsax.arrow_down_2;
        color = const Color(0xFFEF4444);
        prefix = '-';
        break;
      default:
        icon = Iconsax.arrow_right_3;
        color = const Color(0xFF3B82F6);
        prefix = '';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
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
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  movement.productName ?? 'Unknown Product',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'SKU: ${movement.sku ?? 'N/A'}',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: const Color(0xFF64748B),
                  ),
                ),
                if (movement.reference != null && movement.reference!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Ref: ${movement.reference}',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$prefix${movement.quantity}',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(
                '${movement.previousStock} → ${movement.newStock}',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: const Color(0xFF64748B),
                ),
              ),
              Text(
                DateFormat('MMM dd, HH:mm').format(movement.createdAt),
                style: GoogleFonts.poppins(
                  fontSize: 11,
                  color: const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLowStockTab() {
    if (_lowStockProducts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Iconsax.tick_circle,
              color: Color(0xFF10B981),
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              'All Good!',
              style: GoogleFonts.poppins(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No low stock products at the moment',
              style: GoogleFonts.poppins(
                color: const Color(0xFF64748B),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _lowStockProducts.length,
        itemBuilder: (context, index) {
          final product = _lowStockProducts[index];
          return _buildLowStockItem(product).animate().fadeIn().slideY(begin: 0.1, end: 0);
        },
      ),
    );
  }

  Widget _buildLowStockItem(Product product) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: product.currentStock == 0
              ? const Color(0xFFEF4444)
              : const Color(0xFFF59E0B),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: product.currentStock == 0
                  ? const Color(0xFFFEE2E2)
                  : const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              product.currentStock == 0 ? Iconsax.close_circle : Iconsax.warning_2,
              color: product.currentStock == 0
                  ? const Color(0xFFEF4444)
                  : const Color(0xFFF59E0B),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'SKU: ${product.sku}',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: const Color(0xFF64748B),
                  ),
                ),
                Text(
                  'Min Level: ${product.minStockLevel}',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: product.currentStock == 0
                  ? const Color(0xFFEF4444)
                  : const Color(0xFFF59E0B),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '${product.currentStock} left',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionsTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick Actions',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),
          _actionButton(
            'Barcode Operations',
            'Scan barcodes for quick stock operations',
            Iconsax.scan_barcode,
            const Color(0xFF8B5CF6),
            () => showQuickStockOperations(context, onOperationComplete: _loadData),
          ),
          const SizedBox(height: 12),
          _actionButton(
            'Stock Adjustment',
            'Manual stock adjustments by product ID',
            Iconsax.box_add,
            const Color(0xFF3B82F6),
            () => _showStockAdjustmentForm(),
          ),
          const SizedBox(height: 12),
          _actionButton(
            'Export Inventory',
            'Export inventory data to CSV',
            Iconsax.export,
            const Color(0xFF10B981),
            () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Export feature coming soon!')),
              );
            },
          ),
          const SizedBox(height: 12),
          _actionButton(
            'Inventory Report',
            'Generate detailed inventory report',
            Iconsax.document_text,
            const Color(0xFF8B5CF6),
            () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Report feature coming soon!')),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _actionButton(
    String title,
    String subtitle,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
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
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.poppins(
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Iconsax.arrow_right_3,
              color: Color(0xFF94A3B8),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _adjustmentTypeChip(
    String label,
    String value,
    IconData icon,
    Color color,
    String currentValue,
    Function(String) onChanged,
  ) {
    final isSelected = currentValue == value;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? Colors.white : color,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isSelected ? Colors.white : color,
              ),
            ),
          ],
        ),
      ),
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
