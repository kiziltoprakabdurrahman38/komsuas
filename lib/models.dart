import 'categories.dart';

class Meal {
  Meal({
    required this.id,
    required this.title,
    required this.chef,
    required this.price,
    required this.portions,
    required this.lat,
    required this.lng,
    required this.city,
    required this.district,
    required this.description,
    required this.kind,
    this.neighborhood = '',
    this.userAdded = false,
  });

  final String id;
  final String title;
  final String chef;
  final double price;
  int portions;
  final double lat;
  final double lng;
  final String city;
  final String district;
  final String neighborhood;
  final String description;
  final String kind;
  final bool userAdded;

  String get kindLabel => categoryLabel(kind);

  String get placeLabel {
    final parts = [if (neighborhood.isNotEmpty) neighborhood, district, city];
    return parts.join(', ');
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'chef': chef,
        'price': price,
        'portions': portions,
        'lat': lat,
        'lng': lng,
        'city': city,
        'district': district,
        'neighborhood': neighborhood,
        'description': description,
        'kind': kind,
        'userAdded': userAdded,
      };

  factory Meal.fromJson(Map<String, dynamic> json) {
    return Meal(
      id: json['id'] as String,
      title: json['title'] as String,
      chef: json['chef'] as String,
      price: (json['price'] as num).toDouble(),
      portions: (json['portions'] as num).toInt(),
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      city: json['city'] as String,
      district: json['district'] as String,
      neighborhood: json['neighborhood'] as String? ?? '',
      description: json['description'] as String,
      kind: _migrateKind(json['kind'] as String? ?? 'ana'),
      userAdded: json['userAdded'] as bool? ?? false,
    );
  }

  static String _migrateKind(String kind) {
    if (kind == 'hamur') return 'manti';
    return kind;
  }
}

class UserAddress {
  const UserAddress({
    required this.city,
    required this.district,
    required this.neighborhood,
    required this.lat,
    required this.lng,
    this.street = '',
    this.note = '',
    this.fromGps = false,
  });

  final String city;
  final String district;
  final String neighborhood;
  final String street;
  final String note;
  final double lat;
  final double lng;
  final bool fromGps;

  String get shortLabel {
    if (fromGps && city.isEmpty) return 'Yakınım (GPS)';
    if (neighborhood.isNotEmpty) return '$neighborhood, $district';
    if (district.isNotEmpty) return '$district, $city';
    return city.isEmpty ? 'Adres seçilmedi' : city;
  }

  String get fullLabel {
    final parts = <String>[
      if (street.trim().isNotEmpty) street.trim(),
      if (neighborhood.isNotEmpty) neighborhood,
      if (district.isNotEmpty) district,
      if (city.isNotEmpty) city,
    ];
    if (parts.isEmpty) return fromGps ? 'Yakınım (GPS)' : 'Adres seçilmedi';
    return parts.join(', ');
  }

  UserAddress copyWith({
    String? city,
    String? district,
    String? neighborhood,
    String? street,
    String? note,
    double? lat,
    double? lng,
    bool? fromGps,
  }) {
    return UserAddress(
      city: city ?? this.city,
      district: district ?? this.district,
      neighborhood: neighborhood ?? this.neighborhood,
      street: street ?? this.street,
      note: note ?? this.note,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      fromGps: fromGps ?? this.fromGps,
    );
  }

  Map<String, dynamic> toJson() => {
        'city': city,
        'district': district,
        'neighborhood': neighborhood,
        'street': street,
        'note': note,
        'lat': lat,
        'lng': lng,
        'fromGps': fromGps,
      };

  factory UserAddress.fromJson(Map<String, dynamic> json) {
    return UserAddress(
      city: json['city'] as String? ?? '',
      district: json['district'] as String? ?? '',
      neighborhood: json['neighborhood'] as String? ?? '',
      street: json['street'] as String? ?? '',
      note: json['note'] as String? ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 38.7205,
      lng: (json['lng'] as num?)?.toDouble() ?? 35.4826,
      fromGps: json['fromGps'] as bool? ?? false,
    );
  }
}

class LocalOrder {
  LocalOrder({
    required this.id,
    required this.mealId,
    required this.mealTitle,
    required this.chef,
    required this.portions,
    required this.total,
    required this.deposit,
    required this.cashDue,
    required this.code,
    required this.status,
    required this.createdAt,
    this.userAddressLabel = '',
  });

  final String id;
  final String mealId;
  final String mealTitle;
  final String chef;
  final int portions;
  final double total;
  final double deposit;
  final double cashDue;
  final String code;
  String status;
  final String createdAt;
  final String userAddressLabel;

  bool get delivered => status == 'delivered';

  Map<String, dynamic> toJson() => {
        'id': id,
        'mealId': mealId,
        'mealTitle': mealTitle,
        'chef': chef,
        'portions': portions,
        'total': total,
        'deposit': deposit,
        'cashDue': cashDue,
        'code': code,
        'status': status,
        'createdAt': createdAt,
        'userAddressLabel': userAddressLabel,
      };

  factory LocalOrder.fromJson(Map<String, dynamic> json) {
    return LocalOrder(
      id: json['id'] as String,
      mealId: json['mealId'] as String,
      mealTitle: json['mealTitle'] as String,
      chef: json['chef'] as String,
      portions: (json['portions'] as num).toInt(),
      total: (json['total'] as num).toDouble(),
      deposit: (json['deposit'] as num).toDouble(),
      cashDue: (json['cashDue'] as num).toDouble(),
      code: json['code'] as String,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      userAddressLabel: json['userAddressLabel'] as String? ?? '',
    );
  }
}
