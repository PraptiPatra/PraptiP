import { useRef, useState, useCallback } from 'react';
import NodeCard from './NodeCard';
import ConnectionLines from './ConnectionLines';
import { ZoomIn, ZoomOut, RotateCcw, Trash2, Move } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export default function Canvas({ nodes, connections, onUpdateNode, onRemoveNode, onClearAll }) {
  const canvasRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    // Only pan when clicking the canvas background
    if (e.target === canvasRef.current || e.target.closest('[data-canvas-bg]')) {
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
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
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setScale(prev => Math.min(Math.max(prev + delta, 0.25), 2.5));
  }, []);

  const handleNodeDrag = useCallback((nodeId, newPos) => {
    if (onUpdateNode) onUpdateNode(nodeId, newPos);
  }, [onUpdateNode]);

  const resetView = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
  }, []);

  const fitToContent = useCallback(() => {
    if (nodes.length === 0) return;
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs) - 100;
    const minY = Math.min(...ys) - 100;
    setOffset({ x: -minX, y: -minY });
    setScale(0.85);
  }, [nodes]);

  return (
    <TooltipProvider>
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
        <div data-canvas-bg="true" className="absolute inset-0" />

        {/* ── Controls ── */}
        <div data-testid="canvas-controls" className="absolute top-4 right-4 flex items-center gap-1 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                data-testid="zoom-in-btn"
                onClick={() => setScale(prev => Math.min(prev + 0.15, 2.5))}
                className="p-2 bg-white border-2 border-zinc-900 text-zinc-700 hover:bg-zinc-100 transition-colors shadow-[2px_2px_0_0_#18181b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                <ZoomIn size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Zoom In</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                data-testid="zoom-out-btn"
                onClick={() => setScale(prev => Math.max(prev - 0.15, 0.25))}
                className="p-2 bg-white border-2 border-zinc-900 text-zinc-700 hover:bg-zinc-100 transition-colors shadow-[2px_2px_0_0_#18181b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                <ZoomOut size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Zoom Out</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                data-testid="reset-view-btn"
                onClick={resetView}
                className="p-2 bg-white border-2 border-zinc-900 text-zinc-700 hover:bg-zinc-100 transition-colors shadow-[2px_2px_0_0_#18181b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                <RotateCcw size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Reset View</TooltipContent>
          </Tooltip>
          {nodes.length > 0 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="fit-content-btn"
                    onClick={fitToContent}
                    className="p-2 bg-white border-2 border-zinc-900 text-zinc-700 hover:bg-zinc-100 transition-colors shadow-[2px_2px_0_0_#18181b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ml-1"
                  >
                    <Move size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Fit to Content</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="clear-canvas-btn"
                    onClick={onClearAll}
                    className="p-2 bg-white border-2 border-zinc-900 text-[#FF3B30] hover:bg-red-50 transition-colors shadow-[2px_2px_0_0_#18181b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    <Trash2 size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Clear Canvas</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* ── Scale badge ── */}
        <div className="absolute bottom-4 right-4 z-50 text-[10px] font-mono text-zinc-400 bg-white/80 px-2 py-1 border border-zinc-200">
          {Math.round(scale * 100)}%
        </div>

        {/* ── Empty state ── */}
        {nodes.length === 0 && (
          <div data-testid="canvas-empty-state" className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-[280px]">
              <div className="w-14 h-14 mx-auto mb-4 border-2 border-dashed border-zinc-300 flex items-center justify-center">
                <Move size={20} className="text-zinc-300" />
              </div>
              <p className="text-sm text-zinc-400" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Start a conversation with the AI agent
              </p>
              <p className="text-[11px] font-mono text-zinc-300 mt-2 leading-relaxed">
                Your speech will be cleaned up (Wispr Flow-style)<br/>
                and turned into structured visual notes here.
              </p>
            </div>
          </div>
        )}

        {/* ── Transformable container ── */}
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
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
