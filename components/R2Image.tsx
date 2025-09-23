import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { r2Service } from "../lib/r2-service";

// Simple in-memory cache for signed URLs - permanent cache (no expiry)
const urlCache = new Map<string, string>();

interface R2ImageProps {
  url: string;
  style?: object;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
  onLoad?: () => void;
  onError?: (error: any) => void;
}

export default function R2Image({
  url,
  style,
  resizeMode = "cover",
  onLoad,
  onError,
}: R2ImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadSignedUrl = async () => {
      if (!url) {
        setLoading(false);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(false);

      try {
        // Check cache first - permanent cache (no expiry)
        const cached = urlCache.get(url);
        if (cached) {
          setSignedUrl(cached);
          setLoading(false);
          return;
        }

        // Check if it's already a signed URL or public URL
        if (url.includes("X-Amz-Algorithm") || url.includes("Signature")) {
          // Already a signed URL
          setSignedUrl(url);
          // Cache it permanently
          urlCache.set(url, url);
        } else {
          // Extract key from URL and generate signed URL
          const key = r2Service.extractKeyFromUrl(url);

          if (key) {
            const signed = await r2Service.getSignedUrl(key);

            if (!abortController.signal.aborted) {
              setSignedUrl(signed);
              // Cache the signed URL permanently
              if (signed) {
                urlCache.set(url, signed);
              }
            }
          } else {
            // Fallback to original URL
            if (!abortController.signal.aborted) {
              setSignedUrl(url);
              urlCache.set(url, url);
            }
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(true);
          console.error("R2Image error:", err);
          onError?.(err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSignedUrl();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, onError]);

  // Convert resizeMode to contentFit for Expo Image
  const getContentFit = (mode: string) => {
    switch (mode) {
      case "cover": return "cover";
      case "contain": return "contain";
      case "stretch": return "fill";
      case "repeat": return "none";
      case "center": return "none";
      default: return "cover";
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <MaterialIcons name="image" size={48} color="#9CA3AF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !signedUrl) {
    return (
      <View style={[styles.errorContainer, style]}>
        <MaterialIcons name="broken-image" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: signedUrl }}
      style={style}
      contentFit={getContentFit(resizeMode)}
      onLoad={() => {
        onLoad?.();
      }}
      onError={(e) => {
        setError(true);
        onError?.(e);
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 8,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 8,
  },
});