# Setup Instructions

## CloudFlare R2 Configuration

The reports are now stored in CloudFlare R2. The application uses the following configuration:

### R2 Bucket Details
- **Bucket Name**: reports
- **Public URL**: https://reports.dclexplorer.com/
- **Report Path**: `optimization-pipeline/report.json`

### Environment Variables for GitHub Actions

Add these secrets to your GitHub repository:

#### CloudFlare R2 (for report storage)
- `R2_ACCESS_KEY_ID`: CloudFlare R2 Access Key ID
- `R2_SECRET_ACCESS_KEY`: CloudFlare R2 Secret Access Key  
- `R2_ENDPOINT`: https://a2b29bacd555c6fc78becaad8b183e9c.r2.cloudflarestorage.com

#### Decentraland S3 (for checking optimization status)
- `S3_ACCESS_KEY_ID`: AWS S3 Access Key ID
- `S3_SECRET_ACCESS_KEY`: AWS S3 Secret Access Key
- `S3_ENDPOINT`: S3 endpoint URL
- `S3_BUCKET`: S3 bucket name
- `S3_REGION`: S3 region

#### Vercel Configuration
- `VERCEL_URL`: Your Vercel deployment URL (e.g., https://optimization-pipeline-report.vercel.app)
- `UPLOAD_SECRET`: Secret token for authenticating API calls

## Vercel PostgreSQL Database

The history is stored in a Vercel PostgreSQL database. The database is automatically created when you deploy to Vercel.

### Required Vercel Environment Variables

In your Vercel project settings, add:

1. **Database Connection** (automatically added when you connect a PostgreSQL database):
   - `POSTGRES_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

2. **Application Secrets**:
   - `UPLOAD_SECRET`: Same secret used in GitHub Actions

### Setting up the Database

1. Go to your Vercel dashboard
2. Select your project
3. Go to the "Storage" tab
4. Click "Create Database" and select "Postgres"
5. Follow the setup wizard
6. The database connection will be automatically added to your project

The database table will be created automatically on the first history update.

## Local Development

For local development, create a `.env` file:

```env
# CloudFlare R2
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ENDPOINT=https://a2b29bacd555c6fc78becaad8b183e9c.r2.cloudflarestorage.com

# Decentraland S3
S3_ACCESS_KEY_ID=your_s3_access_key
S3_SECRET_ACCESS_KEY=your_s3_secret_key
S3_ENDPOINT=your_s3_endpoint
S3_BUCKET=your_s3_bucket
S3_REGION=your_s3_region

# Vercel
VERCEL_URL=http://localhost:3000
UPLOAD_SECRET=your_upload_secret
```

## Data Flow

1. **Report Generation**: GitHub Actions runs every 12 hours
2. **Upload to R2**: Full report is uploaded to `https://reports.dclexplorer.com/optimization-pipeline/report.json`
3. **History Update**: Statistics are sent to Vercel PostgreSQL via API
4. **Frontend**: 
   - Fetches current report from CloudFlare R2
   - Fetches history from Vercel PostgreSQL via API

## Report Structure

The report JSON has the following structure:
```json
{
  "l": [...],      // Array of lands data
  "s": {...},      // Statistics object  
  "c": {...},      // Scene color indices
  "g": 1234567890  // Generation timestamp
}
```