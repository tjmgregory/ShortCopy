# Short Copy 1.3.0 release candidate

Use `short-copy-1.3.0.zip`. All earlier archives are superseded.

## Validation

- 35 automated tests pass, including malformed provider responses, exact URL encoding, native action and legacy shortcut handling, clipboard failures and concurrency.
- Actual `shortenUrl` function tested with a live da.gd request for a fresh Google Search URL. The short link returned HTTP 302 to the exact input URL. See live-provider-validation.json.
- Separate live requests created fresh links for a Google support URL and a long Google Search URL; both redirected to the exact input.
- Theo confirmed keyboard invocation and toolbar copying on previous builds, then confirmed the new provider worked in Chrome after reloading version 1.3.0 on 18 October 2026.

## Root cause

is.gd returned HTTP 200, Content-Type text/html, body `Error, database insert failed` for newly created links. Existing URLs such as example.com and a simple Google search returned cached links. Fresh example.com URLs failed too, ruling out a Google-only restriction. v.gd and a custom is.gd alias failed with the same database error.

The earlier ERR_BLOCKED_BY_CLIENT observed during automated navigation was not sufficient evidence of a user-installed blocker. No browser security settings were changed.

Version 1.3.0 replaces is.gd with da.gd. Permissions, privacy policy and store copy reflect the change. No fallback sends the URL to a second provider.

## Remaining release work

Capture real Chrome screenshots. Upload to the existing store item and submit. Browser automation blocks chrome://extensions. Following the official Chrome publishing documentation's dashboard link also failed with “The extensions gallery cannot be scripted.” No package or listing changes have been submitted to the store.
