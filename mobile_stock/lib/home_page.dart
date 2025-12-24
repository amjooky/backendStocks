import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import 'package:google_fonts/google_fonts.dart';
import 'services/stock_services.dart';
import 'services/auth_service.dart';
import 'models/models.dart';
import 'screens/dashboard_screen.dart';
import 'screens/products_screen.dart';
import 'screens/inventory_screen.dart';
import 'screens/reports_screen.dart';
import 'screens/pos_screen.dart';
import 'login_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;
  User? _currentUser;
  bool _isLoading = true;
  DashboardData? _dashboardData;

  final List<Widget> _screens = [
    const DashboardScreen(),
    const ProductsScreen(),
    const InventoryScreen(),
    const PosScreen(),
    const ReportsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final user = await AuthService.getCurrentUser();
      final dashboard = await ReportService.getDashboard();
      
      if (mounted) {
        setState(() {
          _currentUser = user;
          _dashboardData = dashboard;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _logout() async {
    // Show loading dialog
    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const AlertDialog(
          content: Row(
            children: [
              CircularProgressIndicator(),
              SizedBox(width: 16),
              Text('Logging out...'),
            ],
          ),
        ),
      );
    }

    try {
      await AuthService.logout();
      
      if (mounted) {
        // Close loading dialog
        Navigator.of(context).pop();
        
        // Navigate to login page and clear the entire navigation stack
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginPage()),
          (route) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        // Close loading dialog
        Navigator.of(context).pop();
        
        // Still navigate to login even if logout API fails
        // because local data has been cleared
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginPage()),
          (route) => false,
        );
        
        // Optionally show a brief message
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Logged out successfully'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        title: Text(
          _getAppBarTitle(),
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1E293B),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Iconsax.notification, color: Color(0xFF64748B)),
            onPressed: () {},
          ),
          PopupMenuButton<String>(
            icon: CircleAvatar(
              backgroundColor: const Color(0xFF3B82F6),
              child: Text(
                _currentUser?.username.substring(0, 1).toUpperCase() ?? 'U',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
            onSelected: (value) {
              if (value == 'logout') {
                _logout();
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem<String>(
                value: 'profile',
                child: Row(
                  children: [
                    const Icon(Iconsax.user, size: 16),
                    const SizedBox(width: 8),
                    Text('Profile (${_currentUser?.displayName ?? 'User'})'),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'settings',
                child: const Row(
                  children: [
                    Icon(Iconsax.setting_2, size: 16),
                    SizedBox(width: 8),
                    Text('Settings'),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Iconsax.logout, size: 16, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Logout', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: (index) => setState(() => _selectedIndex = index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: const Color(0xFF3B82F6),
          unselectedItemColor: const Color(0xFF94A3B8),
          selectedLabelStyle: GoogleFonts.poppins(
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
          unselectedLabelStyle: GoogleFonts.poppins(
            fontSize: 12,
            fontWeight: FontWeight.w400,
          ),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Iconsax.home_2),
              activeIcon: Icon(Iconsax.home_25),
              label: 'Dashboard',
            ),
            BottomNavigationBarItem(
              icon: Icon(Iconsax.box),
              activeIcon: Icon(Iconsax.box_1),
              label: 'Products',
            ),
            BottomNavigationBarItem(
              icon: Icon(Iconsax.graph),
              activeIcon: Icon(Iconsax.graph5),
              label: 'Inventory',
            ),
            BottomNavigationBarItem(
              icon: Icon(Iconsax.card_pos),
              activeIcon: Icon(Iconsax.card_pos),
              label: 'POS',
            ),
            BottomNavigationBarItem(
              icon: Icon(Iconsax.chart_1),
              activeIcon: Icon(Iconsax.chart_21),
              label: 'Reports',
            ),
          ],
        ),
      ),
    );
  }

  String _getAppBarTitle() {
    switch (_selectedIndex) {
      case 0:
        return 'Dashboard - ${_dashboardData?.today.totalSales ?? 0} Sales Today';
      case 1:
        return 'Products';
      case 2:
        return 'Inventory';
      case 3:
        return 'Point of Sale';
      case 4:
        return 'Reports';
      default:
        return 'Stock Management';
    }
  }
}
