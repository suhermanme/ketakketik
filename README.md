# KetakKetik (A type trainer application)

> Cross-platform typing trainer with an adaptive learning engine.

KetakKetik helps you improve your touch typing through adaptive practice. It analyzes your per-key performance — error rates, latency, and consistency — then generates training text that targets your weakest keys. Practice in a browser or as a packaged desktop app.

[User Guide](docs/USER_GUIDE.md) · [Build Instructions](docs/BUILDING.md) · [Development Guide](docs/DEVELOPMENT.md) · [Architecture](ARCHITECTURE.md)

---

## Quick start

| Target | Command |
| --- | --- |
| **Browser (dev)** | `npm ci && npm run dev` — open the printed URL (default `http://localhost:5173`) |
| **Browser (prod)** | `npm run typecheck && npm run build:web && npm run preview` |
| **Desktop (dev)** | `npm run dev:electron` |
| **Desktop (build)** | See [Build and deployment](docs/BUILDING.md) |

Stop the dev server with **Ctrl+C**.

### System requirements

- **Node.js** ≥ 18
- **npm** (any modern version)
- macOS, Windows, or Linux for desktop packaging (builds run on the target OS)

### Browser support

KetakKetik uses standard web APIs (Web Audio, IndexedDB, `FileReader`). It runs in the latest versions of Chrome, Firefox, Safari, and Edge. Desktop packaging uses Electron 33.

---

## Features

| Category | Details |
| --- | --- |
| **Practice modes** | *Practice* (adaptive), *Lessons* (finger drills), *Custom* (load a local `.txt` file) |
| **Adaptive engine** | Identifies your weakest keys using a weighted score (error rate 45 %, latency deviation 30 %, recency 15 %, volatility 10 %) and generates training text that favours those keys |
| **Lessons** | 64 progressive finger drills — single keys, repeated pairs, alternating patterns, mixed combinations, then combined rows |
| **Metrics** | Live WPM graph, accuracy, errors, duration, average WPM, peak WPM |
| **Virtual keyboard** | Pressed-key highlight, error flash, and target-key indicator |
| **Audio** | Three synthesized sound profiles (clicky, tactile, linear) with separate mistake and completion sounds |
| **Accessibility** | Confetti animation respects `prefers-reduced-motion` |
| **Themes** | Light, dark, and system-following; persisted per profile |
| **Profiles** | Multiple user profiles with local IndexedDB persistence |
| **Custom text** | Load a local UTF-8 `.txt` file (up to 1 MB) — files stay on your device |
| **Cross-platform** | Runs in any modern browser; packages as macOS DMG/app and Windows installer/portable EXE |

---

## How it works

### Adaptive learning engine

The engine is a standalone, stateless TypeScript module (`engine/`) with no external dependencies. Each session it:

1. **Scores every key** using error rate, latency deviation, recency of errors, and accuracy volatility.
2. **Identifies the weakest keys** and normalises scores to `[0, 1]`.
3. **Generates training text** from a curated English word list (1–12 letter words), favouring words that contain the identified weak keys.
4. **Computes a progress delta** comparing current and previous weak keys to report improvement or decline.

Seeds are derived from profile ID, UTC date, and lesson index, so every session is deterministic and reproducible.

### Data flow

```
User keystrokes
  → useTypingSession hook (metrics, char states)
  → AudioEngine (Web Audio API synthesis)
  → ProfileStore (IndexedDB — sessions, WPM history, key errors, latency logs)
  → AdaptiveEngine (per-key scoring, text generation)
  → React components (TrainingDisplay, Keyboard, WpmGraph, MetricPanel)
```

### Storage

| Data | Location |
| --- | --- |
| Theme & profile selection | Browser `localStorage` |
| Sessions, WPM history, key errors, latency logs | Browser `IndexedDB` (profile-scoped) |
| Custom text | Memory only (loaded from a local file) |
| Audio state | Runtime only |

There is no account service or cloud sync. Browser and desktop storage are separate.

---

## Project structure

