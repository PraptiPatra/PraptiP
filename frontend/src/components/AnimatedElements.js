import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/* ─── PEN CURSOR ─────────────────────────────────────────
   A small marker that follows the animated path using
   requestAnimationFrame + getPointAtLength for perfect sync
   with framer-motion's pathLength animation.
──────────────────────────────────────────────────────────── */
function PenMarker({ d, delay, duration }) {
  const penRef = useRef(null);

  useEffect(() => {
    const pen = penRef.current;
    if (!pen || !d) return;

    const svg = pen.ownerSVGElement;
    const hostGroup = pen.parentNode;
    if (!svg || !(hostGroup instanceof SVGElement)) return;

    const ns = "http://www.w3.org/2000/svg";
    const tempPath = document.createElementNS(ns, "path");
    tempPath.setAttribute("d", d);
    tempPath.style.visibility = "hidden";
    tempPath.style.position = "absolute";
    tempPath.style.pointerEvents = "none";
    // Keep the helper path in the same transformed group as the animated path.
    hostGroup.appendChild(tempPath);

    let totalLength;
    try {
      totalLength = tempPath.getTotalLength();
    } catch {
      hostGroup.removeChild(tempPath);
      return;
    }

    if (totalLength < 2) {
      hostGroup.removeChild(tempPath);
      return;
    }

    const startTime = performance.now() + delay * 1000;
    let raf;

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function tick(now) {
      const elapsed = (now - startTime) / 1000;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const t = Math.min(elapsed / duration, 1);
      const e = easeInOut(t);

      try {
        const pt = tempPath.getPointAtLength(e * totalLength);
        pen.setAttribute("transform", `translate(${pt.x}, ${pt.y})`);
      } catch {
        // path may have been removed
      }

      // Fade in at start, fade out at end
      if (t < 0.03) pen.style.opacity = String(t / 0.03);
      else if (t > 0.9) pen.style.opacity = String(Math.max(0, 1 - (t - 0.9) / 0.1));
      else pen.style.opacity = "1";

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        pen.style.opacity = "0";
        try {
          if (tempPath.parentNode) hostGroup.removeChild(tempPath);
        } catch {
          // ignore
        }
      }
    }

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      try {
        if (tempPath.parentNode) hostGroup.removeChild(tempPath);
      } catch {
        // ignore
      }
    };
  }, [d, delay, duration]);

  return (
    <g ref={penRef} style={{ opacity: 0 }}>
      {/* Marker pen shape - tilted as if held by hand */}
      <g transform="rotate(-32)">
        {/* Pen body */}
        <rect x="-2.5" y="-24" width="5" height="18" rx="1.5" fill="#A0A0A0" />
        {/* Pen grip / tip section */}
        <rect x="-2.5" y="-7" width="5" height="7" rx="1" fill="#555" />
        {/* Writing tip */}
        <circle r="2" cy="1" fill="#222" />
      </g>
    </g>
  );
}

/* ─── ANIMATED PATH ──────────────────────────────────────
   SVG path that draws itself with framer-motion pathLength.
   Optionally shows a pen cursor following the stroke.
──────────────────────────────────────────────────────────── */
export function AnimatedPath({
  d,
  delay = 0,
  duration = 1.0,
  stroke = "#111",
  strokeWidth = 2.5,
  fill = "none",
  opacity = 1,
  showPen = true,
}) {
  if (!d) return null;

  return (
    <g>
      <motion.path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity }}
        transition={{
          pathLength: { duration, delay, ease: "easeInOut" },
          opacity: { duration: 0.01, delay },
        }}
      />
      {showPen && <PenMarker d={d} delay={delay} duration={duration} />}
    </g>
  );
}

/* ─── ANIMATED TEXT ───────────────────────────────────────
   Text with fade-in animation and optional line wrapping.
──────────────────────────────────────────────────────────── */
export function AnimatedText({
  x,
  y,
  children,
  delay = 0,
  fontSize = 24,
  fontFamily = "Caveat, cursive",
  fill = "#111",
  fontWeight = 400,
  textAnchor = "start",
  maxWidth,
  lineHeight,
}) {
  const text = typeof children === "string" ? children : "";

  if (maxWidth && text.length > maxWidth) {
    const lines = wrapText(text, maxWidth);
    const lh = lineHeight || fontSize * 1.3;
    return (
      <motion.text
        x={x}
        y={y}
        fill={fill}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        textAnchor={textAnchor}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        {lines.map((line, i) => (
          <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>
            {line}
          </tspan>
        ))}
      </motion.text>
    );
  }

  return (
    <motion.text
      x={x}
      y={y}
      fill={fill}
      fontSize={fontSize}
      fontFamily={fontFamily}
      fontWeight={fontWeight}
      textAnchor={textAnchor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.text>
  );
}

/* ─── ANIMATED GROUP ─────────────────────────────────────
   Wrapper that fades in its children.
──────────────────────────────────────────────────────────── */
export function AnimatedGroup({ children, delay = 0, duration = 0.4 }) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.g>
  );
}

/* ─── HELPERS ────────────────────────────────────────────── */
function wrapText(text, maxChars = 40) {
  if (!text) return [""];
  const words = text.split(" ");
  const lines = [];
  let current = "";

  words.forEach((word) => {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  });
  if (current) lines.push(current);
  return lines;
}
