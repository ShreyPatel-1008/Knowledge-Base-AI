import { useState, useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  GraphIcon,
  XIcon,
  FileTextIcon,
  MessageCircleIcon,
} from "./Icons.jsx";

export default function KnowledgeGraphModal({
  isOpen,
  onClose,
  authFetch,
  onScopeChat,
}) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [relatedDocs, setRelatedDocs] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const fgRef = useRef();

  useEffect(() => {
    if (!isOpen) {
      setSelectedNode(null);
      setRelatedDocs([]);
      return;
    }

    async function loadGraph() {
      setLoading(true);
      try {
        const res = await authFetch("/api/documents/graph");
        const data = await res.json();
        if (data.success && data.graph) {
          setGraphData(data.graph);
        }
      } catch (err) {
        console.error("Failed to load knowledge graph:", err);
      } finally {
        setLoading(false);
      }
    }

    loadGraph();
  }, [isOpen, authFetch]);

  // Fetch top 3 related documents when a node is selected
  useEffect(() => {
    if (!selectedNode) {
      setRelatedDocs([]);
      return;
    }

    async function loadRelated() {
      setLoadingRelated(true);
      try {
        const res = await authFetch(`/api/documents/${selectedNode.id}/related`);
        const data = await res.json();
        if (data.success) {
          setRelatedDocs(data.related || []);
        }
      } catch (err) {
        console.error("Failed to load related documents:", err);
      } finally {
        setLoadingRelated(false);
      }
    }

    loadRelated();
  }, [selectedNode, authFetch]);

  if (!isOpen) return null;

  const getNodeColor = (type) => {
    switch (type) {
      case "pdf":
        return "#e11d48"; // rose
      case "docx":
        return "#0284c7"; // sky
      case "txt":
        return "#78716c"; // stone
      case "md":
        return "#9333ea"; // purple
      case "web":
        return "#0d9488"; // teal
      case "youtube":
        return "#dc2626"; // red
      default:
        return "#394541"; // refined green
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.5, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-refined/40 backdrop-blur-xs animate-fade-in-up font-sans">
      <div className="w-full h-full max-w-7xl bg-canvas border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-ivory z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-mallow border border-border flex items-center justify-center text-refined shadow-2xs">
              <GraphIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-refined tracking-tight flex items-center gap-2">
                Knowledge Graph
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-mallow text-refined border border-border font-semibold">
                  {graphData.nodes.length} Documents · {graphData.links.length} Similarity Edges
                </span>
              </h2>
              <p className="text-[11px] text-mineral">
                Nodes are documents. Edges represent semantic cosine similarity (&gt; 0.35).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fgRef.current?.zoomToFit(600, 40)}
              className="px-3 py-1.5 rounded-lg bg-canvas hover:bg-mallow/50 text-xs text-refined border border-border transition-colors cursor-pointer font-medium"
            >
              Reset View
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-mineral hover:text-refined hover:bg-mallow/50 transition-colors cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Graph Canvas Container */}
        <div className="flex-1 relative overflow-hidden bg-ivory/60">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-mineral">
              <div className="w-8 h-8 border-2 border-refined border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs">Computing document embeddings & graph links…</p>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-mineral">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-canvas border border-border flex items-center justify-center text-refined shadow-2xs">
                <GraphIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-refined">No documents ready yet</p>
              <p className="text-xs text-mineral mt-1 max-w-sm">
                Upload at least two documents in the vault to generate semantic knowledge links.
              </p>
            </div>
          ) : (
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              backgroundColor="transparent"
              nodeRelSize={7}
              nodeVal={(node) => Math.max(3, Math.min(10, node.chunkCount || 3))}
              nodeColor={(node) => getNodeColor(node.type)}
              linkColor={() => "rgba(106, 115, 110, 0.35)"}
              linkWidth={(link) => Math.max(1, (link.similarity || 0.4) * 3)}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={2}
              linkDirectionalParticleSpeed={0.005}
              onNodeClick={handleNodeClick}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.name;
                const fontSize = 12 / globalScale;
                const isSelected = selectedNode?.id === node.id;

                // Draw outer glow if selected
                if (isSelected) {
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
                  ctx.fillStyle = "rgba(254, 222, 224, 0.85)";
                  ctx.fill();
                }

                // Node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, 7, 0, 2 * Math.PI, false);
                ctx.fillStyle = getNodeColor(node.type);
                ctx.fill();
                ctx.strokeStyle = isSelected ? "#394541" : "rgba(255, 255, 255, 0.9)";
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.stroke();

                // Node text label
                ctx.font = `600 ${fontSize}px "General Sans", ui-sans-serif, system-ui, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = isSelected ? "#2A3330" : "#394541";
                ctx.fillText(label, node.x, node.y + 15 / globalScale);
              }}
            />
          )}

          {/* Right Inspection Drawer for Selected Node */}
          {selectedNode && (
            <div className="absolute top-4 right-4 bottom-4 w-96 bg-canvas/95 border border-border rounded-2xl shadow-xl p-5 flex flex-col z-20 backdrop-blur-md animate-fade-in-up overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getNodeColor(selectedNode.type) }} />
                  <h3 className="text-xs md:text-sm font-bold text-refined truncate max-w-[220px]" title={selectedNode.name}>
                    {selectedNode.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-mineral hover:text-refined p-1 rounded-lg cursor-pointer"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Details Content */}
              <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
                {/* Meta stats */}
                <div className="flex items-center justify-between text-[11px] text-mineral p-2.5 rounded-xl bg-ivory border border-border">
                  <span>Type: <strong className="text-refined uppercase">{selectedNode.type}</strong></span>
                  <span>Chunks: <strong className="text-refined">{selectedNode.chunkCount}</strong></span>
                  <span>Size: <strong className="text-refined">{((selectedNode.size || 0) / (1024 * 1024)).toFixed(2)} MB</strong></span>
                </div>

                {/* 3-Sentence Summary */}
                {selectedNode.summary && (
                  <div>
                    <span className="text-[10px] font-bold text-refined uppercase tracking-wider block mb-1.5">
                      3-Sentence Summary
                    </span>
                    <p className="p-3 rounded-xl bg-ivory border border-border text-xs text-refined leading-relaxed italic">
                      "{selectedNode.summary}"
                    </p>
                  </div>
                )}

                {/* Topic Tags */}
                {selectedNode.tags && selectedNode.tags.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-mineral uppercase tracking-wider block mb-1.5">
                      Topic Tags
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-mallow border border-border text-[10px] text-refined font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top 3 Related Documents */}
                <div>
                  <span className="text-[10px] font-bold text-mineral uppercase tracking-wider block mb-1.5">
                    Top Related Notes
                  </span>
                  {loadingRelated ? (
                    <div className="py-4 text-center text-mineral text-xs animate-pulse">
                      Finding semantic neighbors…
                    </div>
                  ) : relatedDocs.length === 0 ? (
                    <p className="text-[11px] text-mineral italic p-2">
                      No other documents meet similarity threshold.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {relatedDocs.map((r) => (
                        <div
                          key={r._id}
                          onClick={() => {
                            const found = graphData.nodes.find((n) => n.id === String(r._id));
                            if (found) handleNodeClick(found);
                          }}
                          className="p-2.5 rounded-xl bg-ivory hover:bg-mallow/40 border border-border transition-all cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileTextIcon className="w-3.5 h-3.5 text-refined" />
                            <span className="text-refined font-medium truncate max-w-[170px]">
                              {r.filename}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-refined px-1.5 py-0.5 rounded bg-mallow border border-border">
                            {Math.round((r.similarityScore || 0) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Scoped Chat */}
              <div className="pt-3 border-t border-border shrink-0">
                <button
                  onClick={() => {
                    onScopeChat(selectedNode.id, selectedNode.name);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-refined hover:bg-refined-hover text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircleIcon className="w-3.5 h-3.5" />
                  <span>Chat Scoped to this Document</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
