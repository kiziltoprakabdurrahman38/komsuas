class DistrictNode {
  const DistrictNode(this.name, this.lat, this.lng, this.neighborhoods);

  final String name;
  final double lat;
  final double lng;
  final List<String> neighborhoods;
}

class CityNode {
  const CityNode(this.name, this.districts);

  final String name;
  final List<DistrictNode> districts;
}

const turkeyCities = <CityNode>[
  CityNode('İstanbul', [
    DistrictNode('Kadıköy', 40.9927, 29.0270, ['Caferağa', 'Moda', 'Osmanağa', 'Fenerbahçe', 'Göztepe', 'Kozyatağı']),
    DistrictNode('Beşiktaş', 41.0428, 29.0077, ['Levent', 'Etiler', 'Bebek', 'Ortaköy', 'Sinanpaşa', 'Abbasağa']),
    DistrictNode('Üsküdar', 41.0265, 29.0150, ['Altunizade', 'Çengelköy', 'Kuzguncuk', 'Salacak', 'Acıbadem']),
    DistrictNode('Şişli', 41.0602, 28.9877, ['Nişantaşı', 'Osmanbey', 'Mecidiyeköy', 'Bomonti']),
    DistrictNode('Fatih', 41.0186, 28.9397, ['Sultanahmet', 'Aksaray', 'Fındıkzade', 'Kocamustafapaşa']),
  ]),
  CityNode('Ankara', [
    DistrictNode('Çankaya', 39.9010, 32.8600, ['Kızılay', 'Bahçelievler', 'Çayyolu', 'Oran', 'Yıldız']),
    DistrictNode('Yenimahalle', 39.9700, 32.8000, ['Demetevler', 'Batıkent', 'İvedik', 'Yenimahalle Merkez']),
    DistrictNode('Keçiören', 39.9860, 32.8620, ['Etlik', 'Ovacık', 'Aktepe']),
  ]),
  CityNode('İzmir', [
    DistrictNode('Karşıyaka', 38.4550, 27.1120, ['Bostanlı', 'Mavişehir', 'Donanmacı', 'Alaybey']),
    DistrictNode('Konak', 38.4190, 27.1280, ['Alsancak', 'Göztepe', 'Güzelyalı', 'Kahramanlar']),
    DistrictNode('Bornova', 38.4660, 27.2200, ['Erzene', 'Evka-3', 'Kazımdirik']),
  ]),
  CityNode('Kayseri', [
    DistrictNode('Melikgazi', 38.7205, 35.4826, ['Cumhuriyet', 'Gültepe', 'Anafartalar', 'Esenyurt', 'Hunat']),
    DistrictNode('Kocasinan', 38.7380, 35.4720, ['Yenişehir', 'Sanayi', 'Erciyesevler', 'Barbaros']),
    DistrictNode('Talas', 38.6940, 35.5560, ['Mevlana', 'Yenidoğan', 'Harman']),
    DistrictNode('Hacılar', 38.6470, 35.4540, ['Hacılar Merkez', 'Yukarı']),
  ]),
  CityNode('Gaziantep', [
    DistrictNode('Şahinbey', 37.0500, 37.3700, ['İbrahimli', 'Güneş', 'Karataş', 'Ünaldı']),
    DistrictNode('Şehitkamil', 37.0800, 37.3900, ['Gazi', 'İncili Pınar', 'Karşıyaka']),
  ]),
  CityNode('Trabzon', [
    DistrictNode('Ortahisar', 41.0020, 39.7200, ['Kemerkaya', 'Pazarkapı', 'Boztepe']),
    DistrictNode('Akçaabat', 41.0200, 39.5700, ['Söğütlü', 'Yıldızlı', 'Akçaabat Merkez']),
  ]),
  CityNode('Adana', [
    DistrictNode('Seyhan', 36.9950, 35.3200, ['Çınarlı', 'Reşatbey', 'Kurtuluş', 'Ziyapaşa']),
    DistrictNode('Çukurova', 37.0400, 35.2800, ['Yurt', 'Mahfesığmaz', 'Güzelyalı']),
  ]),
  CityNode('Bursa', [
    DistrictNode('Nilüfer', 40.2100, 28.9800, ['Özlüce', 'Görükle', 'Konak', 'Beşevler']),
    DistrictNode('Osmangazi', 40.1900, 29.0600, ['Soğanlı', 'Hüdavendigar', 'Çekirge']),
  ]),
  CityNode('Antalya', [
    DistrictNode('Muratpaşa', 36.8850, 30.7050, ['Fener', 'Şirinyalı', 'Meltem', 'Güzeloba']),
    DistrictNode('Konyaaltı', 36.8700, 30.6400, ['Liman', 'Hurma', 'Arapsuyu']),
  ]),
  CityNode('Hatay', [
    DistrictNode('Antakya', 36.2020, 36.1600, ['Cebrail', 'Elektrik', 'Gazi']),
  ]),
];

List<String> cityNames() => turkeyCities.map((c) => c.name).toList();

CityNode? cityByName(String name) {
  for (final city in turkeyCities) {
    if (city.name == name) return city;
  }
  return null;
}

DistrictNode? districtByName(String city, String district) {
  final node = cityByName(city);
  if (node == null) return null;
  for (final item in node.districts) {
    if (item.name == district) return item;
  }
  return null;
}
