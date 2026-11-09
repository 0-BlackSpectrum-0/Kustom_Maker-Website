# Corpus Inventory and Ground Truth Report

Generated: 2026-11-09T16:04:39.242Z

## 1. Corpus Summary vs Plan Baselines

| Item | Plan Baseline (Section 3.4) | Measured Value | Status |
|---|---|---|---|
| KWGT Presets (samples repo) | 40 | 40 | VERIFIED |
| KWGT Previews (PNG) | 69 | 69 | VERIFIED |
| KLWP Presets (DarkWave repo) | 2 | 2 | VERIFIED |
| KOMP Presets (samples repo) | 1 | 1 | VERIFIED |
| Extra Samples (from APK) | 3 | 3 | VERIFIED |

## 2. Module Counts Across Corpus (F10)

| Module Type | Observed Count |
|---|---|
| ShapeModule | 2015 |
| OverlapLayerModule | 811 |
| StackLayerModule | 712 |
| TextModule | 392 |
| FontIconModule | 258 |
| ProgressModule | 66 |
| RootLayerModule | 44 |
| CurvedTextModule | 24 |
| KomponentModule | 11 |
| BitmapModule | 10 |

## 3. Enum Frequencies (F11)

### shape_type

| Value | Frequency |
|---|---|
| `RECT` | 1073 |
| `CIRCLE` | 536 |
| `RTRIANGLE` | 54 |
| `ARC` | 40 |
| `TRIANGLE` | 35 |
| `OVAL` | 12 |
| `SLICE` | 11 |
| `PATH` | 7 |
| `EXAGON` | 7 |

### config_stacking

| Value | Frequency |
|---|---|
| `HORIZONTAL_CENTER` | 271 |
| `VERTICAL_CENTER` | 249 |
| `HORIZONTAL_BOTTOM` | 31 |
| `HORIZONTAL_TOP` | 14 |
| `VERTICAL_RIGHT` | 13 |

### shape_rotate_mode

| Value | Frequency |
|---|---|
| `MANUAL` | 120 |
| `DEG270` | 42 |
| `DEG180` | 27 |
| `DEG90` | 17 |
| `FLIP_Y` | 6 |

### fx_gradient

| Value | Frequency |
|---|---|
| `VERTICAL` | 150 |
| `BITMAP` | 72 |
| `RADIAL` | 12 |
| `HORIZONTAL` | 9 |
| `SWEEP` | 4 |

### fx_mask

| Value | Frequency |
|---|---|
| `CLIP_NEXT` | 77 |
| `CLIP_ALL` | 17 |

### progress_mode

| Value | Frequency |
|---|---|
| `SHAPES` | 63 |

### config_rotate_mode

| Value | Frequency |
|---|---|
| `MANUAL` | 43 |
| `FLIP_Y` | 27 |
| `CLOCK_MINUTE` | 18 |
| `CLOCK_HOUR_SMOOTH` | 14 |
| `FLIP_X` | 11 |
| `DEG180` | 9 |
| `CLOCK_HOUR` | 5 |
| `DEG90` | 3 |
| `DEG270` | 3 |
| `CLOCK_MINUTE_SMOOTH` | 3 |
| `CLOCK_SECOND_SMOOTH` | 3 |

### paint_mode

| Value | Frequency |
|---|---|
| `CLEAR` | 376 |
| `XOR` | 61 |
| `SRC` | 16 |
| `DARKEN` | 9 |
| `LIGHTEN` | 4 |
| `MULTIPLY` | 1 |

### progress_rotate_mode

| Value | Frequency |
|---|---|
| `MANUAL` | 16 |
| `DEG270` | 1 |

### text_rotate_mode

| Value | Frequency |
|---|---|
| `DEG270` | 5 |
| `MANUAL` | 3 |
| `DEG90` | 1 |

### icon_rotate_mode

| Value | Frequency |
|---|---|
| `MANUAL` | 7 |
| `DEG90` | 2 |
| `DEG180` | 2 |

