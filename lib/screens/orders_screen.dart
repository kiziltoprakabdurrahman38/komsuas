import 'package:flutter/material.dart';

import '../models.dart';
import '../store.dart';
import '../theme.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key, required this.store});

  final AppStore store;

  Future<void> _verify(BuildContext context, LocalOrder order) async {
    final field = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Teslimat kodu'),
          content: TextField(
            controller: field,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(labelText: '6 haneli kod'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Vazgeç')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Doğrula')),
          ],
        );
      },
    );
    if (ok != true || !context.mounted) {
      field.dispose();
      return;
    }
    final matched = store.confirmDelivery(order, field.text);
    field.dispose();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(matched ? 'Teslimat doğrulandı.' : 'Kod eşleşmedi.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final orders = store.orders;
    return SafeArea(
      child: orders.isEmpty
          ? const Center(child: Text('Henüz sipariş yok.', style: TextStyle(color: inkSoft)))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final order = orders[index];
                return Material(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(order.mealTitle, style: const TextStyle(fontWeight: FontWeight.w800)),
                        Text('${order.chef} · ${order.portions} porsiyon', style: const TextStyle(color: inkSoft)),
                        const SizedBox(height: 6),
                        Text('Kapora ${order.deposit.toStringAsFixed(0)} ₺ · Kapıda ${order.cashDue.toStringAsFixed(0)} ₺'),
                        Text('Teslimat kodu: ${order.code}', style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
                        const SizedBox(height: 8),
                        if (order.delivered)
                          const Text('Teslim edildi', style: TextStyle(color: brand, fontWeight: FontWeight.w700))
                        else
                          OutlinedButton(
                            onPressed: () => _verify(context, order),
                            child: const Text('Kodu doğrula'),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
