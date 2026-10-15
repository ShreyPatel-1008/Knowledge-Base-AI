import multer from "multer";
import path from "path";

const allowedExtensions = [".pdf", ".docx", ".txt", ".md"];

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `${Date.now()}-${safeName}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Supported formats are: PDF, DOCX, TXT, and Markdown (.md)."
      ),
      false
    );
  }
};

/**
 * Accepts a single file under the field name "document".
 * Allowed: .pdf, .docx, .txt, .md
 * Max file size: 10 MB
 */
export const uploadFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single("document");
