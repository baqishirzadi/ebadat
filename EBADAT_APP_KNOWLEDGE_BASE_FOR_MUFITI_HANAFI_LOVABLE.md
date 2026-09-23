# Ebadat App Knowledge Base

## Purpose

This document is the functional knowledge base for the **Ebadat / عبادت** mobile application. It is intended for:

1. Lovable or another product-building agent that needs to understand the existing application.
2. The Mufiti Hanafi AI bot, so it can answer app-navigation questions and explain what the app can do.
3. Human developers maintaining or rebuilding the product.

This report describes the repository as inspected on **2026-09-21**. Local content counts are current repository counts; remote content can change after synchronization.

## 1. Product identity and audience

Ebadat is an RTL-first Islamic worship and learning application designed primarily for Afghan users and Hanafi practice. Its interface is mainly in Dari and Pashto, with Arabic Quran, hadith, dua, and adhkar text.

The product combines:

- Quran reading, translations, search, bookmarks, audio, and downloads.
- Hanafi prayer education and Hanafi prayer-time calculations.
- Five daily prayer times, Adhan notifications, and prayer reminders.
- Qibla direction.
- Islamic, Afghan Solar Hijri, and Gregorian calendar information.
- Adhkar, dhikr counting, hadith, naats, articles, scholar content, and dua requests.
- A remote, streaming **Hanafi Mufti** AI chat.

The primary native targets are Android and iOS. Web support exists through Expo but is limited, especially for native audio, notifications, GPS, compass sensors, and background behavior.

## 2. Navigation: visible tabs and hidden screens

### Visible bottom tabs: exactly 5

The bottom tab bar contains five visible tabs, in RTL order:

| Tab | UI label | Main route | Main function |
|---|---|---|---|
| 1 | خانه | `/(tabs)/index` | Home dashboard and daily hub |
| 2 | قرآن | `/(tabs)/quran-tab` | Surah and juz browsing |
| 3 | جنتری | `/(tabs)/jantari` | Islamic/Afghan/Gregorian calendar |
| 4 | نعت | `/(tabs)/naat` | Naat catalog and audio player |
| 5 | بیشتر | `/(tabs)/more` | Feature hub, statistics, settings, and support |

The tab bar is hidden inside detailed readers and sub-screens such as Quran readers, adhkar details, articles, dua requests, scholar screens, admin screens, and Naat sub-screens.

### Hidden tab routes

These routes are registered in the tab navigator but are intentionally not shown as bottom tabs:

- `/(tabs)/prayer` — prayer times detail screen.
- `/(tabs)/adhkar` — adhkar category browser.
- `/(tabs)/ahadith` — hadith feature screen.
- `/(tabs)/articles` — article feed.
- `/(tabs)/bookmarks` — Quran bookmarks.
- `/(tabs)/prayer-learning` — Hanafi prayer education.

They are opened from Home, More, or feature links.

### Other application routes

| Area | Routes and behavior |
|---|---|
| Onboarding | `/onboarding`, `/onboarding/language`, `/onboarding/location`, `/onboarding/notifications`, `/onboarding/exact-alarms`, `/onboarding/battery` |
| Quran | `/quran/[surah]`, `/quran/juz/[juz]`, `/search` |
| Prayer and Qibla | `/qibla`, `/adhan-settings`, `/adhan-health`, `/calendar` |
| Adhkar and dhikr | `/adhkar/[category]`, `/counter` |
| Mufti | `/mufti-chat` |
| Dua | `/dua-request`, `/dua-request/new`, `/dua-request/[id]` |
| Articles | `/articles`, `/articles/[id]`, `/articles/admin` |
| Hadith | `/ahadith/[id]`, `/ahadith/admin` |
| Naat | `/naat/now-playing`, `/naat/downloads`, `/naat/admin` |
| Scholar portal | `/scholar/login`, `/scholar/dashboard`, `/scholar/analytics`, `/scholar/article/new`, `/scholar/article/[id]` |
| Administration | `/admin/login`, `/admin/dashboard`, `/admin/request/[id]` |
| Settings and miscellaneous | `/settings`, `/ramadan`, `/modal`, `/notification.click` |

