import { useMemo } from "react";
import { AnimatedPath, AnimatedText, AnimatedGroup } from "./AnimatedElements";
import {
  createRng,
  roughLine,
  roughRect,
  roughUnderline,
  roughCheckmark,
  roughCross,
  roughArrowPath,
} from "@/lib/roughPaths";
import { illustrations } from "@/lib/illustrations";

const MX = 60;
const CW = 780;

function wrapText(text, maxChars = 42) {
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

/* ─── ILLUSTRATION RENDERER ───────────────────────────── */
function IllustrationRenderer({ name, x, y, size = 70, baseDelay = 0.2 }) {
  const illust = illustrations[name];
  if (!illust) return null;

  const [, , vw, vh] = illust.viewBox.split(" ").map(Number);
  const scale = size / Math.max(vw, vh);

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity="0.8">
      {illust.paths.map((pathD, i) => (
        <AnimatedPath
          key={i}
          d={pathD}
          delay={baseDelay + i * 0.3}
          duration={0.8}
          strokeWidth={2.5 / scale}
          stroke="#555"
          showPen={true}
        />
      ))}
    </g>
  );
}

/* ─── TITLE SCENE ─────────────────────────────────────── */
function TitleScene({ data, rng }) {
  const title = data.title || "Untitled";
  const subtitle = data.subtitle || "";
  const titleWidth = Math.min(title.length * 22, CW);
  const hasIllustration = data.illustration && illustrations[data.illustration];

  return (
    <>
      {hasIllustration && (
        <IllustrationRenderer
          name={data.illustration}
          x={720}
          y={5}
          size={90}
          baseDelay={0.1}
        />
      )}
      <AnimatedText
        x={hasIllustration ? 400 : 450}
        y={50}
        fontSize={42}
        fontWeight={600}
        textAnchor="middle"
        delay={0.3}
      >
        {title}
      </AnimatedText>
      <AnimatedPath
        d={roughUnderline(
          (hasIllustration ? 400 : 450) - titleWidth / 2,
          62,
          titleWidth,
          rng,
          3
        )}
        delay={0.8}
        duration={0.8}
        strokeWidth={3}
        showPen={true}
      />
      {subtitle && (
        <AnimatedText
          x={hasIllustration ? 400 : 450}
          y={95}
          fontSize={22}
          fill="#52525B"
          textAnchor="middle"
          delay={1.1}
        >
          {subtitle}
        </AnimatedText>
      )}
    </>
  );
}

/* ─── PROBLEM FRAME SCENE ─────────────────────────────── */
function ProblemFrameScene({ data, rng }) {
  const question = data.question || "";
  const context = data.context || "";
  const hasIllustration = data.illustration && illustrations[data.illustration];

  return (
    <>
      <AnimatedPath
        d={roughRect(MX, 10, hasIllustration ? CW - 100 : CW, 130, rng, 2)}
        delay={0.1}
        duration={1.2}
        strokeWidth={2}
        stroke="#0055FF"
        showPen={true}
      />
      {hasIllustration && (
        <IllustrationRenderer
          name={data.illustration}
          x={720}
          y={20}
          size={75}
          baseDelay={0.2}
        />
      )}
      <AnimatedText
        x={80}
        y={35}
        fontSize={14}
        fill="#0055FF"
        fontFamily="Outfit, sans-serif"
        fontWeight={600}
        delay={0.3}
      >
        PROBLEM
      </AnimatedText>
      <AnimatedText x={80} y={72} fontSize={28} fontWeight={600} delay={0.6} maxWidth={hasIllustration ? 32 : 38} lineHeight={34}>
        {question}
      </AnimatedText>
      {context && (
        <AnimatedText x={80} y={115} fontSize={18} fill="#52525B" delay={1.0} maxWidth={hasIllustration ? 40 : 50}>
          {context}
        </AnimatedText>
      )}
    </>
  );
}

