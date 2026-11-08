# Noname Android

## File System Model

The Android client uses a writable overlay over packaged APK assets:

- APK assets are the read-only base layer.
- An existing SAF directory with persisted read/write permission remains the writable overlay.
- Without that permission, the writable overlay is the app's private `filesDir/game` directory.
- Reads and static resource requests check the active overlay first, then fall back to APK assets.
- Writes, creates, deletes, exports, and downloaded/modified user files only affect the active overlay.

This avoids copying the full game directory during installation. An empty overlay is valid; core files such as `noname.js` load from packaged assets.

## Startup Permission

Startup does not request a directory or storage permission. [`src/preload.ts`](../../src/preload.ts) checks `noname.js` through the native file API and then boots the game.

The `SafFs.requestAccess` plugin method remains available for explicit SAF access. Cancelling the picker returns the current access result without rejecting the call. The selected directory is stored with persistable read/write URI permission.

The selected directory does not need to contain a full Noname installation. It is used for user-writable data and file overrides.

If a file exists in both layers, the overlay file wins. Removing the overlay file reveals the packaged asset again. If a SAF grant is revoked, subsequent operations use the private overlay. Switching overlays does not copy files between them.

Private files survive app updates and are removed when the app is uninstalled or its data is cleared. Android does not show a storage permission for access to these files. Shared external directories use SAF URI grants instead of `READ_EXTERNAL_STORAGE` or `MANAGE_EXTERNAL_STORAGE`.

## Native Bridge

The custom Android plugin is `SafFs`.

[`src/platform/android.ts`](../../src/platform/android.ts) adapts this plugin to provide the file APIs used by `game.*` in preload:

- `checkFile`, `checkDir`
- `readFile`, `readFileAsText`
- `writeFile`
- `removeFile`, `removeDir`
- `getFileList`
- `createDir`

`game.checkFile` and `game.checkDir` both call the underlying `statEntry`, which returns `file`, `directory`, or `none`; the JavaScript adapter converts that type into the corresponding check result.

Read APIs use overlay semantics. Delete APIs only touch the active overlay and reject attempts to delete files that exist only in APK assets. Writing a packaged path creates an override in the overlay.

`JsAwarePathHandler` applies the same overlay behavior to `https://localhost/...` WebView requests, so external files can override packaged resources by path.

## Regression checks

With Node.js 24 and the workspace dependencies installed, run `pnpm -F @noname/mobile test:android-startup`. This exercises the Android startup adapter with a native bridge that would reject directory selection.

`SafFsInstrumentedTest` exercises bundled reads, private file writes with Chinese names, directory listing, WebView resource reads, deletion, path traversal rejection, and directory-picker cancellation. Run it on a fresh Android test installation without an existing SAF grant. Use the release build type to test packaged startup; the debug activity loads the development server.
