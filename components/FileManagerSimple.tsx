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
import { r2Service, type MediaFile, type UploadResult } from "../lib/r2-service";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  key: string;
  createdAt: Date;
  lastModified: Date;
}

interface FileManagerSimpleProps {
  onFileSelect?: (file: FileItem) => void;
}

export default function FileManagerSimple({ onFileSelect }: FileManagerSimpleProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [filter, setFilter] = useState<"all" | "images" | "documents" | "videos">("all");

  useEffect(() => {
    // Check R2 configuration on component mount
    const r2Status = r2Service.getConfigurationStatus();
    console.log("R2 Configuration Status:", r2Status);
    if (!r2Status.isValid) {
      console.warn("R2 Configuration is invalid. Missing fields:", r2Status.missingFields);
    }
  }, []);

  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        exif: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const file: MediaFile = {
          uri: asset.uri,
          name: asset.fileName || "image.jpg",
          type: asset.type === "image" ? "image/jpeg" : asset.type || "image/jpeg",
          size: asset.fileSize || 0,
        };

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
        const file: MediaFile = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size || 0,
        };

        await uploadFile(file);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const uploadFile = async (file: MediaFile) => {
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
          size: file.size || 0,
          url: result.url,
          key: result.key,
          createdAt: new Date(),
          lastModified: new Date(),
        };

        setFiles((prev) => [newFile, ...prev]);
        Alert.alert("Success", "File uploaded successfully");
      } else {
        console.error("Upload failed:", result.error);
        Alert.alert("Upload Failed", result.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload file: " + (error instanceof Error ? error.message : "Unknown error"));
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

  const viewFile = (file: FileItem) => {
    if (file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewVisible(true);
    } else {
      // For non-images, get a presigned URL to open in browser
      Alert.alert(
        "File Access",
        `File: ${file.name}\nSize: ${file.size} bytes\n\nThis file can be accessed through the app.`,
        [{ text: "OK", style: "default" }],
      );
    }
  };

  const filteredFiles = files.filter((file) => {
    if (filter === "all") return true;
    if (filter === "images") return file.type.startsWith("image/");
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
        <Text style={styles.fileIcon}>
          {file.type.startsWith("image/") ? "🖼️" : 
           file.type.startsWith("video/") ? "🎬" : 
           file.type.startsWith("audio/") ? "🎵" : "📄"}
        </Text>
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.fileSize}>
            {file.size} bytes • {file.createdAt.toLocaleDateString()}
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

  const testR2Connection = async () => {
    const r2Status = r2Service.getConfigurationStatus();
    if (!r2Status.isValid) {
      Alert.alert("R2 Configuration Error", `Missing configuration fields: ${r2Status.missingFields.join(", ")}`);
      return;
    }
    
    // Try to upload a small test file
    try {
      const testFile: MediaFile = {
        uri: "data:text/plain;base64,aGVsbG8gd29ybGQ=", // "hello world" in base64
        name: "test.txt",
        type: "text/plain",
        size: 11
      };
      
      const result = await r2Service.uploadFile(testFile);
      if (result.success) {
        Alert.alert("R2 Connection Successful", "R2 is properly configured and working!");
        // Clean up the test file
        if (result.key) {
          await r2Service.deleteFile(result.key);
        }
      } else {
        Alert.alert("R2 Connection Failed", result.error || "Unknown error occurred");
      }
    } catch (error) {
      Alert.alert("R2 Connection Failed", error instanceof Error ? error.message : "Unknown error occurred");
    }
  };

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

        <TouchableOpacity
          style={[styles.uploadButton, styles.testButton]}
          onPress={testR2Connection}
        >
          <Text style={styles.uploadButtonText}>🔍 Test R2 Connection</Text>
        </TouchableOpacity>

        {uploading && (
          <View style={styles.uploadingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.uploadingText}>Uploading...</Text>
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
        {filteredFiles.length === 0 ? (
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
  testButton: {
    backgroundColor: "#FF6B35",
    marginTop: 8,
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
});