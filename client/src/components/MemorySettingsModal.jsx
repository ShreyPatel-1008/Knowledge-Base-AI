import { useState, useEffect } from "react";
import {
  SettingsIcon,
  BrainIcon,
  TargetIcon,
  BookOpenIcon,
  LayersIcon,
  PinIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "./Icons.jsx";

export default function MemorySettingsModal({ isOpen, onClose, authFetch }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manual Add Form State
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("preference");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen]);

  const loadMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/memories");
      const data = await res.json();
      if (data.success) {
        setMemories(data.memories || []);
      } else {
        setError(data.message || "Failed to load memories");
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsAdding(true);
    try {
      const res = await authFetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          category: newCategory,
        }),
      });

      const data = await res.json();
      if (data.success && data.memory) {
        setMemories((prev) => [data.memory, ...prev]);
        setNewContent("");
      } else {
        alert(data.message || "Failed to add memory");
      }
    } catch (err) {
      alert(`Add error: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      const res = await authFetch(`/api/memories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMemories((prev) => prev.filter((m) => m._id !== id));
      } else {
        alert(data.message || "Failed to delete memory");
      }
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to delete all long-term memories?")) {
      return;
    }

    try {
      const res = await authFetch("/api/memories", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMemories([]);
      }
    } catch (err) {
      alert(`Clear error: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "preference":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-mallow text-refined border border-border">
            <TargetIcon className="w-3 h-3" />
            Preference
          </span>
        );
      case "learning_style":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <BookOpenIcon className="w-3 h-3" />
            Learning Style
          </span>
        );
      case "work_context":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <LayersIcon className="w-3 h-3" />
            Work Context
          </span>
        );
      case "fact":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <PinIcon className="w-3 h-3" />
            Fact
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">General</span>;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-refined/40 backdrop-blur-xs animate-fade-in-up font-sans"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-canvas border border-border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-ivory shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-mallow border border-border flex items-center justify-center text-refined shadow-2xs">
              <SettingsIcon className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-refined">
                  Long-Term Memory & Preferences
                </h2>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-mallow text-refined border border-border">
                  {memories.length} Active
                </span>
              </div>
              <p className="text-[11px] text-mineral">
                Personal facts & preferences remembered across chats and honored in future answers
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Add Memory Form */}
          <form
            onSubmit={handleAddMemory}
            className="p-3.5 rounded-xl bg-ivory border border-border space-y-3"
          >
            <div className="text-xs font-semibold text-refined flex items-center gap-1.5">
              <PlusIcon className="w-3.5 h-3.5 text-refined" />
              <span>Add Custom Preference or Instruction</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder='e.g. "prefers explanations with code examples" or "prefers concise bullet points"'
                className="flex-1 px-3 py-2 rounded-lg bg-canvas border border-border focus:border-refined focus:ring-2 focus:ring-mallow text-xs text-refined placeholder:text-mineral-light outline-none transition-all"
                disabled={isAdding}
              />

              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-canvas border border-border text-xs text-refined outline-none cursor-pointer"
                disabled={isAdding}
              >
                <option value="preference">Preference</option>
                <option value="learning_style">Learning Style</option>
                <option value="work_context">Work Context</option>
                <option value="fact">Fact</option>
              </select>

              <button
                type="submit"
                disabled={isAdding || !newContent.trim()}
                className="px-4 py-2 rounded-lg bg-refined hover:bg-refined-hover text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>{isAdding ? "Saving…" : "Remember"}</span>
              </button>
            </div>
          </form>

          {/* Memory List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-mineral uppercase tracking-wider">
                Remembered Facts & Preferences
              </h3>
              {memories.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] text-rose-600 hover:text-rose-700 cursor-pointer transition-colors"
                >
                  Clear All Memories
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <div className="w-5 h-5 border-2 border-refined border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-mineral">Loading memories…</p>
              </div>
            ) : error ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {error}
              </div>
            ) : memories.length === 0 ? (
              <div className="py-12 text-center rounded-xl bg-ivory border border-border p-6 space-y-2">
                <div className="w-10 h-10 mx-auto rounded-xl bg-canvas border border-border flex items-center justify-center text-refined shadow-2xs">
                  <BrainIcon className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-refined">No Memories Extracted Yet</p>
                <p className="text-[11px] text-mineral max-w-sm mx-auto">
                  As you chat, the assistant automatically extracts personal facts and preferences (e.g. coding styles, role, interests) and honors them in future answers.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {memories.map((mem) => (
                  <div
                    key={mem._id}
                    className="p-3 rounded-xl bg-canvas hover:bg-ivory/50 border border-border flex items-center justify-between gap-3 transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getCategoryBadge(mem.category)}
                      <p className="text-xs text-refined font-medium truncate">
                        "{mem.content}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-mineral">
                        {new Date(mem.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <button
                        onClick={() => handleDeleteMemory(mem._id)}
                        title="Delete memory"
                        className="p-1.5 rounded-lg text-mineral hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