/* ─── COMPARISON SCENE ────────────────────────────────── */
function ComparisonScene({ data, rng }) {
  const title = data.title || "Comparison";
  const options = data.options || [];
  const colCount = Math.min(options.length, 3);
  const hasIllustration = data.illustration && illustrations[data.illustration];
  const usableWidth = hasIllustration ? CW - 100 : CW;
  const colWidth = usableWidth / colCount;

  return (
    <>
      {hasIllustration && (
        <IllustrationRenderer
          name={data.illustration}
          x={720}
          y={0}
          size={70}
          baseDelay={0.1}
        />
      )}
      <AnimatedText x={MX} y={30} fontSize={14} fill="#A1A1AA" fontFamily="Outfit, sans-serif" fontWeight={600} delay={0.1}>
        COMPARISON
      </AnimatedText>
      <AnimatedText x={MX} y={62} fontSize={28} fontWeight={600} delay={0.2}>
        {title}
      </AnimatedText>
      <AnimatedPath
        d={roughLine(MX, 75, MX + usableWidth, 75, rng, 1)}
        delay={0.4}
        duration={0.6}
        stroke="#D4D4D8"
        showPen={false}
      />

      {options.map((opt, oi) => {
        const colX = MX + oi * colWidth;
        const baseDelay = 0.5 + oi * 0.3;

        return (
          <AnimatedGroup key={oi} delay={baseDelay}>
            {oi > 0 && (
              <AnimatedPath
                d={roughLine(colX, 80, colX, 75 + ((opt.points || []).length + 1) * 34, rng, 1)}
                delay={baseDelay}
                duration={0.5}
                stroke="#E4E4E7"
                strokeWidth={1.5}
                showPen={false}
              />
            )}
            <AnimatedText x={colX + 16} y={105} fontSize={22} fontWeight={600} fill="#0055FF" delay={baseDelay + 0.1}>
              {opt.name}
            </AnimatedText>
            {(opt.points || []).map((pt, pi) => (
              <AnimatedGroup key={pi} delay={baseDelay + 0.2 + pi * 0.15}>
                <AnimatedPath
                  d={`M ${colX + 18} ${125 + pi * 34} L ${colX + 24} ${125 + pi * 34}`}
                  delay={baseDelay + 0.2 + pi * 0.15}
                  duration={0.2}
                  strokeWidth={3}
                  stroke="#111"
                  showPen={false}
                />
                <AnimatedText
                  x={colX + 32}
                  y={130 + pi * 34}
                  fontSize={18}
                  fill="#52525B"
                  delay={baseDelay + 0.25 + pi * 0.15}
                  maxWidth={Math.floor((colWidth - 40) / 10)}
                >
                  {pt}
                </AnimatedText>
              </AnimatedGroup>
            ))}
          </AnimatedGroup>
        );
      })}
    </>
  );
}

/* ─── PROS & CONS SCENE ───────────────────────────────── */
function ProsConsScene({ data, rng }) {
  const title = data.title || "Pros & Cons";
  const pros = data.pros || [];
  const cons = data.cons || [];
  const hasIllustration = data.illustration && illustrations[data.illustration];
  const halfW = (hasIllustration ? CW - 100 : CW) / 2;

  return (
    <>
      {hasIllustration && (
        <IllustrationRenderer name={data.illustration} x={720} y={0} size={70} baseDelay={0.1} />
      )}
      <AnimatedText x={MX} y={30} fontSize={14} fill="#A1A1AA" fontFamily="Outfit, sans-serif" fontWeight={600} delay={0.1}>
        PROS & CONS
      </AnimatedText>
      <AnimatedText x={MX} y={62} fontSize={28} fontWeight={600} delay={0.2}>
        {title}
      </AnimatedText>
      <AnimatedPath d={roughLine(MX, 75, MX + halfW * 2, 75, rng, 1)} delay={0.4} duration={0.5} stroke="#D4D4D8" showPen={false} />
      <AnimatedPath
        d={roughLine(MX + halfW, 80, MX + halfW, 80 + Math.max(pros.length, cons.length) * 34 + 30, rng, 1)}
        delay={0.5}
        duration={0.6}
        stroke="#E4E4E7"
        strokeWidth={1.5}
        showPen={false}
      />

      <AnimatedText x={MX + 16} y={105} fontSize={20} fontWeight={600} fill="#22C55E" delay={0.5}>
        Pros
      </AnimatedText>
      {pros.map((pro, i) => (
        <AnimatedGroup key={`pro-${i}`} delay={0.6 + i * 0.15}>
          <AnimatedPath d={roughCheckmark(MX + 16, 118 + i * 34, 14)} delay={0.65 + i * 0.15} duration={0.3} stroke="#22C55E" strokeWidth={2.5} showPen={true} />
          <AnimatedText x={MX + 38} y={132 + i * 34} fontSize={17} fill="#3F3F46" delay={0.7 + i * 0.15} maxWidth={20}>
            {pro}
          </AnimatedText>
        </AnimatedGroup>
      ))}

      <AnimatedText x={MX + halfW + 16} y={105} fontSize={20} fontWeight={600} fill="#E63946" delay={0.5}>
        Cons
      </AnimatedText>
      {cons.map((con, i) => (
        <AnimatedGroup key={`con-${i}`} delay={0.6 + i * 0.15}>
          <AnimatedPath d={roughCross(MX + halfW + 16, 118 + i * 34, 14)} delay={0.65 + i * 0.15} duration={0.3} stroke="#E63946" strokeWidth={2.5} showPen={true} />
          <AnimatedText x={MX + halfW + 38} y={132 + i * 34} fontSize={17} fill="#3F3F46" delay={0.7 + i * 0.15} maxWidth={20}>
            {con}
          </AnimatedText>
        </AnimatedGroup>
      ))}
    </>
  );
}

