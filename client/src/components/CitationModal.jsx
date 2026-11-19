import { useEffect, useRef } from "react";
import { FileTextIcon, XIcon } from "./Icons.jsx";

export default function CitationModal({ source, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (!source) return;
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, [source]);

  if (!source) return null;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="passage-title"
      onCancel={onClose}
      onClick={event => {
        if (event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right ||
              event.clientY < box.top || event.clientY > box.bottom) onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-border bg-canvas p-0 text-refined shadow-xl backdrop:bg-refined/40"
    >
      <div className="flex max-h-[85dvh] flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-ivory">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-mallow border border-border flex items-center justify-center text-refined shadow-2xs">
              <FileTextIcon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 id="passage-title" className="text-sm font-bold text-refined truncate max-w-sm">
                {source.filename}
              </h3>
              <p className="text-[11px] text-mineral">
                Chunk #{source.chunkIndex} · Estimated page {source.page || 1}
              </p>
            </div>
          </div>
          <button
            aria-label="Close passage preview"
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
              Retrieved passage preview
            </span>
            <div className="mt-2 p-4 rounded-xl bg-ivory border border-border text-xs sm:text-sm text-refined leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] selection:bg-mallow">
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
    </dialog>
  );
}
