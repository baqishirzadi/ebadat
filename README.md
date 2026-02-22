# عبادات - Ebadat Quran App

A production-grade offline Quran app for Hanafi users of Afghanistan, built with React Native + Expo.

## ✨ Features

### 📖 Quran Reading
- **Full Uthmani Mushaf** - Complete Arabic text (114 surahs, 6236 ayahs)
- **Mushaf Page Mode** - Traditional page-by-page reading
- **Scroll Mode** - Modern scrollable ayah view
- **Resume Reading** - Automatically continue where you left off

### 🌐 Translations
- **Dari Translation** - By Anwar Badakhshani
- **Pashto Translation** - Easy modern Afghan Pashto
- View single translation or both simultaneously
- Full RTL support

### 🎨 Themes & Fonts
- **4 Beautiful Themes:**
  - Light (Classic cream/white)
  - Night (True black AMOLED-friendly)
  - Turquoise Blue (Calm ocean)
  - Light Olive Green (Serene nature)

- **2 Quran Fonts:**
  - Uthmani Hafs (Standard Madani style)
  - Nastaliq (IndoPak/Pakistani style)

- Adjustable font sizes for Arabic and translations

### 🔖 Bookmarks
- Bookmark any ayah
- View all bookmarks in one place
- Quick navigation to bookmarked ayahs

### 🔊 Audio (Architecture Ready)
- Per-ayah audio playback
- Offline caching support
- Background playback ready
- Auto-advance to next ayah
- Repeat ayah mode

### 🔍 Search
- Search in Arabic text
- Search in translations (Dari/Pashto)
- Fast offline search

### 📱 100% Offline
- All Quran text bundled
- All translations bundled
- Works without internet after install

## 📁 Project Structure

```
EbadatApp/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation
│   │   ├── index.tsx        # Surah list (home)
│   │   ├── bookmarks.tsx    # Bookmarks screen
│   │   └── settings.tsx     # Settings screen
│   ├── quran/               # Quran reader
│   │   └── [surah].tsx      # Dynamic surah reader
│   └── search.tsx           # Search screen
├── components/
│   └── quran/               # Quran components
│       ├── AyahRow.tsx      # Single ayah display
│       ├── AudioPlayer.tsx  # Audio playback controls
│       ├── MushafView.tsx   # Main Quran view
│       ├── SearchButton.tsx # FAB for search
│       ├── SurahHeader.tsx  # Surah title card
│       ├── SurahList.tsx    # List of all surahs
│       └── TranslationBlock.tsx
├── constants/
│   └── theme.ts             # Theme colors & typography
├── context/
│   └── AppContext.tsx       # Global state management
├── data/
│   └── quran.json           # Quran data (Arabic + translations)
├── hooks/
│   ├── useFonts.ts          # Font loading hook
│   ├── useQuranData.ts      # Quran data access hook
│   └── use-theme-color.ts   # Theme color hook
├── types/
│   └── quran.ts             # TypeScript definitions
└── assets/
    └── fonts/               # Quran fonts
        ├── KFGQPC-Uthmani.ttf
        ├── NotoNastaliqUrdu-Regular.ttf
        ├── Amiri-Regular.ttf
        └── Amiri-Bold.ttf
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## 📦 Key Dependencies

- `expo-router` - File-based navigation
- `@react-native-async-storage/async-storage` - Persistent storage
- `expo-av` - Audio playback
- `expo-file-system` - File system access for caching
- `expo-font` - Custom font loading
- `react-native-reanimated` - Smooth animations

## 🎯 Architecture

### State Management
The app uses React Context (`AppContext`) with `useReducer` for state management:
- User preferences (theme, font, view mode)
- Bookmarks
- Last reading position

All state is persisted to AsyncStorage.

### Data Layer
Quran data is stored as JSON and loaded into memory:
- Optimized for fast search
- Ayah-level granularity
- Juz and Hizb metadata

### Audio Architecture
Prepared for offline-first audio:
- Local caching in app documents directory
- Background playback support
- Per-ayah and per-surah downloads

## 🛠 Development

### Adding More Quran Data
The `data/quran.json` file contains the Quran structure. To add complete data:

1. Each surah needs:
   - Arabic text for all ayahs
   - Dari translations
   - Pashto translations
   - Page, juz, and hizb metadata

### Adding New Themes
Edit `constants/theme.ts` to add themes:

```typescript
const newTheme: ThemeColors = {
  text: '#...',
  background: '#...',
  // ... all color properties
};

export const Themes: Record<ThemeMode, ThemeColors> = {
  // ... existing themes
  newTheme: newTheme,
};
```

## 📱 Platform Support

- ✅ Android (primary target)
- ✅ iOS
- ⚠️ Web (limited - fonts may vary)

## 🤲 About

Built with ❤️ for the Muslim community of Afghanistan.

**Features Islamic values:**
- Respectful handling of Quran text
- RTL-first design
- Local language support (Dari + Pashto)
- Hanafi-focused for Afghan users

## 📄 License

This project is for educational and religious purposes.

---

بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
