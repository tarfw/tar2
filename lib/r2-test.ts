import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Config, validateR2Config } from './r2-config';

export class R2ConnectionTest {
  private client: S3Client | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    if (!validateR2Config()) {
      console.error('R2 configuration validation failed');
      return;
    }

    console.log('Test: Initializing R2 client...');
    console.log('Endpoint:', r2Config.endpoint);
    console.log('Bucket:', r2Config.bucketName);
    console.log('Region:', r2Config.region);

    this.client = new S3Client({
      region: r2Config.region,
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
      forcePathStyle: true,
      maxAttempts: 3,
    });

    console.log('R2 client initialized successfully');
  }

  async testConnection(): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!this.client) {
      return { success: false, error: 'R2 client not initialized' };
    }

    try {
      console.log('Testing R2 connection by listing objects...');

      const command = new ListObjectsV2Command({
        Bucket: r2Config.bucketName,
        MaxKeys: 1, // Just get 1 object to test connection
      });

      const response = await this.client.send(command);

      console.log('R2 connection test successful:', {
        bucketName: response.Name,
        keyCount: response.KeyCount,
        objectCount: response.Contents?.length || 0,
      });

      return {
        success: true,
        data: {
          bucketName: response.Name,
          keyCount: response.KeyCount,
          objectCount: response.Contents?.length || 0,
          objects: response.Contents?.slice(0, 3).map(obj => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
          })) || [],
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('R2 connection test failed:', {
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Provide specific error guidance
      let userFriendlyError = errorMessage;

      if (errorMessage.toLowerCase().includes('network request failed')) {
        userFriendlyError = 'Network connection failed. This could be due to:\n' +
          '• Internet connectivity issues\n' +
          '• Firewall blocking the request\n' +
          '• R2 endpoint not reachable\n' +
          '• CORS configuration issues';
      } else if (errorMessage.toLowerCase().includes('credentials')) {
        userFriendlyError = 'Authentication failed. Please verify:\n' +
          '• Access Key ID is correct\n' +
          '• Secret Access Key is correct\n' +
          '• Keys have R2 read/write permissions';
      } else if (errorMessage.toLowerCase().includes('bucket') || errorMessage.toLowerCase().includes('not found')) {
        userFriendlyError = 'Bucket access failed. Please verify:\n' +
          '• Bucket name is correct\n' +
          '• Bucket exists in your account\n' +
          '• Account ID is correct';
      }

      return { success: false, error: userFriendlyError };
    }
  }

  async testSimpleUpload(): Promise<{ success: boolean; error?: string; key?: string }> {
    if (!this.client) {
      return { success: false, error: 'R2 client not initialized' };
    }

    try {
      console.log('Testing simple upload...');

      const testKey = `test/connection-test-${Date.now()}.txt`;
      const testContent = `R2 connection test at ${new Date().toISOString()}`;

      const command = new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: testKey,
        Body: new TextEncoder().encode(testContent),
        ContentType: 'text/plain',
      });

      await this.client.send(command);

      console.log('Test upload successful:', testKey);

      return { success: true, key: testKey };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';

      console.error('Test upload failed:', {
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });

      return { success: false, error: errorMessage };
    }
  }

  async runFullTest(): Promise<void> {
    console.log('=== R2 Connection Test Suite ===');

    // Test 1: Basic connection
    console.log('\n1. Testing basic connection...');
    const connectionResult = await this.testConnection();

    if (connectionResult.success) {
      console.log('✅ Connection test passed');
      console.log('Bucket data:', connectionResult.data);
    } else {
      console.log('❌ Connection test failed:', connectionResult.error);
      return; // Don't proceed with upload test if connection fails
    }

    // Test 2: Simple upload
    console.log('\n2. Testing upload functionality...');
    const uploadResult = await this.testSimpleUpload();

    if (uploadResult.success) {
      console.log('✅ Upload test passed');
      console.log('Test file uploaded:', uploadResult.key);
    } else {
      console.log('❌ Upload test failed:', uploadResult.error);
    }

    console.log('\n=== Test Suite Complete ===');
  }
}

// Export a singleton instance for easy use
export const r2Test = new R2ConnectionTest();

// Export a simple function to run tests
export const testR2Connection = async (): Promise<void> => {
  await r2Test.runFullTest();
};
