# Decentraland Asset Optimization Pipeline Report

A TypeScript/Node.js application that generates interactive HTML reports for the Decentraland world's asset optimization pipeline.

🌐 **Live Report**: [https://dclexplorer.github.io/optimization-pipeline-report/](https://dclexplorer.github.io/optimization-pipeline-report/)

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

## Live Deployment

The report is automatically generated and deployed to GitHub Pages:
- **Latest Report**: [https://dclexplorer.github.io/optimization-pipeline-report/](https://dclexplorer.github.io/optimization-pipeline-report/)
- **Report History**: [https://dclexplorer.github.io/optimization-pipeline-report/history.html](https://dclexplorer.github.io/optimization-pipeline-report/history.html)

Reports are generated daily at 00:00 UTC and deployed automatically.

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
- **Auto-Deploy**: Pushes reports to GitHub Pages automatically
- **History**: Keeps last 7 reports for historical reference

### GitHub Actions Workflow

The workflow:
1. Fetches world data from Decentraland API
2. Checks optimization status using S3 API
3. Generates interactive HTML report
4. Deploys to GitHub Pages
5. Maintains report history

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
- **GitHub Pages**: Static hosting
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
└── docs/             # GitHub Pages deployment
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT