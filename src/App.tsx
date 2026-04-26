/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { Info, Search, X, BookOpen, Layers, Zap, Network, LayoutGrid, ListTree, Download, Upload, Trash2 } from 'lucide-react';
import React, { useState, useMemo, useRef } from 'react';
import KnowledgeGraph from './components/KnowledgeGraph';
import KnowledgeTree from './components/KnowledgeTree';
import { Node, NODES, RELATIONS, Relation } from './data/knowledgeMap';
import { exportToCSV, parseCSV } from './lib/csvUtils';

export default function App() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>(NODES);
  const [relations, setRelations] = useState<Relation[]>(RELATIONS);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const relationInputRef = useRef<HTMLInputElement>(null);

  const nodeStats = useMemo(() => {
    return {
      Concept: nodes.filter(n => n.type === 'Concept').length,
      Rule: nodes.filter(n => n.type === 'Rule').length,
      Representation: nodes.filter(n => n.type === 'Representation').length,
    };
  }, [nodes]);

  const relatedNodes = useMemo(() => {
    if (!selectedNode) return [];
    
    return relations
      .filter(r => r.source === selectedNode.id || r.target === selectedNode.id)
      .map(r => {
        const isSource = r.source === selectedNode.id;
        const otherId = isSource ? r.target : r.source;
        const node = nodes.find(n => n.id === otherId);
        if (!node) return null;
        
        return {
          node,
          relationType: r.relation,
          isForward: isSource, // Source to Target
          description: r.description
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [selectedNode, nodes, relations]);

  const handleExportNodes = () => {
    exportToCSV(nodes, 'knowledge_nodes.csv');
  };

  const handleExportRelations = () => {
    exportToCSV(relations, 'knowledge_relations.csv');
  };

  const handleImportNodes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const importedNodes = await parseCSV<Node>(file);
        if (confirm('是否覆盖当前所有知识点？点击“取消”将追加导入。')) {
          setNodes(importedNodes);
        } else {
          setNodes(prev => {
            const newNodes = [...prev];
            importedNodes.forEach(innd => {
              if (!newNodes.find(pnd => pnd.id === innd.id)) {
                newNodes.push(innd);
              }
            });
            return newNodes;
          });
        }
      } catch (error) {
        alert('导入失败，请检查文件格式。');
      }
      e.target.value = '';
    }
  };

  const handleImportRelations = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const importedRelations = await parseCSV<Relation>(file);
        if (confirm('是否覆盖当前所有关联关系？点击“取消”将追加导入。')) {
          setRelations(importedRelations);
        } else {
          setRelations(prev => [...prev, ...importedRelations]);
        }
      } catch (error) {
        alert('导入失败，请检查文件格式。');
      }
      e.target.value = '';
    }
  };

  const getRelationStyle = (type: any, isForward: boolean) => {
    switch(type) {
      case 'belongs_to': 
        return { 
          color: 'text-indigo-600', 
          bg: 'bg-indigo-600', 
          line: 'solid', 
          label: isForward ? '父级概念' : '包含子项',
          desc: isForward ? '当前知识点隶属于此分类' : '此分类下包含的原子知识点'
        };
      case 'prerequisite_of': 
        return { 
          color: 'text-amber-600', 
          bg: 'bg-amber-600', 
          line: 'solid', 
          label: isForward ? '后续延伸' : '前置基础',
          desc: isForward ? '基于此知识点进一步推导产生' : '学习此篇章必备的先修知识'
        };
      case 'related_to': 
        return { 
          color: 'text-emerald-600', 
          bg: 'bg-emerald-600', 
          line: 'dashed', 
          label: '横向关联',
          desc: '知识点间存在性质交叉或对比关系'
        };
      default: 
        return { color: 'text-slate-600', bg: 'bg-slate-600', line: 'solid', label: '关联', desc: '' };
    }
  };

  const handleNodeSelect = (node: Node) => {
    setSelectedNode(node);
    setFocusedNodeId(node.id);
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Left Sidebar: Knowledge structure tree */}
      <aside className="w-80 border-r border-gray-100 flex flex-col bg-white shadow-[1px_0_10px_rgba(30,41,59,0.02)] z-10">
        <div className="p-5 border-b border-gray-50 bg-white">
          <h1 className="text-lg font-bold tracking-tight text-indigo-600 flex items-center gap-2">
            <Network className="w-5 h-5" />
            知识图谱
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">高中数学 · 函数的概念与性质</p>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <KnowledgeTree onNodeClick={handleNodeSelect} nodes={nodes} />
        </div>

        <div className="p-4 border-t border-gray-50 bg-gray-50/30 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
            >
              <Upload className="w-3 h-3" /> 导入知识点
            </button>
            <button 
              onClick={handleExportNodes}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
            >
              <Download className="w-3 h-3" /> 导出知识点
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => relationInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-emerald-200 hover:text-emerald-600 transition-all shadow-sm"
            >
              <Upload className="w-3 h-3" /> 导入关系
            </button>
            <button 
              onClick={handleExportRelations}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-emerald-200 hover:text-emerald-600 transition-all shadow-sm"
            >
              <Download className="w-3 h-3" /> 导出关系
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportNodes} 
            accept=".csv" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={relationInputRef} 
            onChange={handleImportRelations} 
            accept=".csv" 
            className="hidden" 
          />
        </div>
          
        <div className="p-4 border-t border-gray-50 grid grid-cols-3 gap-2 bg-gray-50/30">
          <div className="text-center">
            <div className="text-[9px] text-slate-400 font-bold uppercase">概念</div>
            <div className="text-xs font-bold text-indigo-600">{nodeStats.Concept}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-slate-400 font-bold uppercase">规则</div>
            <div className="text-xs font-bold text-orange-600">{nodeStats.Rule}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-slate-400 font-bold uppercase">表示</div>
            <div className="text-xs font-bold text-emerald-600">{nodeStats.Representation}</div>
          </div>
        </div>
      </aside>

      {/* Main Area: Interactive Graph */}
      <main className="flex-1 relative bg-white overflow-hidden">
        <div className="absolute top-6 left-6 z-10 pointer-events-none">
          <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-gray-100 shadow-sm pointer-events-auto flex items-center gap-3">
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 rounded-full bg-indigo-700" /> 单调性
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 rounded-full bg-indigo-600" /> 奇偶性
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 rounded-full bg-indigo-500" /> 周期性
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 rounded-full bg-emerald-600" /> 对称性
             </div>
          </div>
        </div>

        <KnowledgeGraph 
          onNodeClick={handleNodeSelect} 
          focusedNodeId={focusedNodeId} 
          nodes={nodes} 
          relations={relations} 
        />
      </main>

      {/* Right Sidebar: Details & Relations */}
      <AnimatePresence>
        {selectedNode && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[380px] bg-white border-l border-gray-100 shadow-2xl z-20 flex flex-col"
          >
            <div className="p-6 border-b border-gray-50 flex items-start justify-between">
              <div className="space-y-1">
                <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                  selectedNode.type === 'Concept' ? 'bg-indigo-50 text-indigo-600' :
                  selectedNode.type === 'Rule' ? 'bg-orange-50 text-orange-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  {selectedNode.type === 'Concept' ? 'Concept' : selectedNode.type === 'Rule' ? 'Rule' : 'Representation'}
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800">{selectedNode.name}</h2>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">定义与描述</h3>
                <div className="p-5 bg-gray-50 rounded-xl text-sm text-slate-600 leading-relaxed border border-gray-100/50 shadow-inner">
                  {selectedNode.definition}
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 border border-gray-100/50 rounded-lg">
                  <div className="text-[9px] font-bold uppercase text-slate-400 mb-1">层级 (L2)</div>
                  <div className="text-xs font-bold text-slate-700">{selectedNode.l2}</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100/50 rounded-lg">
                  <div className="text-[9px] font-bold uppercase text-slate-400 mb-1">节点 ID</div>
                  <div className="text-xs font-bold text-slate-700 font-mono">{selectedNode.id}</div>
                </div>
              </div>

              <div className="space-y-6">
                {relatedNodes.length > 0 ? (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">关联知识点</h3>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-0.5 bg-indigo-500 rounded-full" />
                          <span className="text-[9px] text-slate-400">隶属 (层级)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-0.5 bg-amber-500 rounded-full" />
                          <span className="text-[9px] text-slate-400">推导演进</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-0.5 border-b border-dashed border-emerald-500" />
                          <span className="text-[9px] text-slate-400">横向关联</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {relatedNodes.map(({ node: n, relationType, isForward }) => {
                        const style = getRelationStyle(relationType, isForward);
                        return (
                          <button 
                            key={n.id} 
                            onClick={() => handleNodeSelect(n)} 
                            className="w-full group relative flex flex-col p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 hover:shadow-sm transition-all text-left overflow-hidden"
                          >
                            {/* Line indicator */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bg}`} />
                            
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-tighter ${style.color}`}>
                                  {style.label}
                                </span>
                                <span className="text-[8px] text-slate-400 font-medium">{style.desc}</span>
                              </div>
                              {style.line === 'dashed' && (
                                <div className="flex gap-1">
                                  <div className="w-1 h-1 rounded-full bg-emerald-400/50" />
                                  <div className="w-1 h-1 rounded-full bg-emerald-400/50" />
                                  <div className="w-1 h-1 rounded-full bg-emerald-400/50" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{n.name}</span>
                              <div className={`p-1 rounded text-[8px] font-bold ${
                                n.type === 'Concept' ? 'bg-indigo-50 text-indigo-600' :
                                n.type === 'Rule' ? 'bg-orange-50 text-orange-600' :
                                'bg-emerald-50 text-emerald-600'
                              }`}>
                                {n.type[0]}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : (
                  <section className="py-10 text-center space-y-2">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <Network className="w-5 h-5 text-slate-200" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">无直接关联节点</p>
                  </section>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Graph Engine v1</span>
              <span className="text-slate-300">© AI Studio</span>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