## 3. Startup and onboarding

### Startup sequence

The root layout provides the application providers, RTL behavior, theme, fonts, splash screen, notification routing, onboarding redirect, and deferred initialization.

The startup sequence is broadly:

1. Force or enable RTL for Arabic, Dari, and Pashto.
2. Keep the native splash screen visible while fonts and critical providers initialize.
3. Show the spiritual splash/greeting experience.
4. Load persisted preferences, bookmarks, reading position, prayer settings, and other local state.
5. Determine whether onboarding is required.
6. Schedule or restore prayer notifications after the critical UI becomes interactive.
7. Defer heavier remote synchronization for articles, hadith, naats, and scholar data.

### First-use onboarding

The normal onboarding flow is:

1. Welcome screen: introduces Quran, prayer times, Adhan, Qibla, and Islamic calendar.
2. Language: choose Dari (`فارسی (دری)`) or Pashto (`پښتو`). This controls translation and app text preferences.
3. Location: select a country/city or use GPS to find the nearest supported city.
4. Notifications: grant or skip prayer notification permission and configure daily prayer reminders.
5. Android exact alarms: on supported Android versions, request exact-alarm permission for reliable prayer timing.
6. Android battery/autostart: explain OEM battery restrictions and autostart guidance.
7. Finish: return to the five-tab application and request the initial prayer schedule.

The user may skip permissions, but prayer notifications and Adhan playback cannot be guaranteed without the relevant permissions and device settings.

## 4. Home dashboard

The Home screen is the daily hub. It normally contains:

- Header with selected city/location.
- Today’s date information.
- Hanafi Mufti widget.
- Current or next prayer information.
- A complete prayer-time row.
- Qibla shortcut/card.
- Continue Quran reading card.
- Adhan schedule-health card.
- Quick actions.

### Home quick actions

The quick-action area can open:

- اذکار — daily adhkar.
- احادیث — hadith.
- دعای خیر — dua request.
- قبله‌نما — Qibla.

The More hub provides additional shortcuts to all major features.

### Home Hanafi Mufti widget

The Home widget is a compact entry point to the same conversation used by the full Mufti screen.

- Title: `مفتی هوشمند حنفی`.
- Dari subtitle: `سوال دینی تان را بپرسید`.
- Pashto subtitle: `خپله دیني پوښتنه وکړئ`.
- Supports multiline input up to 4,000 characters.
- Sends the question to the full Mufti conversation.
- Opens `/mufti-chat` after sending.
- Shows configuration and network errors.

## 5. Quran module

### Quran content

The authoritative Quran implementation contains:

- 114 surahs.
- 6,236 ayahs.
- 604 Mushaf pages.
- 30 juz.
- Arabic Uthmani text.
- Dari translation by Muhammad Anwar Badakhshani.
- Pashto translation identified in metadata as Abu Zakaria.
- Surah names, meanings, revelation types, page, juz, hizb, and sajda metadata.

The application lazy-loads 114 individual surah JSON files and caches recently used surahs. `data/metadata.json` provides the lightweight surah index. The root `data/quran.json` is legacy/sample data and should not be treated as the complete Quran source.

### Quran tab

The Quran tab displays:

- All 114 surahs.
- Surah number, Arabic name, Dari name, meaning, revelation type, and ayah count.
- Search by Arabic name, Dari name, meaning, numeric surah number, or Persian numerals.
- Browse-mode switch between Surah and Juz.
- Continue-reading card based on the saved ayah position.
- Search button opening the Quran search screen.

### Quran reader

Opening a surah supports:

- Scroll reading mode.
- Mushaf/page reading mode.
- Arabic ayah display.
- Dari, Pashto, both, or no translation.
- Per-ayah number and metadata.
- Page and juz information.
- Sajda indicator when applicable.
- Per-ayah bookmark.
- Per-ayah play button.
- Previous/next surah navigation.
- Reader settings shortcut.
- Exact navigation to a searched or bookmarked ayah.
- Continue-reading resume behavior.

