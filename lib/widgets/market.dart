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

class _MarketViewState extends State<MarketView> {
  final _query = TextEditingController();
  String _kind = 'all';

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  List<Meal> _visible() {
    final store = widget.store;
    final q = _query.text.trim().toLowerCase();
    final rows = store.meals.where((meal) {
      if (meal.portions <= 0) return false;
      if (_kind != 'all' && meal.kind != _kind) return false;
      if (kmBetween(store.centerLat, store.centerLng, meal.lat, meal.lng) > store.radiusKm) {
        return false;
      }
      if (q.isEmpty) return true;
      final blob = '${meal.title} ${meal.chef} ${meal.description} ${meal.city} ${meal.district}'.toLowerCase();
      return blob.contains(q);
    }).toList();
    rows.sort((a, b) {
      final da = kmBetween(store.centerLat, store.centerLng, a.lat, a.lng);
      final db = kmBetween(store.centerLat, store.centerLng, b.lat, b.lng);
      return da.compareTo(db);
    });
    return rows;
  }

  Future<void> _openAddressPicker() async {
    final selected = await showAddressPicker(
      context,
      mode: AddressPickerMode.browse,
      initial: widget.store.browseAddress,
      radiusKm: widget.store.radiusKm,
      onRadiusChanged: widget.store.setRadiusKm,
    );
    if (selected != null) {
      widget.store.setBrowseAddress(selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return OrientationBuilder(
          builder: (context, orientation) {
            final size = MediaQuery.sizeOf(context);
            final mode = classifyScreen(size, orientation);
            final columns = gridColumns(mode, size.width);
            final meals = _visible();
            final store = widget.store;
            final chipLabel = store.useGpsBrowse
                ? 'Yakınım · ${store.radiusKm.toStringAsFixed(0)} km'
                : '${store.browseAddress.shortLabel} · ${store.radiusKm.toStringAsFixed(0)} km';

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
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                    child: Text(
                      meals.isEmpty
                          ? '${store.radiusKm.toStringAsFixed(0)} km içinde ilan yok — adresi veya mesafeyi değiştir'
                          : '${meals.length} ilan · ${store.radiusKm.toStringAsFixed(0)} km çevresi',
                      style: const TextStyle(color: inkSoft),
                    ),
                  ),
                  Expanded(
                    child: GridView.builder(
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
                ],
              ),
            );
          },
        );
      },
    );
  }
}
