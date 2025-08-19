import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export class VercelUploader {
  private vercelUrl: string;
  private uploadSecret: string;

  constructor() {
    // Load from environment variables
    this.vercelUrl = process.env.VERCEL_URL || '';
    this.uploadSecret = process.env.UPLOAD_SECRET || '';
  }

  public async uploadReportData(reportData: any): Promise<void> {
    // Check if we have the necessary credentials
    if (!this.vercelUrl || !this.uploadSecret) {
      console.log('\n⚠️  Vercel upload skipped (VERCEL_URL or UPLOAD_SECRET not configured)');
      console.log('   To enable automatic upload to Vercel, set these environment variables:');
      console.log('   - VERCEL_URL: Your Vercel deployment URL');
      console.log('   - UPLOAD_SECRET: Authentication token for upload');
      return;
    }

    try {
      console.log('\n📤 Uploading report data to Vercel...');
      
      // Convert to JSON
      const jsonData = JSON.stringify(reportData);
      const dataSize = Buffer.byteLength(jsonData, 'utf8');
      console.log(`   Data size: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);

      // Send the JSON data directly to Vercel
      console.log('   Sending data to Vercel...');
      const response = await axios.post(
        `${this.vercelUrl}/api/upload-report`,
        {
          data: reportData,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': this.uploadSecret,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      if (response.status === 200) {
        console.log('✅ Report data uploaded to Vercel successfully!');
        console.log(`🌐 View report at: ${this.vercelUrl}`);
        if (response.data.blobUrl) {
          console.log(`📦 Blob Storage URL: ${response.data.blobUrl}`);
        }
      } else {
        console.error('❌ Failed to upload report data to Vercel');
        console.error(`   Status: ${response.status}`);
        console.error(`   Response: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      console.error('❌ Error uploading to Vercel:', error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Response: ${JSON.stringify(error.response.data)}`);
      }
      // Don't throw - we don't want to fail the entire process if upload fails
    }
  }

  // Legacy method for HTML upload (kept for backwards compatibility)
  public async uploadReport(htmlPath: string): Promise<void> {
    console.log('\n⚠️  HTML upload is deprecated. Using JSON data upload instead.');
  }
}