The reader removes the displayed Bismillah from the first ayah where appropriate so it is not duplicated in the surah header. Surah 1 and Surah 9 are handled as exceptions.

### Quran translations and display settings

The user can choose:

- Dari only: `دری`.
- Pashto only: `پښتو`.
- Both: `هردو`.
- No translation: `بدون ترجمه`.

Arabic and translation font sizes each support small, medium, large, and extra-large settings.

Available font families include:

- Quran: QPC Hafs and Scheherazade/Uthmani.
- Dari: Vazirmatn and Amiri.
- Pashto: Amiri Naskh and Noto Nastaliq Urdu.

### Quran search

The search screen supports four modes:

- Arabic: `عربی`.
- Dari: `دری`.
- Pashto: `پښتو`.
- All: `همه`.

Search uses a bundled SQLite database/index and normalized Arabic/Dari text matching. Results identify surah, ayah, matched language, snippets, and navigation targets. Selecting a result opens the relevant surah and jumps to the exact ayah.

### Quran audio

Quran audio is online-first with local caching. The implementation supports these reciters:

- Qari Yasser Al-Dussary — `یاسر الدوسری`, 128 kbps.
- Qari Saad Al-Ghamdi — `سعد الغامدی`, 40 kbps.
- Qari Maher Al-Muaiqly — `ماهر المعیقلی`, 64 kbps.
- Minshawy Mujawwad — `منشاوی (تجوید)`, 192 kbps.
- Minshawy Murattal — `منشاوی (مرتل)`, 128 kbps.
- Abdul Basit Mujawwad — `عبدالباسط (تجوید)`, 128 kbps.

Playback supports:

- Play, pause, resume, and stop.
- Ayah auto-advance.
- Playback speed 1x, 1.25x, 1.5x, or 2x.
- Selected reciter persistence.
- Ayah/surah audio caching.
- Surah and juz download controls where the manifest/audio source is available.
- Auto-play and repeat preferences.

## 6. Prayer times and Adhan

### Prayer times

The app displays five daily prayers:

- Fajr / صبح.
- Dhuhr / ظهر or پیشین.
- Asr / عصر or نماز دیگر.
- Maghrib / شام.
- Isha / خفتن.

It also displays sunrise in prayer-time detail contexts.

### Location

The user can choose a city manually or use GPS. The city database includes Afghan cities and a lazy-loaded world-city database organized into regions. The same selected city is reused by prayer times, Adhan scheduling, and Qibla whenever possible.

### Hanafi calculation policy

For Afghanistan, the code uses a Karachi-style calculation policy with Hanafi Asr, an Afghanistan-specific Maghrib adjustment, and a fixed local Dhuhr policy at 12:30. This is an application calculation policy, not a universal fiqh ruling.

For other countries, the calculation policy is country-aware. Examples include Diyanet for Turkey, Tehran for Iran, Umm Al-Qura for Saudi Arabia, Egyptian, Kuwait, Qatar, Dubai, Singapore/MUIS, ISNA/North America, and Karachi/Hanafi-style policies for Pakistan, India, and Bangladesh.

### Adhan settings

The Adhan settings screen supports:

- Master switch for all prayer reminders.
- Individual enable/disable controls for Fajr, Dhuhr, Asr, Maghrib, and Isha.
- Default/global Adhan voice.
- Per-prayer sound test.
- Optional early reminder, normally one minute before prayer.
- Notification settings shortcut.
- System test scheduled approximately 25 seconds into the future.
- Schedule recheck and recovery.
- Android notification health diagnostics.

The current production Adhan voice is:

- Barakatullah Salim — `برکت‌الله سلیم (رح)`.

Prayer notification state can be `exact` or `fallback`, and the UI explains when the device or permission state prevents exact behavior.

### Platform behavior

