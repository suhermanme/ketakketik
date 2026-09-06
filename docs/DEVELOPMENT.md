# Development and architecture

[Back to README](../README.md)

## Implementation overview

The application is a React renderer shared by web and Electron. There is no required backend. The Electron main process owns the desktop window; the renderer handles lesson generation, keyboard input, metrics, audio, themes, file reading, and profile UI.

```text
Browser entry / Electron BrowserWindow
                |
            app/src/App.tsx
                |
       mode + selected lesson + custom file
                |
          useTypingSession
           /      |       \
  AdaptiveEngine drills   custom text
                |
  text/cursor/stats/history/completion
                |
  TrainingDisplay + Keyboard + WpmGraph + MetricsPanel
                |
        feedback audio + confetti
```

## Source map

| Path | Responsibility |
| --- | --- |
| `app/src/main.tsx` | React root and CSS entry |
| `app/src/App.tsx` | Shared application layout, mode/file controls, keyboard/audio integration |
| `app/hooks/useTypingSession.ts` | Session lifecycle, keystroke validation, cursor, metrics, WPM history |
| `app/hooks/useAudio.ts` | Audio engine lifetime and settings |
| `app/hooks/useTheme.ts` | Theme selection, media-query subscription, local persistence |
| `app/hooks/useProfile.ts` | Local profile UI and local-storage access |
| `app/components/TrainingDisplay.tsx` | Whole-word wrapping, character feedback, scrolling, completion overlay |
| `app/components/Keyboard.tsx` | Responsive key layout and pressed/error/target states |
| `app/components/WpmGraph.tsx` | SVG time-series graph |
| `app/components/MetricPanel.tsx` | Metrics, actual-length progress, lesson controls |
| `app/components/CompletionConfetti.tsx` | Timed completion animation with reduced-motion support |
| `app/utils/lessons.ts` | Mode types, 64-drill curriculum, deterministic drill generation |
| `app/utils/customText.ts` | Local file validation and whitespace normalization |
| `app/utils/keymap.ts` | Simplified QWERTY layout metadata |
| `app/audio/AudioEngine.ts` | Web Audio oscillator creation, scheduling, envelopes, compressor, cleanup |
| `engine/src/engine.ts` | Seeded generation, weakness scoring, metadata, progress comparison |
| `engine/src/wordList.ts` | Deduplicated word dictionary and actual-length buckets |
| `app/persistence/` | Separate IndexedDB schema/store implementation, not wired to the current UI |
| `electron/main.ts` | Desktop startup and window configuration |
| `electron/preload.ts` | Incomplete bridge implementation; see limitations |
| `public/` | Copied static icons and web manifest |

The root Vite and TypeScript configurations map `@ketakketik/engine` to `engine/src`. The UI consumes source directly, so building or publishing the standalone engine package is not required for normal app development. `app/utils/textGenerator.ts` retains older character-based helpers; the current session path does not call them.

## Session lifecycle

The active profile, mode, selected drill, or custom text can trigger regeneration. Restart clears the existing session without changing its text. Practice generation uses a profile/date/lesson-index seed; successive variations are reproducible for those inputs. Lessons use their own seeded generator. Custom text is read with the browser File API.

The first character starts the clock. Correct input advances the cursor. Incorrect input increments errors and briefly marks the current position. Backspace moves back while unfinished. Completion sets `completedAt`, stops periodic metric updates, and triggers feedback and confetti. Reset clears character timers, metric history, and completion state.

WPM is cursor position × 12,000 / elapsed milliseconds, using at least 1,000 ms as the denominator. Current and average WPM use the same session-wide rate. The one-second interval updates duration and rate even during pauses. History retains at most one current sample per elapsed-second bucket. A final reading remains visible after completion.

There is no dedicated pause action, historical session save, or persisted curriculum advancement.

## Practice engine

The engine accepts a key matrix, recent sessions, previous weak keys, and a previous key matrix. It combines error rate, latency deviation, recent errors, and volatility with weights 0.45, 0.30, 0.15, and 0.10. It normalizes scores and identifies a configured number of weak keys.

Generation selects complete dictionary words, preferentially covering supplied weak keys, and respects the target length without cutting the final word. The default focus proportion is 0.60. Not every legacy configuration field influences the new word generator: contextual bigram proportions and word-length metadata should not be treated as enforced word-selection behavior.

The UI currently supplies empty matrices/history on every generation. Consequently, implemented scoring capability does not imply end-to-end adaptive learning. Connecting recorded data to the engine is future work.

## Audio lifecycle

AudioContext creation/resume occurs through playback initiated by user interaction. Each ordinary key event uses a new oscillator connected through filter, gain envelope, and compressor to the destination. Oscillators cannot be restarted after use; ended voices disconnect their nodes.

