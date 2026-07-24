# A17 performance findings (Quran-focused)

Device: Samsung Galaxy A17 (`SM-A175F`, serial `RRGL30AEGFZ`)  
Build: local release APK after post-interactive serialize work  
Date: 2026-07-24

## Verdict

Cold start and post-home idle remain healthy on A17. The main remaining jank surface is **Quran reader scroll/render** (especially Al-Baqara with translation on)—not surah JSON load and not cold-start adhan.

## Cold start (2×)

| Metric | Run 1 | Run 2 |
|--------|-------|-------|
| Interactive ready | 651ms | 630ms |
| Splash dismissed | ~8.3s | ~4.6s |
| `mqt_v_js` T+15 | 0% | 0% |
| `mqt_v_js` T+20 | 0% | 1.4% |
| Adhan | `done … native=31` (~510–569ms) | same |
| `FIRE_ADHAN` alarms | present | present |

Post-interactive smoothness bar still holds.

## Tab smoke

After ~20s settle (`mqt≈0`):

| Tab | Peak `mqt_v_js` (≈2.5s window) | Notes |
|-----|--------------------------------|-------|
| Quran (first open) | **100%** (avg ~51%) | First mount of `SurahList` |
| Jantari | ~29% | Mild |
| More | ~0% | Light |
| Home | ~0% | Already warm |
| Quran (second) | ~0% | `freezeOnBlur` / already mounted |

## Quran deep dive

### Data load (instrumented, then removed)

Opening Al-Baqara logged:

- `getSurahSync require surah=2 … ms=1`
- `convertToLegacy … ms=1`
- `reader getSurah … ms=2`
- `MushafView getSurah … ms=0`

Surah JSON is already in the Hermes bundle; **parse/remap is not the bottleneck** on A17 once the module is resident.

### Open cost (CPU)

| Surface | Peak `mqt` | Avg `mqt` (sample window) |
|---------|------------|---------------------------|
| Al-Fatiha open (~4s) | ~31% | ~10% |
| Al-Baqara open (~5s) | **100%** | **~97%** |
| Baqara idle after open (no scroll) | drops toward idle by ~3.5–5s | — |

Screenshots confirmed Fatiha and Baqara readers painted correctly (translation ON by default).

### Scroll cost

With translation visible (Dari on), fling scroll through Baqara sustained:

- peak **~104%**, avg **~96%** `mqt_v_js` across 8–10 swipes

This matches the UI: each row is a heavy card (Uthmani Arabic + Dari block + actions) in a vertical FlatList.

### Search

First open of search DB (cold process):

- copy **~285ms**, open **~34ms**, FTS available

Warm reopen: copy ~15ms, open ~44ms.

ADB could not reliably inject Arabic query text; query path did run (`searchQuranPaged`) when the field fired. DB open cost is modest vs reader scroll.

### Adhan non-regression

After Quran stress: **71** `FIRE_ADHAN` alarm tags still present; no `native=0` wipe observed.

## Ranked hotspots

1. **Baqara (large surah) FlatList render + scroll** with translation cards — sustained ~95–100% Hermes  
2. **First Quran tab mount** (`SurahList`) — short ~100% spike  
3. **Search DB first copy** (~285ms) — one-time I/O, acceptable  
4. **Surah JSON / legacy convert** — measured ~1–2ms; not the pain point on A17  

## Recommended follow-up fixes (not done in this pass)

1. **Reader list virtualization / row cost** — FlashList or tighter FlatList props; simplify `AyahRow` (fewer nested views/shadows); memo translation subtree  
2. **Defer or lazy-mount translation text** — render Arabic first; mount Dari/Pashto after interaction or only for viewable rows  
3. **Avoid duplicate remaps** — MushafView + reader both call `getSurah`; ensure single legacy convert path (already cached, but keep it that way)  
4. **Optional: async first paint** — skeleton while pinning cache so navigation gesture isn’t competing with first 286-row layout  
5. **Search** — optional idle warm of DB after `isAdhanSettled` if first-search latency matters; not urgent vs scroll  

## Constraints respected

- No adhan horizon/debounce/coalesce weakening  
- No root calendar prewarm  
- Temporary `[QuranPerf]` markers removed after measurement  
