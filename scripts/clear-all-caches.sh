#!/bin/bash

# Clear All Caches Script
# This script clears all Metro, Expo, and Node caches

echo "🧹 Clearing all caches..."

# Stop any running Metro bundler
echo "Stopping Metro bundler..."
pkill -f "expo start" || true
pkill -f "metro" || true

# Clear Expo cache
echo "Clearing .expo directory..."
rm -rf .expo

# Clear node_modules cache
echo "Clearing node_modules/.cache..."
rm -rf node_modules/.cache

# Clear Metro cache
echo "Clearing Metro cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true

# Clear watchman cache (if installed)
if command -v watchman &> /dev/null; then
    echo "Clearing Watchman cache..."
    watchman watch-del-all 2>/dev/null || true
fi

# Clear npm cache (optional)
# echo "Clearing npm cache..."
# npm cache clean --force

echo "✅ All caches cleared!"
echo ""
echo "Next steps:"
echo "1. Run: npx expo start --clear"
echo "   Or for stronger reset: npx expo start --reset-cache"
echo "   Or use tunnel mode: npx expo start --tunnel --clear"
echo "2. In Expo Go app, shake device and tap 'Reload'"
echo "3. Or close Expo Go completely and reopen it"
echo ""
echo "💡 If this doesn't work, try: ./scripts/force-rebuild.sh"