import 'package:flutter/material.dart';

import '../store.dart';
import '../theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.store});

  final AppStore store;

  Future<void> _editName(BuildContext context) async {
    final field = TextEditingController(text: store.displayName);
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Ad Soyad'),
          content: TextField(
            controller: field,
            autofocus: true,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(hintText: 'Örn: Sema Yıldırım'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Vazgeç')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Kaydet')),
          ],
        );
      },
    );
    if (ok == true) {
      store.setDisplayName(field.text);
    }
    field.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        return SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text('Profilim', style: brandTitle(context)),
              const SizedBox(height: 16),
              Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: brand.withValues(alpha: 0.12),
                            child: Text(
                              store.displayName.trim().isNotEmpty
                                  ? store.displayName.trim().substring(0, 1).toUpperCase()
                                  : '?',
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: brandDeep),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(store.displayName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                                const Text('Yemek paylaşırken bu ad görünür', style: TextStyle(color: inkSoft, fontSize: 12)),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () => _editName(context),
                            icon: const Icon(Icons.edit_outlined),
                            tooltip: 'Adı düzenle',
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          _StatChip(label: 'Açık sipariş', value: '${store.openOrderCount}'),
                          const SizedBox(width: 8),
                          _StatChip(label: 'İlanım', value: '${store.activeListingCount}'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('YemekCüzdan', style: TextStyle(color: inkSoft)),
                      Text(
                        '${store.wallet.toStringAsFixed(0)} ₺',
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: brandDeep),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Rezervasyonda %30 kapora buradan düşülür.',
                        style: TextStyle(color: inkSoft, fontSize: 12),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final amount in const [100.0, 250.0, 500.0])
                            FilledButton(
                              onPressed: () {
                                store.topUp(amount);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('${amount.toStringAsFixed(0)} ₺ yüklendi.')),
                                );
                              },
                              style: FilledButton.styleFrom(backgroundColor: brand),
                              child: Text('+${amount.toStringAsFixed(0)} ₺'),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Bakiye, ilanlar ve siparişler yalnızca bu cihazda saklanır. Uygulama kapanıp açılsa da durur.',
                style: TextStyle(color: inkSoft, height: 1.4),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: sage,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            Text(label, style: const TextStyle(color: inkSoft, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
