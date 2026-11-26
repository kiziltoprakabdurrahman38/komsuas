import 'package:flutter/material.dart';

import '../store.dart';
import '../theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.store});

  final AppStore store;

  @override
  Widget build(BuildContext context) {
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
                  Text(store.displayName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text('YemekCüzdan', style: const TextStyle(color: inkSoft)),
                  Text('${store.wallet.toStringAsFixed(0)} ₺', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: brandDeep)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
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
  }
}