- Android uses native exact-alarm support when available and may require exact-alarm, notification, battery, autostart, and OEM permissions.
- iOS uses local notification scheduling and foreground behavior subject to iOS permission rules.
- Changing the city, prayer preferences, permission state, or date causes the schedule to be refreshed.
- Notification taps route to the appropriate feature without intentionally starting duplicate Adhan playback.

## 7. Jantari calendar

The Jantari tab combines:

- Today’s date hero card.
- Today’s prayer times.
- Calendar grid.
- Upcoming occasions.
- Countdown chips.
- Fasting indicator when the current day is a fasting day.
- Adhan health banner.

The calendar grid supports:

- Qamari / Islamic calendar: `قمری`.
- Afghan Solar Hijri calendar: `شمسی`.
- Gregorian calendar: `میلادی`.

Selecting a day opens a detail sheet showing:

- Shamsi date.
- Qamari date.
- Gregorian date.

The event system includes Islamic occasions such as Ramadan, Eid, Ashura, Arafah, Laylat al-Qadr, and related days, plus Afghan cultural markers such as Nowruz and other Solar Hijri dates. The app shows upcoming events and can mark fasting or Eid-related events.

## 8. Naat module

The Naat tab is an audio catalog and player.

### Catalog sources

The preferred source is the Supabase `naats` table. The app also maintains:

- A locally cached catalog.
- Local download metadata.
- A bundled fallback catalog containing 7 Naat records in the repository snapshot.

If remote synchronization fails, the app uses cached data, then the fallback catalog if no cache exists.

### Naat features

- Search/filter the catalog.
- Display Persian/Dari and Pashto titles.
- Display reciter name.
- Play a selected Naat.
- Queue multiple naats.
- Skip next and previous.
- Pause, resume, stop, seek, and view progress.
- Keep a mini-player visible while navigating.
- Open a dedicated now-playing screen.
- Download audio for offline playback.
- View downloaded naats.
- Persist local playback position and download metadata.
- Admin catalog creation, editing, and deletion.

The exact remote catalog is not fixed; the local fallback is only a reliability fallback.

## 9. Adhkar and dhikr counter

The bundled adhkar data contains 11 categories and 48 entries.

Categories:

1. Beginner adhkar — `اذکار ابتدایی` — 10 entries.
2. Morning — `اذکار صبح` — 10 entries.
3. Evening — `اذکار شام` — 3 entries.
4. Sleep — `اذکار خواب` — 6 entries.
5. Waking — `اذکار بیداری` — 1 entry.
6. Travel — `اذکار سفر` — 2 entries.
7. Rizq — `اذکار رزق` — 2 entries.
8. Illness — `اذکار بیماری` — 2 entries.
9. Anxiety and sadness — `اذکار غم و اندوه` — 3 entries.
10. Protection — `اذکار محافظت` — 2 entries.
11. After prayer — `اذکار بعد از نماز` — 7 entries.

Each entry may contain:

- Arabic text.
- Dari translation.
- Pashto translation.
- Reference.
- Suggested repetition count.
- Virtue or explanatory note.

The dhikr counter is opened from the Adhkar area and contributes to personal progress statistics. Adhkar content is bundled locally and is usable without internet.

## 10. Hadith module

The current bundled curated dataset contains 120 hadiths.

### Hadith features

- Daily hadith card.
- Swipe or navigate to previous/next day.
- Muttafaq section with 47 bundled entries.
- Topic browser.
- Search.
- Arabic text.
- Dari translation.
- Pashto translation.
- Source book and source number.
- Authenticity grade.
- Bookmarking.
- Shareable hadith card.
- Daily notification time and enable/disable preference.
- Remote published-hadith synchronization.
- Individual hadith detail route.
- Admin access protected by a PIN flow.

### Local dataset distribution

Bundled source books currently include:

- Bukhari: 63.
- Muslim: 44.
- Nasai: 2.
- Tirmidhi: 4.
- Ahmad: 2.
- Ibn Majah: 2.
- Abu Dawud: 3.

Current authenticity grades in the bundled dataset are 108 Sahih, 10 Hasan, and 2 Daif. Remote published content can change these totals.

