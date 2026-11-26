import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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

  Future<void> _copyCode(BuildContext context, String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Teslimat kodu kopyalandı.')),
    );
  }

  String _when(String iso) {
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(dt.day)}.${two(dt.month)} ${two(dt.hour)}:${two(dt.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final orders = store.orders;
        return SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Siparişlerim', style: brandTitle(context)),
                    const SizedBox(height: 4),
                    Text(
                      orders.isEmpty
                          ? 'Henüz rezervasyon yok'
                          : '${store.openOrderCount} açık · ${orders.length} toplam',
                      style: const TextStyle(color: inkSoft),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: orders.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.receipt_long_outlined, size: 48, color: brand.withValues(alpha: 0.5)),
                              const SizedBox(height: 12),
                              const Text('Yakınındaki bir yemeği rezerve et,', textAlign: TextAlign.center),
                              const Text('teslimat kodun burada görünsün.', textAlign: TextAlign.center, style: TextStyle(color: inkSoft)),
                            ],
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
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
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(order.mealTitle, style: const TextStyle(fontWeight: FontWeight.w800)),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: order.delivered ? const Color(0xFFD1FAE5) : const Color(0xFFFEF3C7),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          order.delivered ? 'Teslim edildi' : 'Bekliyor',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: order.delivered ? brandDeep : const Color(0xFF92400E),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text('${order.chef} · ${order.portions} porsiyon', style: const TextStyle(color: inkSoft)),
                                  if (order.userAddressLabel.isNotEmpty)
                                    Text(order.userAddressLabel, style: const TextStyle(color: inkSoft, fontSize: 12)),
                                  Text(_when(order.createdAt), style: const TextStyle(color: inkSoft, fontSize: 12)),
                                  const SizedBox(height: 8),
                                  Text('Kapora ${order.deposit.toStringAsFixed(0)} ₺ · Kapıda ${order.cashDue.toStringAsFixed(0)} ₺'),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          'Kod: ${order.code}',
                                          style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.4, fontSize: 16),
                                        ),
                                      ),
                                      IconButton(
                                        tooltip: 'Kopyala',
                                        onPressed: () => _copyCode(context, order.code),
                                        icon: const Icon(Icons.copy_rounded, size: 20),
                                      ),
                                    ],
                                  ),
                                  if (!order.delivered)
                                    SizedBox(
                                      width: double.infinity,
                                      child: OutlinedButton(
                                        onPressed: () => _verify(context, order),
                                        child: const Text('Kapıda kodu doğrula'),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
