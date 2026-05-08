import 'package:flutter/material.dart';
import 'package:chatra/theme/app_theme.dart';

class SpotlightSearchWidget extends StatefulWidget {
  final bool isSearchOpen;
  final TextEditingController searchController;
  final FocusNode searchFocusNode;
  final String searchQuery;
  final List<Map<String, dynamic>> searchItems;
  final ValueChanged<bool> onSearchToggle;
  final ValueChanged<String> onSearchQueryChanged;

  const SpotlightSearchWidget({
    super.key,
    required this.isSearchOpen,
    required this.searchController,
    required this.searchFocusNode,
    required this.searchQuery,
    required this.searchItems,
    required this.onSearchToggle,
    required this.onSearchQueryChanged,
  });

  @override
  State<SpotlightSearchWidget> createState() => _SpotlightSearchWidgetState();
}

class _SpotlightSearchWidgetState extends State<SpotlightSearchWidget> {
  @override
  Widget build(BuildContext context) {
    if (!widget.isSearchOpen) {
      return _buildSearchTrigger();
    }
    return _buildSpotlightOverlay();
  }

  Widget _buildSearchTrigger() {
    return GestureDetector(
      onTap: () {
        widget.onSearchToggle(true);
        widget.searchFocusNode.requestFocus();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: const Row(
          children: [
            Icon(Icons.search_rounded, color: Colors.white60, size: 20),
            SizedBox(width: 10),
            Text("Spotlight Search", style: TextStyle(color: Colors.white38, fontSize: 15)),
          ],
        ),
      ),
    );
  }

  Widget _buildSpotlightOverlay() {
    final filtered = widget.searchItems.where((item) {
      final query = widget.searchQuery.toLowerCase();
      return item['title'].toString().toLowerCase().contains(query) ||
          item['keywords'].toString().toLowerCase().contains(query);
    }).toList();

    return Positioned.fill(
      child: GestureDetector(
        onTap: () => widget.onSearchToggle(false),
        child: Container(
          color: Colors.black.withOpacity(0.85),
          padding: const EdgeInsets.fromLTRB(20, 60, 20, 0),
          child: Column(
            children: [
              TextField(
                controller: widget.searchController,
                focusNode: widget.searchFocusNode,
                style: const TextStyle(color: Colors.white, fontSize: 20),
                onChanged: widget.onSearchQueryChanged,
                decoration: InputDecoration(
                  hintText: "Search anything...",
                  hintStyle: const TextStyle(color: Colors.white38),
                  prefixIcon: Icon(
                    Icons.search_rounded,
                    color: AppColors.accentTeal,
                  ),
                  suffixIcon: IconButton(
                    icon: const Icon(
                      Icons.close_rounded,
                      color: Colors.white38,
                    ),
                    onPressed: () {
                      widget.searchController.clear();
                      widget.onSearchQueryChanged("");
                      widget.onSearchToggle(false);
                    },
                  ),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.05),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: BorderSide(
                      color: Colors.white.withOpacity(0.1),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: BorderSide(color: AppColors.accentTeal),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Expanded(
                child: ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final item = filtered[index];
                    return ListTile(
                      leading: Icon(
                        item['icon'] as IconData,
                        color: AppColors.accentTeal,
                      ),
                      title: Text(
                        item['title'].toString(),
                        style: const TextStyle(color: Colors.white, fontSize: 16),
                      ),
                      subtitle: Text(
                        "Tap to open ${item['title']}",
                        style: const TextStyle(color: Colors.white38, fontSize: 12),
                      ),
                      onTap: () {
                        widget.onSearchToggle(false);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
