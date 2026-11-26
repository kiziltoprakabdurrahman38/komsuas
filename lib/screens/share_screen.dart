import 'package:flutter/material.dart';

import '../models.dart';
import '../seed.dart';
import '../store.dart';
import '../theme.dart';

class ShareScreen extends StatefulWidget {
  const ShareScreen({super.key, required this.store});

  final AppStore store;

  @override
  State<ShareScreen> createState() => _ShareScreenState();
}

class _ShareScreenState extends State<ShareScreen> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _portions = TextEditingController(text: '4');
  String _kind = 'ana';
  late Place _place = widget.store.place;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _price.dispose();
    _portions.dispose();
    super.dispose();
  }

  void _submit() {
    final error = widget.store.shareMeal(
      title: _title.text,
      description: _description.text,
      price: double.tryParse(_price.text.replaceAll(',', '.')) ?? 0,
      portions: int.tryParse(_portions.text) ?? 0,
      kind: _kind,
      place: _place,
    );
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    _title.clear();
    _description.clear();
    _price.clear();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('İlan cihazına kaydedildi.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Yemek Paylaş', style: brandTitle(context)),
          const SizedBox(height: 6),
          Text('Aşçı: ${widget.store.displayName}', style: const TextStyle(color: inkSoft)),
          const SizedBox(height: 16),
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Yemek adı')),
          TextField(controller: _description, decoration: const InputDecoration(labelText: 'Açıklama'), maxLines: 3),
          TextField(controller: _price, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Porsiyon fiyatı (₺)')),
          TextField(controller: _portions, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Porsiyon')),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _kind,
            decoration: const InputDecoration(labelText: 'Tür'),
            items: const [
              DropdownMenuItem(value: 'ana', child: Text('Ana Yemek')),
              DropdownMenuItem(value: 'hamur', child: Text('Hamur İşi')),
              DropdownMenuItem(value: 'corba', child: Text('Çorba')),
              DropdownMenuItem(value: 'tatli', child: Text('Tatlı')),
            ],
            onChanged: (value) => setState(() => _kind = value ?? 'ana'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<Place>(
            initialValue: places.contains(_place) ? _place : places.first,
            decoration: const InputDecoration(labelText: 'İl, İlçe'),
            items: [
              for (final place in places) DropdownMenuItem(value: place, child: Text(place.label)),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _place = value);
            },
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submit,
            style: FilledButton.styleFrom(backgroundColor: brand, minimumSize: const Size.fromHeight(48)),
            child: const Text('İlanı Kaydet'),
          ),
        ],
      ),
    );
  }
}
