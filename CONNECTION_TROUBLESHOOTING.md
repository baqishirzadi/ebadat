# راهنمای رفع مشکل اتصال Expo Go

## مشکل: "No apps connected"

اگر Expo Go نمی‌تواند به Metro bundler متصل شود، این مراحل را دنبال کنید:

## روش 1: اتصال مجدد (پیشنهادی)

### مرحله 1: Restart Expo Server
```bash
# Stop server (Ctrl+C)
npx expo start --clear
```

### مرحله 2: Reconnect در Expo Go
1. Expo Go را کاملاً ببندید (از Recent Apps حذف کنید)
2. Expo Go را دوباره باز کنید
3. QR Code جدید را اسکن کنید
4. منتظر بمانید تا اتصال برقرار شود

## روش 2: Tunnel Mode (اگر روش 1 کار نکرد)

اگر گوشی و کامپیوتر در شبکه‌های مختلف هستند یا firewall مشکل دارد:

```bash
# Stop server (Ctrl+C)
npx expo start --tunnel --clear
```

**مزایای Tunnel Mode:**
- ✅ کار می‌کند حتی در شبکه‌های مختلف
- ✅ از سرورهای Expo استفاده می‌کند
- ✅ قابل اعتمادتر برای مشکلات شبکه

**معایب:**
- ⚠️  کندتر از LAN connection
- ⚠️  نیاز به اینترنت

## روش 3: Manual URL Entry

اگر QR Code کار نمی‌کند:

1. در Expo Go: "Enter URL manually" را بزنید
2. از terminal، URL با فرمت `exp://...` را کپی کنید
3. در Expo Go paste کنید و Connect بزنید

## روش 4: USB Connection (Android)

برای Android می‌توانید از USB استفاده کنید:

```bash
# USB را به کامپیوتر وصل کنید
# USB Debugging را در Developer Options فعال کنید
npx expo start --android
```

## بررسی مشکلات

### مشکل: Firewall
- macOS: System Preferences → Security & Privacy → Firewall
- Windows: Windows Defender Firewall
- مطمئن شوید Node.js و Expo اجازه دسترسی دارند

### مشکل: Port 8081
بررسی کنید که port 8081 آزاد است:
```bash
lsof -i :8081
```

اگر port استفاده می‌شود:
```bash
# Kill process on port 8081
kill -9 $(lsof -t -i:8081)
```

### مشکل: WiFi
- مطمئن شوید گوشی و کامپیوتر در همان شبکه WiFi هستند
- بعضی شبکه‌های عمومی (مثل هتل) device-to-device connection را block می‌کنند
- در این صورت از Tunnel Mode استفاده کنید

## دستورات مفید

```bash
# Start with clear cache
npx expo start --clear

# Start with tunnel
npx expo start --tunnel --clear

# Start for Android (USB)
npx expo start --android

# Start for iOS (Simulator)
npx expo start --ios

# Check Expo version
npx expo --version
```

## وضعیت اتصال

بعد از اتصال موفق، باید ببینید:
- ✅ Terminal: "Metro waiting on exp://..."
- ✅ Expo Go: "Connected" یا شروع به load کردن app
- ✅ Terminal: "Reloading apps" وقتی تغییر می‌دهید

اگر هنوز مشکل دارید:
1. Expo Go را uninstall و دوباره install کنید
2. کامپیوتر را restart کنید
3. از Development Build استفاده کنید (برای production)
