# Dlbeen Influencers System

A private, branded workspace for influencer profiles, monthly content commitments, publishing progress, campaign results, renewal decisions, and PDF / Excel reporting.

## Use the system

The prepared Google Sheets database is in the Dlbeen Influencers System folder in Google Drive. See `lib/drive-info.json` for the exact links. Its Reports, Agreements, Content, Influencers and Guide tabs can be used immediately.

The dashboard requires one Google authorization before it can save and load live records. Open Settings → Google Drive and follow `public/integration/SETUP.html`. The ready-to-paste, bound Apps Script is `public/integration/Code.gs`. No connection key is included in this source.

## Data and calculations

- Google Sheets holds influencer, agreement and content records. Profile photos and generated reports are saved in subfolders of the same Drive folder after initialization.
- The private Site stores only its Google endpoint and connection key in D1. API routes require a signed-in visitor. The Site audience must remain owner-private unless account permissions are extended deliberately.
- Stories, reels and posts each have their own delivery target. Overdelivery in one format does not satisfy another format. Each story frame is one content record.
- Reports group by agreement month, brand, creator and currency. IQD and USD are never added together. Published content alone contributes performance metrics.
- Engagement rate uses content with complete reach, likes, comments, shares and saves. Missing observations stay unreported. Summed reach is not unique audience. Follower gains, leads, orders and revenue are entered from attributable evidence.
- The sample workspace is fictional and read-only. It is never written to the live database.
- Prepared capacity: 200 influencers, 300 agreements and 1,500 content records. Extend the Sheet tables, validations, formula ranges and Apps Script limits together when expanding.

## Source map

- `app/workspace.tsx`, `app/globals.css`: dashboard, forms and branding.
- `lib/model.ts`: shared schema, validation and report calculations.
- `lib/export-report.ts`: branded browser PDF and XLSX downloads.
- `app/api/`, `lib/drive-server.ts`: authenticated Google integration.
- `integration/backend-template.gs`: Google Sheets / Drive backend.
- `integration/assemble.mjs`: combines the shared model with the Apps Script backend. Run after model or backend changes.
- `integration/verify.mjs`: delivery, filter, validation and export checks with local fictional fixtures.
- `db/schema.ts`, `drizzle/`: connection configuration schema and migration.

## Development and verification

Use the Sites build and hosting workflow for this project. The checked-in lockfile pins dependencies. `node integration/assemble.mjs` rebuilds `Code.gs`; `node integration/verify.mjs` checks calculations and creates sample reports under the ignored `.sites-runtime/qa/output` directory. `node node_modules/typescript/bin/tsc --noEmit` checks types.

Verified: type checking, production bundle, per-format delivery math, month/currency filtering, missing-metric coverage, Apps Script syntax, generated PDF layout and XLSX contents. End-to-end Google authorization and live writes require the account owner's setup step and have not been claimed as tested.

## Brand assets

`public/brand/` contains the original supplied Dlbeen logo, wordmark and blue-wave theme. The interface and reports use Dlbeen's blue-and-white palette.
