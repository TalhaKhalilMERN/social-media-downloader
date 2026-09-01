# Video Downloader - Web Application Foundation

A modern web application built with Next.js App Router, TypeScript, Tailwind CSS, and `yt-dlp` for analyzing video URLs and detecting stream qualities.

## Current Project Scope

This first phase implements **Step 1–3**:
1. Paste a video URL.
2. Submit the URL for server-side analysis.
3. Extract and display normalized video metadata and detected quality formats using `yt-dlp`.

> **Note**: Actual video downloading, database storage, user authentication, and FFmpeg quality conversion (e.g., converting 720p to 480p/360p) are **NOT** included in this phase. FFmpeg is installed as a prerequisite for future steps.

---

## System Requirements

- **Node.js**: `v18.x` or higher (Node.js v20+ recommended).
- **yt-dlp**: Must be available on system `PATH` or configured via `YTDLP_PATH` environment variable.
- **FFmpeg**: Must be installed on the host machine (required for future conversion stages).

### Verification Commands

Verify system dependencies by running:

```bash
# Check yt-dlp version
yt-dlp --version

# Check FFmpeg version
ffmpeg -version
```

*If `yt-dlp` is located in a custom path (e.g. `C:\Users\talha\Downloads\yt-dlp.exe`), the backend automatically detects it or reads `process.env.YTDLP_PATH`.*

---

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Open Application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing the Analysis API (`POST /api/analyze`)

You can test the analyzer via cURL or any HTTP client:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}"
```

### Sample Response Structure

```json
{
  "success": true,
  "video": {
    "title": "Example Video Title",
    "duration": 212,
    "webpageUrl": "https://example.com/video",
    "extractor": "Youtube",
    "thumbnail": "https://...",
    "width": 1280,
    "height": 720
  },
  "formats": [
    {
      "formatId": "22",
      "extension": "mp4",
      "width": 1280,
      "height": 720,
      "resolution": "720p",
      "videoCodec": "avc1.64001F",
      "audioCodec": "mp4a.40.2",
      "protocol": "https",
      "filesize": 15420000
    }
  ]
}
```

---

## Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + Custom Dark Aesthetics
- **Icons**: Lucide React
- **Process Manager**: Node.js `child_process.execFile` (safe array argument passing without shell interpolation)
