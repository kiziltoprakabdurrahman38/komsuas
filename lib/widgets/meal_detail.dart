import 'package:flutter/material.dart';

import '../layout.dart';
import '../models.dart';
import '../store.dart';
import '../theme.dart';
import 'address_picker.dart';
import 'directions.dart';
import 'meal_map.dart';

Future<void> showMealDetail(BuildContext context, AppStore store, Meal meal) async {
  final size = MediaQuery.sizeOf(context);
  final mode = classifyScreen(size, MediaQuery.orientationOf(context));
  if (mode == ScreenMode.phonePortrait) {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.92,
          minChildSize: 0.55,
          maxChildSize: 0.96,
          builder: (context, scroll) {
            return MealDetailView(store: store, meal: meal, scrollController: scroll, split: false);
          },
        );
      },
    );
    return;
  }

  final wide = mode == ScreenMode.tabletLandscape || mode == ScreenMode.phoneLandscape;
  await showDialog<void>(
    context: context,
    builder: (context) {
      final box = MediaQuery.sizeOf(context);
      return Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: wide ? 1040 : 680,
            maxHeight: box.height * 0.9,
          ),
          child: MealDetailView(store: store, meal: meal, split: wide),
        ),
      );
    },
  );
}

class MealDetailView extends StatelessWidget {
  const MealDetailView({
    super.key,
    required this.store,
    required this.meal,
    required this.split,
    this.scrollController,
  });

  final AppStore store;
  final Meal meal;
  final bool split;
  final ScrollController? scrollController;

  @override
  Widget build(BuildContext context) {
    final media = split
        ? Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _visuals(meal)),
              const SizedBox(width: 20),
              Expanded(child: _facts(context)),
            ],
          )
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _visuals(meal),
              const SizedBox(height: 16),
              _facts(context),
            ],
          );

    return SafeArea(
      child: ListView(
        controller: scrollController,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(meal.title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              ),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
            ],
          ),
          const SizedBox(height: 8),
          media,
        ],
      ),
    );
  }

  Widget _visuals(Meal meal) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 140,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: const LinearGradient(colors: [Color(0xFF99F6E4), Color(0xFF0F766E)]),
          ),
          alignment: Alignment.bottomLeft,
          padding: const EdgeInsets.all(16),
          child: Text(meal.kindLabel, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
        ),
        const SizedBox(height: 12),
        Text(meal.description, style: const TextStyle(height: 1.4, color: ink)),
        const SizedBox(height: 12),
        MealMap(lat: meal.lat, lng: meal.lng),
      ],
    );
  }

  Widget _facts(BuildContext context) {
    final deposit = meal.price * AppStore.depositRate;
    final cash = meal.price - deposit;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(meal.chef, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text(meal.placeLabel, style: const TextStyle(color: inkSoft)),
        const SizedBox(height: 12),
        Text('${meal.price.toStringAsFixed(0)} ₺ / porsiyon', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: brandDeep)),
        const SizedBox(height: 8),
        Text('Kapora %30: ${deposit.toStringAsFixed(0)} ₺', style: const TextStyle(color: inkSoft)),
        Text('Kapıda ödeme: ${cash.toStringAsFixed(0)} ₺', style: const TextStyle(color: inkSoft)),
        Text(meal.portions > 0 ? '${meal.portions} porsiyon kaldı' : 'Porsiyon tükendi', style: const TextStyle(color: inkSoft)),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => openDirections(context, meal),
            icon: const Icon(Icons.navigation_outlined),
            label: const Text("Google Haritalar'da Yol Tarifi Al"),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: meal.portions <= 0
                ? null
                : () async {
                    final address = await showAddressPicker(
                      context,
                      mode: AddressPickerMode.order,
                      initial: store.orderAddress ??
                          (store.browseAddress.fromGps ? null : store.browseAddress),
                    );
                    if (address == null || !context.mounted) return;
                    final error = store.reserve(meal, userAddress: address);
                    final messenger = ScaffoldMessenger.of(context);
                    Navigator.pop(context);
                    messenger.showSnackBar(
                      SnackBar(content: Text(error ?? 'Rezerve edildi. Teslimat kodu Siparişlerim’de.')),
                    );
                  },
            style: FilledButton.styleFrom(backgroundColor: brand, minimumSize: const Size.fromHeight(48)),
            child: const Text('Şimdi Rezerve Et'),
          ),
        ),
      ],
    );
  }
}
