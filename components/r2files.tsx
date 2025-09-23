import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  RefreshControl,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { r2Service, type MediaFile, type UploadResult } from "../lib/r2-service";
import { Feather } from "@expo/vector-icons";
import R2Image from "./R2Image";
import { db } from "../lib/db"; // Import the database to get user info

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

interface DropboxFileManagerProps {
  onFileSelect?: (file: FileItem) => void;
}

export default function R2Files({ onFileSelect }: DropboxFileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPreviews, setLoadingPreviews] = useState<Record<string, boolean>>({});
  const [username, setUsername] = useState<string>("");

  // Get current user information
  useEffect(() => {
    const { user } = db.useAuth();
    if (user?.username) {
      setUsername(user.username);
    } else if (user?.email) {
      // Use email as fallback if username is not available
      setUsername(user.email.split("@")[0]);
    } else {
      // Default to "user" if no user info is available
      setUsername("user");
    }
  }, []);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (type: string): string => {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "film";
    if (type.startsWith("audio/")) return "music";
    if (type.includes("pdf")) return "file-text";
    if (type.includes("word")) return "file-text";
    if (type.includes("excel") || type.includes("sheet")) return "file-text";
    if (type.includes("powerpoint") || type.includes("presentation")) return "file-text";
    return "file";
  };

  // Refresh files list
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Pick image from library
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload images."
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
          name: asset.fileName || `image-${Date.now()}.jpg`,
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

  // Pick document
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

  // Upload file to R2
  const uploadFile = async (file: MediaFile) => {
    setUploading(true);
    try {
      console.log("Starting upload with file:", {
        name: file.name,
        type: file.type,
        size: file.size,
        uri: file.uri?.substring(0, 50) + "...",
      });

      const result: UploadResult = await r2Service.uploadFile(file, username);
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

  // Delete file
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

  // Get accessible URL (signed URL for private files)
  const getAccessibleUrl = async (file: FileItem): Promise<string | null> => {
    try {
      // For image files, we can use the direct URL since they're displayed with Expo Image
      // For other files, we should generate a signed URL for secure access
      if (file.type.startsWith("image/")) {
        return file.url;
      }
      
      // For non-image files, generate a signed URL
      const signedUrl = await r2Service.getSignedUrl(file.key);
      return signedUrl || file.url;
    } catch (error) {
      console.error("Error getting accessible URL:", error);
      return file.url;
    }
  };

  // View file (preview or info)
  const viewFile = async (file: FileItem) => {
    try {
      setLoadingPreviews(prev => ({ ...prev, [file.id]: true }));
      const accessibleUrl = await getAccessibleUrl(file);
      
      if (file.type.startsWith("image/")) {
        setSelectedFile({ ...file, url: accessibleUrl || file.url });
        setPreviewVisible(true);
      } else {
        // For non-image files, open with accessible URL
        if (accessibleUrl) {
          Alert.alert(
            "File Information",
            `Name: ${file.name}
Type: ${file.type}
Size: ${formatFileSize(file.size)}
Uploaded: ${file.createdAt.toLocaleDateString()}

Note: This file can be accessed securely with a signed URL.`,
            [{ text: "OK", style: "default" }],
          );
        } else {
          Alert.alert(
            "File Information",
            `Name: ${file.name}
Type: ${file.type}
Size: ${formatFileSize(file.size)}
Uploaded: ${file.createdAt.toLocaleDateString()}`,
            [{ text: "OK", style: "default" }],
          );
        }
      }
    } catch (error) {
      console.error("Error viewing file:", error);
      Alert.alert("Error", "Failed to access file");
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [file.id]: false }));
    }
  };

  // Render file item
  const renderFileItem = (file: FileItem) => (
    <TouchableOpacity
      key={file.id}
      style={styles.fileItem}
      onPress={() => viewFile(file)}
      onLongPress={() => deleteFile(file)}
    >
      <Feather name={getFileIcon(file.type) as any} size={24} color="#4F46E5" />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.fileMeta}>
          {formatFileSize(file.size)} • {file.createdAt.toLocaleDateString()}
        </Text>
      </View>
      {loadingPreviews[file.id] ? (
        <ActivityIndicator size="small" color="#4F46E5" style={styles.loadingIndicator} />
      ) : (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteFile(file)}
        >
          <Feather name="trash-2" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Files</Text>
        <Text style={styles.headerSubtitle}>{files.length} items</Text>
      </View>

      {/* Upload Area */}
      <View style={styles.uploadArea}>
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={pickImage}
          disabled={uploading}
        >
          <Feather name="image" size={24} color="#4F46E5" />
          <Text style={styles.uploadButtonText}>Upload Image</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={pickDocument}
          disabled={uploading}
        >
          <Feather name="file" size={24} color="#4F46E5" />
          <Text style={styles.uploadButtonText}>Upload Document</Text>
        </TouchableOpacity>
      </View>

      {/* Uploading indicator */}
      {uploading && (
        <View style={styles.uploadingIndicator}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      {/* Files List */}
      <View style={styles.filesSection}>
        {files.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="folder" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No files yet</Text>
            <Text style={styles.emptySubtext}>
              Upload your first file using the buttons above
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.filesList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {files.map(renderFileItem)}
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
            activeOpacity={1}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPreviewVisible(false)}
              >
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
              {selectedFile && (
                <R2Image
                  url={selectedFile.url}
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
  header: {
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  uploadArea: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: "#EEF2FF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "600",
  },
  uploadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  uploadingText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "500",
  },
  filesSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filesList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  fileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 4,
  },
  fileMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  deleteButton: {
    padding: 8,
  },
  loadingIndicator: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 32,
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
  previewImage: {
    width: "100%",
    height: "100%",
  },
});