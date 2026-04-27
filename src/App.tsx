/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { HelpCircle, Info, Search, X, BookOpen, Layers, Zap, Network, LayoutGrid, ListTree, Download, Upload, Trash2 } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import KnowledgeGraph from './components/KnowledgeGraph';
import KnowledgeTree from './components/KnowledgeTree';
import { Node, Relation } from './data/knowledgeMap';
import { exportToCSV, parseCSV } from './lib/csvUtils';
import { Plus, Edit2, Check, ArrowRight } from 'lucide-react';

export default function App() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [l1Order, setL1Order] = useState<string[]>([]);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [editingNodeData, setEditingNodeData] = useState<Partial<Node>>({});
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newRelationData, setNewRelationData] = useState<{target: string, targetName: string, isBrowsing?: boolean, type: string, desc: string}>({ target: '', targetName: '', isBrowsing: false, type: 'parent', desc: '' });
  const [isAddingRelation, setIsAddingRelation] = useState(false);
  const [showTypeInfo, setShowTypeInfo] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const relationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [nodesRes, relationsRes, orderRes] = await Promise.all([
        fetch('/api/nodes'),
        fetch('/api/relations'),
        fetch('/api/settings/l1Order')
      ]);
      const nodesData = await nodesRes.json();
      const relationsData = await relationsRes.json();
      const orderData = await orderRes.json();
      setNodes(nodesData);
      setRelations(relationsData);
      if (orderData) setL1Order(orderData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const saveL1Order = async (newOrder: string[]) => {
    setL1Order(newOrder);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'l1Order', value: newOrder })
      });
    } catch (err) {
      console.error('Failed to save L1 order:', err);
    }
  };

  const saveNode = async (nodeData: Node) => {
    const isNew = !nodes.find(n => n.id === nodeData.id);
    const method = isNew ? 'POST' : 'PUT';
    const url = isNew ? '/api/nodes' : `/api/nodes/${nodeData.id}`;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nodeData)
      });
      if (res.ok) {
        fetchData();
        return true;
      }
    } catch (err) {
      console.error('Failed to save node:', err);
    }
    return false;
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState<{source: string, relation: string, target: string} | null>(null);
  const [deleteConfirmationNode, setDeleteConfirmationNode] = useState<string | null>(null);

  const deleteNode = async (id: string) => {
    // Double confirmation logic
    if (deleteConfirmationNode !== id) {
      setDeleteConfirmationNode(id);
      setTimeout(() => setDeleteConfirmationNode(null), 3000);
      return;
    }

    setDeleteConfirmationNode(null);
    console.log('--- EXECUTING NODE DELETE ---', id);

    try {
      const res = await fetch('/api/nodes/delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      if (res.ok) {
        console.log('Node deleted successfully');
        if (selectedNode?.id === id) setSelectedNode(null);
        fetchData();
      } else {
        const err = await res.json();
        console.error('SERVER REJECTED NODE DELETE:', err);
        alert(`删除失败: ${err.error || '未知错误'}`);
      }
    } catch (err) {
      console.error('NETWORK ERROR IN NODE DELETE:', err);
    }
  };

  const saveRelation = async (relData: Relation) => {
    try {
      const res = await fetch('/api/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relData)
      });
      if (res.ok) {
        fetchData();
        return true;
      }
    } catch (err) {
      console.error('Failed to save relation:', err);
    }
    return false;
  };
  const deleteRelation = async (source: string, relation: string, target: string) => {
    // Basic validation
    if (!source || !relation || !target) return;
    
    // Check if this specific relation is already "armed" for deletion
    const isMatched = deleteConfirmation && 
                     deleteConfirmation.source === source && 
                     deleteConfirmation.relation === relation && 
                     deleteConfirmation.target === target;

    if (!isMatched) {
      // First click: "Arm" the button and set a timeout to cancel it
      setDeleteConfirmation({ source, relation, target });
      setTimeout(() => setDeleteConfirmation(null), 3000); // Reset after 3 seconds
      return;
    }

    // Second click: Perform the actual delete
    setDeleteConfirmation(null);
    console.log('--- EXECUTING VERIFIED DELETE ---');

    try {
      const res = await fetch('/api/relations/delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, relation, target })
      });
      
      const data = await res.json();
      console.log('Server response:', data);
      
      if (res.ok && data.success) {
        console.log('Delete confirmed. Refreshing metadata...');
        
        // Parallel fetching for performance
        const [nRes, rRes] = await Promise.all([
          fetch('/api/nodes'),
          fetch('/api/relations')
        ]);
        
        const updatedNodes = await nRes.json();
        const updatedRelations = await rRes.json();
        
        setNodes(updatedNodes);
        setRelations(updatedRelations);
        
        if (selectedNode) {
          const fresh = updatedNodes.find((n: Node) => n.id === selectedNode.id);
          if (fresh) setSelectedNode(fresh);
        }
      } else {
        console.error('SERVER REJECTED DELETE:', data.error || 'No matching record');
        // Console only, as alert might be blocked
      }
    } catch (err) {
      console.error('NETWORK ERROR IN DELETE:', err);
    }
  };

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

  const currentRelatedIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return new Set(relatedNodes.map(r => r.node.id));
  }, [relatedNodes, selectedNode]);

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
        const confirmMsg = '导入成功，是否保存到数据库？';
        if (confirm(confirmMsg)) {
          for (const node of importedNodes) {
            await saveNode(node);
          }
          fetchData();
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
        if (confirm('导入成功，是否保存到数据库？')) {
          for (const rel of importedRelations) {
            await saveRelation(rel);
          }
          fetchData();
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
          desc: isForward ? '指向当前知识点的上位分类' : '展示当前概念下的具体细分内容'
        };
      case 'prerequisite_of': 
        return { 
          color: 'text-amber-600', 
          bg: 'bg-amber-600', 
          line: 'solid', 
          label: isForward ? '后续延伸' : '前置基础',
          desc: isForward ? '基于此生发出的高级规则' : '学习此点必备的基石'
        };
      case 'related_to': 
        return { 
          color: 'text-emerald-600', 
          bg: 'bg-emerald-600', 
          line: 'dashed', 
          label: '横向关联',
          desc: '性质交叉、类比或对比'
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
        <AnimatePresence>
          {isAddingNode && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-indigo-50/50 border-b border-indigo-100 overflow-hidden"
            >
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">归属目录</span>
                    <span className="text-[9px] font-mono text-indigo-500 font-bold bg-indigo-100 px-1.5 py-0.5 rounded">ID: {editingNodeData.id}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium bg-white/50 border border-slate-200/50 px-2.5 py-1.5 rounded-lg">
                    {editingNodeData.l1} <ArrowRight className="w-2 h-2 inline-block mx-1" /> {editingNodeData.l2}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-1">知识点名称</label>
                    <input 
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      placeholder="例如: 单调性的定义"
                      value={editingNodeData.name || ''}
                      onChange={e => setEditingNodeData({...editingNodeData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-1">节点类型</label>
                      <div className="grid grid-cols-3 gap-2">
                         {[
                           { val: 'Concept', label: '概念', desc: '是什么' },
                           { val: 'Rule', label: '规则', desc: '怎么用' },
                           { val: 'Representation', label: '表示', desc: '怎么写' }
                         ].map(t => (
                         <button
                           key={t.val}
                           onClick={() => setEditingNodeData({...editingNodeData, type: t.val as any})}
                           className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                             editingNodeData.type === t.val 
                               ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                               : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                           }`}
                         >
                           <span className="text-[10px] font-bold">{t.label}</span>
                           <span className={`text-[8px] ${editingNodeData.type === t.val ? 'text-indigo-100' : 'text-slate-400'}`}>{t.desc}</span>
                         </button>
                       ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-1">详细定义</label>
                    <textarea 
                       className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all min-h-[80px] resize-none"
                       placeholder="请输入数学定义或描述语言..."
                       value={editingNodeData.definition || ''}
                       onChange={e => setEditingNodeData({...editingNodeData, definition: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button 
                    onClick={async () => {
                      if (!editingNodeData.id || !editingNodeData.name) return alert('请填入必填项');
                      if (await saveNode(editingNodeData as Node)) {
                        setIsAddingNode(false);
                      }
                    }}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold shadow-indigo-200 shadow-lg active:scale-[0.98] transition-all hover:bg-indigo-700"
                  >
                    确认创建
                  </button>
                  <button 
                    onClick={() => setIsAddingNode(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 bg-white rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all"
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="p-5 border-b border-gray-50 bg-white">
          <h1 className="text-lg font-bold tracking-tight text-indigo-600 flex items-center gap-2">
            <Network className="w-5 h-5" />
            知识图谱
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">高中数学 · 函数的概念与性质</p>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-5 py-3 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">结构树</h3>
          </div>

          <KnowledgeTree 
            onNodeClick={handleNodeSelect} 
            onAddNode={(l1, l2) => {
              // Generate sequential ID based on L1 prefix (F, P, Q, etc.)
              let prefix = 'N';
              if (l1.includes('函数的概念')) prefix = 'F';
              else if (l1.includes('性质')) prefix = 'P';
              else if (l1.includes('不等式') || l1.includes('方程')) prefix = 'Q';
              
              const existingIds = nodes.filter(n => n.id.startsWith(prefix)).map(n => {
                const num = parseInt(n.id.substring(1));
                return isNaN(num) ? 0 : num;
              });
              const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
              const nextId = `${prefix}${nextNum.toString().padStart(3, '0')}`;

              setIsAddingNode(true);
              setEditingNodeData({ id: nextId, name: '', type: 'Concept', l1, l2, definition: '' });
            }} 
            nodes={nodes} 
            l1Order={l1Order}
            onL1OrderChange={saveL1Order}
          />
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
          
        <div className="p-4 border-t border-gray-50 bg-gray-50/30 relative">
          <AnimatePresence>
            {showTypeInfo && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute bottom-full left-4 right-4 mb-2 bg-white/95 backdrop-blur shadow-xl rounded-2xl border border-slate-200 overflow-hidden z-30"
              >
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">知识分类指南</span>
                    <button onClick={() => setShowTypeInfo(false)} className="text-slate-300 hover:text-slate-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-4 text-[10px]">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                         <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-indigo-900 text-xs">概念 (Concept)</span>
                          <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">是什么</span>
                        </div>
                        <div className="text-indigo-700/70 leading-relaxed">数学对象的本质定义、核心内涵与分类标准。它是构建知识体系的原子单元。</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                         <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-orange-900 text-xs">规则 (Rule)</span>
                          <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">怎么用</span>
                        </div>
                        <div className="text-orange-700/70 leading-relaxed">定理、性质、推论、运算法则等逻辑规律。它描述了概念之间的动态交互与应用方式。</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                         <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-emerald-900 text-xs">表示 (Representation)</span>
                          <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">怎么写</span>
                        </div>
                        <div className="text-emerald-700/70 leading-relaxed">符号系统 (集合记号)、图示方式 (Venn图)、表格、坐标等表达抽象思维的形式。</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-4 border-t border-gray-50 grid grid-cols-3 gap-2 bg-gray-50/30 -mx-4 -mb-4 rounded-b-2xl relative">
            <button 
              onClick={() => setShowTypeInfo(!showTypeInfo)}
              className="absolute -top-3 right-4 w-7 h-7 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all z-10"
              title="查看分类说明"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <div className="text-center cursor-help group" onClick={() => setShowTypeInfo(true)}>
              <div className="text-[9px] text-slate-400 font-bold uppercase transition-colors group-hover:text-indigo-500">概念</div>
              <div className="text-xs font-bold text-indigo-600">{nodeStats.Concept}</div>
            </div>
            <div className="text-center cursor-help group" onClick={() => setShowTypeInfo(true)}>
              <div className="text-[9px] text-slate-400 font-bold uppercase transition-colors group-hover:text-orange-500">规则</div>
              <div className="text-xs font-bold text-orange-600">{nodeStats.Rule}</div>
            </div>
            <div className="text-center cursor-help group" onClick={() => setShowTypeInfo(true)}>
              <div className="text-[9px] text-slate-400 font-bold uppercase transition-colors group-hover:text-emerald-500">表示</div>
              <div className="text-xs font-bold text-emerald-600">{nodeStats.Representation}</div>
            </div>
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
               <div className="w-2 h-2 rounded-full bg-purple-600" /> 指数函数
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 rounded-full bg-emerald-600" /> 对数函数
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 rounded-full bg-pink-600" /> 反函数
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
            <div className="p-6 border-b border-gray-50 flex items-start justify-between bg-white sticky top-0 z-10">
                {isEditingNode ? (
                  <div className="flex-1 space-y-4 pr-4">
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">节点标识符</span>
                      <span className="text-[10px] font-mono text-indigo-600 font-bold">{selectedNode.id}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase px-1">显示名称</label>
                      <input 
                        className="w-full text-lg font-bold p-2 bg-white border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-400 transition-all"
                        value={editingNodeData.name || ''}
                        onChange={e => setEditingNodeData({...editingNodeData, name: e.target.value})}
                        placeholder="知识点名称"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase px-1">类型定位</label>
                        <select 
                          className="w-full text-[10px] font-bold p-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer hover:border-indigo-200"
                          value={editingNodeData.type}
                          onChange={e => setEditingNodeData({...editingNodeData, type: e.target.value as any})}
                        >
                          <option value="Concept">Concept (概念)</option>
                          <option value="Rule">Rule (规则)</option>
                          <option value="Representation">Representation (表示)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase px-1">所属类目</label>
                        <div className="w-full text-[10px] font-bold p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-400">
                          {selectedNode.l2}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="space-y-1">
                  <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                    selectedNode.type === 'Concept' ? 'bg-indigo-50 text-indigo-600' :
                    selectedNode.type === 'Rule' ? 'bg-orange-50 text-orange-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    {selectedNode.type}
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-800">{selectedNode.name}</h2>
                </div>
              )}
              <div className="flex gap-1">
                {isEditingNode ? (
                  <button 
                    onClick={async () => {
                      if (await saveNode(editingNodeData as Node)) {
                        setSelectedNode(editingNodeData as Node);
                        setIsEditingNode(false);
                      }
                    }}
                    className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setIsEditingNode(true);
                      setEditingNodeData(selectedNode);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-slate-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => deleteNode(selectedNode.id)}
                  className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg transition-all shadow-sm ${
                    deleteConfirmationNode === selectedNode.id 
                    ? 'bg-red-500 text-white ring-4 ring-red-100 scale-105 font-bold' 
                    : 'hover:bg-red-50 text-red-400'
                  }`}
                  title={deleteConfirmationNode === selectedNode.id ? "再次点击确认删除" : "删除节点"}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleteConfirmationNode === selectedNode.id && <span className="text-[10px]">确认删除?</span>}
                </button>
                <button 
                  onClick={() => setIsEditingNode(false) || setSelectedNode(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">定义与描述</h3>
                {isEditingNode ? (
                  <div className="space-y-2">
                    <textarea 
                      className="w-full p-5 bg-white rounded-2xl text-sm border border-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none min-h-[160px] leading-relaxed shadow-sm transition-all resize-none"
                      value={editingNodeData.definition || ''}
                      onChange={e => setEditingNodeData({...editingNodeData, definition: e.target.value})}
                      placeholder="在此输入数学定义或描述..."
                    />
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-[10px] text-slate-400 font-medium">正在编辑模式 · 更改将在保存后生效</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-gray-50 rounded-xl text-sm text-slate-600 leading-relaxed border border-gray-100/50 shadow-inner">
                    {selectedNode.definition}
                  </div>
                )}
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
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">关联知识点</h3>
                    <button 
                      onClick={() => setIsAddingRelation(!isAddingRelation)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      title="新增关联关系"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {isAddingRelation && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-4"
                    >
                      <div className="space-y-4">
                        {/* 1. Relation Type Selector (Grid of "Cards") */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1 tracking-[0.1em]">关系类型</label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'parent', label: '父级概念', sub: '本节点属于...', color: 'indigo' },
                              { id: 'child', label: '包含子项', sub: '本节点包含...', color: 'indigo' },
                              { id: 'base', label: '前置基础', sub: '学习必备基础...', color: 'amber' },
                              { id: 'extension', label: '后续延伸', sub: '由此衍生出的...', color: 'amber' },
                              { id: 'related', label: '横向关联', sub: '性质对比交叉', color: 'emerald' },
                            ].map(t => (
                              <button
                                key={t.id}
                                onClick={() => setNewRelationData({ ...newRelationData, type: t.id })}
                                className={`flex flex-col p-3 rounded-2xl border transition-all text-center items-center justify-center gap-0.5 ${
                                  newRelationData.type === t.id 
                                    ? `bg-${t.color}-600 border-${t.color}-600 text-white shadow-lg shadow-${t.color}-100 scale-[1.02]` 
                                    : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/30'
                                }`}
                              >
                                <span className="text-[11px] font-bold">{t.label}</span>
                                <span className={`text-[8px] font-medium ${newRelationData.type === t.id ? `text-${t.color}-100` : 'text-slate-400'}`}>{t.sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Target Selection with Search */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1 tracking-[0.1em]">目标知识点</label>
                          <div className="relative">
                            <div className={`flex items-center gap-2 border rounded-2xl bg-white px-4 py-3 shadow-sm transition-all ${newRelationData.target ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-slate-200 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50'}`}>
                              <Search className={`w-4 h-4 ${newRelationData.target ? 'text-emerald-500' : 'text-slate-400'}`} />
                              <input 
                                className="text-xs outline-none w-full bg-transparent font-medium"
                                placeholder="搜索知识点名称或 ID..."
                                value={newRelationData.targetName || ''}
                                onFocus={() => {
                                  if (!newRelationData.target) setNewRelationData({...newRelationData, isBrowsing: true});
                                }}
                                onChange={e => {
                                  const val = e.target.value;
                                  setNewRelationData({...newRelationData, targetName: val, target: '', isBrowsing: !val});
                                }}
                              />
                            </div>
                            
                            {(newRelationData.isBrowsing || (newRelationData.targetName && !newRelationData.target)) && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-[40] max-h-56 overflow-y-auto p-1.5 custom-scrollbar">
                                {!newRelationData.targetName ? (
                                  <div className="space-y-1">
                                    {Array.from(new Set(nodes.map(n => n.l1))).map(l1 => (
                                      <div key={l1} className="space-y-0.5">
                                        <div className="px-2 py-1 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-tighter rounded-md">
                                          {l1}
                                        </div>
                                        {Array.from(new Set(nodes.filter(n => n.l1 === l1).map(n => n.l2))).map(l2 => (
                                          <div key={l2} className="pl-1">
                                            <div className="px-2 py-0.5 text-[8px] font-bold text-slate-300 border-l border-slate-100 flex items-center gap-1">
                                              <Layers className="w-2 h-2" /> {l2}
                                            </div>
                                            {nodes.filter(n => n.l1 === l1 && n.l2 === l2 && n.id !== selectedNode.id).map(n => {
                                              const isRelated = currentRelatedIds.has(n.id);
                                              return (
                                                <button
                                                  key={n.id}
                                                  disabled={isRelated}
                                                  onClick={() => setNewRelationData({...newRelationData, target: n.id, targetName: n.name, isBrowsing: false})}
                                                  className={`w-full text-left pl-4 pr-2 py-2 text-[11px] rounded-lg transition-colors flex items-center justify-between ${
                                                    isRelated ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'hover:bg-emerald-50 text-slate-600'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span>{n.name}</span>
                                                    {isRelated && <span className="text-[7px] bg-slate-200 text-slate-500 px-1 rounded">已关联</span>}
                                                  </div>
                                                  <span className="text-[8px] font-mono text-slate-300">{n.id}</span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  nodes
                                    .filter(n => n.id !== selectedNode.id && n.name.toLowerCase().includes(newRelationData.targetName!.toLowerCase()))
                                    .slice(0, 15)
                                    .map(n => {
                                      const isRelated = currentRelatedIds.has(n.id);
                                      return (
                                        <button
                                          key={n.id}
                                          disabled={isRelated}
                                          onClick={() => setNewRelationData({...newRelationData, target: n.id, targetName: n.name, isBrowsing: false})}
                                          className={`w-full text-left px-3 py-2.5 text-[11px] border-b border-slate-50 last:border-0 flex justify-between items-center rounded-lg ${
                                            isRelated ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'hover:bg-emerald-50 text-slate-700'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 truncate flex-1">
                                            <span className="font-bold truncate">{n.name}</span>
                                            {isRelated && <span className="text-[7px] bg-slate-200 text-slate-500 px-1 rounded shrink-0">已关联</span>}
                                          </div>
                                          <span className="text-[9px] text-slate-300 font-mono shrink-0 ml-2">{n.l2}</span>
                                        </button>
                                      );
                                    })
                                )}
                                {newRelationData.targetName && nodes.filter(n => n.id !== selectedNode.id && n.name.toLowerCase().includes(newRelationData.targetName!.toLowerCase())).length === 0 && (
                                  <div className="p-4 text-[10px] text-slate-400 text-center font-medium">未找到可关联的知识点</div>
                                )}
                              </div>
                            )}
                            
                            {newRelationData.target && (
                               <motion.div 
                                 initial={{ scale: 0.9, opacity: 0 }} 
                                 animate={{ scale: 1, opacity: 1 }}
                                 className="mt-2 flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-xl text-[11px] border border-indigo-200 group"
                               >
                                 <div className="flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                   <span className="font-bold text-indigo-700 font-sans">{newRelationData.targetName}</span>
                                 </div>
                                 <button onClick={() => setNewRelationData({...newRelationData, target: '', targetName: ''})} className="text-indigo-400 hover:text-indigo-600 p-1 hover:bg-indigo-100 rounded-full transition-colors">
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                               </motion.div>
                            )}
                          </div>
                        </div>

                        {/* 3. Description Input */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-emerald-600 uppercase mb-1 block ml-1 tracking-wider">关系描述 (可选)</label>
                          <input 
                            className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:border-emerald-400 outline-none transition-all focus:ring-2 focus:ring-emerald-50"
                            placeholder="例如: 它是前者的具体体现..."
                            value={newRelationData.desc}
                            onChange={e => setNewRelationData({...newRelationData, desc: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button 
                          onClick={async () => {
                            if (!newRelationData.target) return alert('请选择目标节点');
                            if (!selectedNode) return;

                            let sourceId = selectedNode.id;
                            let targetId = newRelationData.target;
                            let relType: Relation['relation'] = 'related_to';

                            switch(newRelationData.type) {
                              case 'parent':
                                relType = 'belongs_to';
                                break;
                              case 'child':
                                relType = 'belongs_to';
                                sourceId = newRelationData.target;
                                targetId = selectedNode.id;
                                break;
                              case 'base':
                                relType = 'prerequisite_of';
                                sourceId = newRelationData.target;
                                targetId = selectedNode.id;
                                break;
                              case 'extension':
                                relType = 'prerequisite_of';
                                break;
                              case 'related':
                                relType = 'related_to';
                                break;
                            }

                            if (await saveRelation({ source: sourceId, target: targetId, relation: relType, description: newRelationData.desc })) {
                              setIsAddingRelation(false);
                              setNewRelationData({ target: '', targetName: '', isBrowsing: false, type: 'parent', desc: '' });
                            }
                          }}
                          className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold shadow-emerald-100 shadow-lg active:scale-95 transition-all hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> 确认关联
                        </button>
                        <button 
                          onClick={() => {
                            setIsAddingRelation(false);
                            setNewRelationData({ target: '', targetName: '', isBrowsing: false, type: 'parent', desc: '' });
                          }}
                          className="px-5 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all active:scale-95"
                        >
                          取消
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {relatedNodes.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex gap-2 justify-end">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-0.5 bg-indigo-500 rounded-full" />
                          <span className="text-[9px] text-slate-400">层级隶属</span>
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
                      <div className="space-y-2.5">
                        {relatedNodes.map((item) => {
                          const { node: n, relationType, isForward } = item;
                          const style = getRelationStyle(relationType, isForward);
                          return (
                            <div 
                              key={`${n.id}-${relationType}-${isForward}`} 
                              className="group relative flex flex-col p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 hover:shadow-md transition-all text-left overflow-hidden cursor-pointer"
                              onClick={() => handleNodeSelect(n)}
                            >
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.bg}`} />
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-black uppercase tracking-tighter ${style.color}`}>
                                      {style.label}
                                    </span>
                                    {item.description && (
                                      <span className="text-[10px] text-slate-700 font-medium font-serif italic">
                                        “{item.description}”
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-base font-bold text-slate-800">{n.name}</h4>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const btn = e.currentTarget;
                                      btn.style.transform = 'scale(0.9)';
                                      await deleteRelation(isForward ? selectedNode.id : n.id, relationType, isForward ? n.id : selectedNode.id);
                                      btn.style.transform = '';
                                    }}
                                    className={`h-8 flex items-center justify-center rounded-lg transition-all shadow-sm z-20 active:scale-95 px-2 gap-1 ${
                                      deleteConfirmation && 
                                      deleteConfirmation.source === (isForward ? selectedNode.id : n.id) && 
                                      deleteConfirmation.target === (isForward ? n.id : selectedNode.id)
                                      ? 'bg-red-500 text-white w-auto ring-2 ring-red-200' 
                                      : 'bg-red-50 text-red-500 w-8'
                                    }`}
                                    title={deleteConfirmation ? "再次点击确认删除" : "删除此关联"}
                                  >
                                    <Trash2 className="w-4 h-4 shrink-0" />
                                    {deleteConfirmation && 
                                     deleteConfirmation.source === (isForward ? selectedNode.id : n.id) && 
                                     deleteConfirmation.target === (isForward ? n.id : selectedNode.id) && (
                                      <span className="text-[10px] font-bold whitespace-nowrap">确认删除?</span>
                                    )}
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNodeSelect(n);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-lg hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                    title="查看详情"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-1.5 text-[9px] text-slate-400 font-medium h-3 overflow-hidden">
                                {style.desc}
                              </div>
                              <div className="absolute right-3 bottom-1.5">
                                <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded ${
                                  n.type === 'Concept' ? 'bg-indigo-50 text-indigo-400' :
                                  n.type === 'Rule' ? 'bg-orange-50 text-orange-400' :
                                  'bg-emerald-50 text-emerald-400'
                                }`}>
                                  {n.id}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <section className="py-10 text-center space-y-2">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                        <Network className="w-5 h-5 text-slate-200" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">无直接关联节点</p>
                    </section>
                  )}
                </section>
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
