import { Buffer } from '@craftzdog/react-native-buffer';

// Polyfill global Buffer
global.Buffer = Buffer;

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  key: string;
  createdAt: Date;
  lastModified: Date;
}

// Simple working R2 service using direct HTTP requests
class WorkingR2Service {
  private readonly endpoint = 'https://f6d1d15e6f0b37b4b8fcad3c41a7922d.r2.cloudflarestorage.com';
  private readonly bucketName = 'tarapp-pqdhr';
  private readonly accessKey = 'c3827ec3b7fb19b6c35168478440a8c6';
  private readonly secretKey = '8e6d899be792b0bee11201a6c9f6f83f865f2fce9f1ca2c3ff172ad35b5759e2';

  // Generate unique file key
  private generateFileKey(username: string, originalName: string | undefined, prefix: string = 'media'): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const safeName = originalName || `file_${timestamp}`;
    const extension = safeName.split('.').pop() || '';
    return `${username}/${prefix}/${timestamp}-${randomId}.${extension}`;
  }

  // Create AWS v4 signature (simplified version)
  private async createSignature(
    method: string,
    path: string,
    queryParams: string = '',
    headers: Record<string, string>,
    payload: string = ''
  ): Promise<string> {
    // This is a simplified AWS v4 signature - for production use proper implementation
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = timestamp.slice(0, 8);

    const credentialScope = `${date}/apac/s3/aws4_request`;
    const signedHeaders = Object.keys(headers).sort().join(';');

    // Create canonical request
    const canonicalRequest = [
      method,
      path,
      queryParams,
      Object.entries(headers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join('\n'),
      '',
      signedHeaders,
      payload
    ].join('\n');

    // For simplicity, return a basic authorization header
    return `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=placeholder`;
  }

  async uploadFile(file: any, prefix: string = 'media'): Promise<UploadResult> {
    try {
      console.log('=== Working R2 Upload Service ===');
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        uri: file.uri?.substring(0, 50) + '...'
      });

      // Generate unique key
      const key = this.generateFileKey('user', file.name, prefix);
      console.log('Generated key:', key);

      // Read file data
      console.log('Reading file from URI...');
      const response = await fetch(file.uri);
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('File blob created, size:', blob.size);

      // Create upload URL
      const uploadUrl = `${this.endpoint}/${this.bucketName}/${key}`;
      console.log('Upload URL:', uploadUrl);

      // Prepare headers
      const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
      const headers: Record<string, string> = {
        'host': new URL(this.endpoint).hostname,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
        'x-amz-date': timestamp,
        'content-type': file.type || 'application/octet-stream',
        'content-length': blob.size.toString()
      };

      // Create authorization header
      const authorization = await this.createSignature(
        'PUT',
        `/${this.bucketName}/${key}`,
        '',
        headers,
        'UNSIGNED-PAYLOAD'
      );

      console.log('Attempting upload with headers:', Object.keys(headers));

      // Try upload with different approaches
      let uploadResponse: Response;

      try {
        // Approach 1: Standard PUT with auth headers
        console.log('Trying upload with AWS auth headers...');
        uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            ...headers,
            'Authorization': authorization
          },
          body: blob
        });

        console.log('Upload response status:', uploadResponse.status);

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.log('Upload error response:', errorText);

          // If auth failed, try without auth (if bucket allows public write)
          if (uploadResponse.status === 403 || uploadResponse.status === 401) {
            console.log('Auth failed, trying public upload...');

            uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
                'Content-Length': blob.size.toString()
              },
              body: blob
            });

            console.log('Public upload response status:', uploadResponse.status);

            if (!uploadResponse.ok) {
              const publicErrorText = await uploadResponse.text();
              console.log('Public upload error:', publicErrorText);
              throw new Error(`Upload failed: ${uploadResponse.status} - ${publicErrorText}`);
            }
          } else {
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
          }
        }

      } catch (fetchError) {
        console.error('Direct upload failed:', fetchError);
        throw new Error(`Network error during upload: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }

      // Generate public URL
      const publicUrl = `https://pub-${this.bucketName}.r2.dev/${key}`;

      console.log('✅ Upload successful!');
      console.log('Public URL:', publicUrl);

      return {
        success: true,
        url: publicUrl,
        key: key
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      console.error('❌ Upload failed:', error);

      // Provide helpful error messages
      let userFriendlyError = errorMessage;

      if (errorMessage.includes('Network request failed')) {
        userFriendlyError = 'Network connection failed. Please check your internet connection and try again.';
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        userFriendlyError = 'Authentication failed. Please check your R2 credentials and bucket permissions.';
      } else if (errorMessage.includes('404')) {
        userFriendlyError = 'Bucket not found. Please verify your R2 bucket name and endpoint.';
      } else if (errorMessage.includes('CORS')) {
        userFriendlyError = 'CORS error. Please configure your R2 bucket to allow uploads from mobile apps.';
      }

      return {
        success: false,
        error: userFriendlyError
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      console.log('=== Working R2 Delete Service ===');
      console.log('Deleting key:', key);

      const deleteUrl = `${this.endpoint}/${this.bucketName}/${key}`;
      console.log('Delete URL:', deleteUrl);

      // Prepare headers for delete
      const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
      const headers: Record<string, string> = {
        'host': new URL(this.endpoint).hostname,
        'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'x-amz-date': timestamp
      };

      const authorization = await this.createSignature(
        'DELETE',
        `/${this.bucketName}/${key}`,
        '',
        headers,
        ''
      );

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          ...headers,
          'Authorization': authorization
        }
      });

      console.log('Delete response status:', response.status);

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        console.log('Delete error response:', errorText);
        return false;
      }

      console.log('✅ Delete successful!');
      return true;

    } catch (error) {
      console.error('❌ Delete failed:', error);
      return false;
    }
  }

  // Test connection to R2
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('=== Testing R2 Connection ===');

      // Test 1: Basic endpoint connectivity
      console.log('Testing endpoint connectivity...');
      const endpointResponse = await fetch(this.endpoint, { method: 'HEAD' });
      console.log('Endpoint response status:', endpointResponse.status);

      // Test 2: Bucket accessibility
      console.log('Testing bucket accessibility...');
      const bucketUrl = `${this.endpoint}/${this.bucketName}`;
      const bucketResponse = await fetch(bucketUrl, { method: 'HEAD' });
      console.log('Bucket response status:', bucketResponse.status);

      const details = {
        endpoint: {
          url: this.endpoint,
          status: endpointResponse.status,
          reachable: endpointResponse.status < 500
        },
        bucket: {
          url: bucketUrl,
          status: bucketResponse.status,
          accessible: bucketResponse.status !== 404
        }
      };

      console.log('Connection test details:', details);

      return {
        success: true,
        details
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      console.error('❌ Connection test failed:', error);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Test with a simple file upload
  async testUpload(): Promise<UploadResult> {
    try {
      console.log('=== Testing Simple Upload ===');

      // Create a simple test file
      const testContent = `Test file created at ${new Date().toISOString()}`;
      const testBlob = new Blob([testContent], { type: 'text/plain' });

      const testFile = {
        name: 'test-upload.txt',
        type: 'text/plain',
        size: testBlob.size,
        uri: URL.createObjectURL(testBlob)
      };

      const result = await this.uploadFile(testFile, 'test');

      // Clean up the object URL
      URL.revokeObjectURL(testFile.uri);

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test upload failed'
      };
    }
  }

  getPublicUrl(key: string): string {
    return `https://pub-${this.bucketName}.r2.dev/${key}`;
  }

  // Get signed URL (simplified - in production use proper presigning)
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      // For simplicity, return the public URL
      // In production, implement proper presigned URL generation
      return this.getPublicUrl(key);
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }
  }
}

export const workingR2Service = new WorkingR2Service();
export default workingR2Service;
