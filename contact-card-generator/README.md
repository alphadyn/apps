# Contact Card Generator

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/contact-card-generator/)

> Standalone browser utility for contact cards and QR output. See the [repository catalog](../README.md) for shared setup and deployment context.

A static browser utility for creating downloadable vCard (.vcf) contact files and scannable QR codes. The app lives in `contact-card-generator/`; it needs no account or application server.

## Header logo

Select the header logo to reload the app's entry page. The current form and generated contact are not retained across the reload.

## Features

- Enter first, middle, and last name, organization, job title, phone numbers (mobile and work), email, website, address, birthday, and notes
- Upload a profile picture, which is resized and embedded directly in the vCard as a `PHOTO` property
- Generates vCard 3.0 output with escaped contact fields and folded property lines
- Preview the raw vCard content before downloading
- Download the contact as a `.vcf` file that can be imported into any contacts app
- Displays a QR code encoding the vCard so it can be scanned directly by a phone camera or QR reader
- Download the QR code as a PNG image
- Compact, responsive workspace with grouped fields, a sticky export panel on desktop, and a stacked layout on mobile
- Keyboard-visible focus indicators and reduced-motion support

## Run locally

From the project root, go to the app folder and start a simple local server:

```bash
cd contact-card-generator
python3 -m http.server 8000
```

Then open this in a browser:

```text
http://localhost:8000/
```

## How to use

1. Fill in as many contact fields as you'd like (at least one is required).
2. Click "Generate contact card".
3. Review the generated QR code in the export panel. Expand "View vCard source" to inspect the raw contact text.
4. Click "Download .vcf file" to save the contact card, or "Download QR code" to save a scannable image of it.

## Notes

- QR codes generated with the [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) library (loaded from a CDN), so scanning them saves the full contact directly without needing the .vcf file.
- The birthday field uses the standard `BDAY` vCard property in `YYYYMMDD` format.
- If a profile picture makes the vCard too large to fit in a QR code, the QR code is generated without the photo while the downloaded `.vcf` file still includes it.
- Profile pictures are resized to a maximum dimension of 240 pixels and converted to JPEG for the contact file.
- Contact generation runs in the browser; it does not upload contacts to a contact database. The QR code and downloaded file contain your contact details, so share them intentionally.
- An internet connection is needed to load the CDN-hosted QR library. Repository page-view analytics are separate from contact generation.

## Files

| File | Purpose |
| --- | --- |
| [index.html](index.html), [styles.css](styles.css) | Contact form, result preview, and responsive layout |
| [app.js](app.js) | Contact formatting, photo resizing, QR generation, and downloads |
| [logo.svg](logo.svg), [favicon.svg](favicon.svg), [ui-preview.svg](ui-preview.svg), [ui-preview.png](ui-preview.png) | Branding and preview artwork |
| [vercel.json](vercel.json) | Static deployment configuration |
