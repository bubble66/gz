import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import { Node, NodeType, NODES, Relation, RELATIONS } from '../data/knowledgeMap';

interface GraphNode extends d3.SimulationNodeDatum, Node {}
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  relation: string;
}

const COLORS: Record<NodeType, string> = {
  Concept: '#3b82f6', // blue-500
  Rule: '#10b981',    // emerald-500
  Representation: '#f59e0b', // amber-500
};

const CATEGORY_COLORS: Record<string, string> = {
  // 第一节
  '函数的概念': '#6366F1',    // Indigo 500
  '函数的三要素': '#4F46E5',  // Indigo 600
  '函数的表示法': '#4338CA',  // Indigo 700
  '分段函数': '#3730A3',      // Indigo 800
  // 第二节
  '单调性': '#4338CA',    // Indigo 700
  '奇偶性': '#4F46E5',    // Indigo 600
  '周期性': '#6366F1',    // Indigo 500
  '对称性': '#15803D',    // Emerald 700
  '最值': '#C2410C',      // Orange 700
  '函数图像': '#15803D',  // Emerald 700
  // 一元二次函数、方程和不等式
  '等式与不等式': '#BE185D',  // Rose 700
  '不等式的性质': '#9D174D',  // Rose 800
  '基本不等式': '#831843',    // Rose 900
  '二次函数': '#0369A1',      // Sky 700
  '一元二次方程': '#075985',    // Sky 800
  '一元二次不等式': '#0C4A6E',  // Sky 900
};

export interface KnowledgeGraphHandle {
  focusNode: (nodeId: string) => void;
}

export default function KnowledgeGraph({ onNodeClick, focusedNodeId }: { onNodeClick: (node: Node) => void, focusedNodeId?: string | null }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height]);

    svg.selectAll('*').remove();

    const g = svg.append('g');
    (gRef as any).current = g.node();

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Prepare data
    const nodes: GraphNode[] = NODES.map(d => ({ ...d }));
    const links: GraphLink[] = RELATIONS.map(d => ({
      source: d.source,
      target: d.target,
      relation: d.relation
    }));

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    simulationRef.current = simulation;

    // Links
    const link = g.append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        switch(d.relation) {
          case 'belongs_to': return '#6366f1'; // Indigo
          case 'prerequisite_of': return '#f59e0b'; // Amber
          case 'related_to': return '#10b981'; // Emerald
          default: return '#94a3b8';
        }
      })
      .attr('stroke-width', d => d.relation === 'prerequisite_of' ? 2 : 1.5)
      .attr('stroke-dasharray', d => d.relation === 'related_to' ? '4 3' : null);

    // Nodes
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('id', d => `node-${d.id}`)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => onNodeClick(d))
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    node.append('circle')
      .attr('r', 8)
      .attr('class', 'node-circle')
      .attr('fill', d => CATEGORY_COLORS[d.l2] || '#cbd5e1')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('x', 12)
      .attr('y', 4)
      .text(d => d.name)
      .attr('font-size', '12px')
      .attr('fill', '#1e293b')
      .attr('font-weight', '500')
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, []);

  // Handle focusing from external prop
  useEffect(() => {
    if (!focusedNodeId || !svgRef.current || !containerRef.current || !simulationRef.current || !zoomRef.current) return;

    const nodes = simulationRef.current.nodes();
    const targetNode = nodes.find(n => n.id === focusedNodeId);

    if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(
          zoomRef.current.transform as any,
          d3.zoomIdentity.translate(width / 2, height / 2).scale(1.5).translate(-targetNode.x, -targetNode.y)
        );
      
      // Visual highlight
      d3.selectAll('.node-circle').transition().attr('r', 8).attr('stroke-width', 2);
      d3.select(`#node-${focusedNodeId} circle`)
        .transition()
        .duration(300)
        .attr('r', 14)
        .attr('stroke-width', 4)
        .attr('stroke', '#6366f1');
    }
  }, [focusedNodeId]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#fcfdfe] overflow-hidden relative">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