### text_size_type

| Value | Frequency |
|---|---|
| `FIXED_WIDTH` | 144 |
| `SINGLE_FIXED_WIDTH` | 27 |
| `FIT_TO_BOX` | 3 |

## 4. Property Binding / Toggles Cross-Tab (F8)

| Toggle Mode | Count | Stale / Matching Sub-counts |
|---|---|---|
| `0` (literal) | 1167 | stale formulas: 562, stale globals: 531 |
| `10` (formula) | 4839 | with formula: 4780, orphan: 59 |
| `100` (global) | 1655 | with global: 1655, orphan: 0 |
| Other | 0 | - |

## 5. Preset Info Releases and Features (F5, F6, F7)

### Release versions observed:
- `376422110`: 9 presets
- `377432414`: 1 presets
- `377435216`: 33 presets
- `378512015`: 2 presets
- `380522706`: 1 presets

### Feature tokens observed:
- `ANALOG_CLOCK`: 18
- `MUSIC`: 14
- `NOTIFICATIONS`: 10
- `BLUETOOTH`: 4
- `WEATHER`: 6
- `AIR_QUALITY`: 1
- `FORECAST`: 5
- `CALENDAR`: 3
- `SIGNAL`: 3
- `NETWORK_INFO`: 3

## 6. Formula Functions and `si()` Frequency (F14, F15)

### Function calls:

| Function | Frequency |
|---|---|
| `gv` | 5622 |
| `ce` | 1372 |
| `tc` | 1010 |
| `si` | 866 |
| `if` | 700 |
| `mu` | 238 |
| `mi` | 197 |
| `nc` | 97 |
| `ni` | 93 |
| `bp` | 77 |
| `df` | 52 |
| `bi` | 44 |
| `lv` | 33 |
| `wi` | 27 |
| `tu` | 25 |
| `ai` | 24 |
| `wf` | 21 |
| `rm` | 10 |
| `br` | 8 |
| `cm` | 7 |
| `ci` | 1 |

### `si()` keys:

| Key | Frequency |
|---|---|
| `rwidth` | 423 |
| `rheight` | 155 |
| `mindex` | 148 |
| `darkmode` | 70 |
| `sysca1` | 30 |
| `syscn1` | 16 |
| `darkwp` | 13 |
| `wpcolor1` | 6 |
| `syscn2` | 2 |
| `pkgname` | 1 |
| `alarmon` | 1 |
| `powersave` | 1 |

## 7. Resource Resolution Rates (F12)

| Status | Count |
|---|---|
| exact | 234 |
| alias_exact | 147 |
| alias_ci | 0 |
| exact_ci | 0 |
| missing | 129 |

## 8. Presets Catalog