```
ketakketik/
├── app/                      # Browser application
│   ├── src/                  # Entry point + App component
│   ├── components/           # React components (Keyboard, WpmGraph, etc.)
│   ├── hooks/                # React hooks (useTypingSession, useAudio, etc.)
│   ├── audio/                # AudioEngine + sound profiles
│   ├── persistence/          # IndexedDB layer (ProfileStore, schema, types)
│   ├── utils/                # Lessons, text generation, custom text loader
│   ├── types/                # Shared TypeScript interfaces
│   └── styles/               # Tailwind + custom CSS
├── engine/                   # Adaptive learning engine (standalone, zero deps)
│   ├── src/                  # engine.ts, interfaces.ts, wordList.ts
│   ├── tests/                # Engine unit tests
│   └── docs/                 # Algorithm design (historical)
├── electron/                 # Electron desktop support
│   ├── main.ts               # Window lifecycle, IPC handlers
│   ├── preload.ts            # Context-isolation bridge
│   └── entitlements.plist    # macOS codesigning entitlements
├── build/                    # App icons (various resolutions)
├── public/                   # Static assets (icons, manifest)
├── scripts/                  # Build/dev helpers
├── docs/                     # User guide, build instructions, dev guide
├── dist/                     # Build output
├── release/                  # Electron packaging output
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Development

### Commands

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server (browser) |
| `npm run dev:electron` | Start Vite + Electron desktop |
| `npm run build` | Full build (tsc + vite) |
| `npm run build:web` | Browser-only build |
| `npm run build:electron` | Electron packaging build |
| `npm run preview` | Local preview of the production build |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run vitest in watch mode |
| `npm run lint` | ESLint check |

### Tests

The suite covers the engine, audio scheduling, finger drills, and custom-text validation:

```sh
npm test
```

Passing checks do not replace interactive UI testing or installed-app testing.

### Adding a new sound profile

Create a file in `app/audio/` that exports a `SoundProfile` object (matching the `SoundProfile` type in `app/audio/types.ts`), then register it in the profile selector. Each profile defines `keyDown` and `keyUp` oscillator parameters (waveform, frequency, filter, duration, gain).

---

## Desktop packaging

**Packaging status:** macOS DMG builds successfully on macOS. Windows and Linux builds require the respective host OS.

Build on the corresponding target operating system:

| Artifact | Command | Output |
| --- | --- | --- |
| macOS DMG | `npm run build:electron` | `release/*.dmg` |
| macOS app folder | `npm run build:electron -- --mac --dir` | `release/mac-arm64/KetakKetik.app` |
| Linux AppImage | `npm run build:electron -- --linux appimage` | `release/*.AppImage` |
| Linux .deb | `npm run build:electron -- --linux deb` | `release/*.deb` |
| Windows x64 installer | `npm run build:electron -- --win nsis --x64` | `release/` (Windows host) |
| Windows x64 portable EXE | `npm run build:electron -- --win portable --x64` | `release/` (Windows host) |

The `.app` / `.exe` bundles the Electron runtime. End users do not install Node.js or start Vite.

See [Build and deployment](docs/BUILDING.md) for complete instructions, architecture selection, local server-free testing, icons, and troubleshooting.

---

## Documentation

- [User guide](docs/USER_GUIDE.md) — modes, lessons, custom files, controls, metrics, audio, themes, profiles
- [Build and deployment](docs/BUILDING.md) — browser dev, static hosting, Electron dev, macOS DMGs, Linux AppImage/deb, Windows installers
- [Development guide](docs/DEVELOPMENT.md) — source layout, data flow, testing, extension points, known limitations
- [Original architecture specification](ARCHITECTURE.md) — historical design intent; not a statement of current implemented behavior
- [Engine algorithm design](engine/docs/algorithm-design.md) — mathematical formulation and scoring details
- [Engine README](engine/README.md) — engine usage, generation, and scoring overview

---

## Technology stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (strict mode) |
| Framework | React 19 |
| Build | Vite 6 |
| Styling | Tailwind CSS 3, PostCSS, custom animations |
| State | React hooks (no external state library) |
| Persistence | IndexedDB (via custom wrapper) |
| Audio | Web Audio API (procedural synthesis) |
| Desktop | Electron 33 (context isolation, IPC bridge) |
| Testing | Vitest |
| Linting | ESLint 9 |
| Icons | PNG icon set (16–512 px) + PWA manifest |

---

## Known limitations

- The adaptive engine currently receives **empty performance inputs** from the main UI, so it does not yet personalise practice from saved session data.
- Session history is persisted in IndexedDB but is not wired up in the current UI.
- Browser and desktop storage namespaces are separate.
- Desktop installer builds have not been verified.

---

## License

Information not yet specified.
