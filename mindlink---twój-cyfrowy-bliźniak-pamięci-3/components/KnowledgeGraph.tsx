
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, Node, Link } from '../types';

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick?: (node: Node) => void;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 400;
    const height = container?.clientHeight || 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    svg.call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
      g.attr("transform", event.transform);
    }));

    // Głęboka kopia danych dla d3
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    const simulation = d3.forceSimulation<any>(nodes)
      .force("link", d3.forceLink<any, any>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    const link = g.append("g")
      .attr("stroke", "#065f46")
      .attr("stroke-opacity", 0.5)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(drag(simulation) as any)
      .on("click", (event, d) => onNodeClick?.(d as any));

    node.append("circle")
      .attr("r", d => d.type === 'concept' ? 8 : 12)
      .attr("fill", d => d.type === 'concept' ? "#10b981" : "#34d399")
      .attr("stroke", "#020617")
      .attr("stroke-width", 2);

    node.append("text")
      .text(d => d.label)
      .attr("x", 15)
      .attr("y", 5)
      .attr("fill", "#a7f3d0")
      .style("font-size", "10px")
      .style("font-weight", "600")
      .style("pointer-events", "none")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)");

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function drag(sim: d3.Simulation<any, undefined>) {
      return d3.drag()
        .on("start", (event) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on("drag", (event) => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on("end", (event) => {
          if (!event.active) sim.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        });
    }

    return () => {
      simulation.stop();
      svg.selectAll("*").remove();
    };
  }, [data, onNodeClick]);

  return (
    <div className="w-full h-full relative bg-slate-950 rounded-3xl overflow-hidden border border-emerald-900/20 shadow-inner">
      <svg ref={svgRef} className="w-full h-full cursor-move" />
      <div className="absolute bottom-4 left-6 flex flex-col gap-1 text-[8px] font-bold uppercase tracking-widest text-emerald-700 bg-slate-950/50 p-2 rounded-lg">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div><span>Wspomnienie</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-600"></div><span>Koncept</span></div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
