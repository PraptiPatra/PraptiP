import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { MagnifyingGlassPlus, MagnifyingGlassMinus, ArrowsIn } from "@phosphor-icons/react";
import SceneRenderer from "./SceneRenderer";

const CANVAS_WIDTH = 900;
const SCENE_GAP = 50;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

function getSceneHeight(scene) {
  if (!scene || !scene.data) return 120;
  const d = scene.data;
  switch (scene.scene_type) {
    case "title":
      return 140;
    case "problem_frame":
      return 170;
    case "comparison": {
      const maxPts = Math.max(1, ...(d.options || []).map((o) => (o.points || []).length));
      return 100 + maxPts * 42 + 70;
    }
    case "pros_cons": {
      const maxItems = Math.max((d.pros || []).length, (d.cons || []).length, 1);
      return 100 + maxItems * 48 + 50;
    }
    case "checklist":
      return 80 + (d.items || []).length * 40 + 30;
    case "scorecard": {
      const rows = (d.criteria || []).length + 1;
      return 80 + rows * 42 + 30;
    }
    case "recommendation":
      return 80 + (d.key_reasons || []).length * 32 + 120;
    case "notes":
      return 80 + (d.notes || []).length * 42 + 30;
    case "process":
      return 80 + (d.steps || []).length * 72 + 30;
    default:
      return 150;
  }
}

export default function WhiteboardCanvas({ scenes }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const sceneLayouts = useMemo(() => {
    let y = 40;
    return scenes.map((scene, i) => {
      const height = getSceneHeight(scene);
      const layout = { scene, y, height, index: i };
      y += height + SCENE_GAP;
      return layout;
    });
  }, [scenes]);

  const totalHeight = useMemo(() => {
    if (sceneLayouts.length === 0) return 600;
    const last = sceneLayouts[sceneLayouts.length - 1];
    return last.y + last.height + 100;
  }, [sceneLayouts]);

  // Auto-scroll to latest scene
  useEffect(() => {
    if (scenes.length > 0 && containerRef.current) {
      const timer = setTimeout(() => {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [scenes.length]);

  // ─── ZOOM HANDLERS ───────────────────────────────────
  const handleWheel = useCallback(
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom((prev) => {
          const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta));
          // Adjust pan to zoom toward cursor
          const rect = containerRef.current.getBoundingClientRect();
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top + containerRef.current.scrollTop;
          const scale = next / prev;
          setPan((p) => ({
            x: cx - (cx - p.x) * scale,
            y: cy - (cy - p.y) * scale,
          }));
          return next;
        });
      }
    },
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ─── PAN HANDLERS ────────────────────────────────────
  const handleMouseDown = useCallback(
    (e) => {
      // Middle mouse button or Space+click for panning
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          panX: pan.x,
          panY: pan.y,
        };
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan({
          x: panStart.current.panX + dx / zoom,
          y: panStart.current.panY + dy / zoom,
        });
      }
    },
    [isPanning, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isPanning) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isPanning, handleMouseMove, handleMouseUp]);

  // ─── ZOOM CONTROLS ───────────────────────────────────
  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      className="whiteboard-area"
      ref={containerRef}
      data-testid="whiteboard-canvas"
      onMouseDown={handleMouseDown}
      style={{ cursor: isPanning ? "grabbing" : zoom > 1 ? "grab" : "default" }}
    >
      <div
        className="whiteboard-svg-container"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: "center top",
          transition: isPanning ? "none" : "transform 0.15s ease-out",
        }}
      >
        <svg
          id="whiteboard-svg"
          className="whiteboard-svg"
          viewBox={`0 0 ${CANVAS_WIDTH} ${totalHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ height: totalHeight }}
        >
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap');
          `}</style>

          {sceneLayouts.map((layout) => (
            <SceneRenderer
              key={layout.scene.id}
              scene={layout.scene}
              y={layout.y}
              width={CANVAS_WIDTH}
              index={layout.index}
            />
          ))}
        </svg>
      </div>

      {/* Empty State */}
      {scenes.length === 0 && (
        <div className="empty-state" data-testid="empty-state">
          <div className="empty-state-title">Whiteboard Agent</div>
          <div className="empty-state-sub">
            Start a conversation to see ideas come to life
          </div>
          <svg
            width="120"
            height="80"
            viewBox="0 0 120 80"
            style={{ marginTop: 24, opacity: 0.15 }}
          >
            <path
              d="M20 60 Q 30 20, 60 35 T 100 25"
              fill="none"
              stroke="#111"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="4 6"
            />
            <circle cx="100" cy="25" r="3" fill="#111" opacity="0.5" />
          </svg>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="zoom-controls" data-testid="zoom-controls">
        <button
          onClick={zoomOut}
          className="zoom-btn"
          data-testid="zoom-out-btn"
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
        >
          <MagnifyingGlassMinus size={16} weight="bold" />
        </button>
        <span className="zoom-label" data-testid="zoom-level">
          {zoomPercent}%
        </span>
        <button
          onClick={zoomIn}
          className="zoom-btn"
          data-testid="zoom-in-btn"
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
        >
          <MagnifyingGlassPlus size={16} weight="bold" />
        </button>
        <div className="zoom-divider" />
        <button
          onClick={resetView}
          className="zoom-btn"
          data-testid="zoom-fit-btn"
          aria-label="Fit to screen"
        >
          <ArrowsIn size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
