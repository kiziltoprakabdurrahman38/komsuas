import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const sage = Color(0xFFF4F7F5);
const ink = Color(0xFF14201C);
const inkSoft = Color(0xFF5C6B64);
const brand = Color(0xFF0F766E);
const brandDeep = Color(0xFF134E4A);

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: brand,
      primary: brand,
      surface: Colors.white,
    ),
    scaffoldBackgroundColor: sage,
  );
  return base.copyWith(
    textTheme: GoogleFonts.outfitTextTheme(base.textTheme).apply(
      bodyColor: ink,
      displayColor: ink,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: sage,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor: ink,
    ),
  );
}

TextStyle brandTitle(BuildContext context) {
  return GoogleFonts.fraunces(
    fontSize: 28,
    fontWeight: FontWeight.w500,
    color: brandDeep,
    height: 1,
  );
}
