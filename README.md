# SAP XML to JSON Converter

A browser-only React + Vite tool for converting SAP XML messages into formatted JSON. It uses `fast-xml-parser` and includes SAP-friendly options for namespace prefixes, empty fields, attributes, arrays, and text trimming.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

The production files will be generated in `dist/`.

## Notes

- The converter runs entirely in the browser and does not require a backend.
- The default XML sample comes from the document `Work General tasks/xml to json`.
- The original Google Doc appears to include copied XML viewer markers like `-<Customer>`. The built-in sample uses the same XML content with those markers removed so it is valid XML.
