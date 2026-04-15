import { useRef, useState, useCallback } from 'react';
import NodeCard from './NodeCard';
import ConnectionLines from './ConnectionLines';
import { Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function Canvas({ nodes, connections, onUpdateNode, onRemoveNode, onClearAll }) {
  const canvasRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    if (e.target === canvasRef.current || e.target.closest('[data-canvas-bg]')) {
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    const dx = e.clientX - lastPanPos.current.x;
    const dy = e.clientY - lastPanPos.current.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPanPos.current = { x: e.clientX, y: e.clientY };
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(prev => Math.min(Math.max(prev + delta, 0.3), 2));
  }, []);

  const handleNodeDrag = useCallback((nodeId, newPos) => {
    if (onUpdateNode) {
      onUpdateNode(nodeId, newPos);
    }
  }, [onUpdateNode]);

  const resetView = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
  }, []);

  return (
    <div
      ref={canvasRef}
      data-testid="whiteboard-canvas"
      className="flex-1 relative overflow-hidden canvas-grid"
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Canvas background (for pan detection) */}
      <div data-canvas-bg="true" className="absolute inset-0" />

      {/* Zoom controls */}
      <div data-testid="canvas-controls" className="absolute top-4 right-4 flex items-center gap-1 z-50">
        <button
          data-testid="zoom-in-btn"
          onClick={() => setScale(prev => Math.min(prev + 0.15, 2))}
          className="p-2 bg-white border-2 border-zinc-900 text-zinc-700 hover:bg-zinc-100 transition-colors shadow-[2px_2px_0_0_#18181b]"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          data-testid="zoom-out-btn"
          onClick={() => setScale(prev => Math.max(prev - 0.15, 0.3))}
          className="p-2 bg-white border-2 border-zinc-900 text-zinc-700 hover:bg-zinc-100 transition-colors shadow-[2px_2px_0_0_#18181b]"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          data-testid="reset-view-btn"
          onClick={resetView}
          className="p-2 bg-white border-2 border-zinc-900 text-zinc-700 hover:bg-zinc-100 transition-colors shadow-[2px_2px_0_0_#18181b]"
          title="Reset view"
        >
          <RotateCcw size={16} />
        </button>
        {nodes.length > 0 && (
          <button
            data-testid="clear-canvas-btn"
            onClick={onClearAll}
            className="p-2 bg-white border-2 border-zinc-900 text-[#FF3B30] hover:bg-red-50 transition-colors shadow-[2px_2px_0_0_#18181b] ml-2"
            title="Clear canvas"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* Scale / pan indicator */}
      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 text-xs font-mono text-zinc-400">
        <Move size={12} />
        <span>{Math.round(scale * 100)}%</span>
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div data-testid="canvas-empty-state" className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-zinc-300 flex items-center justify-center">
              <Move size={24} className="text-zinc-300" />
            </div>
            <p className="text-sm font-mono text-zinc-400">Start speaking to generate visual notes</p>
            <p className="text-xs font-mono text-zinc-300 mt-1">Your conversation will appear here as structured cards</p>
          </div>
        </div>
      )}

      {/* Transformable container */}
      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          inset: 0,
        }}
      >
        <ConnectionLines connections={connections} nodes={nodes} />
        {nodes.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            onDrag={handleNodeDrag}
            onRemove={onRemoveNode}
            canvasOffset={offset}
          />
        ))}
      </div>
    </div>
  );
}
