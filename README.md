# Decentraland Asset Optimization Pipeline Report

A TypeScript/Node.js application that generates interactive HTML reports for the Decentraland world's asset optimization pipeline.

🌐 **Live Report**: Automatically deployed to Vercel every 24 hours!

## Features

- **Automated Daily Reports**: Runs every 24 hours via GitHub Actions
- **Interactive World Map**: 325x325 lands grid visualization
- **Optimization Tracking**: Checks which scenes have optimized assets
- **Click-to-View Reports**: Click any scene to view its optimization report
- **Multiple View Modes**:
  - Scene View: Color-coded scenes
  - Optimization View: Shows optimization status
  - Report Status View: Displays report availability
- **Detailed Statistics**: Comprehensive metrics about the world and optimization coverage

## Deployment

### Vercel Setup

1. **Deploy to Vercel**:
   ```bash
   npx vercel
   ```

2. **Create Deploy Hook**:
   - Go to your Vercel project settings
   - Navigate to Git > Deploy Hooks
   - Create a deploy hook
   - Add the hook URL as `VERCEL_DEPLOY_HOOK` secret in GitHub

3. **Add GitHub Secrets**:
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_ENDPOINT`
   - `S3_BUCKET`
   - `S3_REGION`
   - `VERCEL_DEPLOY_HOOK`

The GitHub Action will:
- Build the report daily at 00:00 UTC
- Commit the report to the `public/` folder
- Trigger Vercel deployment via webhook

## Local Development

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file with your S3 credentials:

```env
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_ENDPOINT=https://your-endpoint.r2.cloudflarestorage.com
S3_BUCKET=optimized-assets
S3_REGION=auto
```

### Running Locally

```bash
# Build and run
npm run generate

# Development mode
npm run dev
```

## CI/CD Pipeline

The project uses GitHub Actions for continuous deployment:

- **Schedule**: Runs daily at 00:00 UTC
- **Manual Trigger**: Can be triggered manually from GitHub Actions tab
- **Auto-Deploy**: Commits reports and triggers Vercel deployment

### GitHub Actions Workflow

The workflow:
1. Fetches world data from Decentraland API
2. Checks optimization status using S3 API
3. Generates interactive HTML report
4. Commits report to `public/` folder
5. Triggers Vercel deployment

## Report Features

### Interactive Map
- **Hover**: Shows land information and scene details
- **Click**: Opens optimization report in a modal
- **Zoom**: Mouse wheel or buttons
- **Pan**: Shift + drag
- **Download**: Export map as PNG

### Optimization Tracking
- ✅ Green: Optimized scenes
- 🟠 Orange: Failed optimization attempts
- 🔴 Red: Not optimized
- 🔵 Blue: Successful reports

### Report Modal
- Displays full JSON report
- Syntax-highlighted for readability
- Shows error messages if optimization failed
- Accessible for any scene

## Technologies Used

- **TypeScript/Node.js**: Core application
- **AWS SDK**: S3 integration for optimization checking
- **GitHub Actions**: CI/CD pipeline
- **Vercel**: Static hosting
- **Canvas API**: Map visualization

## Repository Structure

```
├── src/
│   ├── api/           # API clients
│   ├── index.ts       # Main entry point
│   ├── processor.ts   # Data processing
│   ├── report-generator.ts  # HTML generation
│   └── types.ts       # TypeScript definitions
├── .github/
│   └── workflows/     # GitHub Actions
├── reports/           # Generated reports (local)
└── public/            # Vercel deployment
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT