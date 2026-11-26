import 'package:flutter/material.dart';

enum ScreenMode { phonePortrait, phoneLandscape, tabletPortrait, tabletLandscape }

ScreenMode classifyScreen(Size size, Orientation orientation) {
  if (size.width >= 840) return ScreenMode.tabletLandscape;
  if (orientation == Orientation.landscape && size.width < 840) {
    return ScreenMode.phoneLandscape;
  }
  if (size.width >= 600) return ScreenMode.tabletPortrait;
  return ScreenMode.phonePortrait;
}

int gridColumns(ScreenMode mode, double width) {
  switch (mode) {
    case ScreenMode.phonePortrait:
      return 1;
    case ScreenMode.phoneLandscape:
    case ScreenMode.tabletPortrait:
      return 2;
    case ScreenMode.tabletLandscape:
      return width >= 1200 ? 4 : 3;
  }
}

bool usesBottomBar(ScreenMode mode) => mode == ScreenMode.phonePortrait;

bool railExtended(ScreenMode mode) => mode == ScreenMode.tabletLandscape;
