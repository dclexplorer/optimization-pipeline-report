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

  public async uploadReport(htmlPath: string): Promise<void> {
    // Check if we have the necessary credentials
    if (!this.vercelUrl || !this.uploadSecret) {
      console.log('\n⚠️  Vercel upload skipped (VERCEL_URL or UPLOAD_SECRET not configured)');
      console.log('   To enable automatic upload to Vercel, set these environment variables:');
      console.log('   - VERCEL_URL: Your Vercel deployment URL');
      console.log('   - UPLOAD_SECRET: Authentication token for upload');
      return;
    }

    try {
      console.log('\n📤 Uploading report to Vercel Blob Storage...');
      
      // Read the HTML file
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      const fileSize = fs.statSync(htmlPath).size;
      console.log(`   Report size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

      // First, upload to transfer.sh or similar service
      console.log('   Uploading to temporary storage...');
      const fileName = path.basename(htmlPath);
      
      // Upload to transfer.sh
      const uploadResponse = await axios.put(
        `https://transfer.sh/${fileName}`,
        htmlContent,
        {
          headers: {
            'Max-Downloads': '10',
            'Max-Days': '1',
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const tempUrl = uploadResponse.data.trim();
      console.log(`   Temporary URL: ${tempUrl}`);

      // Now send the URL to Vercel
      console.log('   Sending URL to Vercel...');
      const response = await axios.post(
        `${this.vercelUrl}/api/upload-report`,
        {
          url: tempUrl,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': this.uploadSecret,
          },
        }
      );

      if (response.status === 200) {
        console.log('✅ Report uploaded to Vercel successfully!');
        console.log(`🌐 View report at: ${this.vercelUrl}`);
        if (response.data.blobUrl) {
          console.log(`📦 Blob Storage URL: ${response.data.blobUrl}`);
        }
      } else {
        console.error('❌ Failed to upload report to Vercel');
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

  public async uploadReportDirect(htmlContent: string): Promise<void> {
    // Alternative method that uploads content directly if transfer.sh is down
    if (!this.vercelUrl || !this.uploadSecret) {
      return;
    }

    try {
      console.log('\n📤 Attempting direct upload to Vercel...');
      
      // Try to compress the content first
      const dataUri = `data:text/html;base64,${Buffer.from(htmlContent).toString('base64')}`;
      
      const response = await axios.post(
        `${this.vercelUrl}/api/upload-report-direct`,
        {
          html: htmlContent,
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
        console.log('✅ Report uploaded directly to Vercel!');
      }
    } catch (error: any) {
      // If direct upload fails due to size, fall back to URL method
      if (error.response?.status === 413) {
        console.log('   Direct upload too large, falling back to URL method...');
      } else {
        console.error('❌ Direct upload failed:', error.message);
      }
    }
  }
}