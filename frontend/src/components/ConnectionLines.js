export default function ConnectionLines({ connections, nodes }) {
  if (!connections?.length || !nodes?.length) return null;

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  return (
    <svg
      data-testid="connection-lines-svg"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#a1a1aa" />
        </marker>
      </defs>
      {connections.map((conn, idx) => {
        const fromNode = nodeMap[conn.from_id];
        const toNode = nodeMap[conn.to_id];
        if (!fromNode || !toNode) return null;

        const x1 = fromNode.x + 140;
        const y1 = fromNode.y + 40;
        const x2 = toNode.x + 140;
        const y2 = toNode.y + 40;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // Curved path
        const dx = x2 - x1;
        const dy = y2 - y1;
        const cx = midX - dy * 0.15;
        const cy = midY + dx * 0.15;

        return (
          <g key={`conn-${idx}`}>
            <path
              d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
              fill="none"
              stroke="#d4d4d8"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            {conn.label && (
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                className="text-[10px] fill-zinc-400"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}
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
