import 'dart:math';

double kmBetween(double lat1, double lng1, double lat2, double lng2) {
  const earth = 6371.0;
  final dLat = _rad(lat2 - lat1);
  final dLng = _rad(lng2 - lng1);
  final a = pow(sin(dLat / 2), 2) +
      cos(_rad(lat1)) * cos(_rad(lat2)) * pow(sin(dLng / 2), 2);
  return 2 * earth * asin(min(1, sqrt(a.toDouble())));
}

double _rad(double deg) => deg * pi / 180;
