// Vercel serverless function to serve the latest report from Blob Storage
import { list, head } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    // Try to get the report from Blob Storage
    const { blobs } = await list({ prefix: 'report-latest' });
    
    if (blobs && blobs.length > 0) {
      const reportBlob = blobs[0];
      
      // Fetch the report content from blob URL
      const response = await fetch(reportBlob.url);
      const html = await response.text();
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.status(200).send(html);
    } else {
      // Serve a placeholder page if no report exists yet
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
    }
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
            code {
              background: #f5f5f5;
              padding: 2px 6px;
              border-radius: 3px;
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