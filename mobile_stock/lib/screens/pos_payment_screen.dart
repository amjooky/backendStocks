import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/pos_models.dart' as pos;
import '../services/pos_service.dart';
import '../widgets/loading_button.dart';

class PosPaymentScreen extends StatefulWidget {
  final pos.Sale sale;
  final VoidCallback? onPaymentComplete;

  const PosPaymentScreen({
    Key? key,
    required this.sale,
    this.onPaymentComplete,
  }) : super(key: key);

  @override
  _PosPaymentScreenState createState() => _PosPaymentScreenState();
}

class _PosPaymentScreenState extends State<PosPaymentScreen> {
  pos.PaymentMethod _selectedMethod = pos.PaymentMethod.cash;
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  double get _remainingAmount => widget.sale.total - widget.sale.amountPaid;
  bool get _isFullPayment => (_amountController.text.isEmpty) || 
      (double.tryParse(_amountController.text) ?? 0) >= _remainingAmount;

  @override
  void initState() {
    super.initState();
    // Default to remaining amount for full payment
    _amountController.text = _remainingAmount.toStringAsFixed(2);
  }

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    super.dispose();
  }

  Future<void> _processPayment() async {
    if (_isLoading) return;

    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      setState(() {
        _errorMessage = 'Please enter a valid amount';
      });
      return;
    }

    if (amount > _remainingAmount) {
      setState(() {
        _errorMessage = 'Payment amount cannot exceed remaining balance';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await PosService.addPayment(
        widget.sale.id!,
        method: _selectedMethod,
        amount: amount,
        reference: _referenceController.text.trim().isEmpty 
            ? null 
            : _referenceController.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment of \$${amount.toStringAsFixed(2)} processed successfully'),
            backgroundColor: Colors.green,
          ),
        );

        if (widget.onPaymentComplete != null) {
          widget.onPaymentComplete!();
        }
        
        Navigator.pop(context, true); // Return true to indicate successful payment
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

  Widget _buildPaymentMethodSelector() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Payment Method',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: pos.PaymentMethod.values.map((method) {
                return ChoiceChip(
                  label: Text(method.label),
                  selected: _selectedMethod == method,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedMethod = method;
                      });
                    }
                  },
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountInput() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Payment Amount',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
              ],
              decoration: InputDecoration(
                labelText: 'Amount (\$)',
                prefixText: '\$ ',
                border: const OutlineInputBorder(),
                helperText: 'Remaining: \$${_remainingAmount.toStringAsFixed(2)}',
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () => _amountController.clear(),
                ),
              ),
              onChanged: (value) {
                setState(() {
                  _errorMessage = null;
                });
              },
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                TextButton(
                  onPressed: () {
                    _amountController.text = _remainingAmount.toStringAsFixed(2);
                  },
                  child: const Text('Full Payment'),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () {
                    _amountController.text = (_remainingAmount / 2).toStringAsFixed(2);
                  },
                  child: const Text('Half Payment'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReferenceInput() {
    if (_selectedMethod == pos.PaymentMethod.cash) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Reference ${_selectedMethod == pos.PaymentMethod.card ? '(Transaction ID)' : '(Optional)'}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _referenceController,
              decoration: InputDecoration(
                labelText: _selectedMethod == pos.PaymentMethod.card 
                    ? 'Card Transaction ID'
                    : _selectedMethod == pos.PaymentMethod.digitalWallet
                        ? 'Wallet Transaction ID'
                        : 'Payment Reference',
                border: const OutlineInputBorder(),
                hintText: _selectedMethod == pos.PaymentMethod.card 
                    ? 'e.g., 12345678'
                    : _selectedMethod == pos.PaymentMethod.digitalWallet
                        ? 'e.g., TXN123456'
                        : 'Optional reference',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSaleSummary() {
    return Card(
      color: Colors.grey[50],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Sale Summary',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total Amount:'),
                Text('\$${widget.sale.total.toStringAsFixed(2)}', 
                     style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Already Paid:'),
                Text('\$${widget.sale.amountPaid.toStringAsFixed(2)}', 
                     style: TextStyle(color: Colors.green[700])),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Remaining:'),
                Text('\$${_remainingAmount.toStringAsFixed(2)}', 
                     style: TextStyle(
                       color: _remainingAmount > 0 ? Colors.red[700] : Colors.green[700],
                       fontWeight: FontWeight.bold,
                     )),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Process Payment - Sale #${widget.sale.id}'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildSaleSummary(),
            const SizedBox(height: 16),
            _buildPaymentMethodSelector(),
            const SizedBox(height: 16),
            _buildAmountInput(),
            const SizedBox(height: 16),
            _buildReferenceInput(),
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Card(
                color: Colors.red[50],
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    children: [
                      Icon(Icons.error, color: Colors.red[700]),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(color: Colors.red[700]),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            LoadingButton(
              onPressed: _processPayment,
              isLoading: _isLoading,
              text: _isFullPayment 
                  ? 'Complete Payment (\$${_remainingAmount.toStringAsFixed(2)})'
                  : 'Process Partial Payment',
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _isLoading ? null : () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    );
  }
}