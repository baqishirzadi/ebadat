#!/bin/bash

# Force Rebuild Script
# Stronger cache clearing with --reset-cache option
# Use this when normal cache clearing doesn't work

echo "🔥 Force rebuilding bundle with complete cache clear..."

# Stop any running Metro bundler
echo "Stopping Metro bundler..."
pkill -f "expo start" || true
pkill -f "metro" || true
sleep 2

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

# Clear React Native cache
echo "Clearing React Native cache..."
rm -rf $TMPDIR/react-* 2>/dev/null || true

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

echo "✅ All caches cleared!"
echo ""
echo "Starting Expo with --reset-cache (stronger than --clear)..."
echo ""
echo "⚠️  IMPORTANT:"
echo "1. In Expo Go app, completely close it (swipe away from recent apps)"
echo "2. Clear Expo Go cache: Settings → Apps → Expo Go → Storage → Clear Cache"
echo "3. Reopen Expo Go and scan QR code again"
echo "4. Or use tunnel mode: expo start --tunnel --reset-cache"
echo ""

# Start with reset-cache
npx expo start --reset-cache
