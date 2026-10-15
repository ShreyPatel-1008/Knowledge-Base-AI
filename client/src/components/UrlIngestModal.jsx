import { useState } from "react";
import {
  GlobeIcon,
  PlayCircleIcon,
  AlertTriangleIcon,
  ShieldIcon,
  ArrowRightIcon,
  XIcon,
} from "./Icons.jsx";

export default function UrlIngestModal({ isOpen, onClose, onIngest }) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const isYouTube =
    url.includes("youtube.com/") ||
    url.includes("youtu.be/");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onIngest(url.trim());
      setUrl("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to ingest URL");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetExample = (exampleUrl) => {
    setUrl(exampleUrl);
    setError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-refined/40 backdrop-blur-xs animate-fade-in-up font-sans"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-canvas border border-border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-ivory">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-mallow border border-border flex items-center justify-center text-refined shadow-2xs">
              <GlobeIcon className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-refined">
                Ingest Web Link or YouTube
              </h2>
              <p className="text-[11px] text-mineral">
                Extract articles or video transcripts into your private vault
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-mineral hover:text-refined hover:bg-mallow/50 transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangleIcon className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-refined">
              Target URL
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article or https://youtube.com/watch?v=..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-border focus:border-refined focus:ring-2 focus:ring-mallow text-xs sm:text-sm text-refined placeholder:text-mineral-light outline-none transition-all"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          {/* Real-time Detection Pill */}
          <div className="flex items-center gap-2 text-xs">
            {url.trim() ? (
              isYouTube ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium text-[11px]">
                  <PlayCircleIcon className="w-3.5 h-3.5 text-rose-600" />
                  <span>YouTube Video: Captions & full transcript will be indexed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-mallow border border-border text-refined font-medium text-[11px]">
                  <GlobeIcon className="w-3.5 h-3.5 text-refined" />
                  <span>Web Page: Clean text extracted via Mozilla Readability</span>
                </span>
              )
            ) : (
              <span className="text-[11px] text-mineral">
                Paste any web article URL or YouTube video link above
              </span>
            )}
          </div>

          {/* SSRF & Security Badge */}
          <div className="p-3 rounded-xl bg-ivory border border-border text-[11px] text-mineral space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-refined">
              <ShieldIcon className="w-3.5 h-3.5 text-refined" />
              <span>SSRF & Private Network Guard</span>
            </div>
            <p className="text-[10px] text-mineral leading-normal">
              Resolves DNS and blocks loopback (127.0.0.1), RFC1918 private subnets (10.x, 172.16-31.x, 192.168.x), and cloud metadata endpoints (169.254.169.254).
            </p>
          </div>

          {/* Quick Examples */}
          <div className="pt-1">
            <p className="text-[10px] font-semibold text-mineral uppercase tracking-wider mb-1.5">
              Quick Test Examples:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSetExample("https://en.wikipedia.org/wiki/Artificial_intelligence")}
                className="px-2 py-1 rounded-md bg-ivory hover:bg-mallow/50 text-refined border border-border text-[10px] font-medium transition-colors cursor-pointer"
              >
                Wikipedia: AI
              </button>
              <button
                type="button"
                onClick={() => handleSetExample("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}
                className="px-2 py-1 rounded-md bg-ivory hover:bg-mallow/50 text-refined border border-border text-[10px] font-medium transition-colors cursor-pointer"
              >
                YouTube Video
              </button>
              <button
                type="button"
                onClick={() => handleSetExample("http://localhost:5000")}
                className="px-2 py-1 rounded-md bg-ivory hover:bg-mallow/50 text-refined border border-border text-[10px] font-medium transition-colors cursor-pointer"
              >
                Localhost (Test SSRF Block)
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-mineral hover:text-refined hover:bg-ivory transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="px-4 py-2 rounded-xl bg-refined hover:bg-refined-hover text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Ingesting…</span>
                </>
              ) : (
                <>
                  <span>Ingest & Index</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