Completion schedules four ascending sine tones; a mistake schedules two descending triangle tones. Mistake presses replace the normal downstroke sound and suppress the associated release sound. Master volume applies to both normal and feedback sounds. Destruction stops active voices and closes the context.

Audio tests use a fake AudioContext: they verify scheduling, connections, fresh oscillators, cleanup, mute, and profiles, but do not prove actual speaker output.

## Persistence boundary

Current profile/theme UI uses `localStorage`; current session, mode, file contents, audio preferences, and selected drill are in React memory. The IndexedDB layer uses the database name `ketakketik`, but its presence is not evidence that session history is saved. No backend or cloud synchronization is configured.

## Extending the app

### Add or adjust a finger drill

Edit the groups/stages in `app/utils/lessons.ts`, then run the lesson tests. Keep `keys` consistent with generated text. Add physical keys to `keymap.ts` as needed and update the coverage test and user guide. The UI reads the lesson list and final index dynamically.

### Add practice vocabulary

Edit `engine/src/wordList.ts`. Keep entries keyboard-typeable; the exported dictionary is deduplicated and grouped by actual string length. Test exact-length output and whole-word membership after changes. Update the engine guide if generation behavior changes.

### Adjust audio

Ordinary profiles live in `app/audio/clicky.ts`, `tactile.ts`, and `linear.ts`. Completion/mistake note sequences are in `AudioEngine.playFeedback`. Keep gain envelopes, master volume, and cleanup intact; test repeated playback and mute.

### Change icons

The master runtime PNG is `public/icons/icon.png`. Regenerate favicon, 192/512 PNGs, touch icon, and macOS ICNS together. Preserve real alpha transparency around the rounded tile. Packaged icon paths are configured in `package.json`; the web entry declares icons and manifest. `build/icons/PROMPT.md` records the generation brief. Rebuild and restart to test the Dock icon.

## Tests and validation

From the root:

```sh
npm run typecheck
npm test
npm run build
npm run build:web
```

Targeted test runs:

```sh
npm test -- app/utils/tests/lessons.test.ts
npm test -- app/utils/tests/customText.test.ts
npm test -- app/audio/tests/AudioEngine.test.ts
npm test -- engine/tests/engine.test.ts
```

`npm run test:watch` runs Vitest interactively. Current coverage is 36 engine tests, five audio tests, three lesson tests, and three custom-file tests (47 total). Test counts may change with implementation.

Manual release checks should include all modes, first keystroke, spaces, Backspace, errors, pauses, completion, restart, mode switching, custom-file rejection, theme changes, resizing, actual speaker output, and installed-app launch without a development server. Validate separately on macOS and Windows. Browser builds and TypeScript checks do not verify Electron preload behavior or installer success.

## Known limitations

These are findings from the current code, not changes made as part of documentation:

- **Packager dependency:** `build:electron` references `electron-builder`, but it is absent from the checked-in dependencies. Install it before packaging.
- **Preload format:** TypeScript emits ESM syntax into `preload.js`. Electron requires `.mjs` for ESM preloads; sandboxed preloads require another compatible approach. See [Electron ESM documentation](https://www.electronjs.org/docs/latest/tutorial/esm).
- **Bridge API:** `preload.ts` casts and calls `contextBridge.register`, which is not the documented contextBridge exposure API. Use `exposeInMainWorld` when implementing the bridge. See [Electron contextBridge](https://www.electronjs.org/docs/latest/api/context-bridge).
- **IPC mismatch:** preload methods use `ipcRenderer.invoke`, but main uses `ipcMain.on`; request/response invocation needs corresponding handlers. `profile:get-current` also lacks a main handler. Current React hooks do not rely on this bridge, but bridge-dependent features should not be considered operational.
- **Development launcher:** the helper has a hardcoded Homebrew path, uses `lsof`, and kills port-5173 processes. Use the explicit two-terminal workflow in the build guide instead when portability matters.
- **Standalone engine packaging:** `engine/package.json` references a missing `rollup.config.mts`. Its advertised standalone exports/build are not a verified publishing workflow. Root app compilation uses source aliases instead.
- **Lint setup:** the root script invokes ESLint 9, but no project ESLint configuration is provided. Typecheck and Vitest are the available validated checks; lint is not currently a verified gate.
- **Data integration:** historical results and adaptive training are not connected to the UI persistence layer.
- **Input:** matching is case-insensitive, and emoji/IME/grapheme composition is not supported by the character-by-character model.
- **Web offline behavior:** the manifest has icons/metadata but no service-worker implementation.
- **Distribution:** signing/notarization and installed macOS/Windows runtime verification remain outstanding.

## Historical design documents

`ARCHITECTURE.md` and `engine/docs/algorithm-design.md` describe earlier plans, including character/bigram training, performance assumptions, and persistence behavior that differ from the current implementation. Use this guide, the current engine README, and the source for implementation decisions. Retain those older documents as design history rather than silently treating their planned features as shipped functionality.
