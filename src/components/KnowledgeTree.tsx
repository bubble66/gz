import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, BookOpen, Zap, Layers, Search } from 'lucide-react';
import { useState } from 'react';
import { Node, NodeType } from '../data/knowledgeMap';

interface TreeProps {
  onNodeClick: (node: Node) => void;
  nodes: Node[];
}

export default function KnowledgeTree({ onNodeClick, nodes }: TreeProps) {
  const [expandedL1, setExpandedL1] = useState<string[]>(['函数的概念与性质']);
  const [expandedL2, setExpandedL2] = useState<string[]>(['函数的概念', '单调性']);
  const [searchQuery, setSearchQuery] = useState('');

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

  const l1Categories = Array.from(new Set(nodes.map(n => n.l1)));

  const getTypeIcon = (type: NodeType) => {
    switch (type) {
      case 'Concept': return <BookOpen className="w-3 h-3" />;
      case 'Rule': return <Zap className="w-3 h-3" />;
      case 'Representation': return <Layers className="w-3 h-3" />;
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
        <div className="space-y-4">
          {l1Categories.map((l1) => {
            const l2Categories = Array.from(new Set(nodes.filter(n => n.l1 === l1).map(n => n.l2)));
            const isL1Expanded = expandedL1.includes(l1) || searchQuery.length > 0;

            return (
              <div key={l1} className="space-y-2">
                <button
                  onClick={() => toggleL1(l1)}
                  className="w-full flex items-center gap-2 py-1 px-1 hover:bg-gray-50 rounded-md transition-colors text-left"
                >
                  <div className={`transition-transform duration-200 ${isL1Expanded ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="text-[13px] font-black text-slate-800 tracking-tight">{l1}</span>
                </button>

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
                            <button
                              onClick={() => toggleL2(l2)}
                              className="w-full flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-md transition-colors text-left group"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`transition-transform duration-200 ${isL2Expanded ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-600 tracking-tight">{l2}</span>
                                <span className="text-[10px] text-slate-300 font-bold">{children.length}</span>
                              </div>
                            </button>

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
                                      <div className={`p-1 rounded shrink-0 ${getTypeColor(node.type)}`}>
                                        {getTypeIcon(node.type)}
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
          })}
        </div>
      </div>
    </div>
  );
}