The app normalizes remote entries and merges them over local entries by hadith ID. The remote service is not the same as the local seed and should be treated as dynamic.

## 11. Articles and scholars

The local article seed currently contains 63 articles and 26 scholar records.

### Article categories

1. Iman — `ایمان`.
2. Salah — `نماز`.
3. Akhlaq — `اخلاق`.
4. Family — `خانواده`.
5. Anxiety — `اضطراب`.
6. Rizq — `رزق`.
7. Dua — `دعا`.
8. Tazkiyah — `تزکیه`.
9. Asma al-Husna — `اسماء الحسنی`.

The local seed distribution is currently:

- Iman: 6.
- Akhlaq: 20.
- Salah: 3.
- Anxiety: 2.
- Dua: 2.
- Tazkiyah: 19.
- Rizq: 2.
- Family: 1.
- Asma al-Husna: 8.

### Article behavior

- Browse article cards.
- Filter by category.
- Filter by scholar.
- Filter by language.
- Open a rich article reader.
- View author and category attribution.
- Bookmark articles.
- Share article title and author.
- Receive article-published notifications when registered.
- Synchronize published articles and verified scholars from Supabase.
- Fall back to local seed data when remote access is unavailable.

The article reader supports formatted headings, emphasis, lists, blockquotes, links, category styling, source/author areas, and content-specific language behavior.

### Scholar and admin capabilities

Verified scholars can use the scholar portal to create, edit, publish, and inspect articles and analytics. The general article admin route provides protected content management. These are not ordinary end-user features.

## 12. Hanafi prayer learning

The prayer-learning screen is explicitly described as:

`آموزش نماز طبق مذهب امام ابو حنیفه رحمه‌الله`

It currently contains 8 categories and 40 instructional sections:

1. Wudu — `وضو` — 5 sections.
2. Ghusl — `غسل` — 3 sections.
3. Prayer basics — `اصول نماز` — 5 sections.
4. Prayer recitations — `اذکار نماز` — 12 sections.
5. Prayer types — `انواع نماز` — 9 sections.
6. Sajda sahw — `سجده سهو` — 2 sections.
7. Janazah prayer — `نماز جنازه` — 3 sections.
8. Acknowledgements/contributor — `تقدیر و تشکر` — 1 section.

The instructional content covers wudu conditions, four wudu fard, wudu sunnah, wudu steps, post-wudu dua, ghusl causes and method, prayer conditions, prayer pillars, wajibs, sunnahs, makruh actions, prayer recitations, the five daily prayers, Jumu'ah, Eid, Taraweeh, Witr, Janazah, Duha, Tahajjud, Ishraq, sajda sahw, and Janazah dua.

Content is available in Dari and Pashto, with Arabic text for relevant recitations. This screen is educational guidance and should not replace a qualified local scholar for personal or complicated rulings.

## 13. Qibla compass

The Qibla screen uses the selected prayer city or precise GPS coordinates and calculates the bearing to the Kaaba.

It supports:

- Automatic location detection.
- Manual city selection.
- Live device heading when compass sensors are available.
- Qibla bearing in degrees.
- Current heading in degrees.
- Calibration overlay.
- Accuracy status and degraded mode.
- Alignment indicator when the phone points toward Qibla.
- Reuse of the same prayer city.

Without location, the app can show a setup state asking the user to permit location or select a city. Without compass access, it can still show a city-based calculated direction but not a live rotating compass.

## 14. More hub and progress tracking

The More tab is the feature center. Its main shortcuts include:

- Hanafi Mufti.
- Adhkar.
- Hadith.
- Articles.
- Jantari.
- Qibla.
- Prayer learning.
- Bookmarks.
- Adhan settings.
- Dua requests.
- Admin panel.
- Settings.

The progress dashboard tracks locally:

- Total ayahs read.
- Total ayahs listened to.
- Longest streak.
- Quran completions/khatm count.
- Today’s ayahs read.
- Today’s ayahs listened to.
- Today’s pages read.
- Today’s dhikr count.
- Current consecutive-day streak.
- Total Quran minutes.
- Total dhikr count.
- Ramadan progress array.

