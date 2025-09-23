import { r2Config } from './r2-config';

export interface ManualUploadResult {
  success: boolean;
  error?: string;
  response?: any;
}

export class ManualR2Test {
  async testDirectUpload(fileData: Uint8Array, fileName: string, mimeType: string): Promise<ManualUploadResult> {
    try {
      console.log('=== Manual R2 Upload Test ===');
      console.log('Config:', {
        endpoint: r2Config.endpoint,
        bucket: r2Config.bucketName,
        region: r2Config.region,
        hasAccessKey: !!r2Config.accessKeyId,
        hasSecretKey: !!r2Config.secretAccessKey,
      });

      // Create a simple key for the test file
      const key = `test/${Date.now()}-${fileName}`;
      console.log('Upload key:', key);

      // Try a simple fetch request to R2
      const url = `${r2Config.endpoint}/${r2Config.bucketName}/${key}`;
      console.log('Upload URL:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileData.byteLength.toString(),
        },
        body: fileData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (response.ok) {
        return {
          success: true,
          response: {
            status: response.status,
            url: url,
            key: key,
          }
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseText}`,
          response: {
            status: response.status,
            body: responseText,
          }
        };
      }
    } catch (error) {
      console.error('Manual upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async testNetworkConnectivity(): Promise<ManualUploadResult> {
    try {
      console.log('=== Network Connectivity Test ===');

      // Test 1: Basic internet connectivity
      console.log('Testing basic internet connectivity...');
      const internetTest = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Internet test status:', internetTest.status);

      if (!internetTest.ok) {
        return {
          success: false,
          error: 'No internet connectivity detected',
        };
      }

      // Test 2: R2 endpoint reachability
      console.log('Testing R2 endpoint reachability...');
      const r2EndpointTest = await fetch(r2Config.endpoint, {
        method: 'HEAD',
      });

      console.log('R2 endpoint test status:', r2EndpointTest.status);
      console.log('R2 endpoint headers:', Object.fromEntries(r2EndpointTest.headers.entries()));

      return {
        success: true,
        response: {
          internetConnectivity: internetTest.status,
          r2Endpoint: r2EndpointTest.status,
          r2Headers: Object.fromEntries(r2EndpointTest.headers.entries()),
        }
      };

    } catch (error) {
      console.error('Network connectivity test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: `Network test failed: ${errorMessage}`,
      };
    }
  }

  async testR2BucketAccess(): Promise<ManualUploadResult> {
    try {
      console.log('=== R2 Bucket Access Test ===');

      const bucketUrl = `${r2Config.endpoint}/${r2Config.bucketName}`;
      console.log('Testing bucket URL:', bucketUrl);

      const response = await fetch(bucketUrl, {
        method: 'HEAD',
      });

      console.log('Bucket access status:', response.status);
      console.log('Bucket access headers:', Object.fromEntries(response.headers.entries()));

      if (response.status === 403) {
        return {
          success: false,
          error: 'Bucket access forbidden - check credentials and permissions',
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          error: 'Bucket not found - check bucket name and account ID',
        };
      }

      return {
        success: response.ok,
        response: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        },
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };

    } catch (error) {
      console.error('Bucket access test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: `Bucket access test failed: ${errorMessage}`,
      };
    }
  }

  async runFullDiagnostic(): Promise<void> {
    console.log('\n🚀 Starting R2 Manual Diagnostic Suite...\n');

    // Test 1: Network connectivity
    const networkResult = await this.testNetworkConnectivity();
    if (networkResult.success) {
      console.log('✅ Network connectivity: PASS');
    } else {
      console.log('❌ Network connectivity: FAIL -', networkResult.error);
      return; // Stop if no network
    }

    // Test 2: R2 bucket access
    const bucketResult = await this.testR2BucketAccess();
    if (bucketResult.success) {
      console.log('✅ R2 bucket access: PASS');
    } else {
      console.log('❌ R2 bucket access: FAIL -', bucketResult.error);
    }

    // Test 3: Simple upload test
    console.log('\n📤 Testing simple upload...');
    const testData = new TextEncoder().encode('Hello R2 from manual test!');
    const uploadResult = await this.testDirectUpload(testData, 'manual-test.txt', 'text/plain');

    if (uploadResult.success) {
      console.log('✅ Manual upload: PASS');
      console.log('Upload details:', uploadResult.response);
    } else {
      console.log('❌ Manual upload: FAIL -', uploadResult.error);
    }

    console.log('\n🏁 Diagnostic complete! Check logs above for details.\n');
  }
}

// Export singleton
export const manualR2Test = new ManualR2Test();

// Helper function to run from component
export const runManualR2Test = async (): Promise<void> => {
  await manualR2Test.runFullDiagnostic();
};
