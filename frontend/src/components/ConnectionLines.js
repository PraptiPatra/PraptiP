export default function ConnectionLines({ connections, nodes }) {
  if (!connections?.length || !nodes?.length) return null;

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  return (
    <svg
      data-testid="connection-lines-svg"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5, overflow: 'visible' }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#a1a1aa" />
        </marker>
        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#002FA7" />
        </marker>
      </defs>
      {connections.map((conn, idx) => {
        const fromNode = nodeMap[conn.from_id];
        const toNode = nodeMap[conn.to_id];
        if (!fromNode || !toNode) return null;

        // Center of each node (approx 260px wide, 80px tall)
        const x1 = fromNode.x + 130;
        const y1 = fromNode.y + 40;
        const x2 = toNode.x + 130;
        const y2 = toNode.y + 40;

        // Quadratic bezier control point
        const dx = x2 - x1;
        const dy = y2 - y1;
        const cx = (x1 + x2) / 2 - dy * 0.2;
        const cy = (y1 + y2) / 2 + dx * 0.2;

        return (
          <g key={`conn-${idx}`}>
            <path
              d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
              fill="none"
              stroke="#d4d4d8"
              strokeWidth="1.5"
              strokeDasharray="6 3"
              markerEnd="url(#arrowhead)"
            />
            {conn.label && (
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                fill="#a1a1aa"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', fontWeight: 500 }}
              >
                {conn.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
