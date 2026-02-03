# راهنمای تنظیم Firebase برای بخش دعای خیر

## مراحل تنظیم

### 1. ایجاد پروژه Firebase

1. به [Firebase Console](https://console.firebase.google.com/) بروید
2. روی "Add project" کلیک کنید
3. نام پروژه را وارد کنید (مثلاً "Ebadat")
4. Google Analytics را فعال کنید (اختیاری)
5. پروژه را ایجاد کنید

### 2. افزودن اپلیکیشن Android

1. در Firebase Console، روی آیکون Android کلیک کنید
2. Package name را وارد کنید: `com.afghandev.namaz`
3. App nickname (اختیاری): "Ebadat"
4. روی "Register app" کلیک کنید
5. فایل `google-services.json` را دانلود کنید
6. آن را در `android/app/` قرار دهید

### 3. تنظیم Firestore Database

1. در Firebase Console، به "Firestore Database" بروید
2. روی "Create database" کلیک کنید
3. حالت "Production mode" را انتخاب کنید
4. Location را انتخاب کنید (مثلاً `us-central1`)
5. Database را ایجاد کنید

### 4. تنظیم Firestore Security Rules

در Firebase Console > Firestore > Rules، قوانین زیر را اضافه کنید:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Admins can read all
    }
    
    // Dua requests - users can create and read their own, admins can read/write all
    match /dua_requests/{requestId} {
      allow create: if request.auth == null || request.resource.data.userId == request.auth.uid;
      allow read: if request.auth == null || 
                     resource.data.userId == request.auth.uid ||
                     get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isActive == true;
      allow update: if get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isActive == true;
    }
    
    // Admin users - only admins can read
    match /admin_users/{adminId} {
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isActive == true;
    }
  }
}
```

### 5. دریافت Firebase Config

1. در Firebase Console، به Project Settings بروید
2. در بخش "Your apps"، اپلیکیشن Android را انتخاب کنید
3. مقادیر زیر را کپی کنید:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### 6. تنظیم Environment Variables

فایل `.env` در ریشه پروژه ایجاد کنید:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

یا در `app.json` اضافه کنید:

```json
{
  "expo": {
    "extra": {
      "firebase": {
        "apiKey": "your-api-key",
        "authDomain": "your-project.firebaseapp.com",
        "projectId": "your-project-id",
        "storageBucket": "your-project.appspot.com",
        "messagingSenderId": "your-sender-id",
        "appId": "your-app-id"
      }
    }
  }
}
```

### 7. ایجاد حساب Admin

1. در Firebase Console، به "Authentication" بروید
2. روی "Get started" کلیک کنید
3. "Email/Password" را فعال کنید
4. حساب Admin ایجاد کنید:
   - Email: admin@example.com
   - Password: (یک رمز قوی)
5. در Firestore، collection `admin_users` ایجاد کنید
6. Document با ID = UID کاربر admin ایجاد کنید:

```json
{
  "email": "admin@example.com",
  "name": "سیدعبدالباقی شیرزادی",
  "role": "admin",
  "isActive": true
}
```

### 8. تنظیم Cloud Functions (اختیاری)

برای ارسال خودکار اعلان‌ها:

1. Firebase CLI را نصب کنید: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init functions`
4. Deploy: `firebase deploy --only functions`

### 9. تست

1. اپلیکیشن را اجرا کنید
2. به بخش "دعای خیر و مشورت شرعی" بروید
3. یک درخواست تستی ارسال کنید
4. در Firebase Console، Firestore را بررسی کنید
5. Admin login را تست کنید

## نکات مهم

- **امنیت**: قوانین Firestore را به دقت بررسی کنید
- **Rate Limiting**: در Cloud Functions پیاده‌سازی شده است
- **Notifications**: برای اعلان‌های push، FCM باید تنظیم شود
- **Backup**: به صورت منظم از Firestore backup بگیرید

## ساختار Collections

### `dua_requests`
- `id`: Request ID
- `userId`: User ID
- `category`: 'dua' | 'advice' | 'personal' | 'other'
- `message`: Request text
- `isAnonymous`: boolean
- `status`: 'pending' | 'answered' | 'closed'
- `createdAt`: Timestamp
- `answeredAt`: Timestamp (optional)
- `response`: Response text (optional)
- `reviewerId`: Admin UID (optional)
- `reviewerName`: Admin name (optional)

### `users`
- `id`: User ID
- `deviceToken`: Expo push token
- `notificationEnabled`: boolean
- `createdAt`: Timestamp

### `admin_users`
- `id`: Admin UID
- `email`: Admin email
- `name`: Admin name
- `role`: 'reviewer' | 'admin'
- `isActive`: boolean
