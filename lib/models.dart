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
  final String description;
  final String kind;
  final bool userAdded;

  String get kindLabel {
    switch (kind) {
      case 'hamur':
        return 'Hamur İşi';
      case 'corba':
        return 'Çorba';
      case 'tatli':
        return 'Tatlı';
      default:
        return 'Ana Yemek';
    }
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
      description: json['description'] as String,
      kind: json['kind'] as String,
      userAdded: json['userAdded'] as bool? ?? false,
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
    );
  }
}

class Place {
  const Place(this.city, this.district, this.lat, this.lng);

  final String city;
  final String district;
  final double lat;
  final double lng;

  String get label => '$district, $city';

  @override
  bool operator ==(Object other) =>
      other is Place && other.city == city && other.district == district;

  @override
  int get hashCode => Object.hash(city, district);
}