/* ─── CHECKLIST SCENE ─────────────────────────────────── */
function ChecklistScene({ data, rng }) {
  const title = data.title || "Checklist";
  const items = data.items || [];
  const hasIllustration = data.illustration && illustrations[data.illustration];

  return (
    <>
      {hasIllustration && (
        <IllustrationRenderer name={data.illustration} x={720} y={0} size={70} baseDelay={0.1} />
      )}
      <AnimatedText x={MX} y={30} fontSize={14} fill="#A1A1AA" fontFamily="Outfit, sans-serif" fontWeight={600} delay={0.1}>
        CHECKLIST
      </AnimatedText>
      <AnimatedText x={MX} y={62} fontSize={28} fontWeight={600} delay={0.2}>
        {title}
      </AnimatedText>
      <AnimatedPath d={roughLine(MX, 75, MX + 300, 75, rng, 1)} delay={0.3} duration={0.4} stroke="#D4D4D8" showPen={false} />

      {items.map((item, i) => {
        const iy = 95 + i * 40;
        const isChecked = item.checked;
        return (
          <AnimatedGroup key={i} delay={0.4 + i * 0.2}>
            <AnimatedPath d={roughRect(MX + 10, iy, 20, 20, rng, 1)} delay={0.45 + i * 0.2} duration={0.3} strokeWidth={2} stroke={isChecked ? "#22C55E" : "#D4D4D8"} showPen={true} />
            {isChecked && (
              <AnimatedPath d={roughCheckmark(MX + 12, iy + 2, 16)} delay={0.55 + i * 0.2} duration={0.3} stroke="#22C55E" strokeWidth={2.5} showPen={true} />
            )}
            {!isChecked && (
              <AnimatedPath d={roughCross(MX + 13, iy + 3, 14)} delay={0.55 + i * 0.2} duration={0.3} stroke="#E63946" strokeWidth={2} showPen={true} />
            )}
            <AnimatedText x={MX + 42} y={iy + 16} fontSize={19} fill={isChecked ? "#3F3F46" : "#A1A1AA"} delay={0.5 + i * 0.2} maxWidth={40}>
              {item.text}
            </AnimatedText>
          </AnimatedGroup>
        );
      })}
    </>
  );
}

