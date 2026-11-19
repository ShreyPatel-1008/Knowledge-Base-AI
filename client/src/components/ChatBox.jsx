import { useState } from "react";
import { SendIcon } from "./Icons.jsx";

export default function ChatBox({ onSend, disabled, placeholder, documents, sourceId, onSourceChange }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (!e.nativeEvent.isComposing && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 w-full max-w-4xl mx-auto px-4 md:px-8 pb-3 md:pb-6 pt-2 font-sans"
    >
      <label className="mb-2 flex items-center gap-2 text-xs text-mineral">
        Answer from
        <select
          className="min-w-0 max-w-[70%] truncate rounded-lg border border-border bg-canvas px-2 py-1 text-refined"
          value={sourceId}
          disabled={disabled}
          onChange={event => onSourceChange(event.target.value)}
        >
          <option value="">All documents</option>
          {documents.filter(doc => doc.status === "ready").map(doc =>
            <option key={doc._id} value={doc._id}>{doc.filename}</option>
          )}
        </select>
      </label>
      <div
        className={`
        flex items-end gap-3 bg-canvas border border-border rounded-2xl px-4 py-3
        transition-all duration-200 shadow-xs
        focus-within:border-refined focus-within:ring-2 focus-within:ring-mallow
        ${disabled ? "opacity-60" : ""}
      `}
      >
        <textarea
          aria-label="Your question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || "Ask a question about your documentsâ€¦"}
          rows={1}
          className="flex-1 bg-transparent text-sm text-refined placeholder-mineral resize-none outline-none max-h-32 leading-relaxed font-sans"
          style={{ fieldSizing: "content" }}
        />
        <button
          aria-label="Send question"
          type="submit"
          disabled={disabled || !input.trim()}
          className={`
            shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
            transition-all duration-200
            ${
              input.trim() && !disabled
                ? "bg-refined hover:bg-refined-hover text-white shadow-xs hover:scale-105 cursor-pointer"
                : "bg-border text-mineral cursor-not-allowed"
            }
          `}
        >
          <SendIcon className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-mineral text-center mt-2">
        Enter to send · Shift + Enter for a new line.
      </p>
    </form>
  );
}
