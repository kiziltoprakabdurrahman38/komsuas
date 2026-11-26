import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'location_service.dart';
import 'models.dart';
import 'seed.dart';

class AppStore extends ChangeNotifier {
  AppStore({
    required this.meals,
    required this.orders,
    required this.wallet,
    required this.displayName,
    required this.browseAddress,
    required this.orderAddress,
    required this.useGpsBrowse,
  });

  static const _key = 'komsuas_local_v3';
  static const depositRate = 0.30;
  static const radiusKm = 20.0;

  final List<Meal> meals;
  final List<LocalOrder> orders;
  double wallet;
  String displayName;
  UserAddress browseAddress;
  UserAddress? orderAddress;
  bool useGpsBrowse;

  double get centerLat => browseAddress.lat;
  double get centerLng => browseAddress.lng;

  static Future<AppStore> open() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key) ?? prefs.getString('komsuas_local_v2');
    late final AppStore store;
    if (raw == null) {
      store = AppStore(
        meals: seedMeals(),
        orders: [],
        wallet: 500,
        displayName: 'Abdurrahman Kızıltoprak',
        browseAddress: defaultBrowse,
        orderAddress: null,
        useGpsBrowse: true,
      );
    } else {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      store = AppStore(
        meals: (json['meals'] as List<dynamic>)
            .map((item) => Meal.fromJson(item as Map<String, dynamic>))
            .toList(),
        orders: (json['orders'] as List<dynamic>)
            .map((item) => LocalOrder.fromJson(item as Map<String, dynamic>))
            .toList(),
        wallet: (json['wallet'] as num).toDouble(),
        displayName: json['displayName'] as String? ?? 'Abdurrahman Kızıltoprak',
        browseAddress: json['browseAddress'] != null
            ? UserAddress.fromJson(json['browseAddress'] as Map<String, dynamic>)
            : defaultBrowse,
        orderAddress: json['orderAddress'] != null
            ? UserAddress.fromJson(json['orderAddress'] as Map<String, dynamic>)
            : null,
        useGpsBrowse: json['useGpsBrowse'] as bool? ?? true,
      );
    }
    await store.refreshGpsIfNeeded();
    await store.persist();
    return store;
  }

  Future<void> persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode({
        'meals': meals.map((meal) => meal.toJson()).toList(),
        'orders': orders.map((order) => order.toJson()).toList(),
        'wallet': wallet,
        'displayName': displayName,
        'browseAddress': browseAddress.toJson(),
        'orderAddress': orderAddress?.toJson(),
        'useGpsBrowse': useGpsBrowse,
      }),
    );
  }

  Future<bool> refreshGpsIfNeeded() async {
    if (!useGpsBrowse) return false;
    final position = await LocationService.currentPosition();
    if (position == null) return false;
    browseAddress = UserAddress(
      city: browseAddress.city,
      district: browseAddress.district,
      neighborhood: browseAddress.neighborhood,
      street: browseAddress.street,
      lat: position.latitude,
      lng: position.longitude,
      fromGps: true,
      note: 'Cihaz konumu',
    );
    notifyListeners();
    await persist();
    return true;
  }

  Future<bool> useDeviceLocation() async {
    final position = await LocationService.currentPosition();
    if (position == null) return false;
    useGpsBrowse = true;
    browseAddress = UserAddress(
      city: '',
      district: '',
      neighborhood: '',
      lat: position.latitude,
      lng: position.longitude,
      fromGps: true,
      note: 'Cihaz konumu',
    );
    notifyListeners();
    await persist();
    return true;
  }

  void setBrowseAddress(UserAddress address) {
    useGpsBrowse = address.fromGps;
    browseAddress = address;
    notifyListeners();
    persist();
  }

  void setOrderAddress(UserAddress address) {
    orderAddress = address;
    notifyListeners();
    persist();
  }

  void topUp(double amount) {
    wallet += amount;
    notifyListeners();
    persist();
  }

  String? shareMeal({
    required String title,
    required String description,
    required double price,
    required int portions,
    required String kind,
    required UserAddress address,
  }) {
    final clean = title.trim();
    if (clean.length < 3) return 'Yemek adı en az 3 karakter olmalı.';
    if (price <= 0 || portions <= 0) return 'Fiyat ve porsiyon sıfırdan büyük olmalı.';
    if (address.city.isEmpty || address.district.isEmpty) {
      return 'İl ve ilçe seçmelisin.';
    }
    meals.insert(
      0,
      Meal(
        id: 'u${DateTime.now().millisecondsSinceEpoch}',
        title: clean,
        chef: displayName,
        price: price,
        portions: portions,
        lat: address.lat,
        lng: address.lng,
        city: address.city,
        district: address.district,
        neighborhood: address.neighborhood,
        description: description.trim().isEmpty ? 'Evde, taze pişirildi.' : description.trim(),
        kind: kind,
        userAdded: true,
      ),
    );
    notifyListeners();
    persist();
    return null;
  }

  String? reserve(Meal meal, {required UserAddress userAddress, int count = 1}) {
    if (meal.portions < count) return 'Yeterli porsiyon kalmadı.';
    if (userAddress.city.isEmpty || userAddress.district.isEmpty) {
      return 'Sipariş için adresini seçmelisin.';
    }
    final total = meal.price * count;
    final deposit = (total * depositRate * 100).round() / 100;
    if (wallet + 0.001 < deposit) {
      return 'Kapora için cüzdanda en az ${deposit.toStringAsFixed(0)} ₺ olmalı.';
    }
    meal.portions -= count;
    wallet -= deposit;
    orderAddress = userAddress;
    final code = (Random.secure().nextInt(900000) + 100000).toString();
    orders.insert(
      0,
      LocalOrder(
        id: 'o${DateTime.now().millisecondsSinceEpoch}',
        mealId: meal.id,
        mealTitle: meal.title,
        chef: meal.chef,
        portions: count,
        total: total,
        deposit: deposit,
        cashDue: total - deposit,
        code: code,
        status: 'reserved',
        createdAt: DateTime.now().toIso8601String(),
        userAddressLabel: userAddress.fullLabel,
      ),
    );
    notifyListeners();
    persist();
    return null;
  }

  bool confirmDelivery(LocalOrder order, String entered) {
    if (order.delivered) return true;
    if (entered.trim() != order.code) return false;
    order.status = 'delivered';
    notifyListeners();
    persist();
    return true;
  }
}
