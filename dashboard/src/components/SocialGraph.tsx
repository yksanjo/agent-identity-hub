import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, AgentType, AgentStatus } from '../types';

interface SocialGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick?: (node: GraphNode) => void;
  selectedNode?: string | null;
  width?: number;
  height?: number;
}

const typeColors: Record<AgentType, string> = {
  [AgentType.ORCHESTRATOR]: '#ff6b6b',
  [AgentType.WORKER]: '#4ecdc4',
  [AgentType.VALIDATOR]: '#45b7d1',
  [AgentType.GATEWAY]: '#96ceb4',
  [AgentType.SPECIALIST]: '#feca57',
  [AgentType.USER_PROXY]: '#ff9ff3'
};

const statusOpacities: Record<AgentStatus, number> = {
  [AgentStatus.ACTIVE]: 1,
  [AgentStatus.INACTIVE]: 0.6,
  [AgentStatus.SUSPENDED]: 0.4,
  [AgentStatus.REVOKED]: 0.3,
  [AgentStatus.PENDING]: 0.5
};

export const SocialGraph: React.FC<SocialGraphProps> = ({
  nodes,
  links,
  onNodeClick,
  selectedNode,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main group for zoom
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        setTransform(event.transform);
      });

    svg.call(zoom);

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes as any)
      .force('link', d3.forceLink<GraphNode, any>(links as any)
        .id((d: any) => d.id)
        .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create arrow markers for directed edges
    svg.append('defs').selectAll('marker')
      .data(['end'])
      .enter().append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#666');

    // Draw links
    const link = g.append('g')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (d: any) => Math.sqrt(d.value * 3))
      .attr('marker-end', 'url(#arrow)');

    // Draw link labels
    const linkLabel = g.append('g')
      .attr('font-size', 10)
      .attr('fill', '#999')
      .selectAll('text')
      .data(links)
      .join('text')
      .text((d: any) => d.type.replace(/_/g, ' '));

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node circles
    node.append('circle')
      .attr('r', (d) => 15 + d.trustScore * 10)
      .attr('fill', (d) => typeColors[d.type] || '#888')
      .attr('stroke', (d) => selectedNode === d.id ? '#fff' : 'none')
      .attr('stroke-width', 3)
      .attr('opacity', (d) => statusOpacities[d.status] || 1)
      .on('click', (_event, d) => onNodeClick?.(d));

    // Trust score ring
    node.append('circle')
      .attr('r', (d) => 15 + d.trustScore * 10 + 3)
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        if (d.trustScore >= 0.8) return '#2ecc71';
        if (d.trustScore >= 0.5) return '#f39c12';
        return '#e74c3c';
      })
      .attr('stroke-width', 2)
      .attr('opacity', 0.7);

    // Node labels
    node.append('text')
      .text((d) => d.name)
      .attr('x', 0)
      .attr('y', (d) => 15 + d.trustScore * 10 + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e0e0e0')
      .attr('font-size', 11)
      .style('pointer-events', 'none');

    // Node tooltips
    node.append('title')
      .text((d) => `${d.name}\nType: ${d.type}\nTrust: ${(d.trustScore * 100).toFixed(1)}%\nStatus: ${d.status}`);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, onNodeClick, selectedNode]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ background: '#0a0a0f', borderRadius: 8 }}
    />
  );
};

export default SocialGraph;
