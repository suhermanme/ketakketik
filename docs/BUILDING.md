# Build and deployment

[Back to README](../README.md)

## Prerequisites and installation

Use a terminal in the project root containing `package.json`. Install Node.js and npm first. The root package declares Node.js `>=18`; check dependency engine requirements when upgrading or installing a packager.

```sh
node --version
npm --version
npm ci
```

Use `npm ci` with the committed lockfile for a reproducible install. Use `npm install` when intentionally changing dependencies, and keep `package.json` and `package-lock.json` together. Do not copy `node_modules` between operating systems; install dependencies on the target machine. The root install is sufficient to run the app and root tests; the root imports engine source directly.

## Browser development

```sh
npm run dev
```

Open the printed URL, normally `http://localhost:5173`. Vite may choose another available port. Changes to the UI are served during development; Ctrl+C stops the server.

## Browser production and static hosting

```sh
npm run typecheck
npm run build:web
npm run preview
```

`build:web` uses `vite.web.config.ts` and writes the browser bundle and public assets into `dist/`. It does not itself run TypeScript checking, so run typecheck separately. Preview starts a local server and prints its address, commonly port 4173.

Upload the generated site's `index.html`, `assets/`, `icons/`, and `manifest.webmanifest` from `dist/` to a static host. If desktop builds have also populated this folder, do not publish the generated Electron files or unnecessary compiled source. Use a clean checkout/build directory for web releases.

The default web build expects deployment at the domain root. For a subdirectory such as `/ketakketik/`:

```sh
npm run build:web -- --base=/ketakketik/
```

