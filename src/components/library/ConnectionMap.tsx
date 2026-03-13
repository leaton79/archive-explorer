import { useEffect, useRef, useState } from "react";
import { getConnectionGraph } from "../../lib/tauri-commands";
import type { GraphData, GraphNode } from "../../lib/types";

interface ConnectionMapProps {
  onSelectItem?: (id: string) => void;
}

const MEDIA_COLORS: Record<string, string> = {
  image: "#7c3aed",
  audio: "#059669",
  movies: "#dc2626",
  texts: "#2563eb",
  software: "#d97706",
  web: "#6366f1",
  unknown: "#6b7280",
};

export function ConnectionMap({ onSelectItem }: ConnectionMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const loadGraph = async () => {
      setLoading(true);
      try {
        const data = await getConnectionGraph();
        setGraphData(data);
      } catch (err) {
        console.error("Failed to load graph:", err);
      } finally {
        setLoading(false);
      }
    };
    loadGraph();
  }, []);

  // Measure container
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      setDimensions({ width: rect.width, height: Math.max(400, rect.height - 40) });
    }
  }, [graphData]);

  // Simple force simulation without D3 dependency
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0 || !svgRef.current) return;

    const { nodes, edges } = graphData;
    const { width, height } = dimensions;

    // Initialize positions
    type SimNode = GraphNode & { x: number; y: number; vx: number; vy: number };
    const simNodes: SimNode[] = nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (Math.cos((i / nodes.length) * Math.PI * 2) * width) / 3,
      y: height / 2 + (Math.sin((i / nodes.length) * Math.PI * 2) * height) / 3,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map<string, SimNode>();
    simNodes.forEach((n) => nodeMap.set(n.id, n));

    // Run simulation
    const iterations = 120;
    const repulsion = 3000;
    const attraction = 0.008;
    const centerForce = 0.01;
    const damping = 0.85;

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = dist * attraction;
        const fx = (dx / Math.max(dist, 1)) * force;
        const fy = (dy / Math.max(dist, 1)) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Center gravity
      for (const node of simNodes) {
        node.vx += (width / 2 - node.x) * centerForce;
        node.vy += (height / 2 - node.y) * centerForce;
      }

      // Apply velocity with damping
      for (const node of simNodes) {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
        // Keep in bounds
        node.x = Math.max(40, Math.min(width - 40, node.x));
        node.y = Math.max(40, Math.min(height - 40, node.y));
      }
    }

    // Render
    const svg = svgRef.current;
    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(a.x));
      line.setAttribute("y1", String(a.y));
      line.setAttribute("x2", String(b.x));
      line.setAttribute("y2", String(b.y));
      line.setAttribute("stroke", "var(--border-strong)");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("opacity", "0.6");
      svg.appendChild(line);

      // Edge label
      if (edge.label) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", String((a.x + b.x) / 2));
        text.setAttribute("y", String((a.y + b.y) / 2 - 6));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "var(--text-muted)");
        text.setAttribute("font-size", "10");
        text.setAttribute("font-family", "var(--font-body)");
        text.textContent = edge.label;
        svg.appendChild(text);
      }
    }

    // Nodes
    for (const node of simNodes) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("cursor", "pointer");
      g.addEventListener("click", () => onSelectItem?.(node.id));
      g.addEventListener("mouseenter", () => setHoveredNode(node.id));
      g.addEventListener("mouseleave", () => setHoveredNode(null));

      const radius = Math.max(12, Math.min(24, 8 + node.link_count * 4));
      const color = MEDIA_COLORS[node.media_type] || MEDIA_COLORS.unknown;

      // Circle
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(node.x));
      circle.setAttribute("cy", String(node.y));
      circle.setAttribute("r", String(radius));
      circle.setAttribute("fill", color);
      circle.setAttribute("opacity", "0.85");
      circle.setAttribute("stroke", "var(--bg-primary)");
      circle.setAttribute("stroke-width", "2");
      g.appendChild(circle);

      // Label
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(node.x));
      text.setAttribute("y", String(node.y + radius + 14));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "var(--text-primary)");
      text.setAttribute("font-size", "11");
      text.setAttribute("font-family", "var(--font-body)");
      text.setAttribute("font-weight", "500");
      const titleText = node.title.length > 25 ? node.title.slice(0, 22) + "..." : node.title;
      text.textContent = titleText;
      g.appendChild(text);

      svg.appendChild(g);
    }
  }, [graphData, dimensions, onSelectItem]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span>Loading connection map...</span>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🕸️</div>
        <div>No connections yet.</div>
        <div style={{ fontSize: "0.82rem" }}>
          Open a saved item and use "Link to..." to connect related items.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          {graphData.nodes.length} items · {graphData.edges.length} connections
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(MEDIA_COLORS).filter(([k]) => k !== "unknown").map(([type, color]) => (
            <span
              key={type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: "0.68rem",
                color: "var(--text-muted)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                }}
              />
              {type}
            </span>
          ))}
        </div>
      </div>
      <div
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ display: "block" }}
        />
      </div>
      {hoveredNode && (
        <div
          style={{
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            marginTop: 6,
            textAlign: "center",
          }}
        >
          Click a node to view item details
        </div>
      )}
    </div>
  );
}
