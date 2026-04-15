import { motion } from 'framer-motion';
import { GripVertical, X, MessageSquare, Lightbulb, HelpCircle, Zap, BookOpen } from 'lucide-react';

const CATEGORY_CONFIG = {
  topic: { icon: BookOpen, class: 'node-topic', color: '#002FA7', label: 'TOPIC' },
  concept: { icon: Lightbulb, class: 'node-concept', color: '#7C3AED', label: 'CONCEPT' },
  example: { icon: MessageSquare, class: 'node-example', color: '#059669', label: 'EXAMPLE' },
  question: { icon: HelpCircle, class: 'node-question', color: '#D97706', label: 'QUESTION' },
  action: { icon: Zap, class: 'node-action', color: '#FF3B30', label: 'ACTION' },
};

export default function NodeCard({ node, onDrag, onRemove, canvasOffset }) {
  const config = CATEGORY_CONFIG[node.category] || CATEGORY_CONFIG.topic;
  const Icon = config.icon;

  return (
    <motion.div
      data-testid={`node-card-${node.id}`}
      className={`absolute min-w-[200px] max-w-[280px] bg-white border-2 border-zinc-900 p-0 shadow-[4px_4px_0_0_#18181b] cursor-grab active:cursor-grabbing active:shadow-[2px_2px_0_0_#18181b] active:translate-x-[2px] active:translate-y-[2px] transition-shadow duration-75 select-none ${config.class}`}
      style={{ left: node.x, top: node.y, zIndex: 10 }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      drag
      dragMomentum={false}
      onDrag={(e, info) => {
        if (onDrag) {
          onDrag(node.id, {
            x: node.x + info.delta.x,
            y: node.y + info.delta.y
          });
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-zinc-100">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-zinc-300" />
          <span
            className="text-[10px] font-mono font-medium uppercase tracking-[0.2em]"
            style={{ color: config.color }}
          >
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Icon size={14} style={{ color: config.color }} />
          {onRemove && (
            <button
              data-testid={`remove-node-${node.id}`}
              onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}
              className="ml-1 p-0.5 text-zinc-300 hover:text-zinc-900 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <h3 className="text-base font-semibold tracking-tight leading-none text-zinc-900 mb-1.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {node.title}
        </h3>
        <p className="text-xs text-zinc-600 leading-relaxed font-mono">
          {node.content}
        </p>
      </div>
    </motion.div>
  );
}
