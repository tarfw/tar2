import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  workingR2Service as r2Service,
  type FileItem,
  type UploadResult,
} from "../lib/r2-working";
import {
  validateFile,
  formatFileSize,
  getFileIcon,
  isImageFile,
  sanitizeFileName,
} from "../lib/file-utils";
import { testR2Connection } from "../lib/r2-test";
import { runManualR2Test } from "../lib/r2-manual-test";
import { simpleR2Service } from "../lib/r2-simple";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface FileManagerProps {
  onFileSelect?: (file: FileItem) => void;
}

export default function FileManager({ onFileSelect }: FileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "images" | "documents" | "videos"
  >("all");
  const [testing, setTesting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    loadFiles();
    // Show debug info on component mount
    setDebugInfo(`Endpoint: https://f6d1d15e6f0b37b4b8fcad3c41a7922d.r2.cloudflarestorage.com
Bucket: tarapp-pqdhr
Region: apac`);
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    // In a real app, you'd load this from your database or storage
    // For now, we'll just show uploaded files in state
    setLoading(false);
  };

  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload images.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Settings",
              onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync(),
            },
          ],
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: sanitizeFileName(asset.fileName || "image.jpg"),
          type: asset.type || "image/jpeg",
          size: asset.fileSize || 0,
        };

        // Validate file before upload
        const validation = validateFile(file);
        if (!validation.isValid) {
          Alert.alert("File Error", validation.error || "Invalid file");
          return;
        }

        if (validation.warnings && validation.warnings.length > 0) {
          Alert.alert("Warning", validation.warnings.join("\n"));
        }

        await uploadFile(file);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: sanitizeFileName(asset.name),
          type: asset.mimeType || "application/octet-stream",
          size: asset.size || 0,
        };

        // Validate file before upload
        const validation = validateFile(file);
        if (!validation.isValid) {
          Alert.alert("File Error", validation.error || "Invalid file");
          return;
        }

        if (validation.warnings && validation.warnings.length > 0) {
          Alert.alert("Warning", validation.warnings.join("\n"));
        }

        await uploadFile(file);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const uploadFile = async (file: any) => {
    setUploading(true);
    try {
      console.log("Starting upload with file:", {
        name: file.name,
        type: file.type,
        size: file.size,
        uri: file.uri?.substring(0, 50) + "...",
      });

      const result: UploadResult = await r2Service.uploadFile(file);
      console.log("Upload result:", result);

      if (result.success && result.url && result.key) {
        const newFile: FileItem = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: result.url,
          key: result.key,
          createdAt: new Date(),
          lastModified: new Date(),
        };

        setFiles((prev) => [newFile, ...prev]);
        Alert.alert("Success", "File uploaded successfully");
      } else {
        Alert.alert("Upload Failed", result.error || "Unknown error occurred");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload file");
    }
    setUploading(false);
  };

  const deleteFile = async (file: FileItem) => {
    Alert.alert(
      "Delete File",
      `Are you sure you want to delete ${file.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await r2Service.deleteFile(file.key);
            if (success) {
              setFiles((prev) => prev.filter((f) => f.id !== file.id));
              Alert.alert("Success", "File deleted successfully");
            } else {
              Alert.alert("Error", "Failed to delete file");
            }
          },
        },
      ],
    );
  };

  const viewFile = async (file: FileItem) => {
    if (isImageFile(file.type)) {
      setSelectedFile(file);
      setPreviewVisible(true);
    } else {
      // For non-images, get a presigned URL to open in browser
      const signedUrl = await r2Service.getSignedUrl(file.key);
      if (signedUrl) {
        Alert.alert(
          "File Access",
          `File: ${file.name}\nSize: ${formatFileSize(file.size)}\n\nPresigned URL generated for secure access.`,
          [{ text: "OK", style: "default" }],
        );
      } else {
        Alert.alert("Error", "Failed to generate access URL for file");
      }
    }
  };

  const runConnectionTest = async () => {
    setTesting(true);
    try {
      await testR2Connection();
      Alert.alert("Test Complete", "Check the console for detailed results");
    } catch (error) {
      Alert.alert("Test Failed", "Check the console for error details");
    }
    setTesting(false);
  };

  const runManualTest = async () => {
    setTesting(true);
    try {
      await runManualR2Test();
      Alert.alert(
        "Manual Test Complete",
        "Check the console for detailed network and R2 diagnostics",
      );
    } catch (error) {
      Alert.alert("Manual Test Failed", "Check the console for error details");
    }
    setTesting(false);
  };

  const runSimpleTest = async () => {
    setTesting(true);
    try {
      // Test connection first
      const connectionResult = await r2Service.testConnection();
      if (connectionResult.success) {
        // If connection works, try a test upload
        const uploadResult = await r2Service.testUpload();
        if (uploadResult.success) {
          Alert.alert(
            "Working R2 Test",
            "✅ Connection and upload test successful! Check console for details.",
          );
        } else {
          Alert.alert(
            "Working R2 Test",
            `⚠️ Connection OK but upload failed: ${uploadResult.error}`,
          );
        }
      } else {
        Alert.alert(
          "Working R2 Test",
          `❌ Connection failed: ${connectionResult.error}`,
        );
      }
    } catch (error) {
      Alert.alert("Working R2 Test Failed", "Check console for details");
    }
    setTesting(false);
  };

  const filteredFiles = files.filter((file) => {
    if (filter === "all") return true;
    if (filter === "images") return isImageFile(file.type);
    if (filter === "videos") return file.type.startsWith("video/");
    if (filter === "documents")
      return !file.type.startsWith("image/") && !file.type.startsWith("video/");
    return true;
  });

  const renderFileItem = (file: FileItem) => (
    <TouchableOpacity
      key={file.id}
      style={styles.fileItem}
      onPress={() => viewFile(file)}
    >
      <View style={styles.fileInfo}>
        <Text style={styles.fileIcon}>{getFileIcon(file.type)}</Text>
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.fileSize}>
            {formatFileSize(file.size)} • {file.createdAt.toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteFile(file)}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Upload Section */}
      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>Upload Files</Text>
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              uploading && styles.uploadButtonDisabled,
            ]}
            onPress={pickImage}
            disabled={uploading}
          >
            <Text style={styles.uploadButtonText}>📷 Upload Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              uploading && styles.uploadButtonDisabled,
            ]}
            onPress={pickDocument}
            disabled={uploading}
          >
            <Text style={styles.uploadButtonText}>📄 Upload Document</Text>
          </TouchableOpacity>
        </View>

        {/* Test Buttons */}
        <View style={styles.testButtonsContainer}>
          <TouchableOpacity
            style={[styles.testButton, testing && styles.uploadButtonDisabled]}
            onPress={runConnectionTest}
            disabled={testing}
          >
            <Text style={styles.testButtonText}>
              {testing ? "🔍 Testing..." : "🔍 AWS SDK"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.testButton,
              styles.manualTestButton,
              testing && styles.uploadButtonDisabled,
            ]}
            onPress={runManualTest}
            disabled={testing}
          >
            <Text style={styles.testButtonText}>
              {testing ? "🛠️ Testing..." : "🛠️ Manual"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.testButton,
              styles.simpleTestButton,
              testing && styles.uploadButtonDisabled,
            ]}
            onPress={runSimpleTest}
            disabled={testing}
          >
            <Text style={styles.testButtonText}>
              {testing ? "⚡ Testing..." : "⚡ Working"}
            </Text>
          </TouchableOpacity>
        </View>

        {uploading && (
          <View style={styles.uploadingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}
        {testing && (
          <View style={styles.uploadingIndicator}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={[styles.uploadingText, { color: "#FF6B35" }]}>
              Testing connection...
            </Text>
          </View>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText}>{debugInfo}</Text>
          </View>
        )}
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(["all", "images", "documents", "videos"] as const).map(
            (filterType) => (
              <TouchableOpacity
                key={filterType}
                style={[
                  styles.filterButton,
                  filter === filterType && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(filterType)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === filterType && styles.filterButtonTextActive,
                  ]}
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>
      </View>

      {/* Files List */}
      <View style={styles.filesSection}>
        <Text style={styles.sectionTitle}>
          My Files ({filteredFiles.length})
        </Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : filteredFiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No files uploaded yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the upload buttons above to add your first file
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.filesList}
            showsVerticalScrollIndicator={false}
          >
            {filteredFiles.map(renderFileItem)}
          </ScrollView>
        )}
      </View>

      {/* Image Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={() => setPreviewVisible(false)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPreviewVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              {selectedFile && (
                <Image
                  source={{ uri: selectedFile.url }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  uploadSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  uploadButtons: {
    flexDirection: "row",
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadButtonDisabled: {
    backgroundColor: "#ccc",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  uploadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
  },
  uploadingText: {
    color: "#007AFF",
    fontSize: 14,
  },
  testButtonsContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: "#FF6B35",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  manualTestButton: {
    backgroundColor: "#9B59B6",
  },
  simpleTestButton: {
    backgroundColor: "#27AE60",
  },
  testButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "500",
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#007AFF",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  filesSection: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  filesList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: "#666",
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseArea: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: -50,
    right: 0,
    zIndex: 1,
    padding: 10,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  debugContainer: {
    backgroundColor: "#f8f8f8",
    padding: 8,
    marginTop: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  debugText: {
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
  },
});
