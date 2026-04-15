import { useRef, useEffect, useMemo } from "react";
import SceneRenderer from "./SceneRenderer";

const CANVAS_WIDTH = 900;
const SCENE_GAP = 50;

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
      return 100 + maxPts * 34 + 70;
    }
    case "pros_cons": {
      const maxItems = Math.max((d.pros || []).length, (d.cons || []).length, 1);
      return 100 + maxItems * 34 + 50;
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
      return 80 + (d.notes || []).length * 34 + 30;
    case "process":
      return 80 + (d.steps || []).length * 72 + 30;
    default:
      return 150;
  }
}

export default function WhiteboardCanvas({ scenes }) {
  const containerRef = useRef(null);

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

  return (
    <div className="whiteboard-area" ref={containerRef} data-testid="whiteboard-canvas">
      <div className="whiteboard-svg-container">
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

      {scenes.length === 0 && (
        <div className="empty-state" data-testid="empty-state">
          <div className="empty-state-title">Whiteboard Agent</div>
          <div className="empty-state-sub">Start a conversation to see ideas come to life</div>
          <svg width="120" height="80" viewBox="0 0 120 80" style={{ marginTop: 24, opacity: 0.15 }}>
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
    </div>
  );
}
