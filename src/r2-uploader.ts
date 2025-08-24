import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

export class R2Uploader {
  private s3Client: S3Client;
  private bucketName: string = 'reports';
  private baseUrl: string = 'https://reports.dclexplorer.com';

  constructor() {
    // CloudFlare R2 credentials
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'c9da6e65496b745bce7f177b3a5c36c3';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '3b534210a41519e601b10ef3628fe1fc9693db2b53896c83be01212820e911f9';
    const endpoint = process.env.R2_ENDPOINT || 'https://a2b29bacd555c6fc78becaad8b183e9c.r2.cloudflarestorage.com';

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
  }

  public async uploadReportData(reportData: any): Promise<void> {
    try {
      console.log('\n📤 Uploading report data to CloudFlare R2...');
      
      const timestamp = new Date().toISOString();
      
      // Main report data
      const mainReportKey = 'optimization-pipeline/report.json';
      const mainReportData = JSON.stringify(reportData);
      
      console.log(`   Uploading main report (${(Buffer.byteLength(mainReportData) / 1024 / 1024).toFixed(2)} MB)...`);
      
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: mainReportKey,
        Body: mainReportData,
        ContentType: 'application/json',
        CacheControl: 'public, max-age=3600' // Cache for 1 hour
      }));
      
      // Also save a timestamped version for history
      const historyKey = `optimization-pipeline/history/${timestamp.split('T')[0]}/${timestamp.replace(/[:.]/g, '-')}.json`;
      
      console.log('   Saving historical snapshot...');
      
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: historyKey,
        Body: mainReportData,
        ContentType: 'application/json',
        CacheControl: 'public, max-age=31536000' // Cache historical data for 1 year
      }));
      
      // Update metadata file with latest info
      const metadata = {
        lastUpdated: timestamp,
        stats: reportData.s,
        totalLands: reportData.l.length,
        reportUrl: `${this.baseUrl}/${mainReportKey}`,
        historyUrl: `${this.baseUrl}/${historyKey}`
      };
      
      console.log('   Updating metadata...');
      
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: 'optimization-pipeline/metadata.json',
        Body: JSON.stringify(metadata),
        ContentType: 'application/json',
        CacheControl: 'public, max-age=300' // Cache metadata for 5 minutes
      }));
      
      console.log('✅ Report data uploaded to CloudFlare R2 successfully!');
      console.log(`🌐 View report at: ${this.baseUrl}/optimization-pipeline/report.json`);
      
      // Trigger Vercel API to update PostgreSQL history
      await this.updateDatabaseHistory(reportData.s, timestamp);
      
    } catch (error: any) {
      console.error('❌ Error uploading to CloudFlare R2:', error.message);
      throw error;
    }
  }
  
  private async updateDatabaseHistory(stats: any, timestamp: string): Promise<void> {
    try {
      if (!process.env.VERCEL_URL) {
        console.log('   Skipping database update (VERCEL_URL not configured)');
        return;
      }
      
      console.log('   Updating database history...');
      
      const axios = require('axios');
      const response = await axios.post(
        `${process.env.VERCEL_URL}/api/update-history`,
        {
          timestamp,
          stats,
          secret: process.env.UPLOAD_SECRET
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 200) {
        console.log('   Database history updated successfully');
      }
    } catch (error: any) {
      console.error('   Warning: Failed to update database history:', error.message);
      // Don't throw - this is not critical
    }
  }
}