Open the site through HTTP/HTTPS, rather than double-clicking the HTML file. The site needs no application backend. Vite preview is intended for local verification, not production hosting. See [Vite's static-deployment guide](https://vite.dev/guide/static-deploy.html).

The manifest supplies application identity and icons. There is no service worker, so offline browser installation/caching is not guaranteed. The desktop build is the server-free distribution option.

## Desktop: how it works

The build pipeline runs four steps:

1. **TypeScript compilation** (`tsc --outDir dist-ee`) — compiles `electron/` and `app/` source to `dist-ee/`
2. **Vite production build** (`vite build`) — bundles the React UI into `dist/`
3. **Merge** (`cp -r dist-ee/electron dist-ee/icons dist/`) — copies Electron main/preload files into the Vite output
4. **Packaging** (`electron-builder`) — bundles everything into a `.app` and `.dmg`

`package.json` points Electron to `dist/electron/main.js`. In production, the main process calls `BrowserWindow.loadFile()` for `dist/index.html`. `vite.config.ts` uses `base: './'` so the assets resolve relative to that file.

A packaged app ignores `VITE_DEV_SERVER_URL`. Installed users do not start Vite, install Node.js, or open a local port. Electron includes Chromium and Node.js internally; this is a bundled desktop application, not a rewrite into OS-native UI code.

## Install the desktop packager

`electron-builder` is already declared in devDependencies. Run `npm ci` once to install it.

**Verification status:** macOS DMG builds have been verified on Apple Silicon (macOS 25.6). Windows builds require a Windows host and have not been tested.

## macOS application and DMG

Run on macOS after `npm ci`.

A single command builds both the app bundle and the DMG:

```sh
npm run build:electron
```

Output:
- `release/mac-arm64/KetakKetik.app` — application bundle (Apple Silicon)
- `release/KetakKetik-1.0.0-arm64.dmg` — DMG installer

Drag the `.app` into Applications and launch it normally. Double-click the `.dmg` to install.

For an unpacked app directory only (no DMG):

```sh
npm run build:electron -- --mac --dir
```

The macOS icon comes from `build/icons/KetakKetik.icns`. The runtime also sets the Dock icon from the bundled PNG.

Signing and notarization credentials are not configured in this repository. Preparing an app for public distribution requires a separate signing/notarization workflow; creating a local `.app` is not proof that it is ready for distribution.

## Windows installer and portable executable

On a Windows machine, open PowerShell in the project root:

```powershell
npm ci
npm run build:electron -- --win nsis --x64
```

The NSIS installer is written to `release/`. Install it, then launch KetakKetik from Windows. No local development server is required.

For a portable executable:

```powershell
npm run build:electron -- --win portable --x64
```

For an unpacked app directory useful for testing:

```powershell
npm run build:electron -- --win --dir --x64
```

Use a native Windows build environment for this documented workflow. The supplied Windows icon is `public/icons/icon-512.png`; installer icon conversion is handled by the packager. Windows signing is not configured, and the Windows runtime/installer has not been tested in this workspace.

## Run compiled Electron locally without a port

Build the desktop-compatible assets first:

```sh
npm run build
```

On macOS/Linux:

```sh
unset VITE_DEV_SERVER_URL
npx electron .
```

In Windows PowerShell:

```powershell
Remove-Item Env:VITE_DEV_SERVER_URL -ErrorAction SilentlyContinue
npx electron .
```

This launches compiled local files without Vite. It is a runtime smoke test, not an installer build. Do not substitute `build:web` here: the desktop build needs relative asset URLs and the compiled main process.

## Electron development with live reload

`npm run dev:electron` is an existing convenience script, but it assumes Homebrew's `/opt/homebrew/bin/npx` and Unix `lsof`. It also forcibly terminates processes using port 5173. It is not a portable Windows launcher and may stop an unrelated service using that port.

A more explicit two-terminal workflow avoids that helper. Terminal 1:

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Terminal 2 on macOS/Linux:

```sh
npx tsc
VITE_DEV_SERVER_URL=http://127.0.0.1:5173 npx electron .
```

Terminal 2 in Windows PowerShell:

```powershell
npx tsc
$env:VITE_DEV_SERVER_URL = 'http://127.0.0.1:5173'
npx electron .
```

This workflow intentionally uses a local server during development. Renderer changes reload through Vite; Electron main/preload changes require recompilation and restarting Electron. Clear the environment variable before testing local-file loading.

## Build configuration reference

| Location | Purpose |
| --- | --- |
| `package.json` → `main` | Electron entry point |
| `package.json` → `build` | Product name, app ID, output folder, packaged files, platform icons |
| `vite.config.ts` | Default build, desktop-relative asset URLs, source aliases, Tailwind |
| `vite.web.config.ts` | Browser build configuration |
| `tsconfig.json` | TypeScript compile output and aliases |
| `electron/main.ts` | Window sizing, Dock icon, development URL / production file loading |
| `public/icons/` | Runtime PNGs, favicon, touch icon |
| `public/manifest.webmanifest` | Browser application metadata |
| `build/icons/KetakKetik.icns` | Packaged macOS icon |

Both Vite configurations write to `dist/`. Run `npm run build` immediately before Electron packaging/testing so a previous browser build does not leave root-relative asset references.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `electron-builder` not found | Run `npm ci` to install all devDependencies |
| Blank desktop window / missing assets | Rebuild with `npm run build`; check relative URLs and `dist/electron/main.js` |
| Desktop tries connecting to localhost | Clear `VITE_DEV_SERVER_URL` for unpackaged testing |
| Preload import or `contextBridge.register` error | See the documented preload/IPC limitations; these are existing source issues |
| Development helper fails on Windows or Intel Mac | Use the two-terminal workflow |
| Browser port already occupied | Stop the specific development process or choose another port; avoid killing unrelated processes |
| Old Dock icon | Fully quit and reopen; for packaged apps, rebuild the application bundle |
| Old web favicon | Hard refresh or clear cached site icons |
| Sound silent | Click training text, type a character, check app and OS volume |
| Profiles missing between runs | Check origin/port, browser vs desktop context, and renamed storage keys |
| App refused by OS distribution checks | Review signing/release preparation rather than assuming a successful compile means a distributable app |
