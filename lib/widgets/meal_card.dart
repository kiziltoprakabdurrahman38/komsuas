import 'package:flutter/material.dart';

import '../models.dart';
import '../theme.dart';

class MealCard extends StatelessWidget {
  const MealCard({super.key, required this.meal, required this.distanceKm, required this.onOpen});

  final Meal meal;
  final double distanceKm;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 84,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    colors: meal.kind == 'tatli'
                        ? const [Color(0xFFFDE68A), Color(0xFFF59E0B)]
                        : meal.kind == 'corba'
                            ? const [Color(0xFFBAE6FD), Color(0xFF0284C7)]
                            : const [Color(0xFFA7F3D0), Color(0xFF0F766E)],
                  ),
                ),
                alignment: Alignment.bottomLeft,
                padding: const EdgeInsets.all(10),
                child: Text(
                  meal.kindLabel,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                meal.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, height: 1.2),
              ),
              const SizedBox(height: 4),
              Text(meal.chef, style: const TextStyle(color: inkSoft, fontSize: 13)),
              const SizedBox(height: 2),
              Text(
                '${meal.placeLabel} · ${distanceKm.toStringAsFixed(1)} km',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: inkSoft, fontSize: 12),
              ),
              const Spacer(),
              Row(
                children: [
                  Text(
                    '${meal.price.toStringAsFixed(0)} ₺',
                    style: const TextStyle(color: brandDeep, fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  const Spacer(),
                  Text(
                    meal.portions > 0 ? '${meal.portions} porsiyon' : 'Tükendi',
                    style: const TextStyle(color: inkSoft, fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: onOpen,
                  style: FilledButton.styleFrom(
                    backgroundColor: brand,
                    minimumSize: const Size.fromHeight(40),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('İncele'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
