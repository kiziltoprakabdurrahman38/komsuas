import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'screens/shell.dart';
import 'store.dart';
import 'theme.dart';
import 'turkey_places.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = true;
  await TurkeyCatalog.load();
  runApp(const KomsuasApp());
}

class KomsuasApp extends StatelessWidget {
  const KomsuasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KomşuAş',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const BootScreen(),
    );
  }
}

class BootScreen extends StatefulWidget {
  const BootScreen({super.key});

  @override
  State<BootScreen> createState() => _BootScreenState();
}

class _BootScreenState extends State<BootScreen> {
  AppStore? _store;

  @override
  void initState() {
    super.initState();
    AppStore.open().then((store) {
      if (mounted) setState(() => _store = store);
    });
  }

  @override
  Widget build(BuildContext context) {
    final store = _store;
    if (store == null) {
      return const Scaffold(
        backgroundColor: sage,
        body: Center(child: CircularProgressIndicator(color: brand)),
      );
    }
    return AppShell(store: store);
  }
}
