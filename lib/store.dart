import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';
import 'seed.dart';

class AppStore extends ChangeNotifier {
  AppStore({
    required this.meals,
    required this.orders,
    required this.wallet,
    required this.displayName,
    required this.place,
  });

  static const _key = 'komsuas_local_v1';
  static const depositRate = 0.30;

  final List<Meal> meals;
  final List<LocalOrder> orders;
  double wallet;
  String displayName;
  Place place;

  static Future<AppStore> open() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) {
      final store = AppStore(
        meals: seedMeals(),
        orders: [],
        wallet: 500,
        displayName: 'Abdurrahman Kızıltoprak',
        place: defaultPlace,
      );
      await store.persist();
      return store;
    }
    final json = jsonDecode(raw) as Map<String, dynamic>;
    return AppStore(
      meals: (json['meals'] as List<dynamic>)
          .map((item) => Meal.fromJson(item as Map<String, dynamic>))
          .toList(),
      orders: (json['orders'] as List<dynamic>)
          .map((item) => LocalOrder.fromJson(item as Map<String, dynamic>))
          .toList(),
      wallet: (json['wallet'] as num).toDouble(),
      displayName: json['displayName'] as String? ?? 'Abdurrahman Kızıltoprak',
      place: Place(
        json['city'] as String? ?? defaultPlace.city,
        json['district'] as String? ?? defaultPlace.district,
        (json['lat'] as num?)?.toDouble() ?? defaultPlace.lat,
        (json['lng'] as num?)?.toDouble() ?? defaultPlace.lng,
      ),
    );
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
        'city': place.city,
        'district': place.district,
        'lat': place.lat,
        'lng': place.lng,
      }),
    );
  }

  void choosePlace(Place next) {
    place = next;
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
    required Place place,
  }) {
    final clean = title.trim();
    if (clean.length < 3) return 'Yemek adı en az 3 karakter olmalı.';
    if (price <= 0 || portions <= 0) return 'Fiyat ve porsiyon sıfırdan büyük olmalı.';
    meals.insert(
      0,
      Meal(
        id: 'u${DateTime.now().millisecondsSinceEpoch}',
        title: clean,
        chef: displayName,
        price: price,
        portions: portions,
        lat: place.lat,
        lng: place.lng,
        city: place.city,
        district: place.district,
        description: description.trim().isEmpty ? 'Evde, taze pişirildi.' : description.trim(),
        kind: kind,
        userAdded: true,
      ),
    );
    notifyListeners();
    persist();
    return null;
  }

  String? reserve(Meal meal, {int count = 1}) {
    if (meal.portions < count) return 'Yeterli porsiyon kalmadı.';
    final total = meal.price * count;
    final deposit = (total * depositRate * 100).round() / 100;
    if (wallet + 0.001 < deposit) {
      return 'Kapora için cüzdanda en az ${deposit.toStringAsFixed(0)} ₺ olmalı.';
    }
    meal.portions -= count;
    wallet -= deposit;
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
