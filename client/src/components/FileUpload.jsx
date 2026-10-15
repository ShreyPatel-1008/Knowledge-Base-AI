import { useState, useRef } from "react";
import { FileTextIcon, PlusIcon } from "./Icons.jsx";

export default function FileUpload({ onUpload, isUploading, hasFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      onUpload(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  // Collapsed view after upload
  if (hasFile) {
    return (
      <div className="px-6 py-3 shrink-0 font-sans">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs text-refined hover:text-refined-deep transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 font-medium"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Upload another PDF
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  // Full upload area
  return (
    <div className="px-6 pt-6 pb-2 shrink-0 font-sans">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer
          transition-all duration-300 ease-out bg-canvas
          ${
            isDragging
              ? "border-refined bg-mallow/40 scale-[1.01] shadow-sm"
              : "border-border hover:border-refined hover:bg-ivory/50"
          }
          ${isUploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <div className="relative">
          {isUploading ? (
            <>
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl loading-shimmer flex items-center justify-center">
                <svg className="w-7 h-7 text-refined animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-sm text-refined font-semibold">Processing your document…</p>
              <p className="text-xs text-mineral mt-1">Extracting text → Chunking → Embedding → Indexing</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-ivory flex items-center justify-center border border-border text-refined shadow-2xs">
                <FileTextIcon className="w-7 h-7" />
              </div>
              <p className="text-sm text-refined font-semibold mb-1">
                Drop your PDF here or click to browse
              </p>
              <p className="text-xs text-mineral">
                Supports PDF files up to 20 MB
              </p>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
