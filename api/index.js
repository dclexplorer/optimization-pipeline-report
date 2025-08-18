// Vercel serverless function to serve the latest report
import { storedReport } from './upload-report.js';

export default async function handler(req, res) {
  try {
    if (storedReport && storedReport.html) {
      // Serve the stored report
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Report-Timestamp', storedReport.timestamp);
      res.setHeader('X-Report-Uploaded', storedReport.uploadedAt);
      res.status(200).send(storedReport.html);
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
    res.status(500).send('<h1>Error loading report</h1><p>Please try again later.</p>');
  }
}