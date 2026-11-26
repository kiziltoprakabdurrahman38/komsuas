import 'package:flutter_test/flutter_test.dart';
import 'package:komsuas/geo.dart';
import 'package:komsuas/layout.dart';
import 'package:flutter/material.dart';
import 'package:komsuas/seed.dart';

void main() {
  test('seed has twenty titled-free meals', () {
    final meals = seedMeals();
    expect(meals.length, 20);
    expect(meals.map((meal) => meal.chef).toSet().length, greaterThan(15));
    for (final meal in meals) {
      expect(meal.chef.contains('Usta'), isFalse);
      expect(meal.chef.contains('Hanım'), isFalse);
      expect(meal.chef.contains('Teyze'), isFalse);
    }
  });

  test('screen modes follow width and orientation', () {
    expect(classifyScreen(const Size(390, 844), Orientation.portrait), ScreenMode.phonePortrait);
    expect(classifyScreen(const Size(800, 390), Orientation.landscape), ScreenMode.phoneLandscape);
    expect(classifyScreen(const Size(700, 1000), Orientation.portrait), ScreenMode.tabletPortrait);
    expect(classifyScreen(const Size(1280, 800), Orientation.landscape), ScreenMode.tabletLandscape);
    expect(gridColumns(ScreenMode.tabletLandscape, 1280), 4);
    expect(gridColumns(ScreenMode.tabletLandscape, 900), 3);
  });

  test('kayseri meals sit near melikgazi', () {
    final manti = seedMeals().firstWhere((meal) => meal.chef == 'Sema Yıldırım');
    expect(kmBetween(defaultPlace.lat, defaultPlace.lng, manti.lat, manti.lng), lessThan(5));
  });
}
