import { motion } from "framer-motion";

export function AnimatedPath({
  d,
  delay = 0,
  duration = 1.0,
  stroke = "#111",
  strokeWidth = 2.5,
  fill = "none",
  opacity = 1,
}) {
  return (
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
  );
}

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

  // Simple text wrapping
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

export function PenCursor({ x, y, delay = 0, duration = 1 }) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: duration + 0.5, delay, times: [0, 0.05, 0.8, 1] }}
    >
      <motion.circle
        cx={x}
        cy={y}
        r={3}
        fill="#0055FF"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.3, delay }}
      />
      <motion.circle
        cx={x}
        cy={y}
        r={8}
        fill="none"
        stroke="#0055FF"
        strokeWidth={1}
        opacity={0.3}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.5, 1] }}
        transition={{ duration: 0.4, delay }}
      />
    </motion.g>
  );
}

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
