import 'package:flutter/material.dart';

import '../geo.dart';
import '../layout.dart';
import '../models.dart';
import '../seed.dart';
import '../store.dart';
import '../theme.dart';
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
    final place = widget.store.place;
    final q = _query.text.trim().toLowerCase();
    final rows = widget.store.meals.where((meal) {
      if (meal.portions <= 0) return false;
      if (_kind != 'all' && meal.kind != _kind) return false;
      if (kmBetween(place.lat, place.lng, meal.lat, meal.lng) > 80) return false;
      if (q.isEmpty) return true;
      final blob = '${meal.title} ${meal.chef} ${meal.description} ${meal.city}'.toLowerCase();
      return blob.contains(q);
    }).toList();
    rows.sort((a, b) {
      final da = kmBetween(place.lat, place.lng, a.lat, a.lng);
      final db = kmBetween(place.lat, place.lng, b.lat, b.lng);
      return da.compareTo(db);
    });
    return rows;
  }

  Future<void> _pickPlace() async {
    final selected = await showModalBottomSheet<Place>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              const ListTile(title: Text('İl, İlçe', style: TextStyle(fontWeight: FontWeight.w800))),
              for (final place in places)
                ListTile(
                  title: Text(place.label),
                  trailing: place.label == widget.store.place.label ? const Icon(Icons.check, color: brand) : null,
                  onTap: () => Navigator.pop(context, place),
                ),
            ],
          ),
        );
      },
    );
    if (selected != null) widget.store.choosePlace(selected);
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
                            onPressed: _pickPlace,
                            style: TextButton.styleFrom(
                              backgroundColor: Colors.white.withValues(alpha: 0.7),
                              foregroundColor: ink,
                              shape: const StadiumBorder(side: BorderSide(color: Color(0x1A022C22))),
                            ),
                            icon: const Icon(Icons.location_on_outlined, size: 18),
                            label: Text('${widget.store.place.city}, ${widget.store.place.district} ▾'),
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
                              for (final filter in const [
                                ('all', 'Tümü'),
                                ('ana', 'Ana Yemek'),
                                ('hamur', 'Hamur İşi'),
                                ('corba', 'Çorba'),
                                ('tatli', 'Tatlı'),
                              ])
                                Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: ChoiceChip(
                                    label: Text(filter.$2),
                                    selected: _kind == filter.$1,
                                    onSelected: (_) => setState(() => _kind = filter.$1),
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
                      meals.isEmpty ? 'Bu çevrede ilan yok' : '${meals.length} aktif ilan',
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
                        final distance = kmBetween(widget.store.place.lat, widget.store.place.lng, meal.lat, meal.lng);
                        return MealCard(
                          meal: meal,
                          distanceKm: distance,
                          onOpen: () => showMealDetail(context, widget.store, meal),
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
