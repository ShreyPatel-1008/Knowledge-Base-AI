import { useState, useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MessageList from "./components/MessageList.jsx";
import ChatBox from "./components/ChatBox.jsx";
import CitationModal from "./components/CitationModal.jsx";
import KnowledgeGraphModal from "./components/KnowledgeGraphModal.jsx";
import QuizModal from "./components/QuizModal.jsx";
import UrlIngestModal from "./components/UrlIngestModal.jsx";
import MemorySettingsModal from "./components/MemorySettingsModal.jsx";
import {
  LogoIcon,
  MenuIcon,
  TargetIcon,
  GraphIcon,
  SettingsIcon,
  PlusIcon,
} from "./components/Icons.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function Dashboard() {
  const { user, logout, authFetch } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [scopedDocument, setScopedDocument] = useState(null); // { id, name }
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ── Quiz & Flashcards Generator State ──
  const [quizTarget, setQuizTarget] = useState(null); // { documentId, tag, title }
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [studyData, setStudyData] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState(null);

  // ── URL & YouTube Ingestion State ──
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);

  // ── Long-Term Memory Settings State ──
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  /* ── 1. Load initial user data on mount ────────────── */
  useEffect(() => {
    fetchDocuments();
    fetchActiveChat();
  }, []);

  /* ── 2. Poll for documents in processing state ─────── */
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 2500);

    return () => clearInterval(interval);
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      const res = await authFetch("/api/documents");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  const fetchActiveChat = async () => {
    try {
      const res = await authFetch("/api/chat/active");
      const data = await res.json();
      if (data.success) {
        setChat(data.chat);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  /* ── 3. Handle document upload ─────────────────────── */
  const handleUpload = async (file) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("document", file);

    try {
      const res = await authFetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        await fetchDocuments();
      } else {
        alert(data.message || "Upload failed");
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  /* ── 3B. Handle Web & YouTube URL Ingestion ────────── */
  const handleIngestUrl = async (url) => {
    const res = await authFetch("/api/ingest/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to ingest URL");
    }

    await fetchDocuments();
  };

  /* ── 4. Handle document deletion ───────────────────── */
  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Delete "${filename}", its vectors, and chat citations?`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d._id !== docId));
        if (scopedDocument?.id === docId) {
          setScopedDocument(null);
        }
        fetchActiveChat();
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  /* ── 5. Handle document re-indexing ────────────────── */
  const handleReindex = async (docId, filename) => {
    try {
      const res = await authFetch(`/api/documents/${docId}/reindex`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        await fetchDocuments();
      } else {
        alert(data.message || "Failed to re-index");
      }
    } catch (err) {
      alert(`Re-index error: ${err.message}`);
    }
  };

  /* ── 5B. Generate Quiz & Flashcards per doc or tag ── */
  const handleOpenQuiz = async (target) => {
    // target: { documentId?, tag?, title }
    setQuizTarget(target);
    setIsQuizOpen(true);
    setIsGeneratingQuiz(true);
    setQuizError(null);
    setStudyData(null);

    try {
      const res = await authFetch("/api/study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: target.documentId,
          tag: target.tag,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStudyData(data.data);
      } else {
        setQuizError(data.message || "Failed to generate study materials.");
      }
    } catch (err) {
      setQuizError(`Generation error: ${err.message}`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  /* ── 6. Handle SSE streaming chat with optional doc scope ── */
  const handleAsk = async (question) => {
    const userMsg = {
      _id: "temp-" + Date.now(),
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAsking(true);
    setStreamingMessage(null);

    try {
      const response = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          chatId: chat?._id,
          documentId: scopedDocument?.id || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentContent = "";
      let currentSources = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const payload = JSON.parse(trimmed.slice(6));

            if (payload.type === "init") {
              if (payload.chatId && !chat) {
                setChat({ _id: payload.chatId });
              }
              currentSources = payload.sources || [];
              setStreamingMessage({
                content: "",
                sources: currentSources,
              });
            } else if (payload.type === "token") {
              currentContent += payload.token;
              setStreamingMessage({
                content: currentContent,
                sources: currentSources,
              });
            } else if (payload.type === "done") {
              setMessages((prev) => [
                ...prev,
                {
                  _id: "msg-" + Date.now(),
                  role: "assistant",
                  content: payload.answer || currentContent,
                  sources: payload.sources || currentSources,
                  createdAt: new Date().toISOString(),
                },
              ]);
              setStreamingMessage(null);
            } else if (payload.type === "error") {
              setMessages((prev) => [
                ...prev,
                {
                  _id: "err-" + Date.now(),
                  role: "assistant",
                  content: `Error: ${payload.message || "An error occurred."}`,
                  sources: [],
                  createdAt: new Date().toISOString(),
                },
              ]);
              setStreamingMessage(null);
            }
          } catch (e) {
            console.error("Error parsing SSE chunk:", e);
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          _id: "err-" + Date.now(),
          role: "assistant",
          content: `Error: ${err.message}`,
          sources: [],
        },
      ]);
      setStreamingMessage(null);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex h-screen bg-canvas overflow-hidden font-sans text-refined ambient-glow">
      {/* ── Sidebar ── */}
      <Sidebar
        documents={documents}
        isUploading={isUploading}
        onUpload={handleUpload}
        onOpenUrlModal={() => setIsUrlModalOpen(true)}
        onDelete={handleDelete}
        onReindex={handleReindex}
        onOpenQuiz={handleOpenQuiz}
        onOpenMemorySettings={() => setIsMemoryModalOpen(true)}
        selectedTag={selectedTag}
        onSelectTag={(tag) => setSelectedTag(tag)}
        user={user}
        onLogout={logout}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* ── Main Chat Dashboard ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas/70">
        {/* Header */}
        <header className="bg-canvas/95 border-b border-border backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3.5 shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg text-mineral hover:text-refined hover:bg-ivory cursor-pointer"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-refined flex items-center justify-center shadow-sm shrink-0 text-white">
              <LogoIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm md:text-base font-display font-bold text-refined tracking-tight">
                  KnowledgeBase
                </h1>

                {/* Scoped Document Pill */}
                {scopedDocument ? (
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-mallow border border-border text-refined flex items-center gap-1.5 animate-fade-in-up">
                    <span>Scoped: <strong>{scopedDocument.name}</strong></span>
                    <button
                      onClick={() => setScopedDocument(null)}
                      title="Clear document scope and search all documents"
                      className="hover:opacity-70 cursor-pointer ml-0.5 text-xs font-bold"
                    >
                      ×
                    </button>
                  </span>
                ) : selectedTag ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-mallow border border-border text-refined flex items-center gap-1">
                    <span>#{selectedTag}</span>
                    <button
                      onClick={() => setSelectedTag(null)}
                      className="hover:opacity-70 cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-mineral truncate">
                {scopedDocument
                  ? `Answering strictly from "${scopedDocument.name}"`
                  : `${documents.filter((d) => d.status === "ready").length} private documents indexed`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Contextual Quiz Button */}
            {scopedDocument ? (
              <button
                onClick={() =>
                  handleOpenQuiz({
                    documentId: scopedDocument.id,
                    title: scopedDocument.name,
                  })
                }
                className="px-2.5 py-1.5 rounded-lg bg-mallow hover:bg-mallow-hover border border-border text-xs font-semibold text-refined transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title={`Generate Quiz for ${scopedDocument.name}`}
              >
                <TargetIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quiz Doc</span>
              </button>
            ) : selectedTag ? (
              <button
                onClick={() =>
                  handleOpenQuiz({
                    tag: selectedTag,
                    title: `Tag: #${selectedTag}`,
                  })
                }
                className="px-2.5 py-1.5 rounded-lg bg-mallow hover:bg-mallow-hover border border-border text-xs font-semibold text-refined transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title={`Generate Quiz for #${selectedTag}`}
              >
                <TargetIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quiz #{selectedTag}</span>
              </button>
            ) : null}

            {/* Knowledge Graph Button */}
            <button
              onClick={() => setIsGraphOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-ivory hover:bg-mallow/60 border border-border text-xs font-medium text-refined transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <GraphIcon className="w-3.5 h-3.5 text-refined" />
              <span className="hidden sm:inline">Knowledge Graph</span>
            </button>

            {/* Long-Term Memory / Preferences Settings Button */}
            <button
              onClick={() => setIsMemoryModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-ivory hover:bg-mallow/60 border border-border text-xs font-medium text-refined transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="View and manage long-term remembered facts & preferences"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-refined" />
              <span className="hidden sm:inline">Memories</span>
            </button>

            {/* New Chat Button */}
            <button
              onClick={() => {
                setChat(null);
                setMessages([]);
                setScopedDocument(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-refined hover:bg-refined-hover text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <PlusIcon className="w-3 h-3" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </header>

        {/* Message list */}
        <MessageList
          messages={messages}
          streamingMessage={streamingMessage}
          isAsking={isAsking}
          onSelectSource={(source) => setSelectedSource(source)}
        />

        {/* Input area */}
        <ChatBox
          onSend={handleAsk}
          disabled={isAsking}
          placeholder={
            scopedDocument
              ? `Ask a question scoped to ${scopedDocument.name}…`
              : "Ask a question about your documents…"
          }
        />
      </div>

      {/* Citation Preview Modal */}
      <CitationModal
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
      />

      {/* Interactive 2D Knowledge Graph Modal */}
      <KnowledgeGraphModal
        isOpen={isGraphOpen}
        onClose={() => setIsGraphOpen(false)}
        authFetch={authFetch}
        onScopeChat={(id, name) => {
          setScopedDocument({ id, name });
          setChat(null);
          setMessages([]);
        }}
      />

      {/* Quiz and Flashcard Generator Modal */}
      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        title={quizTarget?.title}
        loading={isGeneratingQuiz}
        error={quizError}
        studyData={studyData}
        onRetry={() => quizTarget && handleOpenQuiz(quizTarget)}
      />

      {/* Web & YouTube URL Ingestion Modal */}
      <UrlIngestModal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        onIngest={handleIngestUrl}
      />

      {/* Long-Term Memory & Preferences Settings Modal */}
      <MemorySettingsModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        authFetch={authFetch}
      />
    </div>
  );
}

export default function App() {
  const googleClientId = GOOGLE_CLIENT_ID || "not-configured";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <AppContent googleConfigured={Boolean(GOOGLE_CLIENT_ID)} />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

function AppContent({ googleConfigured }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl loading-shimmer flex items-center justify-center mb-3">
          <div className="w-6 h-6 border-2 border-refined border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-xs text-mineral">Loading your knowledge vault…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage googleConfigured={googleConfigured} />;
  }

  return <Dashboard />;
}