/* ─── SCORECARD SCENE ─────────────────────────────────── */
function ScorecardScene({ data, rng }) {
  const title = data.title || "Scorecard";
  const criteria = data.criteria || [];
  const options = data.options || [];
  const colW = CW / (options.length + 1);
  const rowH = 42;

  return (
    <>
      <AnimatedText x={MX} y={30} fontSize={14} fill="#A1A1AA" fontFamily="Outfit, sans-serif" fontWeight={600} delay={0.1}>
        SCORECARD
      </AnimatedText>
      <AnimatedText x={MX} y={62} fontSize={28} fontWeight={600} delay={0.2}>
        {title}
      </AnimatedText>
      <AnimatedPath d={roughLine(MX, 80, MX + CW, 80, rng, 1)} delay={0.3} duration={0.5} strokeWidth={2} showPen={true} />

      {options.map((opt, oi) => (
        <AnimatedText key={`h-${oi}`} x={MX + colW * (oi + 1) + colW / 2} y={100} fontSize={18} fontWeight={600} fill="#0055FF" textAnchor="middle" delay={0.4 + oi * 0.1}>
          {opt.name}
        </AnimatedText>
      ))}
      <AnimatedPath d={roughLine(MX, 110, MX + CW, 110, rng, 1)} delay={0.5} duration={0.4} stroke="#D4D4D8" showPen={false} />

      {criteria.map((criterion, ci) => {
        const ry = 120 + ci * rowH;
        return (
          <AnimatedGroup key={ci} delay={0.6 + ci * 0.15}>
            <AnimatedText x={MX + 10} y={ry + 22} fontSize={17} fill="#52525B" delay={0.6 + ci * 0.15}>
              {criterion}
            </AnimatedText>
            {options.map((opt, oi) => {
              const score = (opt.scores || [])[ci] || 0;
              const isMax = options.every((o) => ((o.scores || [])[ci] || 0) <= score) && score > 0;
              return (
                <AnimatedText key={`s-${oi}`} x={MX + colW * (oi + 1) + colW / 2} y={ry + 22} fontSize={20} fontWeight={isMax ? 700 : 400} fill={isMax ? "#0055FF" : "#3F3F46"} textAnchor="middle" delay={0.65 + ci * 0.15 + oi * 0.05}>
                  {score}
                </AnimatedText>
              );
            })}
            {ci < criteria.length - 1 && (
              <AnimatedPath d={roughLine(MX, ry + 32, MX + CW, ry + 32, rng, 0.5)} delay={0.7 + ci * 0.15} duration={0.3} stroke="#F4F4F5" strokeWidth={1} showPen={false} />
            )}
          </AnimatedGroup>
        );
      })}

      {(() => {
        const totalsY = 120 + criteria.length * rowH;
        return (
          <AnimatedGroup delay={0.7 + criteria.length * 0.15}>
            <AnimatedPath d={roughLine(MX, totalsY, MX + CW, totalsY, rng, 1)} delay={0.7 + criteria.length * 0.15} duration={0.4} strokeWidth={2} showPen={true} />
            <AnimatedText x={MX + 10} y={totalsY + 26} fontSize={18} fontWeight={700} delay={0.8 + criteria.length * 0.15}>
              Total
            </AnimatedText>
            {options.map((opt, oi) => {
              const total = (opt.scores || []).reduce((a, b) => a + b, 0);
              const maxTotal = Math.max(...options.map((o) => (o.scores || []).reduce((a, b) => a + b, 0)));
              return (
                <AnimatedText key={`t-${oi}`} x={MX + colW * (oi + 1) + colW / 2} y={totalsY + 26} fontSize={22} fontWeight={700} fill={total === maxTotal ? "#0055FF" : "#3F3F46"} textAnchor="middle" delay={0.85 + criteria.length * 0.15 + oi * 0.05}>
                  {total}
                </AnimatedText>
              );
            })}
          </AnimatedGroup>
        );
      })()}
    </>
  );
}

/* ─── RECOMMENDATION SCENE ────────────────────────────── */
function RecommendationScene({ data, rng }) {
  const title = data.title || "Recommendation";
  const recommendation = data.recommendation || "";
  const reasons = data.key_reasons || [];
  const hasIllustration = data.illustration && illustrations[data.illustration];

  return (
    <>
      <AnimatedPath
        d={roughRect(MX, 10, CW, 80 + reasons.length * 32 + (hasIllustration ? 80 : 60), rng, 2)}
        delay={0.1}
        duration={1.2}
        strokeWidth={2.5}
        stroke="#0055FF"
        showPen={true}
      />
      {hasIllustration && (
        <IllustrationRenderer name={data.illustration} x={720} y={20} size={70} baseDelay={0.3} />
      )}
      <AnimatedPath
        d="M 80 30 L 84 42 L 96 42 L 86 50 L 90 62 L 80 54 L 70 62 L 74 50 L 64 42 L 76 42 Z"
        delay={0.3}
        duration={0.5}
        stroke="#0055FF"
        strokeWidth={2}
        fill="none"
        showPen={true}
      />
      <AnimatedText x={104} y={52} fontSize={14} fill="#0055FF" fontFamily="Outfit, sans-serif" fontWeight={600} delay={0.4}>
        {title.toUpperCase()}
      </AnimatedText>
      <AnimatedText x={80} y={92} fontSize={26} fontWeight={600} delay={0.6} maxWidth={hasIllustration ? 32 : 38} lineHeight={32}>
        {recommendation}
      </AnimatedText>

      {reasons.map((reason, i) => {
        const ry = 125 + i * 32;
        return (
          <AnimatedGroup key={i} delay={0.9 + i * 0.15}>
            <AnimatedPath d={`M ${MX + 20} ${ry + 6} L ${MX + 30} ${ry + 6}`} delay={0.9 + i * 0.15} duration={0.2} stroke="#0055FF" strokeWidth={2.5} showPen={false} />
            <AnimatedText x={MX + 38} y={ry + 12} fontSize={17} fill="#52525B" delay={0.95 + i * 0.15} maxWidth={38}>
              {reason}
            </AnimatedText>
          </AnimatedGroup>
        );
      })}
    </>
  );
}

