# Short Copy 1.2.0 release candidate

`short-copy-1.2.0.zip` contains only the runtime extension files. Archive integrity and manifest field lengths passed. All 17 automated tests passed; a live is.gd API request returned a valid short URL.

Not yet submitted. Real Chrome integration testing and screenshots are pending: browser navigation to chrome://extensions is blocked by the browser security policy, and navigation to the developer dashboard returns "Not allowed".

Manual test:
1. Load the repository directory at chrome://extensions using Load unpacked.
2. Open https://example.com. Invoke Option+Shift+C on Mac (Alt+Shift+C elsewhere), then paste into a text field. Confirm an is.gd link and success notification.
3. Repeat using the toolbar icon.
4. Let the service worker go idle, then repeat.
5. Disconnect the network and invoke it. Confirm an error notification and unchanged clipboard contents.
6. Confirm browser settings pages and local files are rejected.

Upload to the original store item only after these pass. Submission text is in ../store/submission.md.
