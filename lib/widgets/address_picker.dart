import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../location_service.dart';
import '../models.dart';
import '../theme.dart';
import '../turkey_places.dart';

enum AddressPickerMode { browse, order, share }

Future<UserAddress?> showAddressPicker(
  BuildContext context, {
  required AddressPickerMode mode,
  UserAddress? initial,
}) {
  return showModalBottomSheet<UserAddress>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (context) {
      return AddressPickerSheet(mode: mode, initial: initial);
    },
  );
}

class AddressPickerSheet extends StatefulWidget {
  const AddressPickerSheet({super.key, required this.mode, this.initial});

  final AddressPickerMode mode;
  final UserAddress? initial;

  @override
  State<AddressPickerSheet> createState() => _AddressPickerSheetState();
}

class _AddressPickerSheetState extends State<AddressPickerSheet> {
  late String? _city;
  late String? _district;
  late String? _neighborhood;
  late final TextEditingController _street;
  late LatLng _pin;
  late final MapController _mapController = MapController();
  bool _busyGps = false;
  bool _showMap = false;

  @override
  void initState() {
    super.initState();
    final seed = widget.initial;
    _city = seed?.city.isNotEmpty == true ? seed!.city : null;
    _district = seed?.district.isNotEmpty == true ? seed!.district : null;
    _neighborhood = seed?.neighborhood.isNotEmpty == true ? seed!.neighborhood : null;
    _street = TextEditingController(text: seed?.street ?? '');
    _pin = LatLng(seed?.lat ?? 38.7205, seed?.lng ?? 35.4826);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _showMap = true);
    });
  }

  @override
  void dispose() {
    _street.dispose();
    _mapController.dispose();
    super.dispose();
  }

  List<String> get _districts => _city == null ? const [] : districtsOfCity(_city!);

  List<String> get _neighborhoods {
    if (_city == null || _district == null) return const [];
    return neighbourhoodsOfDistrict(_city!, _district!);
  }

  void _applyDistrictCoords() {
    if (_city == null || _district == null) return;
    final center = districtCenter(_city!, _district!);
    if (center == null) return;
    final point = LatLng(center.lat, center.lng);
    setState(() => _pin = point);
    _mapController.move(point, 14);
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
    final point = LatLng(position.latitude, position.longitude);
    setState(() => _pin = point);
    _mapController.move(point, 16);
  }

  Future<String?> _pickFromList({
    required String title,
    required List<String> items,
    String? selected,
  }) async {
    final query = TextEditingController();
    var filtered = List<String>.from(items);
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheet) {
            return SafeArea(
              child: SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.75,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 8, 8),
                      child: Row(
                        children: [
                          Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18))),
                          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: TextField(
                        controller: query,
                        autofocus: true,
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.search),
                          hintText: 'Ara…',
                        ),
                        onChanged: (value) {
                          final q = value.trim().toLowerCase();
                          setSheet(() {
                            filtered = items
                                .where((item) => q.isEmpty || item.toLowerCase().contains(q))
                                .toList();
                          });
                        },
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final item = filtered[index];
                          return ListTile(
                            title: Text(item),
                            trailing: item == selected ? const Icon(Icons.check, color: brand) : null,
                            onTap: () => Navigator.pop(context, item),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
    query.dispose();
    return result;
  }

  void _confirm() {
    if (_city == null || _district == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Önce il ve ilçe seç.')),
      );
      return;
    }
    if (_neighborhood == null || _neighborhood!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mahalle seçmelisin.')),
      );
      return;
    }
    Navigator.pop(
      context,
      UserAddress(
        city: _city!,
        district: _district!,
        neighborhood: _neighborhood!,
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
    final height = MediaQuery.sizeOf(context).height * 0.92;
    final catalog = TurkeyCatalog.instance;
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
                      label: const Text('Konumumu kullan (20 km çevrem)'),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '81 il · ${catalog.neighbourhoodCount} mahalle · sabit 20 km vitrin',
                      style: const TextStyle(color: inkSoft, fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    const Text('Başka şehir / adres', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                  ],
                  _SelectTile(
                    label: 'İl',
                    value: _city,
                    helper: '${catalog.cities.length} il',
                    onTap: () async {
                      final value = await _pickFromList(title: 'İl seç', items: catalog.cities, selected: _city);
                      if (value == null) return;
                      setState(() {
                        _city = value;
                        _district = null;
                        _neighborhood = null;
                      });
                    },
                  ),
                  const SizedBox(height: 10),
                  _SelectTile(
                    label: 'İlçe',
                    value: _district,
                    helper: _city == null ? 'Önce il seç' : '${_districts.length} ilçe',
                    enabled: _city != null,
                    onTap: () async {
                      final value = await _pickFromList(title: 'İlçe seç', items: _districts, selected: _district);
                      if (value == null) return;
                      setState(() {
                        _district = value;
                        _neighborhood = null;
                      });
                      _applyDistrictCoords();
                    },
                  ),
                  const SizedBox(height: 10),
                  _SelectTile(
                    label: 'Mahalle',
                    value: _neighborhood,
                    helper: _district == null ? 'Önce ilçe seç' : '${_neighborhoods.length} mahalle',
                    enabled: _district != null,
                    onTap: () async {
                      final value = await _pickFromList(
                        title: 'Mahalle seç',
                        items: _neighborhoods,
                        selected: _neighborhood,
                      );
                      if (value == null) return;
                      setState(() => _neighborhood = value);
                    },
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
                      child: _showMap
                          ? FlutterMap(
                              mapController: _mapController,
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
                            )
                          : const ColoredBox(
                              color: Color(0xFFE8EEF0),
                              child: Center(child: CircularProgressIndicator(color: brand)),
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

class _SelectTile extends StatelessWidget {
  const _SelectTile({
    required this.label,
    required this.value,
    required this.onTap,
    this.helper,
    this.enabled = true,
  });

  final String label;
  final String? value;
  final String? helper;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(14),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          helperText: helper,
          enabled: enabled,
          suffixIcon: const Icon(Icons.expand_more),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: Text(
          value ?? 'Seç',
          style: TextStyle(
            color: value == null ? inkSoft : ink,
            fontWeight: value == null ? FontWeight.w500 : FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
