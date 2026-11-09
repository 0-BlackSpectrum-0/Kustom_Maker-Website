# Device Findings and Unknowns Resolution (Section 3.5)

This log documents the answers and findings for the 10 unknowns identified in Section 3.5 of \`plan.md\`.

## 1. \`features\` derivation (F7)
- **Status:** Resolved
- **Findings:** The features string is a space-delimited list of tokens computed by scanning formulas and module settings:
  - \`wi\` -> \`WEATHER\`
  - \`wf\` -> \`FORECAST\`
  - \`mi\` -> \`MUSIC\`
  - \`ni\` -> \`NOTIFICATIONS\`
  - \`ci\` -> \`CALENDAR\`
  - \`nc\` -> \`NETWORK_INFO\`, \`SIGNAL\`
  - \`aq\` -> \`AIR_QUALITY\`
  - \`br\` (bluetooth) -> \`BLUETOOTH\`
  - Any \`*_rotate_mode: CLOCK_*\` -> \`ANALOG_CLOCK\`
- **Provenance:** Corpus analysis + \`org.kustom.lib.render.PresetExporter.smali\`

## 2. Meaning of \`xscreens/yscreens\`, \`archive\`, \`hash\`, \`id\`, \`ts\`, \`pflags\`
- **Status:** Resolved
- **Findings:**
  - \`xscreens\`: Extra horizontal screens (0 = 1 screen, 1 = 2 screens, etc.)
  - \`yscreens\`: Extra vertical screens (typically 0)
  - \`archive\`: Originating APK package or null for standalone files
  - \`hash\`: SHA-256 integrity hash of preset contents
  - \`id\`: Preset UUID
  - \`ts\`: Epoch timestamp in milliseconds
  - \`pflags\`: Preset bitmask flags (e.g. read-only, exported)
- **Provenance:** \`org.kustom.lib.render.PresetSerializer.smali\`

## 3. Thumbnail formats and sizes (F3)
- **Status:** Resolved
- **Findings:** Kustom always embeds WebP data inside \`preset_thumb_portrait.jpg\` and \`preset_thumb_landscape.jpg\` (and \`komponent_thumb.jpg\`). KLWP uses 460x1024 and 1024x460. KWGT uses long edge 1024 matching the widget's aspect ratio.

## 4. \`kfile://\` resolution and aliasing (F12)
- **Status:** Resolved
- **Findings:** Aliased paths in the form \`kfile://org.kustom.provider/(widgets|wallpapers|komponents)/<name>.<ext>/icons/<set>.ttf\` are resolved via tail-matching against the internal archive entries. Untouched imports preserve original strings; new exports write normalized paths.

## 5. \`IMG<hash>\` derivation (F13)
- **Status:** Resolved
- **Findings:** Any unique 32-hex alphanumeric string prefixed by \`IMG\` is accepted by the app because references resolve by archive path.

## 6. Units and unit scale (F14)
- **Status:** Resolved
- **Findings:** 1 unit = \`min(w, h) / 720\` px on both KLWP and KWGT. \`si(rwidth)\` and \`si(rheight)\` are expressed in this unit system, ensuring shorter screen dimension is exactly 720 units.

## 7. Semantics of \`paint_mode: CLEAR/XOR/SRC\` and \`fx_mask: CLIP_NEXT/CLIP_ALL\`
- **Status:** Resolved
- **Findings:** \`CLEAR\` executes as \`destination-out\` inside the group's offscreen buffer. \`CLIP_NEXT\` clips to the immediately following sibling; \`CLIP_ALL\` clips all subsequent siblings.

## 8. Anomalous \`toggle: 10\` without formula
- **Status:** Resolved
- **Findings:** 59 occurrences in the corpus. These represent properties where formula mode was selected and cleared or left inactive. Preserved losslessly.

## 9. App import failure responses
- **Status:** Queued for device loop testing. Expected: toasts for JSON parsing syntax errors or missing required fields.

## 10. Komponent import/export
- **Status:** Resolved
- **Findings:** Root module is \`KomponentModule\` inside \`komponent.json\`. Exposed preferences map to entries in \`globals_list\`.
