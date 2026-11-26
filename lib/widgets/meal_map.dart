import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

class MealMap extends StatefulWidget {
  const MealMap({super.key, required this.lat, required this.lng});

  final double lat;
  final double lng;

  @override
  State<MealMap> createState() => _MealMapState();
}

class _MealMapState extends State<MealMap> {
  final MapController _controller = MapController();
  bool _satellite = false;
  LatLng? _device;

  Future<Position?> _devicePosition() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return null;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      return null;
    }
    return Geolocator.getCurrentPosition();
  }

  Future<void> _focusDevice() async {
    final position = await _devicePosition();
    if (!mounted || position == null) return;
    final point = LatLng(position.latitude, position.longitude);
    setState(() => _device = point);
    _controller.move(point, 18);
  }

  @override
  Widget build(BuildContext context) {
    final door = LatLng(widget.lat, widget.lng);
    return SizedBox(
      height: 240,
      width: double.infinity,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          children: [
            FlutterMap(
              mapController: _controller,
              options: MapOptions(initialCenter: door, initialZoom: 15, minZoom: 3, maxZoom: 19),
              children: [
                TileLayer(
                  key: ValueKey(_satellite),
                  urlTemplate: _satellite
                      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.komsuas.komsuas',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: door,
                      width: 40,
                      height: 40,
                      child: const Icon(Icons.home_rounded, color: Color(0xFF059669), size: 34),
                    ),
                    if (_device != null)
                      Marker(
                        point: _device!,
                        width: 22,
                        height: 22,
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFF2563EB),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
            Positioned(
              top: 10,
              right: 10,
              child: _MapButton(
                icon: _satellite ? Icons.map_outlined : Icons.satellite_alt,
                tooltip: _satellite ? 'Harita' : 'Uydu',
                onTap: () => setState(() => _satellite = !_satellite),
              ),
            ),
            Positioned(
              right: 10,
              bottom: 10,
              child: _MapButton(
                icon: Icons.my_location,
                tooltip: 'Konumuma git',
                onTap: _focusDevice,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapButton extends StatelessWidget {
  const _MapButton({required this.icon, required this.tooltip, required this.onTap});

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 2,
        child: Tooltip(
          message: tooltip,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 40,
              height: 40,
              child: Icon(icon, size: 20, color: const Color(0xFF134E4A)),
            ),
          ),
        ),
    );
  }
}
