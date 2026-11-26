import 'dart:convert';

import 'package:flutter/services.dart';

class DistrictCoords {
  const DistrictCoords(this.lat, this.lng);

  final double lat;
  final double lng;
}

class TurkeyCatalog {
  TurkeyCatalog._({
    required this.cities,
    required this.districtsByCity,
    required this.neighbourhoodsByCityDistrict,
    required this.centersByCityDistrict,
    required this.codeByCityName,
  });

  final List<String> cities;
  final Map<String, List<String>> districtsByCity;
  final Map<String, Map<String, List<String>>> neighbourhoodsByCityDistrict;
  final Map<String, Map<String, DistrictCoords>> centersByCityDistrict;
  final Map<String, String> codeByCityName;

  static TurkeyCatalog? _instance;

  static TurkeyCatalog get instance {
    final current = _instance;
    if (current == null) {
      throw StateError('TurkeyCatalog.load() henüz çağrılmadı.');
    }
    return current;
  }

  static Future<TurkeyCatalog> load() async {
    if (_instance != null) return _instance!;

    final cityListRaw = await rootBundle.loadString('assets/turkey/cityList.json');
    final districtsRaw = await rootBundle.loadString('assets/turkey/districtsByCityCode.json');
    final neighbourhoodsRaw =
        await rootBundle.loadString('assets/turkey/neighbourhoodsByDistrictAndCityCode.json');
    final centersRaw = await rootBundle.loadString('assets/turkey/districtCenters.json');

    final cityList = (jsonDecode(cityListRaw) as List<dynamic>)
        .map((item) => item as Map<String, dynamic>)
        .toList();
    final districtsByCode = (jsonDecode(districtsRaw) as Map<String, dynamic>).map(
      (code, value) => MapEntry(
        code,
        (value as List<dynamic>).map((item) => item as String).toList()..sort(),
      ),
    );
    final neighbourhoodsByCode = (jsonDecode(neighbourhoodsRaw) as Map<String, dynamic>).map(
      (code, districts) => MapEntry(
        code,
        (districts as Map<String, dynamic>).map(
          (district, rows) => MapEntry(
            district,
            (rows as List<dynamic>)
                .map((item) => _cleanNeighborhood(item as String))
                .where((item) => item.isNotEmpty)
                .toSet()
                .toList()
              ..sort(),
          ),
        ),
      ),
    );
    final centersByCode = (jsonDecode(centersRaw) as Map<String, dynamic>).map(
      (code, districts) => MapEntry(
        code,
        (districts as Map<String, dynamic>).map(
          (district, pair) {
            final coords = pair as List<dynamic>;
            return MapEntry(
              district,
              DistrictCoords((coords[0] as num).toDouble(), (coords[1] as num).toDouble()),
            );
          },
        ),
      ),
    );

    final codeByCityName = <String, String>{};
    final cities = <String>[];
    for (final row in cityList) {
      final code = row['code'] as String;
      final name = row['name'] as String;
      codeByCityName[name] = code;
      cities.add(name);
    }
    cities.sort();

    final districtsByCity = <String, List<String>>{};
    final neighbourhoodsByCityDistrict = <String, Map<String, List<String>>>{};
    final centersByCityDistrict = <String, Map<String, DistrictCoords>>{};

    for (final entry in codeByCityName.entries) {
      final city = entry.key;
      final code = entry.value;
      districtsByCity[city] = districtsByCode[code] ?? const [];
      neighbourhoodsByCityDistrict[city] = neighbourhoodsByCode[code] ?? const {};
      centersByCityDistrict[city] = centersByCode[code] ?? const {};
    }

    _instance = TurkeyCatalog._(
      cities: cities,
      districtsByCity: districtsByCity,
      neighbourhoodsByCityDistrict: neighbourhoodsByCityDistrict,
      centersByCityDistrict: centersByCityDistrict,
      codeByCityName: codeByCityName,
    );
    return _instance!;
  }

  static String _cleanNeighborhood(String raw) {
    return raw
        .replaceAll(RegExp(r'\s+Mah\.?$', caseSensitive: false), '')
        .replaceAll(RegExp(r'\s+Mahallesi$', caseSensitive: false), '')
        .trim();
  }

  List<String> districtsOf(String city) => districtsByCity[city] ?? const [];

  List<String> neighbourhoodsOf(String city, String district) {
    return neighbourhoodsByCityDistrict[city]?[district] ?? const [];
  }

  DistrictCoords? centerOf(String city, String district) {
    return centersByCityDistrict[city]?[district];
  }

  int get neighbourhoodCount {
    var total = 0;
    for (final districts in neighbourhoodsByCityDistrict.values) {
      for (final rows in districts.values) {
        total += rows.length;
      }
    }
    return total;
  }
}

List<String> cityNames() => TurkeyCatalog.instance.cities;

List<String> districtsOfCity(String city) => TurkeyCatalog.instance.districtsOf(city);

List<String> neighbourhoodsOfDistrict(String city, String district) {
  return TurkeyCatalog.instance.neighbourhoodsOf(city, district);
}

DistrictCoords? districtCenter(String city, String district) {
  return TurkeyCatalog.instance.centerOf(city, district);
}
