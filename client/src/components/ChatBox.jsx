import { useState } from "react";
import { SendIcon } from "./Icons.jsx";

export default function ChatBox({ onSend, disabled, placeholder }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 px-4 md:px-8 pb-6 pt-2 font-sans"
    >
      <div
        className={`
        flex items-end gap-3 bg-canvas border border-border rounded-2xl px-4 py-3
        transition-all duration-200 shadow-xs
        focus-within:border-refined focus-within:ring-2 focus-within:ring-mallow
        ${disabled ? "opacity-60" : ""}
      `}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || "Ask a question about your documents…"}
          rows={1}
          className="flex-1 bg-transparent text-sm text-refined placeholder-mineral resize-none outline-none max-h-32 leading-relaxed font-sans"
          style={{ fieldSizing: "content" }}
        />
        <button
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
        Answers generated with Hybrid RRF retrieval + Cross-Encoder re-ranking. Press Enter to send.
      </p>
    </form>
  );
}
