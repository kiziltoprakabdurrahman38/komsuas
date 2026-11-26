import 'package:flutter/material.dart';

import '../layout.dart';
import '../store.dart';
import '../theme.dart';
import '../widgets/market.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';
import 'share_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.store});

  final AppStore store;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      MarketView(key: const ValueKey('home'), store: widget.store, autofocusSearch: false),
      MarketView(key: const ValueKey('search'), store: widget.store, autofocusSearch: true),
      ShareScreen(store: widget.store),
      OrdersScreen(store: widget.store),
      ProfileScreen(store: widget.store),
    ];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.store.refreshGpsIfNeeded();
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final orientation = MediaQuery.orientationOf(context);
    final mode = classifyScreen(size, orientation);
    final bottom = usesBottomBar(mode);

    return ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: sage,
          body: Row(
            children: [
              if (!bottom)
                NavigationRail(
                  extended: railExtended(mode),
                  backgroundColor: sage,
                  selectedIndex: _index,
                  onDestinationSelected: (value) => setState(() => _index = value),
                  labelType: railExtended(mode) ? NavigationRailLabelType.none : NavigationRailLabelType.all,
                  destinations: const [
                    NavigationRailDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: Text('Ana Sayfa')),
                    NavigationRailDestination(icon: Icon(Icons.search), label: Text('Ara')),
                    NavigationRailDestination(icon: Icon(Icons.add_circle, color: brand), label: Text('Yemek Paylaş')),
                    NavigationRailDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: Text('Siparişlerim')),
                    NavigationRailDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: Text('Profilim')),
                  ],
                ),
              Expanded(
                child: IndexedStack(
                  index: _index,
                  children: _pages,
                ),
              ),
            ],
          ),
          bottomNavigationBar: bottom
              ? NavigationBar(
                  backgroundColor: sage,
                  selectedIndex: _index,
                  onDestinationSelected: (value) => setState(() => _index = value),
                  destinations: const [
                    NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Ana Sayfa'),
                    NavigationDestination(icon: Icon(Icons.search), label: 'Ara'),
                    NavigationDestination(
                      icon: _ShareGlyph(selected: false),
                      selectedIcon: _ShareGlyph(selected: true),
                      label: 'Paylaş',
                    ),
                    NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Siparişlerim'),
                    NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profilim'),
                  ],
                )
              : null,
        );
      },
    );
  }
}

class _ShareGlyph extends StatelessWidget {
  const _ShareGlyph({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: brand,
        shape: BoxShape.circle,
        boxShadow: selected ? const [BoxShadow(color: Color(0x330F766E), blurRadius: 8)] : null,
      ),
      child: const Icon(Icons.add, color: Colors.white, size: 22),
    );
  }
}
