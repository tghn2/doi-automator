# DOI Automator

Client-side XML generator for Crossref deposits.

[https://tghndoiautomator.netlify.app/](https://tghndoiautomator.netlify.app/)

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Crossref deposit setup

The app now includes:

- an **Open Crossref validator** button that opens the Crossref metadata quality check page
- a **Send XML to Crossref** button that submits the XML through a Netlify Function

## Notes

- Uses `read-excel-file` for workbook import.
- Supports hub, resource, translation, and appendix exports.
- Workbook rows can be loaded from imported `.xlsx` files.
- Crossref deposits are sent to `https://doi.crossref.org/servlet/deposit` unless `CROSSREF_TEST` is enabled, in which case the test endpoint is used. The XML validator remains at `https://www.crossref.org/02publishers/parser.html`.
