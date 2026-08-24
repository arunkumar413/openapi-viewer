# OpenAPI Viewer

A small React app for reading OpenAPI 3 and Swagger 2 documents. Paths and HTTP methods live in a sidebar. Selecting one fills the main pane with the request URL, path, method, parameters, request body, status codes, and response body.

![OpenAPI Viewer screenshot](<screenshots/Screenshot 2026-08-24 at 6.57.25 PM.png>)

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:43147](http://127.0.0.1:43147).

## What you can open

- The bundled **Harbor Books** sample (loaded on first visit)
- A local `.json`, `.yaml`, or `.yml` file
- A public spec URL (some hosts block the browser with CORS; use a file if that happens)
- Pasted JSON or YAML

## Production build

```bash
npm run build
npm run preview
```
