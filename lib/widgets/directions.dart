import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models.dart';

Future<void> openDirections(BuildContext context, Meal meal) async {
  final destination = '${meal.lat},${meal.lng}';
  var url = 'https://www.google.com/maps/dir/?api=1&destination=$destination&travelmode=driving';
  try {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (enabled) {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      final allowed = permission == LocationPermission.always || permission == LocationPermission.whileInUse;
      if (allowed) {
        final position = await Geolocator.getCurrentPosition();
        url = 'https://www.google.com/maps/dir/?api=1'
            '&origin=${position.latitude},${position.longitude}'
            '&destination=$destination&travelmode=driving';
      }
    }
  } catch (_) {
    // Origin stays omitted so Google Maps uses the device's live location.
  }
  final launched = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  if (!launched && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Google Haritalar açılamadı.')),
    );
  }
}
