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
      
      // Split lands into chunks to stay under size limits
      const CHUNK_SIZE = 5000; // Lands per chunk
      const lands = reportData.l;
      const chunks = [];
      
      for (let i = 0; i < lands.length; i += CHUNK_SIZE) {
        chunks.push(lands.slice(i, i + CHUNK_SIZE));
      }
      
      console.log(`   Splitting data into ${chunks.length} chunks (${lands.length} lands total)`);
      
      // First, upload metadata with stats and scene colors
      const metadata = {
        s: reportData.s, // stats
        c: reportData.c, // color indices
        g: reportData.g, // generated timestamp
        totalChunks: chunks.length,
        totalLands: lands.length
      };
      
      console.log('   Uploading metadata...');
      let response = await axios.post(
        `${this.vercelUrl}/api/upload-metadata`,
        {
          data: metadata,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': this.uploadSecret,
          },
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`Failed to upload metadata: ${response.status}`);
      }
      
      // Upload each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkData = {
          chunkIndex: i,
          totalChunks: chunks.length,
          lands: chunks[i]
        };
        
        const chunkSize = Buffer.byteLength(JSON.stringify(chunkData), 'utf8');
        console.log(`   Uploading chunk ${i + 1}/${chunks.length} (${(chunkSize / 1024 / 1024).toFixed(2)} MB)...`);
        
        response = await axios.post(
          `${this.vercelUrl}/api/upload-chunk`,
          {
            data: chunkData,
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Auth-Token': this.uploadSecret,
            },
          }
        );
        
        if (response.status !== 200) {
          throw new Error(`Failed to upload chunk ${i}: ${response.status}`);
        }
      }
      
      // Signal completion and update history
      console.log('   Finalizing upload and updating history...');
      const timestamp = new Date().toISOString();
      response = await axios.post(
        `${this.vercelUrl}/api/finalize-upload`,
        {
          totalChunks: chunks.length,
          timestamp: timestamp,
          stats: reportData.s, // Include stats for history tracking
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': this.uploadSecret,
          },
        }
      );

      if (response.status === 200) {
        console.log('✅ Report data uploaded to Vercel successfully!');
        console.log(`🌐 View report at: ${this.vercelUrl}`);
      } else {
        console.error('❌ Failed to finalize upload');
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