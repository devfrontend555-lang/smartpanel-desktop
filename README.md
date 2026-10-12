# SmartPanel

SmartPanel is an intelligent dashboard project with a web app, an Electron desktop shell for Windows/macOS, and a PySide6 desktop client.

## Development

Use Node.js 22 or newer for the Electron toolchain. Install dependencies with `npm ci`, then run `npm run dev` for the web app.

## Desktop builds

- Windows installer: `npm run desktop:build:win`
- Windows portable: `npm run desktop:build:portable`
- macOS disk image: `npm run desktop:build:mac`

Pushing a `v*` Git tag starts the GitHub Actions workflow that builds Windows and macOS packages and publishes them as release assets.
