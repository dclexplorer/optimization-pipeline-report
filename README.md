# Decentraland Asset Optimization Pipeline Report

A TypeScript/Node.js application that generates interactive HTML reports for the Decentraland world's asset optimization pipeline.

## Features

- Fetches world data from Decentraland's API (325x325 lands grid)
- Processes scene data and land occupancy
- Generates an interactive HTML report with:
  - Visual 325x325 map representation
  - Hover tooltips showing scene IDs for each land
  - World statistics (total lands, occupied lands, scenes, etc.)
  - Zoom controls and map download functionality

## Installation

```bash
npm install
```

## Usage

Run the report generator:

```bash
npm start
```

Or for development:

```bash
npm run dev
```

The report will be saved in the `reports/` directory with a timestamp.

## How it Works

1. **Data Fetching**: Queries the Decentraland API in batches (up to 50,000 positions per request)
2. **Data Processing**: Maps each land position to its corresponding scene ID
3. **Report Generation**: Creates an interactive HTML file with Canvas-based visualization
4. **Statistics**: Calculates and displays world metrics

## Map Coordinates

- World size: 325x325 lands
- Coordinate range: (-175, -175) to (175, 175)
- Center point: (0, 0)

## Output

The generated HTML report includes:
- Interactive map with color-coded scenes
- Hover information for each land
- Statistics dashboard
- Zoom and pan controls
- Export functionality