The dashboard also displays upcoming events, help/support content, creator information, location, date, and Adhan status.

## 15. Settings and preferences

### Themes

The app contains four themes:

- Light.
- Night/AMOLED-friendly dark.
- Turquoise blue.
- Light olive green.

### Quran and language preferences

Users can select:

- Quran font.
- Dari font.
- Pashto font.
- Arabic Quran font size.
- Translation font size.
- Scroll or Mushaf view mode.
- Dari, Pashto, both, or no translation.
- Auto-play audio.
- Repeat ayah.

Preferences, bookmarks, and the last reading position are persisted locally with AsyncStorage.

### Prayer settings link

Settings also shows the prayer calculation method and links to the dedicated Adhan settings screen. The app version currently displayed by the settings screen is `1.0.0`.

## 16. Dua request system

The dua area is called `دعای خیر و مشورت شرعی` and supports:

- New personal dua/advice request.
- Categories such as dua, advice, personal, and other.
- User gender selection: brother or sister.
- Responder selection from the configured responder registry.
- Request history and detail view.
- Offline pending queue.
- Cached request records.
- Retry/synchronization when online.
- AI-generated response support.
- Human/admin review and manual response support.
- Unread response count.

The current responder registry contains:

- Qari Syed Safiullah Shirzadi — `قاری سید صفی‌الله شیرزادی`.
- Syed Abdul Baqi Shirzadi — `سیدعبدالباقی شیرزادی`.

The local dua advisor detects Dari versus Pashto, provides spiritually supportive text, and adds a scholar-consultation recommendation for sensitive topics such as divorce, marriage, inheritance, riba, crime, suicide, abortion, serious illness, surgery, contracts, and related matters.

## 17. Hanafi Mufti AI chat

### User experience

The Mufti feature exists in two places:

1. The Home Hanafi Mufti widget.
2. The full `/mufti-chat` screen.

The full chat supports:

- Starter question chips.
- User and assistant message bubbles.
- Markdown-formatted assistant responses.
- Streaming response display.
- Copy assistant response.
- Clear conversation.
- Error display and dismissal.
- Multiline input up to 4,000 characters.
- Persistent local history of the latest 40 messages.

Starter questions currently include:

- `نماز ظهر چند رکعت است؟`
- `زکات طلا چگونه محاسبه می‌شود؟`
- `حق والدین بر فرزندان چیست؟`
- `حامیان این برنامه کیستند؟`
- `سازنده این برنامه کیست؟`
- `نماز مسافر چند رکعت است؟`

### Technical behavior

The mobile client sends sanitized user/assistant message history to a remote Supabase Edge Function named `hanafi-mufti`.

- Network is required.
- The service must be configured with a URL and anonymous key.
- The client sends at most the latest 40 messages.
- Each message is limited to 4,000 characters.
- Responses are consumed as Server-Sent Events (SSE).
- The assistant response streams incrementally into the UI.
- Conversation history is stored locally under the Hanafi Mufti storage key.
- The remote backend/system prompt is not included in this repository and cannot be inferred from the mobile client.

### Important AI boundary

The Mufti chat is a guidance feature. It must not be described as an independent, universally authoritative mufti. For sensitive, high-stakes, disputed, or highly personal matters, the bot should recommend consultation with a qualified Hanafi scholar.

## 18. Ramadan planner status

The repository contains a Ramadan planner implementation with:

- 30 daily Quran portions, one juz per day.
- A 30-day completion progress tracker.
- Daily Arabic duas and Dari translations.
- Suhoor/iftar and Ramadan advice content.
- Daily Ramadan map content.

However, the current route has `RAMADAN_SEASON_ACTIVE = false` and redirects users back to the More screen. Therefore the planner is implemented in code but currently inactive/archived in the normal application flow.

Do not tell users that the Ramadan planner is currently open unless the seasonal flag is enabled in the deployed build.

## 19. Data and architecture

### Mobile stack

- React Native 0.81.
- Expo SDK 54.
- Expo Router file-based navigation.
- TypeScript.
- React Context providers for global state.
- AsyncStorage for local persistence.
- Supabase client and Edge Functions for remote services.
- Expo Notifications and platform-native scheduling.
- Track Player for Naat playback.
- Custom Quran audio manager for ayah playback.
- Expo Location and Expo Sensors for location and compass behavior.
- Expo SQLite for Quran search indexing.

### Global providers

The application provider tree includes:

- AppProvider — theme, preferences, bookmarks, reading position.
- PrayerProvider — location, prayer times, Adhan, notification schedule, health.
- StatsProvider — reading, listening, dhikr, streak, and Ramadan progress.
- DuaProvider — dua requests, unread state, and synchronization.
- NaatProvider — Naat catalog, downloads, and player state.
- AhadithProvider — hadith data, daily selection, bookmarks, topics, search, notifications.
- ArticlesProvider — articles, scholars, bookmarks, and synchronization.
- ScholarProvider — scholar login/session and scholar data.

### Local/offline-first content

The following are bundled or locally persisted:

- Quran metadata and 114 surah files.
- Quran search database.
- Quran translations.
- Adhkar.
- Prayer-learning content.
- Local hadith seed.
- Local article seed.
- Local city data and calendar logic.
- App preferences and bookmarks.
- Quran reading position.
- Mufti chat history.
- Naat catalog cache and downloaded-file metadata.
- Dua request queue/cache.

### Remote or network-dependent content

The following may require internet or backend configuration:

- Hanafi Mufti responses.
- Remote hadith synchronization.
- Remote articles and scholar synchronization.
- Remote Naat catalog and remote audio.
- Dua submission, synchronization, and AI responses.
- Some prayer-time source requests and remote city/date support.
- Quran audio when the requested ayah is not cached.

The app generally uses local data, cache, or fallback data when possible, but this does not make every feature fully offline.

## 20. AI intent map for Mufiti Hanafi

The bot should classify questions into these intents:

| User intent | Direct to or explain |
|---|---|
| “Where is Quran?” | Bottom tab `قرآن` |
| “How do I find a surah?” | Quran tab, Surah search, or Juz mode |
| “How do I search an ayah?” | Search button, then Arabic/Dari/Pashto/All mode |
| “How do I resume reading?” | Quran tab, `ادامه تلاوت` card |
| “How do I save an ayah?” | Open an ayah and press bookmark |
| “How do I listen to Quran?” | Open surah, press ayah play or surah play |
| “How do I change Quran translation?” | Settings or reader translation controls |
| “Prayer times are wrong” | Verify city, location, date, Hanafi policy, and schedule health |
| “Adhan did not play” | Adhan settings, notification permission, exact alarms, battery/autostart, health screen |
| “How do I change city?” | Home city chip, Prayer screen, or Qibla city selector |
| “How do I find Qibla?” | More → Qibla or Home Qibla card |
| “What is Jantari?” | Calendar tab with Qamari/Shamsi/Gregorian modes |
| “Where are daily adhkar?” | More/Home → Adhkar |
| “How do I count dhikr?” | Adhkar → Dhikr counter |
| “Where is daily hadith?” | More → Hadith → Daily section |
| “How do I search hadith?” | Hadith → Search section |
| “Where are Islamic articles?” | More → Articles |
| “How do I learn prayer?” | More → Prayer learning |
| “Where are naats?” | Bottom tab `نعت` |
| “How do I request dua?” | Home/More → Dua request |
| “How do I ask the AI mufti?” | Home Mufti widget or More → Hanafi Mufti |
| “Where are saved items?” | More → Bookmarks; Quran ayah bookmarks are the primary saved-item screen |
| “How do I change appearance?” | More → Settings |
| “Where is Ramadan plan?” | Explain that the planner exists but is currently inactive when the seasonal flag is false |

## 21. Response policy for the Mufiti Hanafi bot

### Language

- Reply in the user’s language when clear.
- Support English feature names but use the app’s Dari/Pashto labels when giving navigation.
- Preserve Arabic religious text accurately.
- Use RTL-friendly wording for Dari and Pashto.

### App-navigation answers

When explaining a feature, give a short path such as:

`More / بیشتر → Hanafi Mufti / مفتی هوشمند حنفی`

Mention whether the feature is a visible bottom tab, a More shortcut, or a screen opened from another feature.

### Religious answers

- Prefer Hanafi-oriented guidance where the question is fiqh-related.
- Clearly distinguish an app feature explanation from a religious ruling.
- Do not invent a source, scholar, hadith grade, article, or app feature.
- For divorce, inheritance, marriage, riba, criminal matters, medical emergencies, suicide/self-harm, serious illness, or disputes requiring personal facts, recommend a qualified local Hanafi scholar or appropriate professional.
- Do not imply that a generated response replaces a fatwa or personal scholarly consultation.
- When citing a hadith or Quran ayah, avoid pretending the app has a full tafsir or fatwa database if the requested information is not present.

### Capability boundaries

The bot should explain that:

- Quran text, translations, adhkar, prayer-learning content, and local hadith seed are available locally.
- Mufti AI responses require internet and backend configuration.
- Remote articles, hadith updates, naats, dua synchronization, and some audio require internet.
- Adhan reliability depends on notification permission, exact alarms, battery/autostart settings, device OEM behavior, and selected location.
- Qibla live rotation requires location and compass access.
- The Ramadan planner is currently inactive when the seasonal flag is false.

## 22. Known limitations and source-of-truth notes

1. The remote Mufti Edge Function and its backend system prompt are not present in this repository.
2. The Mufti mobile client only defines transport, streaming, local history, and UI behavior; it does not define the backend’s theological knowledge.
3. Remote articles, hadiths, naats, and AI responses are dynamic and may not match the local seed counts later.
4. The current local Naat fallback contains 7 records, but the remote catalog can be larger.
5. The root `data/quran.json` file is not the authoritative complete Quran source; the 114 lazy-loaded files under `data/surahs/` are used by the current implementation.
6. Prayer-time calculations are policy-driven and location-dependent. A displayed time should not be treated as a universal time for every city.
7. Android background behavior varies by manufacturer, especially on aggressive battery-management devices.
8. Admin and scholar routes exist but require authentication/PIN/backend access and are not normal end-user features.
9. The Ramadan planner is present in code but currently redirected away from normal use because the seasonal feature flag is disabled.

## 23. Short bot summary

Ebadat is a Dari/Pashto RTL Islamic app with five visible tabs: Home, Quran, Jantari, Naat, and More. Its strongest user-facing features are the full offline Quran with translations and search, Hanafi prayer times and Adhan reminders, Qibla, Islamic/Afghan calendar tools, adhkar, hadith, naats, articles, prayer education, dua requests, and a remote Hanafi Mufti AI chat. The bot should guide users through the correct screen, answer in their language, respect Hanafi context, explain offline/online requirements, and recommend qualified scholars for sensitive or high-stakes religious questions.

## 24. Pashto interface implementation addendum

- The app now stores a separate persisted `appLanguage` preference: `dari` or `pashto`. This controls the interface language independently from the Quran translation selector.
- Users select the interface language during onboarding at `زبان برنامه` and can change it later from `More → Settings → App language`.
- Shared RTL text, navigation tabs, More dashboard labels, calendar event names/dates, adhkar category names, Naat headings, and key settings labels use Pashto when selected. Religious source content keeps its own authoritative Dari/Pashto fields rather than being machine-rewritten.
- The Quran translation selector remains separate and can show Dari, Pashto, both, or no translation.
- Notification permission, exact-alarm, battery-optimization, autostart, and Adhan-health guidance is intentionally forced to the Farsi (`fa`) catalog on both iOS and Android. This includes the app’s “enable notifications” and troubleshooting messages. The operating system’s native permission sheet may still follow the device system language and cannot be overridden by JavaScript.
