import 'package:flutter/material.dart';

import '../categories.dart';
import '../geo.dart';
import '../layout.dart';
import '../models.dart';
import '../store.dart';
import '../theme.dart';
import 'address_picker.dart';
import 'meal_card.dart';
import 'meal_detail.dart';

class MarketView extends StatefulWidget {
  const MarketView({super.key, required this.store, required this.autofocusSearch});

  final AppStore store;
  final bool autofocusSearch;

  @override
  State<MarketView> createState() => _MarketViewState();
}

enum _SortMode { nearest, cheapest, newest }

class _MarketViewState extends State<MarketView> {
  final _query = TextEditingController();
  String _kind = 'all';
  _SortMode _sort = _SortMode.nearest;

  @override
  void initState() {
    super.initState();
    widget.store.addListener(_onStore);
  }

  @override
  void didUpdateWidget(covariant MarketView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.store != widget.store) {
      oldWidget.store.removeListener(_onStore);
      widget.store.addListener(_onStore);
    }
  }

  @override
  void dispose() {
    widget.store.removeListener(_onStore);
    _query.dispose();
    super.dispose();
  }

  void _onStore() {
    if (mounted) setState(() {});
  }

  List<Meal> _visible() {
    final store = widget.store;
    final q = _query.text.trim().toLowerCase();
    final rows = store.meals.where((meal) {
      if (meal.portions <= 0) return false;
      if (_kind != 'all' && meal.kind != _kind) return false;
      if (kmBetween(store.centerLat, store.centerLng, meal.lat, meal.lng) > AppStore.radiusKm) {
        return false;
      }
      if (q.isEmpty) return true;
      final blob = '${meal.title} ${meal.chef} ${meal.description} ${meal.city} ${meal.district}'.toLowerCase();
      return blob.contains(q);
    }).toList();
    rows.sort((a, b) {
      switch (_sort) {
        case _SortMode.cheapest:
          return a.price.compareTo(b.price);
        case _SortMode.newest:
          return b.id.compareTo(a.id);
        case _SortMode.nearest:
          final da = kmBetween(store.centerLat, store.centerLng, a.lat, a.lng);
          final db = kmBetween(store.centerLat, store.centerLng, b.lat, b.lng);
          return da.compareTo(db);
      }
    });
    return rows;
  }

  Future<void> _refresh() async {
    final ok = await widget.store.refreshGpsIfNeeded();
    if (!mounted) return;
    if (!ok && widget.store.useGpsBrowse) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Konum yenilenemedi. Adres seçerek de bakabilirsin.')),
      );
    }
  }

  Future<void> _openAddressPicker() async {
    final selected = await showAddressPicker(
      context,
      mode: AddressPickerMode.browse,
      initial: widget.store.browseAddress,
    );
    if (selected != null) {
      widget.store.setBrowseAddress(selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final orientation = MediaQuery.orientationOf(context);
    final mode = classifyScreen(size, orientation);
    final columns = gridColumns(mode, size.width);
    final meals = _visible();
    final store = widget.store;
    final chipLabel = store.useGpsBrowse
        ? 'Yakınım · 20 km'
        : '${store.browseAddress.shortLabel} · 20 km';

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('KomşuAş', style: brandTitle(context)),
                const Text('Kapıdan Sıcak Ev Yemeği', style: TextStyle(color: inkSoft, fontSize: 13)),
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: _openAddressPicker,
                    style: TextButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.7),
                      foregroundColor: ink,
                      shape: const StadiumBorder(side: BorderSide(color: Color(0x1A022C22))),
                    ),
                    icon: Icon(
                      store.useGpsBrowse ? Icons.my_location : Icons.location_on_outlined,
                      size: 18,
                    ),
                    label: Text('$chipLabel ▾'),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _query,
                  autofocus: widget.autofocusSearch,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Yemek, malzeme veya aşçı ara',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: Color(0x1A022C22)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: Color(0x1A022C22)),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final filter in mealCategories)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(filter.label),
                            selected: _kind == filter.id,
                            onSelected: (_) => setState(() => _kind = filter.id),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    meals.isEmpty ? '20 km içinde ilan yok' : '${meals.length} ilan · 20 km',
                    style: const TextStyle(color: inkSoft),
                  ),
                ),
                DropdownButtonHideUnderline(
                  child: DropdownButton<_SortMode>(
                    value: _sort,
                    isDense: true,
                    items: const [
                      DropdownMenuItem(value: _SortMode.nearest, child: Text('En yakın')),
                      DropdownMenuItem(value: _SortMode.cheapest, child: Text('En ucuz')),
                      DropdownMenuItem(value: _SortMode.newest, child: Text('En yeni')),
                    ],
                    onChanged: (value) {
                      if (value != null) setState(() => _sort = value);
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: brand,
              onRefresh: _refresh,
              child: meals.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
                      children: [
                        Icon(Icons.ramen_dining_outlined, size: 48, color: brand.withValues(alpha: 0.45)),
                        const SizedBox(height: 12),
                        const Text(
                          'Bu çevrede aktif ilan yok.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Başka ilçe seç veya konumunu yenile.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: inkSoft),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: _openAddressPicker,
                          style: FilledButton.styleFrom(backgroundColor: brand),
                          child: const Text('Adres değiştir'),
                        ),
                      ],
                    )
                  : GridView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                        mainAxisExtent: 292,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: meals.length,
                      itemBuilder: (context, index) {
                        final meal = meals[index];
                        final distance = kmBetween(store.centerLat, store.centerLng, meal.lat, meal.lng);
                        return MealCard(
                          meal: meal,
                          distanceKm: distance,
                          onOpen: () => showMealDetail(context, store, meal),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