/* ─── NOTES SCENE ─────────────────────────────────────── */
function NotesScene({ data, rng }) {
  const title = data.title || "Notes";
  const notes = data.notes || [];
  const hasIllustration = data.illustration && illustrations[data.illustration];

  return (
    <>
      {hasIllustration && (
        <IllustrationRenderer name={data.illustration} x={720} y={0} size={70} baseDelay={0.1} />
      )}
      <AnimatedText x={MX} y={30} fontSize={14} fill="#A1A1AA" fontFamily="Outfit, sans-serif" fontWeight={600} delay={0.1}>
        KEY NOTES
      </AnimatedText>
      <AnimatedText x={MX} y={62} fontSize={28} fontWeight={600} delay={0.2}>
        {title}
      </AnimatedText>
      <AnimatedPath d={roughLine(MX, 75, MX + 240, 75, rng, 1)} delay={0.3} duration={0.4} stroke="#D4D4D8" showPen={false} />

      {notes.map((note, i) => {
        const ny = 95 + i * 34;
        return (
          <AnimatedGroup key={i} delay={0.4 + i * 0.15}>
            <circle cx={MX + 18} cy={ny + 8} r={3.5} fill="#111" opacity={0.5} />
            <AnimatedText x={MX + 32} y={ny + 14} fontSize={18} fill="#3F3F46" delay={0.45 + i * 0.15} maxWidth={hasIllustration ? 36 : 42}>
              {note}
            </AnimatedText>
          </AnimatedGroup>
        );
      })}
    </>
  );
}

/* ─── PROCESS SCENE ───────────────────────────────────── */
function ProcessScene({ data, rng }) {
  const title = data.title || "Process";
  const steps = data.steps || [];
  const hasIllustration = data.illustration && illustrations[data.illustration];

  return (
    <>
      {hasIllustration && (
        <IllustrationRenderer name={data.illustration} x={720} y={0} size={70} baseDelay={0.1} />
      )}
      <AnimatedText x={MX} y={30} fontSize={14} fill="#A1A1AA" fontFamily="Outfit, sans-serif" fontWeight={600} delay={0.1}>
        PROCESS
      </AnimatedText>
      <AnimatedText x={MX} y={62} fontSize={28} fontWeight={600} delay={0.2}>
        {title}
      </AnimatedText>

      {steps.map((step, i) => {
        const sy = 90 + i * 72;
        const baseDelay = 0.3 + i * 0.25;

        return (
          <AnimatedGroup key={i} delay={baseDelay}>
            <AnimatedPath
              d={`M ${MX + 20} ${sy + 14} m -14 0 a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0`}
              delay={baseDelay}
              duration={0.4}
              stroke="#0055FF"
              strokeWidth={2}
              showPen={true}
            />
            <AnimatedText x={MX + 20} y={sy + 19} fontSize={16} fontWeight={700} fill="#0055FF" textAnchor="middle" fontFamily="Outfit, sans-serif" delay={baseDelay + 0.1}>
              {i + 1}
            </AnimatedText>
            <AnimatedText x={MX + 48} y={sy + 10} fontSize={20} fontWeight={600} delay={baseDelay + 0.15}>
              {step.label}
            </AnimatedText>
            <AnimatedText x={MX + 48} y={sy + 35} fontSize={16} fill="#71717A" delay={baseDelay + 0.2} maxWidth={hasIllustration ? 34 : 40}>
              {step.description}
            </AnimatedText>
            {i < steps.length - 1 && (
              <AnimatedPath
                d={roughArrowPath(MX + 20, sy + 32, MX + 20, sy + 60, rng).line}
                delay={baseDelay + 0.3}
                duration={0.3}
                stroke="#D4D4D8"
                strokeWidth={1.5}
                showPen={false}
              />
            )}
          </AnimatedGroup>
        );
      })}
    </>
  );
}

/* ─── SCENE RENDERER ──────────────────────────────────── */
export default function SceneRenderer({ scene, y, width, index }) {
  const rng = useMemo(() => createRng(index * 7 + 13), [index]);

  if (!scene || !scene.data) return null;

  const sceneComponents = {
    title: TitleScene,
    problem_frame: ProblemFrameScene,
    comparison: ComparisonScene,
    pros_cons: ProsConsScene,
    checklist: ChecklistScene,
    scorecard: ScorecardScene,
    recommendation: RecommendationScene,
    notes: NotesScene,
    process: ProcessScene,
  };

  const SceneComponent = sceneComponents[scene.scene_type];
  if (!SceneComponent) return null;

  return (
    <g transform={`translate(0, ${y})`} data-testid={`scene-${scene.scene_type}-${index}`}>
      <SceneComponent data={scene.data} rng={rng} />
    </g>
  );
}
