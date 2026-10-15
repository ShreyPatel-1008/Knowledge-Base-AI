import { FileTextIcon, XIcon } from "./Icons.jsx";

export default function CitationModal({ source, onClose }) {
  if (!source) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-refined/40 backdrop-blur-xs animate-fade-in-up font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-canvas border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-ivory">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-mallow border border-border flex items-center justify-center text-refined shadow-2xs">
              <FileTextIcon className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-refined truncate max-w-sm">
                {source.filename}
              </h3>
              <p className="text-[11px] text-mineral">
                Page {source.page || 1} · Chunk #{source.chunkIndex} · Match Score:{" "}
                <span className="text-refined font-semibold bg-mallow px-1.5 py-0.2 rounded border border-border">
                  {Math.round((source.score || 0) * 100)}%
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-mineral hover:text-refined hover:bg-mallow/50 transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <span className="text-[10px] font-bold text-mineral uppercase tracking-wider">
              Exact Retrieved Chunk Context
            </span>
            <div className="mt-2 p-4 rounded-xl bg-ivory border border-border text-xs sm:text-sm text-refined leading-relaxed font-mono whitespace-pre-wrap selection:bg-mallow">
              {source.chunkPreview}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-canvas flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-refined hover:bg-refined-hover text-xs font-semibold text-white transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
