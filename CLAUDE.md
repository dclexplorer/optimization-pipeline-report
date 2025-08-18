# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript/Node.js application that generates interactive HTML reports for Decentraland's asset optimization pipeline. It fetches world data, checks optimization status, and creates a visual 325x325 lands map showing scene optimization status.

## Essential Commands

```bash
# Local development
npm install              # Install dependencies
npm run dev             # Run in development mode (ts-node)
npm run generate        # Build and run full report generation
npm run build           # Compile TypeScript to JavaScript
npm start               # Run compiled JavaScript

# Deployment
npx vercel              # Deploy to Vercel
npx vercel --prod       # Deploy to production

# GitHub Actions
gh workflow run generate-report.yml  # Manually trigger report generation
gh secret list          # List configured secrets
```

## Required Environment Variables

Create a `.env` file for local development:
```env
S3_ACCESS_KEY_ID=        # R2/S3 access key
S3_SECRET_ACCESS_KEY=    # R2/S3 secret key
S3_ENDPOINT=             # https://xxx.r2.cloudflarestorage.com
S3_BUCKET=optimized-assets
S3_REGION=auto
```

GitHub Secrets required for CI/CD:
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`
- `VERCEL_URL`: The Vercel deployment URL (e.g., https://optimization-pipeline-report.vercel.app)
- `UPLOAD_SECRET`: Authentication token for uploading reports to Vercel

Vercel Environment Variables:
- `UPLOAD_SECRET`: Same token as GitHub secret for authentication

## Architecture & Data Flow

### Report Generation Pipeline
1. **Data Fetching** (`src/api/decentraland.ts`):
   - Fetches world data from Decentraland API in batches
   - Uses smaller batch size (10,000) in CI to avoid 500 errors
   - Implements retry logic with exponential backoff
   - Coordinate range: -175,-175 to 175,175 (325x325 grid)

2. **Optimization Checking** (`src/api/s3-client.ts`):
   - Primary: Uses S3 API with AWS SDK to check for optimized assets
   - Fallback: HTTP HEAD requests to optimization server
   - Checks for `{sceneId}-mobile.zip` files
   - Fetches `{sceneId}-report.json` for non-optimized scenes

3. **Data Processing** (`src/processor.ts`):
   - Converts scene data to land-based grid structure
   - Calculates statistics and metrics
   - Maps scenes to their land positions

4. **HTML Generation** (`src/report-generator.ts`):
   - Creates self-contained HTML with embedded JavaScript
   - Implements interactive canvas-based map visualization
   - Compresses data to avoid JSON.stringify size limits
   - Includes modal popup for viewing optimization reports

### Deployment Architecture

**Vercel Serverless Functions**:
- `api/index.js`: Serves the stored report at root URL
- `api/upload-report.js`: Receives and stores reports from GitHub Actions

**GitHub Actions → Vercel Flow**:
1. Action generates report locally
2. POSTs HTML to Vercel's `/api/upload-report` endpoint with authentication
3. Vercel stores report in memory (resets on redeploy)
4. Root URL serves the stored report

## Key Implementation Details

### API Rate Limiting & Reliability
- The Decentraland API can return 500 errors for large batches
- CI environment uses 10,000 pointers per batch (vs 50,000 locally)
- Implements 3 retry attempts with exponential backoff
- 120-second timeout for API requests
- Small delays between batch requests to avoid overwhelming server

### Data Compression Strategy
The report uses compressed property names to avoid JSON size limits:
```javascript
// Compressed format
{ x: -175, y: -175, s: "sceneId", o: true, r: { ok: true } }
// s = sceneId, o = hasOptimizedAssets, r = optimizationReport
```

### Report Interactivity
- Canvas-based rendering for performance with 105,625 lands
- Click handlers show optimization reports in modal
- Multiple view modes (scenes, optimization status, report status)
- Zoom/pan controls with mouse and keyboard
- PNG export functionality

## Common Tasks

### Adding New Secrets to GitHub
```bash
gh secret set SECRET_NAME --body "secret_value"
```

### Adding Environment Variables to Vercel
```bash
echo "value" | vercel env add VAR_NAME production
```

### Testing S3 Connection Locally
Ensure `.env` file has correct S3 credentials, then:
```bash
npm run dev
```

### Debugging Failed Workflows
Check GitHub Actions logs for:
- "ERR_BAD_RESPONSE" - API timeout/500 errors (batch size may need adjustment)
- Authentication failures - verify UPLOAD_SECRET matches in both GitHub and Vercel
- Missing reports - ensure S3 credentials are correct

## Important Considerations

- **No Repository Commits**: The workflow does NOT commit reports to the repository
- **Vercel Storage**: Reports are stored in memory on Vercel (ephemeral)
- **Daily Schedule**: Runs at 00:00 UTC via cron schedule
- **Manual Triggers**: Can be triggered manually via GitHub Actions UI
- **Report Size**: HTML reports can be 5-10MB due to embedded data