import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:komsuas/categories.dart';
import 'package:komsuas/geo.dart';
import 'package:komsuas/layout.dart';
import 'package:komsuas/seed.dart';
import 'package:komsuas/store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('seed has titled-free meals and richer categories', () {
    final meals = seedMeals();
    expect(meals.length, greaterThanOrEqualTo(20));
    expect(mealCategories.length, greaterThan(5));
    expect(AppStore.radiusKm, 20);
    for (final meal in meals) {
      expect(meal.chef.contains('Usta'), isFalse);
      expect(meal.chef.contains('Hanım'), isFalse);
      expect(meal.chef.contains('Teyze'), isFalse);
      expect(meal.neighborhood.isNotEmpty, isTrue);
    }
  });

  test('screen modes follow width and orientation', () {
    expect(classifyScreen(const Size(390, 844), Orientation.portrait), ScreenMode.phonePortrait);
    expect(classifyScreen(const Size(800, 390), Orientation.landscape), ScreenMode.phoneLandscape);
    expect(classifyScreen(const Size(700, 1000), Orientation.portrait), ScreenMode.tabletPortrait);
    expect(classifyScreen(const Size(1280, 800), Orientation.landscape), ScreenMode.tabletLandscape);
  });

  test('kayseri meals sit near melikgazi default', () {
    final manti = seedMeals().firstWhere((meal) => meal.chef == 'Sema Yıldırım');
    expect(kmBetween(defaultBrowse.lat, defaultBrowse.lng, manti.lat, manti.lng), lessThan(5));
  });
}
