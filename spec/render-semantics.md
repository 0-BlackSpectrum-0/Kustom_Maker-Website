# Kustom Biomolecular & Vector Render Semantics

Provenance: decompiled:org/kustom/lib/render + sample:corpus + docs:kustom.rocks

## 1. Units and Scaling System
- One Kustom unit = `min(canvas.width, canvas.height) / 720` px.
- Every layer and group multiplies coordinates and dimensions by `config_scale_value / 100`.
- Position offsets (`position_offset_x`, `position_offset_y`) apply to children of `RootLayerModule`, `OverlapLayerModule`, and `KomponentModule`.
- When anchored to right (`gx > 0`) or bottom (`gy > 0`), offset acts as an inward margin (subtracted from edge).
- For multi-screen KLWP (`screens > 1`), horizontal scroll position is calculated as `screenScrollX = -Math.round(screenOffset * (screens - 1) * innerW)`.

## 2. Anchoring and Alignment
- 9-point grid: `TOPLEFT`, `TOP`, `TOPRIGHT`, `CENTERLEFT`, `CENTER`, `CENTERRIGHT`, `BOTTOMLEFT`, `BOTTOM`, `BOTTOMRIGHT`.
- Relative origin computed against parent bounds.
- 4-way padding (`position_padding_left`, `position_padding_top`, `position_padding_right`, `position_padding_bottom`) expands the measured bounding box.

## 3. Text Measurement & Sizing Rules
- Exact font measurement via Canvas 2D `measureText()` with `font` string matching rendering context.
- Cached by `(font, fontSize, text)` tuple.
- Line height standard: `1.25 * fontSize`.
- Sizing modes (`text_size_type`):
  - `SINGLE_FONT_HEIGHT`: Standard single or newline-delimited text.
  - `SINGLE_FIXED_WIDTH`: Single-line text scaled down proportionally if measured width exceeds `text_width`.
  - `FIXED_WIDTH`: Multi-line text wrapped at word boundaries within `text_width`, constrained up to `text_lines` lines.
  - `FIT_TO_BOX`: Fitted to bounding bounds.

## 4. Stacking Rules (`StackLayerModule`)
- Stacking directions: `VERTICAL_LEFT`, `VERTICAL_CENTER`, `VERTICAL_RIGHT`, `HORIZONTAL_TOP`, `HORIZONTAL_CENTER`, `HORIZONTAL_BOTTOM`.
- Sequential accumulation along main axis with `config_margin` gap.
- Cross-axis alignment determined by anchor suffix (e.g. `_CENTER`, `_LEFT`, `_RIGHT`).

## 5. Shapes and Geometry
- `RECT`: Rectangle with optional uniform corner radius (`shape_corners`).
- `CIRCLE`: Ellipse with equal radii (`shape_width / 2`).
- `OVAL`: Ellipse with radii `shape_width / 2` and `shape_height / 2`.
- `TRIANGLE`: Equilateral or isosceles triangle pointing upwards.
- `RTRIANGLE`: Right-angled triangle.
- `ARC`: Stroke or sector sweep from `0` to `shape_angle` degrees.
- `SLICE`: Filled pie wedge.
- `EXAGON`: 6-sided polygon.
- `PATH`: Raw SVG Path definition (`M ... Z`).

## 6. Blend Modes (`paint_mode`)
Canvas 2D composite mapping:
- `NORMAL` -> `source-over`
- `CLEAR` -> `destination-out` (erases in current offscreen group buffer)
- `SRC` -> `copy`
- `DST` -> `destination-over`
- `XOR` -> `xor`
- `DARKEN` -> `darken`
- `LIGHTEN` -> `lighten`
- `SCREEN` -> `screen`
- `ADD` -> `lighter`
- `OVERLAY` -> `overlay`
- `MULTIPLY` -> `multiply`

## 7. Clipping Masks (`fx_mask`)
- `CLIP_NEXT`: The current module acts as an alpha mask for the immediately following sibling.
- `CLIP_ALL`: The current module acts as an alpha mask for all subsequent siblings within the same group.
- `BACKGROUND`: Masks against the background.

## 8. Gradients & Textures
- `VERTICAL`, `HORIZONTAL`: Linear gradients between `paint_color` and `fx_gradient_color`.
- `RADIAL`: Radial gradient centred at (`fx_gradient_offset_x`, `fx_gradient_offset_y`).
- `SWEEP`: Angular / conic gradient starting at 0 degrees.
- `BITMAP`: Pattern fill using image referenced by `fx_gradient_bitmap`.

## 9. Rotation Modes
- `NONE`: 0 degrees.
- `MANUAL`: Static angle in degrees.
- `DEG90`, `DEG180`, `DEG270`: Fixed 90-degree steps.
- `FLIP_X`, `FLIP_Y`: Horizontal / vertical mirror transform.
- `CLOCK_HOUR`: Stepped by hour hand (`hour * 30` deg).
- `CLOCK_HOUR_SMOOTH`: Continuous hour hand rotation (`(hour % 12 + minute / 60) * 30` deg).
- `CLOCK_MINUTE`: Stepped by minute (`minute * 6` deg).
- `CLOCK_MINUTE_SMOOTH`: Continuous minute hand (`(minute + second / 60) * 6` deg).
- `CLOCK_SECOND`: Stepped second hand (`second * 6` deg).
- `CLOCK_SECOND_SMOOTH`: Smooth sweep seconds hand (`(second + ms / 1000) * 6` deg).
