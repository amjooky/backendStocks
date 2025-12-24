import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';

import '../models/pos_models.dart';
import '../theme/app_colors.dart';
import '../services/receipt_history_service.dart';
import '../models/receipt.dart';
import 'receipt_history_screen.dart';

class EnhancedPosPaymentScreen extends StatefulWidget {
  final List<SaleItem> items;
  final Customer? customer;
  final VoidCallback? onPaymentComplete;

  const EnhancedPosPaymentScreen({
    super.key,
    required this.items,
    this.customer,
    this.onPaymentComplete,
  });

  @override
  State<EnhancedPosPaymentScreen> createState() => _EnhancedPosPaymentScreenState();
}

class _EnhancedPosPaymentScreenState extends State<EnhancedPosPaymentScreen> {
  PaymentMethod _selectedPaymentMethod = PaymentMethod.cash;
  final TextEditingController _cashAmountController = TextEditingController();
  final NumberFormat _currency = NumberFormat.currency(symbol: '\$');
  
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Set default cash amount to total for convenience
    if (_selectedPaymentMethod == PaymentMethod.cash) {
      _cashAmountController.text = _finalTotal.toStringAsFixed(2);
    }
  }

  @override
  void dispose() {
    _cashAmountController.dispose();
    super.dispose();
  }


  double get _subtotal => widget.items.fold(0.0, (sum, item) => sum + item.subtotal);
  double get _totalDiscount => 0.0; // No promotions for simplicity
  double get _totalTax => widget.items.fold(0.0, (sum, item) => sum + item.taxAmount);
  double get _finalTotal => _subtotal - _totalDiscount + _totalTax;

  double? get _changeAmount {
    if (_selectedPaymentMethod != PaymentMethod.cash) return null;
    final cashAmount = double.tryParse(_cashAmountController.text);
    if (cashAmount == null || cashAmount <= _finalTotal) return null;
    return cashAmount - _finalTotal;
  }

  bool _canProcessPayment() {
    // Basic validation: must have items and total > 0
    if (widget.items.isEmpty || _finalTotal <= 0) {
      return false;
    }

    // For cash payments, validate amount
    if (_selectedPaymentMethod == PaymentMethod.cash) {
      final cashAmount = double.tryParse(_cashAmountController.text);
      return cashAmount != null && cashAmount >= _finalTotal;
    }

    // For non-cash payments, no additional validation needed
    return true;
  }

  Future<void> _confirmAndGenerateReceipt() async {
    if (_isLoading) return;

    // Validate payment first
    double? cashAmount;
    double? changeAmount;
    
    if (_selectedPaymentMethod == PaymentMethod.cash) {
      cashAmount = double.tryParse(_cashAmountController.text);
      if (cashAmount == null || cashAmount < _finalTotal) {
        setState(() {
          _errorMessage = 'Cash amount must be at least ${_currency.format(_finalTotal)}';
        });
        return;
      }
      changeAmount = cashAmount - _finalTotal;
    }

    // Show confirmation dialog
    final confirmed = await _showPaymentConfirmationDialog(
      paymentMethod: _selectedPaymentMethod,
      total: _finalTotal,
      cashAmount: cashAmount,
      changeAmount: changeAmount,
    );

    if (confirmed != true) return;

    // Proceed with receipt generation
    await _generateReceipt(cashAmount, changeAmount);
  }

  Future<bool?> _showPaymentConfirmationDialog({
    required PaymentMethod paymentMethod,
    required double total,
    double? cashAmount,
    double? changeAmount,
  }) async {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              _getPaymentMethodIcon(paymentMethod),
              color: AppColors.primary,
              size: 24,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Confirm Payment',
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  fontSize: 18,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Please confirm the payment details:',
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 16),
            
            // Payment summary
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Column(
                children: [
                  _buildConfirmationRow('Payment Method', paymentMethod.label),
                  const SizedBox(height: 8),
                  _buildConfirmationRow('Total Amount', _currency.format(total)),
                  
                  if (paymentMethod == PaymentMethod.cash && cashAmount != null) ...[
                    const SizedBox(height: 8),
                    _buildConfirmationRow('Cash Received', _currency.format(cashAmount)),
                    if (changeAmount != null && changeAmount > 0) ...[
                      const SizedBox(height: 8),
                      _buildConfirmationRow(
                        'Change Due',
                        _currency.format(changeAmount),
                        valueColor: AppColors.info,
                        isBold: true,
                      ),
                    ],
                  ],
                  
                  if (widget.customer != null) ...[
                    const Divider(height: 16),
                    _buildConfirmationRow('Customer', widget.customer!.name),
                  ],
                  
                  const Divider(height: 16),
                  _buildConfirmationRow('Items', '${widget.items.length} item(s)'),
                ],
              ),
            ),
            
            const SizedBox(height: 12),
            Text(
              'A receipt will be generated and saved to history.',
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: Colors.grey[600],
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(
              'Cancel',
              style: GoogleFonts.poppins(color: Colors.grey[600]),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: Text(
              'Confirm Payment',
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmationRow(
    String label,
    String value, {
    Color? valueColor,
    bool isBold = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 14,
            color: Colors.grey[700],
          ),
        ),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: isBold ? FontWeight.w600 : FontWeight.w500,
            color: valueColor ?? Colors.black87,
          ),
        ),
      ],
    );
  }

  Future<void> _generateReceipt(double? cashAmount, double? changeAmount) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Generate receipt number from backend
      final receiptNumber = await ReceiptHistoryService.generateReceiptNumber();
      
      // Create receipt
      final receipt = Receipt(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        timestamp: DateTime.now(),
        items: widget.items,
        customer: widget.customer,
        subtotal: _subtotal,
        tax: _totalTax,
        discount: _totalDiscount,
        total: _finalTotal,
        paymentMethod: _selectedPaymentMethod,
        cashAmount: cashAmount,
        changeAmount: changeAmount,
        notes: 'Payment confirmed via mobile POS',
        receiptNumber: receiptNumber,
      );

      // Save to backend and get the saved receipt with server ID
      final savedReceipt = await ReceiptHistoryService.saveReceipt(receipt);

      if (mounted) {
        // Show receipt
        await _showReceiptDialog(savedReceipt);
        
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment confirmed and receipt generated! ${changeAmount != null && changeAmount > 0 ? 'Change: ${_currency.format(changeAmount)}' : ''}'),
            backgroundColor: AppColors.success,
            duration: const Duration(seconds: 3),
            action: SnackBarAction(
              label: 'View History',
              textColor: Colors.white,
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const ReceiptHistoryScreen(),
                  ),
                );
              },
            ),
          ),
        );

        widget.onPaymentComplete?.call();
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _showReceiptDialog(Receipt receipt) async {
    return showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Iconsax.receipt_1, color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Receipt Generated',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Text(
              receipt.generateReceiptText(
                storeName: 'STOCK MANAGEMENT',
                storeAddress: '123 Business St, City',
                storePhone: '+1 (555) 123-4567',
                cashierName: 'Mobile POS',
              ),
              style: GoogleFonts.robotoMono(fontSize: 12),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const ReceiptHistoryScreen(),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('View History'),
          ),
        ],
      ),
    );
  }

  void _onNumberTap(String number) {
    final current = _cashAmountController.text;
    if (number == '.' && current.contains('.')) return;
    
    setState(() {
      _cashAmountController.text = current + number;
      _errorMessage = null; // Clear error when typing
    });
  }

  void _onNumberClear() {
    setState(() {
      if (_cashAmountController.text.isNotEmpty) {
        _cashAmountController.text = _cashAmountController.text.substring(0, _cashAmountController.text.length - 1);
        _errorMessage = null; // Clear error when typing
      }
    });
  }

  void _onNumberClearAll() {
    setState(() {
      _cashAmountController.text = '';
      _errorMessage = null; // Clear error when clearing
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Payment & Receipt',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black,
      ),
      body: _isLoading ? 
        const Center(child: CircularProgressIndicator()) :
        Column(
          children: [
            // Scrollable content
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    // Order Summary
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Order Summary',
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildSummaryRow('Subtotal', _currency.format(_subtotal)),
                          if (_totalDiscount > 0)
                            _buildSummaryRow('Discount', '-${_currency.format(_totalDiscount)}', color: AppColors.success),
                          if (_totalTax > 0)
                            _buildSummaryRow('Tax', _currency.format(_totalTax)),
                          const Divider(height: 24),
                          _buildSummaryRow(
                            'TOTAL',
                            _currency.format(_finalTotal),
                            isTotal: true,
                          ),
                          if (_changeAmount != null) ...[
                            const SizedBox(height: 8),
                            _buildSummaryRow(
                              'Change',
                              _currency.format(_changeAmount!),
                              color: AppColors.info,
                            ),
                          ],
                        ],
                      ),
                    ),

                    // Payment Method Selection
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Payment Method',
                            style: GoogleFonts.poppins(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: PaymentMethod.values.take(3).map((method) {
                              final isSelected = _selectedPaymentMethod == method;
                              return Expanded(
                                child: Container(
                                  margin: const EdgeInsets.only(right: 8),
                                  child: Material(
                                    color: isSelected ? AppColors.primary : Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    child: InkWell(
                                      onTap: () {
                        setState(() {
                          _selectedPaymentMethod = method;
                          if (method != PaymentMethod.cash) {
                            _cashAmountController.text = _finalTotal.toStringAsFixed(2);
                          } else {
                            _cashAmountController.text = _finalTotal.toStringAsFixed(2);
                          }
                          // Clear any error messages when switching payment methods
                          _errorMessage = null;
                        });
                                      },
                                      borderRadius: BorderRadius.circular(12),
                                      child: Container(
                                        padding: const EdgeInsets.all(12),
                                        child: Column(
                                          children: [
                                            Icon(
                                              _getPaymentMethodIcon(method),
                                              color: isSelected ? Colors.white : AppColors.primary,
                                              size: 20,
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              method.label,
                                              style: GoogleFonts.poppins(
                                                color: isSelected ? Colors.white : Colors.black,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500,
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),

                    // Cash Amount Input and Number Pad (for cash payments)
                    if (_selectedPaymentMethod == PaymentMethod.cash) ...[
                      const SizedBox(height: 16),
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Text(
                              'Cash Amount Received',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey.shade300),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    '\$ ',
                                    style: GoogleFonts.poppins(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  Expanded(
                                    child: Text(
                                      _cashAmountController.text.isEmpty ? '0.00' : _cashAmountController.text,
                                      style: GoogleFonts.poppins(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w600,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            // Quick amount buttons
                            Row(
                              children: [_finalTotal.ceil(), 50, 100].map((amount) {
                                return Expanded(
                                  child: Container(
                                    margin: const EdgeInsets.symmetric(horizontal: 2),
                                    child: ElevatedButton(
                                      onPressed: () {
                                        setState(() {
                                          _cashAmountController.text = amount.toString();
                                        });
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.grey.shade100,
                                        foregroundColor: Colors.black87,
                                        elevation: 0,
                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                      ),
                                      child: Text(
                                        '\$$amount',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),

                      // Number Pad
                      const SizedBox(height: 12),
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildNumberPad(),
                      ),
                    ],

                    // Error Message
                    if (_errorMessage != null) ...[
                      Container(
                        margin: const EdgeInsets.all(16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Iconsax.warning_2,
                              color: Colors.red.shade600,
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: GoogleFonts.poppins(
                                  color: Colors.red.shade700,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Add some bottom padding for the button
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),

            // Process Payment Button - Fixed at bottom
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(16),
              child: ElevatedButton(
                onPressed: (_canProcessPayment() && !_isLoading) ? _confirmAndGenerateReceipt : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 2,
                ),
                child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text(
                      'Confirm Payment • ${_currency.format(_finalTotal)}',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
              ),
            ),
          ],
        ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isTotal = false, Color? color}) {
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
              color: color,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.w600 : FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNumberPad() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: ['1', '2', '3'].map((number) => _buildNumberButton(number)).toList(),
          ),
          const SizedBox(height: 6),
          Row(
            children: ['4', '5', '6'].map((number) => _buildNumberButton(number)).toList(),
          ),
          const SizedBox(height: 6),
          Row(
            children: ['7', '8', '9'].map((number) => _buildNumberButton(number)).toList(),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildNumberButton('.'),
              _buildNumberButton('0'),
              _buildActionButton('⌫', _onNumberClear),
            ],
          ),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            height: 40,
            margin: const EdgeInsets.symmetric(horizontal: 2),
            child: Material(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              child: InkWell(
                onTap: _onNumberClearAll,
                borderRadius: BorderRadius.circular(8),
                child: Center(
                  child: Text(
                    'Clear',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNumberButton(String number) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        child: Material(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            onTap: () => _onNumberTap(number),
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              height: 40,
              child: Center(
                child: Text(
                  number,
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(String label, VoidCallback onTap) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        child: Material(
          color: AppColors.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              height: 40,
              child: Center(
                child: Text(
                  label,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  IconData _getPaymentMethodIcon(PaymentMethod method) {
    switch (method) {
      case PaymentMethod.cash:
        return Iconsax.money;
      case PaymentMethod.card:
        return Iconsax.card;
      case PaymentMethod.digitalWallet:
        return Iconsax.mobile;
      default:
        return Iconsax.money;
    }
  }
}