| ID | Type | Dimensions | Release | Modules | Previews Matched | Size Mismatch |
|---|---|---|---|---|---|---|
| Clean_Time_Date_Info | kwgt | 918x542 | 376422110 | 12 | 2 | ⚠️ YES |
| Interstellar_Analog | kwgt | 916x1169 | 377435216 | 35 | 1 | ⚠️ YES |
| Interstellar_Analog_Khaki_Field_Murph_Auto | kwgt | 916x1482 | 377435216 | 17 | 1 | NO |
| Interstellar_Endurance | kwgt | 415x542 | 377435216 | 355 | 2 | ⚠️ YES |
| Interstellar_Endurance_Analog | kwgt | 415x542 | 377435216 | 361 | 2 | ⚠️ YES |
| Interstellar_Endurance_Analog_2 | kwgt | 415x542 | 377435216 | 359 | 1 | NO |
| iOS_Battery_Widget | kwgt | 416x542 | 376422110 | 8 | 1 | NO |
| Material3_Expanded_Media_Player | kwgt | 918x542 | 376422110 | 55 | 1 | NO |
| Material3_Media_Player_Output | kwgt | 916x542 | 377432414 | 57 | 1 | NO |
| material_notification_widget | kwgt | 916x226 | 377435216 | 21 | 3 | NO |
| Minimal_Media_Player | kwgt | 918x228 | 376422110 | 21 | 1 | NO |
| Minimal_Media_Player_2 | kwgt | 918x228 | 376422110 | 20 | 1 | NO |
| Minimal_Media_Player_3 | kwgt | 918x228 | 376422110 | 23 | 1 | NO |
| Mini_Media_Player | kwgt | 667x542 | 376422110 | 17 | 1 | NO |
| Nothing_Analog_ | kwgt | 415x542 | 377435216 | 9 | 2 | NO |
| Nothing_Analog_2 | kwgt | 415x542 | 377435216 | 12 | 2 | NO |
| Nothing_Analog_3 | kwgt | 415x542 | 377435216 | 6 | 2 | NO |
| Nothing_Analog_5 | kwgt | 415x542 | 377435216 | 11 | 2 | NO |
| Nothing_Analog_5_Transparent | kwgt | 415x542 | 377435216 | 10 | 2 | NO |
| Nothing_Battery | kwgt | 415x542 | 377435216 | 5 | 1 | NO |
| Nothing_Battery2 | kwgt | 415x542 | 377435216 | 16 | 2 | NO |
| Nothing_Battery_Mini | kwgt | 415x226 | 377435216 | 15 | 2 | NO |
| Nothing_CPU | kwgt | 415x542 | 377435216 | 37 | 2 | NO |
| Nothing_Date_Time | kwgt | 415x542 | 377435216 | 7 | 2 | NO |
| Nothing_Date_Time2 | kwgt | 415x542 | 377435216 | 17 | 2 | NO |
| Nothing_Date_Time3 | kwgt | 916x542 | 377435216 | 7 | 2 | NO |
| Nothing_Digital | kwgt | 415x542 | 377435216 | 10 | 2 | NO |
| Nothing_Digital2 | kwgt | 415x542 | 377435216 | 6 | 2 | NO |
| Nothing_Digital3 | kwgt | 415x542 | 377435216 | 184 | 2 | NO |
| Nothing_Digital4 | kwgt | 415x542 | 377435216 | 9 | 2 | NO |
| Nothing_Digital_Clock | kwgt | 415x542 | 377435216 | 12 | 2 | NO |
| Nothing_Future_Clock | kwgt | 916x542 | 377435216 | 15 | 2 | NO |
| Nothing_Master_Widget | kwgt | 916x1169 | 377435216 | 42 | 2 | NO |
| Nothing_Media_Player | kwgt | 916x542 | 377435216 | 183 | 2 | NO |
| Nothing_Media_Player2 | kwgt | 916x226 | 377435216 | 12 | 2 | NO |
| Nothing_Media_Player3 | kwgt | 415x542 | 377435216 | 153 | 2 | NO |
| Nothing_Mini_Calender | kwgt | 916x226 | 377435216 | 20 | 2 | NO |
| Nothing_Sun_Info | kwgt | 415x542 | 377435216 | 19 | 2 | NO |
| Nothing_Temp | kwgt | 415x542 | 377435216 | 5 | 2 | NO |
| Universal_Media_Player | kwgt | 918x542 | 376422110 | 17 | 1 | NO |
| Wave_Progress_Bar | komp | 485x49 | 376422110 | 38 | 0 | NO |
| 05_19_25_DarkWave_Release | klwp | 540x1200 | 378512015 | 678 | 0 | NO |
| 08_31_25_DarkWave_PreRelease | klwp | 540x1200 | 380522706 | 698 | 0 | NO |
| 05_19_25_DarkWave_Release_extra | klwp | 540x1200 | 378512015 | 678 | 0 | NO |
| Clock_01_extra | komp | 953x953 | 377435216 | 25 | 0 | NO |
| Clock_01_extra | kwgt | 1037x1037 | 377435216 | 26 | 0 | NO |
