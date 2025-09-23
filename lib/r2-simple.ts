import { r2Config } from './r2-config';

export interface SimpleUploadResult {
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

// Simple AWS v4 signature generation for React Native
class SimpleR2Service {
  private createSignature(
    method: string,
    path: string,
    queryString: string,
    headers: Record<string, string>,
    payload: string
  ): string {
    // This is a simplified version - in production you'd want proper AWS v4 signing
    // For now, we'll try direct upload without signing and rely on bucket permissions
    return '';
  }

  async uploadFile(file: any, prefix: string = 'media'): Promise<SimpleUploadResult> {
    try {
      console.log('=== Simple R2 Upload ===');
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        uri: file.uri
      });

      // Generate a unique key
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = file.name?.split('.').pop() || 'bin';
      const key = `${prefix}/${timestamp}-${randomId}.${extension}`;

      console.log('Generated key:', key);

      // Read file as blob/buffer
      const response = await fetch(file.uri);
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('File blob size:', blob.size);

      // Try direct upload to R2 using fetch
      const uploadUrl = `${r2Config.endpoint}/${r2Config.bucketName}/${key}`;
      console.log('Upload URL:', uploadUrl);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Content-Length': blob.size.toString(),
          // Add basic auth headers - this is simplified
          'Authorization': `AWS4-HMAC-SHA256 Credential=${r2Config.accessKeyId}/20231201/auto/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=placeholder`,
        },
        body: blob,
      });

      console.log('Upload response status:', uploadResponse.status);
      console.log('Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.log('Upload error response:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      // Generate public URL
      const publicUrl = `https://pub-${r2Config.bucketName}.r2.dev/${key}`;

      console.log('Upload successful!');
      console.log('Public URL:', publicUrl);

      return {
        success: true,
        url: publicUrl,
        key: key
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Simple R2 upload error:', error);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      console.log('=== Simple R2 Delete ===');
      console.log('Deleting key:', key);

      const deleteUrl = `${r2Config.endpoint}/${r2Config.bucketName}/${key}`;
      console.log('Delete URL:', deleteUrl);

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 Credential=${r2Config.accessKeyId}/20231201/auto/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=placeholder`,
        },
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Delete error response:', errorText);
        return false;
      }

      console.log('Delete successful!');
      return true;

    } catch (error) {
      console.error('Simple R2 delete error:', error);
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('=== Simple R2 Connection Test ===');

      // Test basic connectivity to R2 endpoint
      const testUrl = r2Config.endpoint;
      console.log('Testing endpoint:', testUrl);

      const response = await fetch(testUrl, {
        method: 'HEAD',
      });

      console.log('Connection test status:', response.status);
      console.log('Connection test headers:', Object.fromEntries(response.headers.entries()));

      return {
        success: response.status < 500, // Any response < 500 means we can reach the endpoint
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Connection test error:', error);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Try a simpler upload approach using presigned URLs (if we can generate them)
  async uploadWithPresignedUrl(file: any): Promise<SimpleUploadResult> {
    try {
      console.log('=== Presigned URL Upload Attempt ===');

      // For now, let's try a different approach - upload to a test endpoint
      // This would normally require a backend to generate presigned URLs

      const testUpload = await this.uploadFile(file, 'test');
      return testUpload;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Presigned upload failed'
      };
    }
  }

  getPublicUrl(key: string): string {
    return `https://pub-${r2Config.bucketName}.r2.dev/${key}`;
  }
}

export const simpleR2Service = new SimpleR2Service();
export default simpleR2Service;
