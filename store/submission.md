# Chrome Web Store submission

Existing item: ehelhgbbjhjbfaleajkhjbdpomnbnkob
Account: tjmgregory@gmail.com
Version: 1.2.2
Title and summary: manifest.json
Detailed description: description.txt
Category: Workflow & Planning (retain existing category if still offered)
Support URL: https://github.com/tjmgregory/ShortCopy/issues
Homepage: https://github.com/tjmgregory/ShortCopy
Privacy policy URL after publishing this branch: https://github.com/tjmgregory/ShortCopy/blob/manifest-v3/PRIVACY.md

## Single purpose

Shorten the current tab's URL with is.gd and copy the resulting link to the clipboard when the user invokes the keyboard shortcut or toolbar action.

## Permission justifications

- activeTab: Read the active tab's URL only after the user presses the shortcut or clicks the extension.
- clipboardWrite: Write the shortened URL to the clipboard. The extension never reads the clipboard.
- offscreen: Create a hidden extension document to write to the clipboard because the Manifest V3 service worker has no DOM access. Close it after copying.
- notifications: Confirm the link was copied, or explain why shortening or copying failed.
- https://is.gd/*: Send the user-requested URL to the is.gd shortening API over HTTPS and receive a short link. No other host permission is requested.
- Remote code: No. All executable code is bundled. The API returns JSON data only.

## Data disclosures

Disclose Website history / URLs as processed and transmitted to is.gd for the requested shortening function. Do not claim that no user data leaves the device. No page content, clipboard reads, ads, telemetry or developer-operated data server. Refer to PRIVACY.md for third-party network data and retention.

## Reviewer notes

This updates the original version 1.1.1 from Manifest V2 to Manifest V3. Open https://example.com, invoke Alt+Shift+C or the toolbar icon, then paste into a text field. An is.gd URL should appear. Mac uses Option+Shift+C. The shortcut is configurable at chrome://extensions/shortcuts. The default keyboard shortcut now uses the native action command. The original command ID remains as a legacy entry for existing shortcut assignments. No login or paid account is required.

## Pending checks

- Load unpacked in real Chrome and verify shortcut, toolbar, clipboard, notification, worker restart and failure handling.
- Capture genuine screenshots of the extension in use.
- Confirm dashboard removal reason and any account-level requirements.
- Upload ZIP, copy, policy URL and images, then submit for review.
