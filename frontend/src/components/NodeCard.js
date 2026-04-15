import { motion } from 'framer-motion';
import { GripVertical, X, MessageSquare, Lightbulb, HelpCircle, Zap, BookOpen } from 'lucide-react';

const CATEGORY_CONFIG = {
  topic:    { icon: BookOpen,       color: '#002FA7', bg: 'bg-blue-50/60',   label: 'TOPIC' },
  concept:  { icon: Lightbulb,      color: '#7C3AED', bg: 'bg-violet-50/60', label: 'CONCEPT' },
  example:  { icon: MessageSquare,  color: '#059669', bg: 'bg-emerald-50/60',label: 'EXAMPLE' },
  question: { icon: HelpCircle,     color: '#D97706', bg: 'bg-amber-50/60',  label: 'QUESTION' },
  action:   { icon: Zap,            color: '#FF3B30', bg: 'bg-red-50/60',    label: 'ACTION' },
};

export default function NodeCard({ node, onDrag, onRemove }) {
  const config = CATEGORY_CONFIG[node.category] || CATEGORY_CONFIG.topic;
  const Icon = config.icon;

  return (
    <motion.div
      data-testid={`node-card-${node.id}`}
      className="absolute min-w-[220px] max-w-[300px] bg-white border-2 border-zinc-900 select-none"
      style={{
        left: node.x,
        top: node.y,
        zIndex: 10,
        boxShadow: '4px 4px 0 0 #18181b',
        borderLeftWidth: '5px',
        borderLeftColor: config.color,
      }}
      initial={{ scale: 0.7, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28, delay: Math.random() * 0.15 }}
      drag
      dragMomentum={false}
      whileDrag={{
        boxShadow: '2px 2px 0 0 #18181b',
        scale: 1.02,
        cursor: 'grabbing',
      }}
      onDrag={(e, info) => {
        if (onDrag) {
          onDrag(node.id, {
            x: node.x + info.delta.x,
            y: node.y + info.delta.y,
          });
        }
      }}
    >
      {/* Category header */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b border-zinc-100 ${config.bg}`}>
        <div className="flex items-center gap-1.5">
          <Icon size={12} style={{ color: config.color }} />
          <span
            className="text-[9px] font-mono font-medium uppercase tracking-[0.2em] leading-none"
            style={{ color: config.color }}
          >
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <GripVertical size={12} className="text-zinc-300 cursor-grab" />
          {onRemove && (
            <button
              data-testid={`remove-node-${node.id}`}
              onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}
              className="p-0.5 text-zinc-300 hover:text-zinc-800 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <h3
          className="text-sm font-semibold tracking-tight leading-tight text-zinc-900 mb-1"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {node.title}
        </h3>
        <p className="text-[11px] text-zinc-600 leading-relaxed" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {node.content}
        </p>
      </div>
    </motion.div>
  );
}
