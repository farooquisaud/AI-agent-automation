"use client";

import ReactFlow, {
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";
import { X } from "lucide-react";

type StepType = "LLM" | "HTTP" | "Delay" | "Tool" | "Document";

type StepNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: React.ReactNode;
  };
  style?: React.CSSProperties;
};

/* ---------- NODE COLORS ---------- */

function getNodeColor(type: string) {
  switch (type) {
    case "LLM":
      return "#7c3aed"; // purple
    case "HTTP":
      return "#2563eb"; // blue
    case "Tool":
      return "#f59e0b"; // orange
    case "Document":
      return "#16a34a"; // green
    case "Delay":
      return "#6b7280"; // gray
    default:
      return "#374151";
  }
}

export default function VisualBuilder({
  steps,
  setSteps,
}: {
  steps: any[];
  setSteps: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  /* ---------- INITIAL NODES ---------- */

  const initialNodes: StepNode[] = steps.map((s, i) => ({
    id: s.id,
    type: "default",
    position: { x: i * 320, y: 120 },
    data: {
      label: (
        <div className="flex items-center justify-between gap-2">
          <span>
            {s.name} ({s.type})
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(s.id);
            }}
            className="text-red-500 hover:text-red-600 text-xs"
          >
            ✕
          </button>
        </div>
      ),
    },
    style: {
      padding: "12px 16px",
      borderRadius: "12px",
      border: `1px solid ${getNodeColor(s.type)}`,
      background: "var(--card)",
      color: "var(--foreground)",
      fontSize: "14px",
      cursor: "pointer",
      fontWeight: 500,
      minWidth: 240,
      maxWidth: 240,
      textAlign: "center",
      boxShadow: `0 0 0 1px ${getNodeColor(s.type)}20, 0 2px 6px rgba(0,0,0,0.05)`,
    },
  }));

  const initialEdges = steps.slice(1).map((step, index) => ({
    id: `e-${steps[index].id}-${step.id}`,
    source: steps[index].id,
    target: step.id,
    animated: true,
    style: { strokeWidth: 2 },
    label: "",
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const selectedStep = steps.find((s) => s.id === selectedNode?.id);

  /* ---------- EVENTS ---------- */

  function onNodeClick(_: any, node: Node) {
    setSelectedNode(node);
  }

  function handleEdgesDelete(deletedEdges: any[]) {
    setEdges((eds) =>
      eds.filter((edge) => !deletedEdges.find((d) => d.id === edge.id)),
    );
  }

  function rebuildStepOrder(newEdges: any[]) {
    if (!newEdges.length) return;

    const map: any = {};

    newEdges.forEach((edge) => {
      map[edge.source] = edge.target;
    });

    const start = steps.find((s) => !newEdges.find((e) => e.target === s.id));

    if (!start) return;

    const ordered = [start];
    let current = start;

    while (map[current.id]) {
      const next = steps.find((s) => s.id === map[current.id]);
      if (!next) break;

      ordered.push(next);
      current = next;
    }

    setSteps(ordered);
  }

  const onConnect = (params: Connection) => {
    setEdges((eds) => {
      const filtered = eds.filter((e) => e.target !== params.target);

      const newEdges = addEdge(
        {
          ...params,
          animated: true,
          style: { strokeWidth: 2 },
          label: "",
        },
        filtered,
      );

      return newEdges;
    });
  };

  function updateStep(stepId: string, patch: any) {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    );
  }

  function buildNodePreview(step: any) {
    const rows: { name: string; type: string }[] = [];

    if (step.type === "LLM") {
      rows.push({ name: "prompt", type: "string" });

      if (step.useMemory) {
        rows.push({ name: "memory", type: "agent" });
        rows.push({ name: "memoryTopK", type: "number" });
      }

      rows.push({ name: "output", type: "text" });
    }

    if (step.type === "HTTP") {
      rows.push({ name: "url", type: "string" });
      rows.push({ name: "method", type: "string" });
      rows.push({ name: "response", type: "json" });
    }

    if (step.type === "Delay") {
      rows.push({ name: "seconds", type: "number" });
    }

    if (step.type === "Tool") {
      rows.push({ name: "tool", type: "string" });
    }

    if (step.type === "Document") {
      rows.push({ name: "query", type: "string" });
      rows.push({ name: "topK", type: "number" });
    }

    return rows;
  }

  function updateNodeLabel(stepId: string, name: string, type: string) {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    const schema = buildNodePreview({ ...step, name, type });

    setNodes((nds) =>
      nds.map((n) =>
        n.id === stepId
          ? {
              ...n,
              data: {
                ...n.data,
                label: (
                  <div className="w-full text-sm">
                    {/* HEADER */}
                    <div className="flex items-center justify-between border-b pb-1 mb-2 group">
                      <span className="font-semibold truncate">{name}</span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(stepId);
                        }}
                        className="text-red-500 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>

                    {/* TYPE */}
                    <div className="text-xs text-muted-foreground mb-2">
                      {type}
                    </div>

                    {/* SCHEMA */}
                    <div className="space-y-1">
                      {schema.map((row) => (
                        <div
                          key={row.name}
                          className="flex justify-between text-xs py-1 border-b border-muted/50 last:border-0"
                        >
                          <span>{row.name}</span>
                          <span className="text-muted-foreground">
                            {row.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
            }
          : n,
      ),
    );
  }

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch(apiUrl("/documents"), {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        });

        const data = await res.json();

        if (data.ok) {
          setDocuments(data.documents || []);
        }
      } catch (err) {
        console.error("Failed to load documents", err);
      }
    }

    fetchDocuments();
  }, []);

  useEffect(() => {
    const newEdges = steps.slice(1).map((step, index) => ({
      id: `e-${steps[index].id}-${step.id}`,
      source: steps[index].id,
      target: step.id,
      animated: true,
      style: { strokeWidth: 2 },
      label: "",
    }));

    setEdges(newEdges);
  }, [steps]);

  useEffect(() => {
    if (!edges.length) return;

    const map: Record<string, string> = {};

    edges.forEach((edge) => {
      map[edge.source] = edge.target;
    });

    const start = steps.find((s) => !edges.find((e) => e.target === s.id));
    if (!start) return;

    const ordered: any[] = [];
    const visited = new Set<string>();

    let current = start;

    while (current && !visited.has(current.id)) {
      ordered.push(current);
      visited.add(current.id);

      const nextId = map[current.id];
      current = steps.find((s) => s.id === nextId);
    }

    // 🔹 add remaining steps that are disconnected
    const remaining = steps.filter((s) => !visited.has(s.id));

    const newOrder = [...ordered, ...remaining];

    const currentOrder = steps.map((s) => s.id).join(",");
    const nextOrder = newOrder.map((s) => s.id).join(",");

    if (currentOrder !== nextOrder) {
      setSteps(newOrder);
    }
  }, [edges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const step = steps.find((s) => s.id === node.id);
        if (!step) return node;
        const isSelected = selectedNode?.id === node.id;

        const schema = buildNodePreview(step);

        return {
          ...node,
          style: {
            ...node.style,
            border: isSelected
              ? "2px solid #3b82f6"
              : `1px solid ${getNodeColor(step.type)}`,
            boxShadow: isSelected
              ? "0 0 0 2px rgba(59,130,246,.35), 0 4px 12px rgba(0,0,0,.25)"
              : `0 0 0 1px ${getNodeColor(step.type)}20, 0 2px 6px rgba(0,0,0,0.05)`,
          },
          data: {
            ...node.data,
            label: (
              <div className="w-full text-sm">
                <div className="flex items-center justify-between border-b pb-1 mb-2 group">
                  <span className="font-semibold truncate flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: getNodeColor(step.type) }}
                    />
                    {step.name}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(step.id);
                    }}
                    className="text-red-500 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs text-muted-foreground mb-2">
                  {step.type}
                </div>

                <div className="space-y-1">
                  {schema.map((row) => (
                    <div
                      key={row.name}
                      className="flex justify-between text-xs py-1 border-b border-muted/50 last:border-0"
                    >
                      <span>{row.name}</span>
                      <span className="text-muted-foreground">{row.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
        };
      }),
    );
  }, [steps, selectedNode]);

  /* ---------- ADD NODE ---------- */

  function addNode() {
    const id = uuidv4();

    const node: StepNode = {
      id,
      type: "default",
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
      data: {
        label: (
          <div className="flex items-center justify-between gap-2">
            <span>New Step (LLM)</span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(id);
              }}
              className="text-red-500 hover:text-red-600 text-xs"
            >
              ✕
            </button>
          </div>
        ),
      },
      style: {
        padding: "12px 16px",
        borderRadius: "12px",
        border: `1px solid ${getNodeColor("LLM")}`,
        background: "var(--card)",
        color: "var(--foreground)",
        fontSize: "14px",
        fontWeight: 500,
        minWidth: 240,
        cursor: "pointer",
        maxWidth: 240,
        textAlign: "center",
        boxShadow: `0 0 0 1px ${getNodeColor("LLM")}20, 0 2px 6px rgba(0,0,0,0.05)`,
      },
    };

    setNodes((n) => [...n, node]);

    setSteps([
      ...steps,
      {
        id,
        name: "New Step",
        type: "LLM",
        prompt: "",
      },
    ]);
  }

  /* ---------- DELETE NODE ---------- */

  function deleteNode(nodeId: string) {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
    );

    setSteps((prev) => prev.filter((s) => s.id !== nodeId));

    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }

  return (
    <div className="h-[720px] rounded-xl border bg-gradient-to-b from-background to-muted/40 relative overflow-hidden">
      {/* ---------- ADD STEP BUTTON ---------- */}

      <div className="absolute z-20 top-4 left-4">
        <button
          onClick={addNode}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg shadow-md hover:scale-[1.02] hover:shadow-lg transition"
        >
          + Add Step
        </button>
      </div>

      {/* ---------- GRAPH ---------- */}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={handleEdgesDelete}
        onNodeClick={onNodeClick}
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: { strokeWidth: 2 },
        }}
        fitView
      >
        <Controls className="bg-card border rounded-md shadow" />

        <Background gap={24} size={1} />
      </ReactFlow>

      {/* ---------- SETTINGS PANEL ---------- */}

      {selectedNode && selectedStep && (
        <div className="absolute right-0 top-0 h-full w-[380px] bg-card border-l shadow-xl z-30 flex flex-col">
          {/* HEADER */}

          <div className="p-4 border-b flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">Step Settings</h3>
              <p className="text-xs text-muted-foreground">
                Configure workflow step
              </p>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="p-2 rounded-md hover:bg-muted transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* FORM */}

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* STEP NAME */}

            <div>
              <label className="text-xs text-muted-foreground">Step Name</label>

              <input
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                value={selectedStep.name || ""}
                onChange={(e) => {
                  updateStep(selectedStep.id, { name: e.target.value });
                  updateNodeLabel(
                    selectedStep.id,
                    e.target.value,
                    selectedStep.type,
                  );
                }}
              />
            </div>

            {/* STEP TYPE */}

            <div>
              <label className="text-xs text-muted-foreground">Step Type</label>

              <select
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                value={selectedStep.type || ""}
                onChange={(e) => {
                  const type = e.target.value as StepType;

                  updateStep(selectedStep.id, { type });

                  updateNodeLabel(selectedStep.id, selectedStep.name, type);
                }}
              >
                <option value="" disabled>
                  Select step type
                </option>

                <option value="LLM">LLM</option>
                <option value="HTTP">HTTP</option>
                <option value="Delay">Delay</option>
                <option value="Tool">Tool</option>
                <option value="Document">Document</option>
              </select>
            </div>

            {/* ---------- LLM ---------- */}

            {selectedStep.type === "LLM" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Prompt
                  </label>

                  <textarea
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background min-h-[120px]"
                    value={selectedStep.prompt || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, { prompt: e.target.value })
                    }
                  />
                </div>

                {/* 🔥 Advanced Options */}
                <div className="rounded-lg border border-muted p-4">
                  <p className="text-sm font-semibold mb-3">Advanced Options</p>

                  <div className="flex items-center justify-between">
                    <label className="text-sm cursor-pointer">
                      Use Agent Memory
                    </label>

                    <input
                      type="checkbox"
                      checked={selectedStep.useMemory ?? false}
                      onChange={(e) =>
                        updateStep(selectedStep.id, {
                          useMemory: e.target.checked,
                        })
                      }
                    />
                  </div>

                  {selectedStep.useMemory && (
                    <div className="mt-3">
                      <label className="text-sm">Memory Top K</label>

                      <input
                        type="number"
                        className="w-full border rounded-lg px-3 py-2 mt-1 bg-background"
                        value={selectedStep.memoryTopK ?? 5}
                        onChange={(e) =>
                          updateStep(selectedStep.id, {
                            memoryTopK: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ---------- DELAY ---------- */}

            {selectedStep.type === "Delay" && (
              <div>
                <label className="text-xs text-muted-foreground">
                  Delay (seconds)
                </label>

                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                  value={selectedStep.delay || ""}
                  onChange={(e) =>
                    updateStep(selectedStep.id, {
                      delay: Number(e.target.value),
                    })
                  }
                />
              </div>
            )}

            {/* ---------- HTTP ---------- */}

            {selectedStep.type === "HTTP" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">URL</label>

                  <input
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.url || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, { url: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    Method
                  </label>

                  <select
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.method || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, { method: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Select method
                    </option>

                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </>
            )}

            {/* ---------- TOOL ---------- */}

            {selectedStep.type === "Tool" && (
              <div>
                <label className="text-xs text-muted-foreground">Tool</label>

                <select
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                  value={selectedStep.tool || ""}
                  onChange={(e) =>
                    updateStep(selectedStep.id, { tool: e.target.value })
                  }
                >
                  <option value="" disabled>
                    Select tool
                  </option>

                  <option value="email">Email</option>
                  <option value="file">File</option>
                  <option value="browser">Browser</option>
                </select>
              </div>
            )}

            {/* EMAIL */}

            {selectedStep.type === "Tool" && selectedStep.tool === "email" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">To</label>

                  <input
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.to || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, { to: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    Subject
                  </label>

                  <input
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.subject || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, { subject: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Text</label>

                  <textarea
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.text || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, { text: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {/* FILE */}

            {selectedStep.type === "Tool" && selectedStep.tool === "file" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Action
                  </label>

                  <select
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.action || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, { action: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Select action
                    </option>

                    <option value="write">Write</option>
                    <option value="append">Append</option>
                    <option value="read">Read</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Path</label>

                  <input
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.path || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, { path: e.target.value })
                    }
                  />
                </div>

                {selectedStep.action !== "read" && (
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Content
                    </label>

                    <textarea
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                      value={selectedStep.content || ""}
                      onChange={(e) =>
                        updateStep(selectedStep.id, {
                          content: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </>
            )}

            {/* BROWSER */}

            {selectedStep.type === "Tool" &&
              selectedStep.tool === "browser" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Action
                    </label>

                    <select
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                      value={selectedStep.action || ""}
                      onChange={(e) =>
                        updateStep(selectedStep.id, { action: e.target.value })
                      }
                    >
                      <option value="" disabled>
                        Select action
                      </option>

                      <option value="screenshot">Screenshot</option>
                      <option value="evaluate">Evaluate</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">URL</label>

                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                      value={selectedStep.url || ""}
                      onChange={(e) =>
                        updateStep(selectedStep.id, { url: e.target.value })
                      }
                    />
                  </div>

                  {selectedStep.action === "evaluate" && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Code
                      </label>

                      <textarea
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                        value={selectedStep.code || ""}
                        onChange={(e) =>
                          updateStep(selectedStep.id, { code: e.target.value })
                        }
                      />
                    </div>
                  )}
                </>
              )}

            {/* DOCUMENT */}

            {selectedStep.type === "Document" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Document
                  </label>

                  <select
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.documentId || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        documentId: e.target.value,
                      })
                    }
                  >
                    <option value="" disabled>
                      Select document
                    </option>

                    {documents.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.title || "Untitled Document"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Query</label>

                  <textarea
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.query || ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        query: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Top K</label>

                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background"
                    value={selectedStep.topK || 4}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        topK: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
