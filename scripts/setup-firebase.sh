#!/bin/bash

# Quick Firebase Setup Script
# This script helps you set up Firebase configuration quickly

echo "🔥 Firebase Setup Helper"
echo "========================"
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "✅ .env file already exists"
    echo ""
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy .env.example to .env
if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
else
    echo "❌ .env.example not found. Creating basic .env file..."
    cat > .env << 'EOF'
# Firebase Configuration
# Get these values from Firebase Console > Project Settings > Your apps

EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EOF
    echo "✅ Created basic .env file"
fi

echo ""
echo "📝 Next steps:"
echo "1. Go to https://console.firebase.google.com/"
echo "2. Select your project (or create a new one)"
echo "3. Go to Project Settings (⚙️ icon)"
echo "4. Scroll to 'Your apps' section"
echo "5. Select your Android app (or add one)"
echo "6. Copy the config values"
echo "7. Paste them into the .env file"
echo ""
echo "After filling .env, run:"
echo "  node scripts/seedArticlesWeb.js  # Import articles"
echo "  npx expo start --clear            # Restart Expo"
echo ""
