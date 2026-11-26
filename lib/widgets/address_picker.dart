import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../location_service.dart';
import '../models.dart';
import '../store.dart';
import '../theme.dart';
import '../turkey_places.dart';

enum AddressPickerMode { browse, order, share }

Future<UserAddress?> showAddressPicker(
  BuildContext context, {
  required AddressPickerMode mode,
  UserAddress? initial,
  double? radiusKm,
  ValueChanged<double>? onRadiusChanged,
}) {
  return showModalBottomSheet<UserAddress>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (context) {
      return AddressPickerSheet(
        mode: mode,
        initial: initial,
        radiusKm: radiusKm,
        onRadiusChanged: onRadiusChanged,
      );
    },
  );
}

class AddressPickerSheet extends StatefulWidget {
  const AddressPickerSheet({
    super.key,
    required this.mode,
    this.initial,
    this.radiusKm,
    this.onRadiusChanged,
  });

  final AddressPickerMode mode;
  final UserAddress? initial;
  final double? radiusKm;
  final ValueChanged<double>? onRadiusChanged;

  @override
  State<AddressPickerSheet> createState() => _AddressPickerSheetState();
}

class _AddressPickerSheetState extends State<AddressPickerSheet> {
  late String? _city;
  late String? _district;
  late String? _neighborhood;
  late final TextEditingController _street;
  late LatLng _pin;
  late double _radius;
  bool _busyGps = false;

  @override
  void initState() {
    super.initState();
    final seed = widget.initial;
    _city = seed?.city.isNotEmpty == true ? seed!.city : null;
    _district = seed?.district.isNotEmpty == true ? seed!.district : null;
    _neighborhood = seed?.neighborhood.isNotEmpty == true ? seed!.neighborhood : null;
    _street = TextEditingController(text: seed?.street ?? '');
    _pin = LatLng(seed?.lat ?? 38.7205, seed?.lng ?? 35.4826);
    _radius = widget.radiusKm ?? 20;
  }

  @override
  void dispose() {
    _street.dispose();
    super.dispose();
  }

  List<DistrictNode> get _districts {
    final city = cityByName(_city ?? '');
    return city?.districts ?? const [];
  }

  List<String> get _neighborhoods {
    final district = districtByName(_city ?? '', _district ?? '');
    return district?.neighborhoods ?? const [];
  }

  void _applyDistrictCoords() {
    final district = districtByName(_city ?? '', _district ?? '');
    if (district == null) return;
    setState(() => _pin = LatLng(district.lat, district.lng));
  }

  Future<void> _useGps() async {
    setState(() => _busyGps = true);
    final position = await LocationService.currentPosition();
    setState(() => _busyGps = false);
    if (!mounted) return;
    if (position == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Konum izni verilmedi veya GPS kapalı.')),
      );
      return;
    }
    if (widget.mode == AddressPickerMode.browse) {
      Navigator.pop(
        context,
        UserAddress(
          city: '',
          district: '',
          neighborhood: '',
          lat: position.latitude,
          lng: position.longitude,
          fromGps: true,
          note: 'Cihaz konumu',
        ),
      );
      return;
    }
    setState(() => _pin = LatLng(position.latitude, position.longitude));
  }

  void _confirm() {
    if (_city == null || _district == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Önce il ve ilçe seç.')),
      );
      return;
    }
    Navigator.pop(
      context,
      UserAddress(
        city: _city!,
        district: _district!,
        neighborhood: _neighborhood ?? '',
        street: _street.text.trim(),
        lat: _pin.latitude,
        lng: _pin.longitude,
        fromGps: false,
      ),
    );
  }

  String get _title {
    switch (widget.mode) {
      case AddressPickerMode.browse:
        return 'Nereleri göreyim?';
      case AddressPickerMode.order:
        return 'Sipariş adresin';
      case AddressPickerMode.share:
        return 'Teslimat kapısı adresi';
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.9;
    return SizedBox(
      height: height,
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(width: 42, height: 4, decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(99))),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 12, 8),
              child: Row(
                children: [
                  Expanded(child: Text(_title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
                  IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                children: [
                  if (widget.mode == AddressPickerMode.browse) ...[
                    FilledButton.icon(
                      onPressed: _busyGps ? null : _useGps,
                      style: FilledButton.styleFrom(backgroundColor: brand, minimumSize: const Size.fromHeight(48)),
                      icon: _busyGps
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.my_location),
                      label: const Text('Konumumu kullan (çevremdekiler)'),
                    ),
                    const SizedBox(height: 12),
                    const Text('Mesafe', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        for (final km in AppStore.radiusChoices)
                          ChoiceChip(
                            label: Text('${km.toStringAsFixed(0)} km'),
                            selected: _radius == km,
                            onSelected: (_) {
                              setState(() => _radius = km);
                              widget.onRadiusChanged?.call(km);
                            },
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('Başka şehir / adres', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                  ],
                  DropdownButtonFormField<String>(
                    initialValue: _city,
                    decoration: const InputDecoration(labelText: 'İl'),
                    items: [
                      for (final name in cityNames()) DropdownMenuItem(value: name, child: Text(name)),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _city = value;
                        _district = null;
                        _neighborhood = null;
                      });
                    },
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    initialValue: _district,
                    decoration: const InputDecoration(labelText: 'İlçe'),
                    items: [
                      for (final item in _districts) DropdownMenuItem(value: item.name, child: Text(item.name)),
                    ],
                    onChanged: _city == null
                        ? null
                        : (value) {
                            setState(() {
                              _district = value;
                              _neighborhood = null;
                            });
                            _applyDistrictCoords();
                          },
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    initialValue: _neighborhood,
                    decoration: const InputDecoration(labelText: 'Mahalle'),
                    items: [
                      for (final name in _neighborhoods) DropdownMenuItem(value: name, child: Text(name)),
                    ],
                    onChanged: _district == null ? null : (value) => setState(() => _neighborhood = value),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _street,
                    decoration: const InputDecoration(
                      labelText: 'Sokak / kapı no (isteğe bağlı)',
                      hintText: 'Örn: Gül Sokak No:12',
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text('Haritadan nokta seç', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 220,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: FlutterMap(
                        options: MapOptions(
                          initialCenter: _pin,
                          initialZoom: 14,
                          onTap: (tap, point) => setState(() => _pin = point),
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'com.komsuas.komsuas',
                          ),
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: _pin,
                                width: 40,
                                height: 40,
                                child: const Icon(Icons.location_pin, color: brand, size: 40),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Lat ${_pin.latitude.toStringAsFixed(5)}, Lng ${_pin.longitude.toStringAsFixed(5)}',
                    style: const TextStyle(color: inkSoft, fontSize: 12),
                  ),
                  if (widget.mode != AddressPickerMode.browse) ...[
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: _busyGps ? null : _useGps,
                      icon: const Icon(Icons.gps_fixed),
                      label: const Text('Pin’i GPS konumuma taşı'),
                    ),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: FilledButton(
                onPressed: _confirm,
                style: FilledButton.styleFrom(backgroundColor: brand, minimumSize: const Size.fromHeight(50)),
                child: Text(widget.mode == AddressPickerMode.browse ? 'Bu adrese göre göster' : 'Adresi kaydet'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
