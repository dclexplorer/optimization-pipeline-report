import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import { CONFIG, PATHS } from '../config';

dotenv.config();

export class S3OptimizationChecker {
  private s3Client: S3Client;
  private bucket: string;
  private optimizedAssets: Set<string> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    this.bucket = CONFIG.S3_BUCKET;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🔍 Fetching list of optimized assets from S3...');
    const startTime = Date.now();
    
    try {
      let continuationToken: string | undefined;
      let totalObjects = 0;
      
      const prefix = PATHS.s3Prefix;
      const prefixRegex = new RegExp(`^${prefix}(.+?)-mobile\\.zip$`);

      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        });

        const response = await this.s3Client.send(command);

        if (response.Contents) {
          for (const object of response.Contents) {
            if (object.Key && object.Key.endsWith('-mobile.zip')) {
              // Extract scene ID from key: {version}/{sceneId}-mobile.zip
              const match = object.Key.match(prefixRegex);
              if (match) {
                this.optimizedAssets.add(match[1]);
              }
            }
          }
          totalObjects += response.Contents.length;
        }
        
        continuationToken = response.NextContinuationToken;
        console.log(`  Fetched ${totalObjects} objects so far...`);
      } while (continuationToken);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Found ${this.optimizedAssets.size} optimized scenes in ${elapsed}s`);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to fetch S3 objects:', error);
      throw error;
    }
  }

  public hasOptimizedAsset(sceneId: string): boolean {
    if (!this.initialized) {
      throw new Error('S3OptimizationChecker not initialized. Call initialize() first.');
    }
    return this.optimizedAssets.has(sceneId);
  }

  public async checkSingleAsset(sceneId: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: PATHS.getOptimizedAssetKey(sceneId),
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  public getOptimizedSceneIds(): string[] {
    return Array.from(this.optimizedAssets);
  }

  public getOptimizationStats(): { total: number, sceneIds: string[] } {
    return {
      total: this.optimizedAssets.size,
      sceneIds: this.getOptimizedSceneIds()
    };
  }
}