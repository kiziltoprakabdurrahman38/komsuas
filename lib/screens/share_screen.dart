import 'package:flutter/material.dart';

import '../categories.dart';
import '../models.dart';
import '../store.dart';
import '../theme.dart';
import '../widgets/address_picker.dart';

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
  UserAddress? _address;

  @override
  void initState() {
    super.initState();
    final browse = widget.store.browseAddress;
    if (!browse.fromGps && browse.city.isNotEmpty) {
      _address = browse;
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _price.dispose();
    _portions.dispose();
    super.dispose();
  }

  Future<void> _pickAddress() async {
    final selected = await showAddressPicker(
      context,
      mode: AddressPickerMode.share,
      initial: _address,
    );
    if (selected != null) setState(() => _address = selected);
  }

  void _submit() {
    final address = _address;
    if (address == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Önce teslimat kapısı adresini seç.')),
      );
      return;
    }
    final error = widget.store.shareMeal(
      title: _title.text,
      description: _description.text,
      price: double.tryParse(_price.text.replaceAll(',', '.')) ?? 0,
      portions: int.tryParse(_portions.text) ?? 0,
      kind: _kind,
      address: address,
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
    final categories = mealCategories.where((item) => item.id != 'all').toList();
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
            decoration: const InputDecoration(labelText: 'Kategori'),
            items: [
              for (final item in categories) DropdownMenuItem(value: item.id, child: Text(item.label)),
            ],
            onChanged: (value) => setState(() => _kind = value ?? 'ana'),
          ),
          const SizedBox(height: 14),
          const Text('Teslimat kapısı', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _pickAddress,
            icon: const Icon(Icons.home_work_outlined),
            label: Text(_address?.fullLabel ?? 'İl → İlçe → Mahalle seç / haritadan işaretle'),
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
