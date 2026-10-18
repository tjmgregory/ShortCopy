# Short Copy privacy policy

Updated: 18 October 2026

Short Copy is a Chrome extension by Theo Gregory that shortens the current tab's URL using is.gd and copies the result to your clipboard.

## Information used

When you press the shortcut or click the toolbar icon, the extension reads the active tab's URL and sends it over HTTPS to https://is.gd/create.php. This includes any path, query string and fragment present in that URL. is.gd also receives network information, including your IP address. Do not shorten links containing passwords, access tokens or other private information.

The extension does not read page content, browse your history, or read your existing clipboard contents. It writes the returned short link to your clipboard and displays a notification. URLs are processed temporarily; the extension does not maintain a link history or persist them in extension storage.

## Third-party processing

is.gd processes the submitted URL to create and operate a redirect. The resulting short link can be shared and used by anyone who has it. is.gd's handling and retention of data are governed by its own [privacy policy](https://is.gd/privacy.php). Short Copy does not control is.gd's systems or retention.

The developer does not operate a server receiving your URLs, sell user data, or include advertising, tracking or analytics code in the extension. Data is used only to provide the link-shortening and copying feature.

## Permissions

- **activeTab:** read the current URL when you invoke the extension.
- **Host access to is.gd:** send the URL to the shortening API.
- **clipboardWrite:** put the short link on your clipboard.
- **offscreen:** use a hidden extension document to perform the clipboard write.
- **notifications:** confirm success or explain a failure.

## Contact

For questions, contact tjmgregory@gmail.com or open an issue at https://github.com/tjmgregory/ShortCopy/issues.
