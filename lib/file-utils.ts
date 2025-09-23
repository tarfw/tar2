export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 50 * 1024 * 1024, // 50MB
  archive: 50 * 1024 * 1024, // 50MB
  other: 25 * 1024 * 1024, // 25MB
  default: 25 * 1024 * 1024, // 25MB
};

export const ALLOWED_MIME_TYPES = {
  images: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
  ],
  videos: [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/webm",
    "video/ogg",
    "video/avi",
  ],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/json",
    "application/xml",
    "text/xml",
  ],
  archives: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-7z-compressed",
  ],
};

export const getFileCategory = (
  mimeType: string,
): "image" | "video" | "document" | "archive" | "other" => {
  if (ALLOWED_MIME_TYPES.images.includes(mimeType)) return "image";
  if (ALLOWED_MIME_TYPES.videos.includes(mimeType)) return "video";
  if (ALLOWED_MIME_TYPES.documents.includes(mimeType)) return "document";
  if (ALLOWED_MIME_TYPES.archives.includes(mimeType)) return "archive";
  return "other";
};

export const validateFile = (file: {
  name?: string;
  type?: string;
  size?: number;
}): FileValidationResult => {
  const warnings: string[] = [];

  // Check if file has required properties
  if (!file.name) {
    return { isValid: false, error: "File name is required" };
  }

  if (!file.type) {
    warnings.push("File type could not be determined");
  }

  if (!file.size || file.size === 0) {
    return { isValid: false, error: "File appears to be empty" };
  }

  // Get file category and size limit
  const category = file.type ? getFileCategory(file.type) : "other";
  const sizeLimit =
    FILE_SIZE_LIMITS[category as keyof typeof FILE_SIZE_LIMITS] ||
    FILE_SIZE_LIMITS.default;

  // Check file size
  if (file.size > sizeLimit) {
    const limitMB = Math.round(sizeLimit / (1024 * 1024));
    return {
      isValid: false,
      error: `File size exceeds limit of ${limitMB}MB for ${category} files`,
    };
  }

  // Check if file type is allowed
  if (file.type && category === "other") {
    const allAllowedTypes = [
      ...ALLOWED_MIME_TYPES.images,
      ...ALLOWED_MIME_TYPES.videos,
      ...ALLOWED_MIME_TYPES.documents,
      ...ALLOWED_MIME_TYPES.archives,
    ];

    if (!allAllowedTypes.includes(file.type)) {
      warnings.push(`File type "${file.type}" may not be supported`);
    }
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : "";
};

export const generateFileName = (
  originalName: string,
  prefix: string = "",
): string => {
  const extension = getFileExtension(originalName);
  const nameWithoutExt =
    originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);

  const cleanName = nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .substring(0, 50);

  const finalName = prefix
    ? `${prefix}_${cleanName}_${timestamp}_${randomId}`
    : `${cleanName}_${timestamp}_${randomId}`;

  return extension ? `${finalName}.${extension}` : finalName;
};

export const getFileIcon = (mimeType: string): string => {
  const category = getFileCategory(mimeType);

  switch (category) {
    case "image":
      return "🖼️";
    case "video":
      return "🎥";
    case "document":
      if (mimeType.includes("pdf")) return "📄";
      if (mimeType.includes("word") || mimeType.includes("document"))
        return "📝";
      if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
        return "📊";
      if (mimeType.includes("powerpoint") || mimeType.includes("presentation"))
        return "📊";
      if (mimeType.includes("text")) return "📄";
      return "📄";
    case "archive":
      return "🗂️";
    default:
      return "📁";
  }
};

export const isImageFile = (mimeType: string): boolean => {
  return ALLOWED_MIME_TYPES.images.includes(mimeType);
};

export const isVideoFile = (mimeType: string): boolean => {
  return ALLOWED_MIME_TYPES.videos.includes(mimeType);
};

export const isDocumentFile = (mimeType: string): boolean => {
  return ALLOWED_MIME_TYPES.documents.includes(mimeType);
};

export const sanitizeFileName = (filename: string): string => {
  // Remove or replace invalid characters for file systems
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 255); // Limit filename length
};

export const getMimeTypeFromExtension = (filename: string): string => {
  const ext = getFileExtension(filename);

  const mimeMap: { [key: string]: string } = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",

    // Videos
    mp4: "video/mp4",
    mpeg: "video/mpeg",
    mov: "video/quicktime",
    webm: "video/webm",
    ogg: "video/ogg",
    avi: "video/avi",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",

    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    "7z": "application/x-7z-compressed",
  };

  return mimeMap[ext] || "application/octet-stream";
};
