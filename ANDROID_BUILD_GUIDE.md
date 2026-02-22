# 📱 Android APK Build Guide - Step by Step

## ✅ Prerequisites Check

Your environment:
- ✅ Node.js v25.5.0 (LTS)
- ✅ npm 11.8.0
- ✅ Expo CLI 54.0.22
- ✅ EAS project ID configured

---

## 🚀 Step-by-Step Build Process

### **STEP 1: Install EAS CLI** (One-time setup)

```bash
npm install -g eas-cli
```

Verify installation:
```bash
eas --version
```

---

### **STEP 2: Login to Expo Account**

```bash
npx expo login
```

Enter your Expo account credentials. If you don't have an account, create one at: https://expo.dev

---

### **STEP 3: Verify Project Configuration**

Check for any issues:
```bash
cd /Users/ahmad/Desktop/EbadatApp
npx expo-doctor
```

Fix any reported issues before proceeding.

---

### **STEP 4: Ensure All Dependencies Are Installed**

```bash
npm install
```

Verify critical packages:
```bash
npm list expo expo-router expo-notifications expo-av expo-font
```

---

### **STEP 5: Test App Locally First** (Recommended)

Start the development server to ensure everything works:
```bash
npx expo start --clear
```

Test on Expo Go app on your phone to verify:
- ✅ App launches without crashes
- ✅ Fonts load correctly
- ✅ Notifications work
- ✅ Audio playback works
- ✅ Quran data loads offline

**Stop the server** (Ctrl+C) when done testing.

---

### **STEP 6: Build APK with EAS**

This will build the APK in the cloud (takes 10-20 minutes):

```bash
npx eas build -p android --profile preview
```

**What happens:**
1. EAS uploads your project to Expo servers
2. Builds the APK in the cloud
3. Provides a download link when complete

**First time?** You'll be asked:
- "Would you like to create a new Android Keystore?" → **Answer: Yes**
- This creates a signing key for your app (keep it safe!)

---

### **STEP 7: Download APK**

After build completes:

1. **Option A: From Terminal**
   - The build command will show a URL like: `https://expo.dev/accounts/your-account/builds/...`
   - Open this URL in browser
   - Click "Download" button

2. **Option B: From Expo Dashboard**
   - Go to: https://expo.dev/accounts/your-account/projects/NamazAfghanistan/builds
   - Find your latest build
   - Click "Download" button

**File will be named:** `app-preview-xxxxx.apk`

---

### **STEP 8: Install APK on Android Device**

#### **Method 1: Direct Transfer (Easiest)**

1. Transfer APK to your Android phone:
   - Email it to yourself
   - Use AirDrop/Bluetooth
   - Use USB cable
   - Upload to Google Drive and download on phone

2. On your Android phone:
   - Open **Files** app
   - Find the downloaded APK file
   - Tap on it
   - If prompted: **Settings → Allow from this source**
   - Tap **Install**
   - Wait for installation
   - Tap **Open**

#### **Method 2: ADB (Advanced)**

If you have Android Debug Bridge installed:
```bash
adb install path/to/app-preview-xxxxx.apk
```

---

## 🔍 Troubleshooting Common Issues

### **Issue 1: "EAS CLI not found"**
```bash
npm install -g eas-cli
```

### **Issue 2: "Not logged in"**
```bash
npx expo login
```

### **Issue 3: "Build failed - missing dependencies"**
```bash
npm install
npx expo install --fix
```

### **Issue 4: "APK won't install - Unknown source"**
On Android phone:
- **Settings → Security → Unknown Sources** → Enable
- Or: **Settings → Apps → Special Access → Install Unknown Apps** → Enable for your file manager

### **Issue 5: "App crashes on launch"**
- Check Metro bundler logs for errors
- Verify all fonts are in `/assets/fonts/`
- Verify adhan sound file is in `/assets/sounds/`
- Test in Expo Go first before building APK

### **Issue 6: "Build takes too long"**
- Normal build time: 10-20 minutes
- First build is slower (15-25 minutes)
- Check build status at: https://expo.dev/builds

---

## 📋 Pre-Build Checklist

Before building, verify:

- [ ] App runs in Expo Go without crashes
- [ ] All fonts load (Amiri, Uthman Taha, Vazirmatn, NotoNastaliqUrdu)
- [ ] Adhan sound file exists in `/assets/sounds/`:
  - [ ] `barakatullah_salim_18sec.mp3`
- [ ] No console errors in Metro bundler
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] All dependencies installed: `npm install`

---

## 🎯 Quick Build Command (All-in-One)

If everything is set up, just run:

```bash
cd /Users/ahmad/Desktop/EbadatApp
npx expo login
npx eas build -p android --profile preview
```

Then download and install the APK!

---

## 📱 Testing the APK

After installation, test:

1. **Launch** - App should open without crashes
2. **Fonts** - Arabic text should display correctly
3. **Quran** - Open a surah, verify text loads
4. **Audio** - Play a Quran ayah, verify sound works
5. **Notifications** - Check Adhan settings, verify notifications work
6. **Offline** - Turn off WiFi, verify Quran still works
7. **RTL** - Verify UI is right-to-left

---

## 🔐 Keystore Information

**IMPORTANT:** Your Android keystore is managed by Expo EAS.

- Keystore is stored securely on Expo servers
- You can view it at: https://expo.dev/accounts/your-account/credentials
- **Never lose access to your Expo account** - you need it for updates!

---

## 📦 Build Profiles Explained

- **`preview`** → APK for testing (what you want now)
- **`production`** → AAB for Google Play Store (for later)

---

## 🆘 Need Help?

- Expo Docs: https://docs.expo.dev/build/introduction/
- EAS Build: https://docs.expo.dev/build/building-on-ci/
- Community: https://forums.expo.dev/

---

## ✅ Success Indicators

You'll know it worked when:

1. ✅ Build completes with status "finished"
2. ✅ APK file downloads successfully
3. ✅ APK installs on Android device
4. ✅ App launches without crashes
5. ✅ All features work as expected

---

**Ready to build?** Run Step 6! 🚀
