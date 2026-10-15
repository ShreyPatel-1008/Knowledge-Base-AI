import { useState, useRef } from "react";
import {
  GlobeIcon,
  TargetIcon,
  FolderIcon,
  LinkIcon,
  TrashIcon,
  RefreshIcon,
  SettingsIcon,
  LogOutIcon,
  PlusIcon,
} from "./Icons.jsx";

export default function Sidebar({
  documents,
  isUploading,
  onUpload,
  onOpenUrlModal,
  onDelete,
  onReindex,
  onOpenQuiz,
  onOpenMemorySettings,
  selectedTag,
  onSelectTag,
  user,
  onLogout,
  isOpen,
  onToggle,
}) {
  const fileInputRef = useRef(null);
  const [expandedSummaries, setExpandedSummaries] = useState({});

  const toggleSummary = (docId) => {
    setExpandedSummaries((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  // Collect all unique tags and counts across user's documents
  const tagCounts = {};
  documents.forEach((d) => {
    (d.tags || []).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const uniqueTags = Object.keys(tagCounts).sort();

  // Filtered documents by active tag
  const displayedDocuments = selectedTag
    ? documents.filter((d) => (d.tags || []).includes(selectedTag))
    : documents;

  const getFormatBadge = (type) => {
    switch (type) {
      case "pdf":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">PDF</span>;
      case "docx":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">DOCX</span>;
      case "txt":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">TXT</span>;
      case "md":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">MD</span>;
      case "web":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">WEB</span>;
      case "youtube":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">YOUTUBE</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">FILE</span>;
    }
  };

  const getStatusBadge = (status, chunkCount, errorMessage) => {
    if (status === "processing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          Processing…
        </span>
      );
    }
    if (status === "ready") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          {chunkCount} chunks
        </span>
      );
    }
    return (
      <span
        title={errorMessage || "Processing failed"}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
      >
        Failed
      </span>
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = "";
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-refined/40 z-20 md:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30
          w-80 md:w-88 flex flex-col bg-ivory border-r border-border
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-ivory">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-refined tracking-wide">
              Document Vault
            </span>
            <span className="px-2 py-0.5 rounded-full bg-mallow border border-border text-[11px] text-refined font-semibold">
              {documents.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenUrlModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-canvas hover:bg-mallow/40 border border-border text-refined text-xs font-medium transition-all shadow-2xs cursor-pointer"
              title="Ingest Webpage or YouTube Video URL"
            >
              <GlobeIcon className="w-3.5 h-3.5 text-refined" />
              <span className="hidden sm:inline">Add URL</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-refined hover:bg-refined-hover text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add Doc
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Tag Filter Bar */}
        {uniqueTags.length > 0 && (
          <div className="px-3 py-2.5 bg-ivory/80 border-b border-border">
            <div className="flex items-center justify-between text-[10px] text-mineral font-semibold uppercase tracking-wider mb-1.5 px-1">
              <span>Filter by Topic</span>
              {selectedTag && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenQuiz?.({ tag: selectedTag, title: `Tag: #${selectedTag}` })}
                    className="text-refined bg-mallow hover:bg-mallow-hover px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border transition-colors cursor-pointer flex items-center gap-1"
                    title={`Generate quiz for all documents tagged #${selectedTag}`}
                  >
                    <TargetIcon className="w-3 h-3" />
                    <span>Quiz Tag</span>
                  </button>
                  <button
                    onClick={() => onSelectTag(null)}
                    className="text-mineral hover:text-refined cursor-pointer lowercase"
                  >
                    clear
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              <button
                onClick={() => onSelectTag(null)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  !selectedTag
                    ? "bg-refined text-white shadow-2xs"
                    : "bg-canvas text-mineral hover:bg-mallow/40 hover:text-refined border border-border"
                }`}
              >
                All ({documents.length})
              </button>
              {uniqueTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    selectedTag === tag
                      ? "bg-refined text-white shadow-2xs"
                      : "bg-canvas text-mineral hover:bg-mallow/40 hover:text-refined border border-border"
                  }`}
                >
                  <span>#{tag}</span>
                  <span className="opacity-70 text-[9px]">({tagCounts[tag]})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {displayedDocuments.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-canvas border border-border flex items-center justify-center text-mineral">
                <FolderIcon className="w-6 h-6 text-mineral" />
              </div>
              <p className="text-xs font-semibold text-refined">
                {selectedTag ? `No documents with tag "#${selectedTag}"` : "Vault is empty"}
              </p>
              <p className="text-[11px] text-mineral mt-1">
                {selectedTag ? "Clear filter to view all documents" : "Upload your files to index and summarize them"}
              </p>
            </div>
          ) : (
            displayedDocuments.map((doc) => (
              <div
                key={doc._id}
                className="group relative rounded-xl bg-canvas hover:bg-canvas/90 border border-border hover:border-mineral-light p-3 transition-all shadow-2xs"
              >
                {/* Header: Type, Title, Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFormatBadge(doc.type)}
                    <div className="min-w-0">
                      <span
                        title={doc.filename}
                        className="text-xs font-semibold text-refined truncate block"
                      >
                        {doc.filename}
                      </span>
                      {doc.sourceUrl && (
                        <a
                          href={doc.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-mineral hover:text-refined hover:underline flex items-center gap-1 truncate max-w-[170px]"
                          title={doc.sourceUrl}
                        >
                          <LinkIcon className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{doc.sourceUrl}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions: Quiz, Reindex & Delete */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => onOpenQuiz?.({ documentId: doc._id, title: doc.filename })}
                      disabled={doc.status !== "ready"}
                      title="Generate Quiz & Flashcards"
                      className="p-1.5 rounded-md text-mineral hover:text-refined hover:bg-mallow/50 cursor-pointer disabled:opacity-30 transition-colors"
                    >
                      <TargetIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onReindex(doc._id, doc.filename)}
                      disabled={doc.status === "processing"}
                      title="Re-index document"
                      className="p-1.5 rounded-md text-mineral hover:text-refined hover:bg-mallow/50 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDelete(doc._id, doc.filename)}
                      title="Delete document"
                      className="p-1.5 rounded-md text-mineral hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tags Pill Row */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {doc.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
                        className={`px-1.5 py-0.2 rounded text-[9px] font-medium transition-all cursor-pointer ${
                          selectedTag === tag
                            ? "bg-refined text-white"
                            : "bg-mallow-soft text-refined hover:bg-mallow border border-border"
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* 3-Sentence Summary Drawer */}
                {doc.summary && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <button
                      onClick={() => toggleSummary(doc._id)}
                      className="text-[10px] text-refined hover:text-refined-deep font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{expandedSummaries[doc._id] ? "▾ Hide summary" : "▸ 3-sentence summary"}</span>
                    </button>
                    {expandedSummaries[doc._id] && (
                      <div className="mt-1.5 p-2.5 rounded-lg bg-ivory border border-border text-[11px] text-refined leading-relaxed font-sans animate-fade-in-up">
                        <p className="italic text-refined font-normal">"{doc.summary}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Footer: Size & Status */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-mineral pt-1 border-t border-border/60">
                  <span>{(doc.size / (1024 * 1024)).toFixed(2)} MB</span>
                  {getStatusBadge(doc.status, doc.chunkCount, doc.errorMessage)}
                </div>

                {/* Generate Quiz & Flashcards CTA */}
                {doc.status === "ready" && (
                  <button
                    onClick={() => onOpenQuiz?.({ documentId: doc._id, title: doc.filename })}
                    className="mt-2.5 w-full py-1.5 px-2 rounded-lg bg-ivory hover:bg-mallow/60 border border-border text-[10px] text-refined font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <TargetIcon className="w-3.5 h-3.5 text-refined" />
                    <span>Generate Quiz & Flashcards</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* User Profile & Logout */}
        {user && (
          <div className="p-3.5 border-t border-border bg-ivory flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-lg object-cover border border-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-refined flex items-center justify-center font-bold text-xs text-white uppercase shadow-2xs">
                  {user.name?.[0] || "U"}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-refined truncate flex items-center gap-1">
                  {user.name}
                  {user.authProvider === "google" && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-sky-100 text-sky-800 font-normal">
                      G
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-mineral truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onOpenMemorySettings}
                title="Long-Term Memory & Preferences Settings"
                className="p-1.5 rounded-lg text-mineral hover:text-refined hover:bg-mallow/50 transition-colors cursor-pointer"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-mineral hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
