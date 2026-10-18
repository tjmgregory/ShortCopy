# Short Copy

A small Chrome URL shortener. Press **Alt+Shift+C** (Option+Shift+C on Mac) or click the toolbar icon to shorten the current tab's URL with is.gd and copy the result to your clipboard. No account or API key required.

Change the shortcut at `chrome://extensions/shortcuts`.

Requires Chrome 116 or later and an internet connection. Supports HTTP and HTTPS pages. URLs are sent to is.gd only when invoked. See [Privacy](PRIVACY.md).

## Development

Load this directory using **Load unpacked** at `chrome://extensions` with Developer mode enabled. There is no build step or third-party runtime dependency.

Run checks with `node --test tests/*.test.cjs`.

The manifest keeps the original `toggle-pin` command identifier to preserve existing users' shortcut assignments.

## Release

Create a ZIP containing only `manifest.json`, `background.js`, `offscreen.html`, `offscreen.js`, and the four numbered PNG icons. Upload it to the existing Chrome Web Store item `ehelhgbbjhjbfaleajkhjbdpomnbnkob`.

Store copy and research live in `store/`. Test the real Chrome shortcut, toolbar action, clipboard and notifications before submitting.

Original scissor icon element: https://icons8.com/.
