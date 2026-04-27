import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, BookOpen, Zap, Layers, Search, Plus, GripVertical } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Node, NodeType } from '../data/knowledgeMap';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TreeProps {
  onNodeClick: (node: Node) => void;
  onAddNode: (l1: string, l2: string) => void;
  nodes: Node[];
  l1Order: string[];
  onL1OrderChange: (newOrder: string[]) => void;
}

interface SortableItemProps {
  l1: string;
  nodes: Node[];
  filteredNodes: Node[];
  expandedL1: string[];
  expandedL2: string[];
  searchQuery: string;
  toggleL1: (l1: string) => void;
  toggleL2: (l2: string) => void;
  onAddNode: (l1: string, l2: string) => void;
  onNodeClick: (node: Node) => void;
  getTypeLabel: (type: NodeType) => string;
  getTypeIcon: (type: NodeType) => React.ReactNode;
  getTypeColor: (type: NodeType) => string;
}

function SortableL1({
  l1,
  nodes,
  filteredNodes,
  expandedL1,
  expandedL2,
  searchQuery,
  toggleL1,
  toggleL2,
  onAddNode,
  onNodeClick,
  getTypeLabel,
  getTypeIcon,
  getTypeColor,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: l1 });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const l2Categories = Array.from(new Set(nodes.filter(n => n.l1 === l1).map(n => n.l2)));
  const isL1Expanded = expandedL1.includes(l1) || searchQuery.length > 0;

  return (
    <div ref={setNodeRef} style={style} className="space-y-2 select-none">
      <div className="group flex items-center gap-1 hover:bg-gray-50 rounded-md transition-colors pr-2">
        <button
          className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => toggleL1(l1)}
          className="flex-1 flex items-center gap-2 py-1 text-left"
        >
          <div className={`transition-transform duration-200 ${isL1Expanded ? 'rotate-90' : ''}`}>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-[13px] font-black text-slate-800 tracking-tight">{l1}</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isL1Expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3 ml-2 border-l-2 border-slate-100 pl-3"
          >
            {l2Categories.map((l2) => {
              const children = filteredNodes.filter(n => n.l1 === l1 && n.l2 === l2);
              if (children.length === 0) return null;

              const isL2Expanded = expandedL2.includes(l2) || searchQuery.length > 0;

              return (
                <div key={l2} className="space-y-1">
                  <div className="w-full flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-md transition-colors text-left group">
                    <button
                      onClick={() => toggleL2(l2)}
                      className="flex items-center gap-2 flex-1"
                    >
                      <div className={`transition-transform duration-200 ${isL2Expanded ? 'rotate-90' : ''}`}>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 tracking-tight">{l2}</span>
                      <span className="text-[10px] text-slate-300 font-bold">{children.length}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddNode(l1, l2);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="在当前分类下新增知识点"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isL2Expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-0.5 ml-3 border-l border-gray-100 pl-2 py-0.5"
                      >
                        {children.map((node) => (
                          <button
                            key={node.id}
                            onClick={() => onNodeClick(node)}
                            className="w-full flex items-center gap-3 p-1.5 hover:bg-indigo-50/50 rounded-md transition-all text-left group border border-transparent hover:border-indigo-100"
                          >
                            <div className={`p-1 rounded shrink-0 ${getTypeColor(node.type)} flex items-center gap-1`}>
                              {getTypeIcon(node.type)}
                              <span className="text-[8px] font-bold leading-none">{getTypeLabel(node.type)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-bold text-slate-600 truncate group-hover:text-indigo-600">{node.name}</h4>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function KnowledgeTree({ onNodeClick, onAddNode, nodes, l1Order, onL1OrderChange }: TreeProps) {
  const [expandedL1, setExpandedL1] = useState<string[]>(['函数的概念与性质', '指数函数与对数函数']);
  const [expandedL2, setExpandedL2] = useState<string[]>(['函数的概念', '单调性', '指数', '指数函数']);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Allow click without drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleL1 = (l1: string) => {
    setExpandedL1(prev =>
      prev.includes(l1) ? prev.filter(item => item !== l1) : [...prev, l1]
    );
  };

  const toggleL2 = (l2: string) => {
    setExpandedL2(prev =>
      prev.includes(l2) ? prev.filter(item => item !== l2) : [...prev, l2]
    );
  };

  const filteredNodes = nodes.filter(n =>
    n.name.includes(searchQuery) || n.definition.includes(searchQuery)
  );

  const allL1s = useMemo(() => Array.from(new Set(nodes.map(n => n.l1))), [nodes]);

  const orderedL1s = useMemo(() => {
    const ordered = l1Order.filter(l1 => allL1s.includes(l1));
    const remaining = allL1s.filter(l1 => !l1Order.includes(l1));
    return [...ordered, ...remaining];
  }, [allL1s, l1Order]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedL1s.indexOf(active.id as string);
      const newIndex = orderedL1s.indexOf(over.id as string);
      const newOrder = arrayMove(orderedL1s, oldIndex, newIndex);
      onL1OrderChange(newOrder);
    }
  };

  const getTypeIcon = (type: NodeType) => {
    switch (type) {
      case 'Concept': return <BookOpen className="w-3 h-3" />;
      case 'Rule': return <Zap className="w-3 h-3" />;
      case 'Representation': return <Layers className="w-3 h-3" />;
    }
  };

  const getTypeLabel = (type: NodeType) => {
    switch (type) {
      case 'Concept': return '概';
      case 'Rule': return '规';
      case 'Representation': return '表';
    }
  };

  const getTypeColor = (type: NodeType) => {
    switch (type) {
      case 'Concept': return 'text-indigo-600 bg-indigo-50';
      case 'Rule': return 'text-orange-600 bg-orange-50';
      case 'Representation': return 'text-emerald-600 bg-emerald-50';
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="在结构中搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedL1s}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {orderedL1s.map((l1) => (
                <SortableL1
                  key={l1}
                  l1={l1}
                  nodes={nodes}
                  filteredNodes={filteredNodes}
                  expandedL1={expandedL1}
                  expandedL2={expandedL2}
                  searchQuery={searchQuery}
                  toggleL1={toggleL1}
                  toggleL2={toggleL2}
                  onAddNode={onAddNode}
                  onNodeClick={onNodeClick}
                  getTypeIcon={getTypeIcon}
                  getTypeLabel={getTypeLabel}
                  getTypeColor={getTypeColor}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
