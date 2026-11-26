import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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

class MealDetailView extends StatefulWidget {
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
  State<MealDetailView> createState() => _MealDetailViewState();
}

class _MealDetailViewState extends State<MealDetailView> {
  int _count = 1;

  Meal get meal => widget.meal;
  AppStore get store => widget.store;

  Future<void> _reserve() async {
    final address = await showAddressPicker(
      context,
      mode: AddressPickerMode.order,
      initial: store.orderAddress ?? (store.browseAddress.fromGps ? null : store.browseAddress),
    );
    if (address == null || !mounted) return;
    final (error, order) = store.reserve(meal, userAddress: address, count: _count);
    if (!mounted) return;
    if (error != null || order == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error ?? 'Rezervasyon başarısız.')));
      return;
    }
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Rezervasyon tamam'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${order.mealTitle} · ${order.portions} porsiyon'),
              const SizedBox(height: 8),
              Text('Kapora ${order.deposit.toStringAsFixed(0)} ₺ alındı.'),
              Text('Kapıda ${order.cashDue.toStringAsFixed(0)} ₺ ödeyeceksin.'),
              const SizedBox(height: 12),
              const Text('Teslimat kodun', style: TextStyle(color: inkSoft)),
              const SizedBox(height: 4),
              SelectableText(
                order.code,
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: 4),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: order.code));
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(dialogContext).showSnackBar(
                    const SnackBar(content: Text('Kod panoya kopyalandı.')),
                  );
                }
              },
              child: const Text('Kodu kopyala'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext),
              style: FilledButton.styleFrom(backgroundColor: brand),
              child: const Text('Tamam'),
            ),
          ],
        );
      },
    );
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final media = widget.split
        ? Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _visuals()),
              const SizedBox(width: 20),
              Expanded(child: _facts(context)),
            ],
          )
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _visuals(),
              const SizedBox(height: 16),
              _facts(context),
            ],
          );

    return SafeArea(
      child: ListView(
        controller: widget.scrollController,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  meal.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
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

  Widget _visuals() {
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
    final deposit = meal.price * _count * AppStore.depositRate;
    final cash = meal.price * _count - deposit;
    final maxCount = meal.portions.clamp(0, 12);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(meal.chef, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text(meal.placeLabel, style: const TextStyle(color: inkSoft)),
        const SizedBox(height: 12),
        Text(
          '${meal.price.toStringAsFixed(0)} ₺ / porsiyon',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: brandDeep),
        ),
        const SizedBox(height: 12),
        if (meal.portions > 0) ...[
          const Text('Porsiyon', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(
            children: [
              IconButton.filledTonal(
                onPressed: _count > 1 ? () => setState(() => _count -= 1) : null,
                icon: const Icon(Icons.remove),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('$_count', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              ),
              IconButton.filledTonal(
                onPressed: _count < maxCount ? () => setState(() => _count += 1) : null,
                icon: const Icon(Icons.add),
              ),
              const SizedBox(width: 8),
              Text('${meal.portions} kaldı', style: const TextStyle(color: inkSoft)),
            ],
          ),
          const SizedBox(height: 10),
          Text('Kapora %30: ${deposit.toStringAsFixed(0)} ₺', style: const TextStyle(color: inkSoft)),
          Text('Kapıda ödeme: ${cash.toStringAsFixed(0)} ₺', style: const TextStyle(color: inkSoft)),
          Text('Toplam: ${(meal.price * _count).toStringAsFixed(0)} ₺', style: const TextStyle(fontWeight: FontWeight.w700)),
        ] else
          const Text('Porsiyon tükendi', style: TextStyle(color: inkSoft)),
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
            onPressed: meal.portions <= 0 ? null : _reserve,
            style: FilledButton.styleFrom(backgroundColor: brand, minimumSize: const Size.fromHeight(48)),
            child: Text(_count > 1 ? '$_count Porsiyon Rezerve Et' : 'Şimdi Rezerve Et'),
          ),
        ),
      ],
    );
  }
}
