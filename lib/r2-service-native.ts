import { Buffer } from '@craftzdog/react-native-buffer';

// Polyfill global Buffer for AWS SDK
global.Buffer = Buffer;

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  r2Config,
  validateR2Config,
  generateFileKey,
  getPublicUrl,
  trackError,
  type MediaFile,
} from "./r2-config";

export enum UploadErrorType {
  CONFIGURATION = "configuration",
  NETWORK = "network",
  FILE_READ = "file_read",
  SERVER = "server",
  UNKNOWN = "unknown",
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  errorType?: UploadErrorType;
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

class R2ServiceNative {
  private client: S3Client | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    if (!validateR2Config()) {
      console.error("R2 configuration validation failed");
      return;
    }

    console.log("Initializing React Native compatible R2 client...");

    try {
      this.client = new S3Client({
        region: r2Config.region,
        endpoint: r2Config.endpoint,
        credentials: {
          accessKeyId: r2Config.accessKeyId,
          secretAccessKey: r2Config.secretAccessKey,
        },
        forcePathStyle: true,
        maxAttempts: 3,
        requestHandler: {
          connectionTimeout: 60000,
          requestTimeout: 120000,
        },
        runtime: "react-native",
        apiVersion: "2006-03-01",
      });

      console.log("React Native R2 client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize R2 client:", error);
    }
  }

  async uploadFile(
    file: MediaFile,
    prefix: string = "media",
  ): Promise<UploadResult> {
    if (!this.client) {
      const configValid = validateR2Config();
      return {
        success: false,
        error: `R2 client not initialized - ${configValid ? "client initialization failed" : "configuration missing or invalid"}`,
        errorType: UploadErrorType.CONFIGURATION,
      };
    }

    if (!file || !file.uri) {
      return {
        success: false,
        error: "Invalid file provided",
        errorType: UploadErrorType.FILE_READ,
      };
    }

    try {
      const key = generateFileKey(file.name, prefix);
      console.log("Generated file key:", key);

      // Read file data
      let fileBuffer: Buffer;
      try {
        console.log("Reading file from URI:", file.uri);

        // Use fetch to read the file
        const response = await fetch(file.uri);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch file: ${response.status} ${response.statusText}`,
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);

        console.log("File read successfully, size:", fileBuffer.length);
      } catch (fileReadError) {
        console.error("File read error:", fileReadError);
        return {
          success: false,
          error: `Failed to read file: ${fileReadError instanceof Error ? fileReadError.message : "Unknown file read error"}`,
          errorType: UploadErrorType.FILE_READ,
        };
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return {
          success: false,
          error: "File appears to be empty or corrupted",
          errorType: UploadErrorType.FILE_READ,
        };
      }

      console.log("Preparing upload to R2:", {
        bucket: r2Config.bucketName,
        key: key,
        contentType: file.type || "application/octet-stream",
        size: fileBuffer.length,
      });

      // Create upload command
      const command = new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: file.type || "application/octet-stream",
        ContentLength: fileBuffer.length,
        Metadata: {
          "original-name": file.name || "unknown",
          "upload-time": new Date().toISOString(),
        },
      });

      console.log("Sending upload command to R2...");

      // Set a timeout for the upload
      const uploadPromise = this.client.send(command);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Upload timeout after 2 minutes")), 120000)
      );

      const response = await Promise.race([uploadPromise, timeoutPromise]);
      console.log("Upload successful:", response);

      const url = getPublicUrl(key);
      console.log("Generated public URL:", url);

      return { success: true, url, key };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      console.error("R2 Upload error details:", {
        error: error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        fileName: file.name,
        fileSize: file.size,
        endpoint: r2Config.endpoint,
        bucket: r2Config.bucketName,
      });

      trackError(error as Error, "R2ServiceNative.uploadFile", {
        fileName: file.name,
        fileSize: file.size,
      });

      return {
        success: false,
        error: this.getDetailedErrorMessage(error, errorMessage),
        errorType: this.categorizeError(error),
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    if (!this.client) {
      console.error("R2 client not initialized for deleteFile");
      return false;
    }

    try {
      console.log("Deleting file with key:", key);

      const command = new DeleteObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      console.log("File deleted successfully:", key);
      return true;
    } catch (error) {
      console.error("Failed to delete file:", error);
      trackError(error as Error, "R2ServiceNative.deleteFile", { key });
      return false;
    }
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string | null> {
    if (!this.client) {
      console.error("R2 client not initialized for getSignedUrl");
      return null;
    }

    try {
      console.log("Generating signed URL for key:", key);

      const command = new GetObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      console.log("Signed URL generated successfully");
      return signedUrl;
    } catch (error) {
      console.error("Failed to generate signed URL:", error);
      trackError(error as Error, "R2ServiceNative.getSignedUrl", { key });
      return null;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const command = new HeadObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<any> {
    if (!this.client) return null;

    try {
      const command = new HeadObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);
      return {
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
      };
    } catch (error) {
      trackError(error as Error, "R2ServiceNative.getFileMetadata", { key });
      return null;
    }
  }

  getPublicUrl(key: string): string {
    return getPublicUrl(key);
  }

  private categorizeError(error: unknown): UploadErrorType {
    if (!error) return UploadErrorType.UNKNOWN;

    const errorMessage =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

    if (
      errorMessage.includes("credentials") ||
      errorMessage.includes("access denied") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("invalid access key") ||
      errorMessage.includes("signature")
    ) {
      return UploadErrorType.CONFIGURATION;
    }

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("enotfound") ||
      errorMessage.includes("econnrefused")
    ) {
      return UploadErrorType.NETWORK;
    }

    if (
      errorMessage.includes("file") &&
      (errorMessage.includes("read") ||
        errorMessage.includes("access") ||
        errorMessage.includes("not found"))
    ) {
      return UploadErrorType.FILE_READ;
    }

    if (
      errorMessage.includes("500") ||
      errorMessage.includes("502") ||
      errorMessage.includes("503") ||
      errorMessage.includes("504") ||
      errorMessage.includes("internal server error")
    ) {
      return UploadErrorType.SERVER;
    }

    return UploadErrorType.UNKNOWN;
  }

  private getDetailedErrorMessage(
    error: unknown,
    defaultMessage: string,
  ): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Network-related errors
      if (
        message.includes("network request failed") ||
        message.includes("fetch")
      ) {
        return "Network connection failed. This could be due to:\n• Internet connectivity issues\n• Firewall blocking the request\n• R2 endpoint not accessible from mobile\n• CORS configuration issues";
      }

      // CORS-related errors
      if (message.includes("cors") || message.includes("access-control")) {
        return "CORS error: Mobile apps cannot directly access R2 without proper configuration. Consider using a backend proxy.";
      }

      // Authentication errors
      if (
        message.includes("credentials") ||
        message.includes("access denied") ||
        message.includes("unauthorized")
      ) {
        return "Authentication failed: Please verify your R2 credentials are correct and have proper permissions.";
      }

      // Configuration errors
      if (message.includes("endpoint") || message.includes("bucket")) {
        return "Configuration error: Please check your R2 endpoint and bucket name are correct.";
      }

      // Timeout errors
      if (message.includes("timeout")) {
        return "Upload timeout: The file upload took too long. Try with a smaller file or check your connection.";
      }
    }

    return defaultMessage;
  }
}

export const r2ServiceNative = new R2ServiceNative();
export default r2ServiceNative;
