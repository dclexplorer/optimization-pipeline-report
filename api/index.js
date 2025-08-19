// Vercel serverless function to serve the latest report from Blob Storage
import { list } from '@vercel/blob';
import { generateHTMLFromData } from './generate-html.js';

export default async function handler(req, res) {
  try {
    // Check if upload is complete
    const { blobs: completeBlobs } = await list({ prefix: 'report-complete' });
    
    if (!completeBlobs || completeBlobs.length === 0) {
      // No complete report yet
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Optimization Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              text-align: center;
            }
            h1 { color: #667eea; }
            p { color: #666; margin: 20px 0; }
            .info {
              background: #f0f0f0;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h1>📊 Decentraland Optimization Report</h1>
          <div class="info">
            <p>The first report will be generated soon!</p>
            <p>Reports are generated daily at 00:00 UTC.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Fetch completion info
    const completeResponse = await fetch(completeBlobs[0].url);
    const completeInfo = await completeResponse.json();
    
    // Fetch metadata
    const { blobs: metadataBlobs } = await list({ prefix: 'report-metadata' });
    if (!metadataBlobs || metadataBlobs.length === 0) {
      throw new Error('Metadata not found');
    }
    
    const metadataResponse = await fetch(metadataBlobs[0].url);
    const metadata = await metadataResponse.json();
    
    // Fetch and reassemble chunks
    const allLands = [];
    for (let i = 0; i < completeInfo.totalChunks; i++) {
      const { blobs: chunkBlobs } = await list({ prefix: `report-chunk-${i}` });
      if (chunkBlobs && chunkBlobs.length > 0) {
        const chunkResponse = await fetch(chunkBlobs[0].url);
        const chunkData = await chunkResponse.json();
        allLands.push(...chunkData);
      }
    }
    
    // Reconstruct full report data
    const reportData = {
      l: allLands,
      s: metadata.s,
      c: metadata.c,
      g: metadata.g
    };
    
    // Generate HTML from the data
    const html = generateHTMLFromData(reportData);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error serving report:', error);
    
    // Check if it's a blob storage not configured error
    if (error.message?.includes('BLOB_STORE_NOT_FOUND')) {
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Configuration Required</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
            }
            h1 { color: #ff6b6b; }
            .error {
              background: #ffe0e0;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #ff6b6b;
            }
          </style>
        </head>
        <body>
          <h1>⚠️ Blob Storage Not Configured</h1>
          <div class="error">
            <p><strong>Action Required:</strong> Enable Vercel Blob Storage for this project.</p>
            <ol>
              <li>Go to your Vercel Dashboard</li>
              <li>Navigate to the Storage tab</li>
              <li>Create a new Blob store</li>
              <li>Connect it to this project</li>
            </ol>
            <p>Once configured, the reports will be stored and served automatically.</p>
          </div>
        </body>
        </html>
      `);
    } else {
      res.status(500).send('<h1>Error loading report</h1><p>Please try again later.</p>');
    }
  }
}