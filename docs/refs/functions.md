# Kustom Official Function Reference Summary

Summarized from https://docs.kustom.rocks/reference/functions/

## Function Families

| Family | Name | Purpose | Tier |
|---|---|---|---|
| `gv` | Global Variables | Fetch defined global values or evaluate global formulas | T1 (Exact) |
| `ce` | Color Editor | Manipulate colors (alpha, luminance, saturation, contrast) | T1 (Exact) |
| `si` | System Info | Query system state (dark mode, screen metrics, alarms) | T1 (Exact) |
| `tc` | Text Converter | String operations (split, cut, uppercase, regex, format) | T1 (Exact) |
| `if` | Conditional | Conditional branching \`$if(cond, then, else)\` | T1 (Exact) |
| `df` | Date / Time Format | Date and clock formatting with offset parsing | T1 (Exact) |
| `mu` | Math Utilities | Math operations (round, floor, ceil, sin, cos, min, max) | T1 (Exact) |
| `lv` | Local Variables | Define and retrieve scoped local variables | T1 (Exact) |
| `tf` | Timespan Format | Format elapsed seconds into timespans | T1 (Exact) |
| `cm` | Color Maker | Construct #AARRGGBB color from ARGB components | T1 (Exact) |
| `fl` | For Loop | Iterate and concatenate expressions | T1 (Exact) |
| `dp` | Date Parse | Parse date strings into epoch timestamps | T1 (Exact) |
| `mi` | Music Info | Current media title, artist, cover art, track progress | T2 (Simulated) |
| `bi` | Battery Info | Battery level, charging state, temperature, voltage | T2 (Simulated) |
| `wi` | Weather Info | Current temperature, condition, icon, humidity, wind | T2 (Simulated) |
| `wf` | Weather Forecast | Multi-day / hourly forecast data arrays | T2 (Simulated) |
| `ai` | Astronomy Info | Solar / lunar coordinates, sunrise, sunset, moon phase | T2 (Simulated) |
| `ci` | Calendar Info | Calendar appointments, start time, title, location | T2 (Simulated) |
| `rm` | Resource Metrics | Internal storage and RAM metrics | T2 (Simulated) |
| `mq` | Media Queue | Next / previous queued tracks | T2 (Simulated) |
| `nc` | Network Connectivity| WiFi SSID, cellular signal, IP address | T2 (Simulated) |
| `ni` | Notification Info | Active notifications count, title, text, app package | T2 (Simulated) |
| `bp` | Bitmap Palette | Extract vibrant, muted, dominant colors from image | T2 (Simulated) |
| `aq` | Air Quality | AQI index, PM2.5, PM10 levels | T2 (Simulated) |
| `li` | Location Info | Street address, city, coordinates | T2 (Simulated) |
| `uc` | Unread Counts | Missed calls, unread SMS | T2 (Simulated) |
| `fd` | Fitness Data | Daily steps, distance, active minutes | T2 (Simulated) |
| `ts` | Traffic / Commute | Travel time to destination | T2 (Simulated) |
| `tu` | Timer Utilities | Periodic tick and timer events | T2 (Simulated) |
| `gh` | GitHub Info | Repository stars, issues, commit status | T2 (Simulated) |
| `sh` | Shell | Execute shell commands on Android | T3 (Placeholder) |
| `wg` | Web Get | Fetch HTTP / RSS / JSON responses | T3 (Placeholder) |
| `br` | Broadcast Receiver | Listen to Android broadcast intents | T3 (Placeholder) |
| `cd` | Countdown | Countdown timers | T3 (Placeholder) |
