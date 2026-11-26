class MealCategory {
  const MealCategory(this.id, this.label);

  final String id;
  final String label;
}

const mealCategories = <MealCategory>[
  MealCategory('all', 'Tümü'),
  MealCategory('ana', 'Ana Yemek'),
  MealCategory('corba', 'Çorba'),
  MealCategory('salata', 'Salata / Mezeler'),
  MealCategory('borek', 'Börek'),
  MealCategory('manti', 'Mantı / Hamur'),
  MealCategory('simit', 'Simit / Poğaça'),
  MealCategory('tatli', 'Tatlı'),
  MealCategory('kahvalti', 'Kahvaltılık'),
  MealCategory('icecek', 'İçecek'),
  MealCategory('diger', 'Diğer'),
];

String categoryLabel(String id) {
  for (final item in mealCategories) {
    if (item.id == id) return item.label;
  }
  return 'Ev Yemeği';
}
