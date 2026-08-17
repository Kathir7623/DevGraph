import React, { useRef, useEffect, useState } from 'react';

export default function GraphView({ 
  graphData, 
  onNodeClick, 
  selectedNodeId, 
  highlightPath = null 
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [hoveredNode, setHoveredNode] = useState(null);
  
  // Physics simulation references
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const dragNodeRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  
  // Track graph updates to auto-fit camera viewport
  const prevGraphDataKeyRef = useRef('');

  // Node styles configuration
  const nodeStyles = {
    Developer: { color: '#3b82f6', radius: 25, glyph: '👤' },
    Technology: { color: '#10b981', radius: 21, glyph: '{ }' },
    Project: { color: '#f59e0b', radius: 23, glyph: '</>' }
  };

  // Adjust canvas dimensions on container resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleResize = () => {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 500
      });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize or update nodes/links for the physics simulation
  useEffect(() => {
    if (!graphData || !graphData.nodes) return;
    
    const currentKey = JSON.stringify(graphData.nodes.map(n => n.id));
    const width = dimensions.width || 600;
    const height = dimensions.height || 500;
    
    // If the graph nodes changed completely, re-initialize positions.
    if (prevGraphDataKeyRef.current !== currentKey) {
      prevGraphDataKeyRef.current = currentKey;
      
      nodesRef.current = graphData.nodes.map((node, i) => {
        const existingNode = nodesRef.current.find(n => n.id === node.id);
        if (existingNode) return { ...node, ...existingNode };
        
        const angle = i * 0.5;
        const radius = 50 + i * 22;
        return {
          ...node,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          radius: nodeStyles[node.type]?.radius || 20
        };
      });

      // Trigger camera auto-fit
      setTimeout(autoFitGraph, 200);
    }

    // Map links to point directly to node references instead of string IDs
    linksRef.current = graphData.links.map(link => {
      const sourceNode = nodesRef.current.find(n => n.id === (link.source.id || link.source));
      const targetNode = nodesRef.current.find(n => n.id === (link.target.id || link.target));
      
      return {
        ...link,
        sourceNode,
        targetNode
      };
    }).filter(link => link.sourceNode && link.targetNode);

  }, [graphData, dimensions]);

  // Trigger auto-fit bounds when a path is highlighted
  useEffect(() => {
    if (highlightPath && highlightPath.nodes && highlightPath.nodes.length > 0) {
      autoFitGraph();
    }
  }, [highlightPath]);

  // Fit camera bounds to display all nodes in the center
  const autoFitGraph = () => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    const graphWidth = maxX - minX || 1;
    const graphHeight = maxY - minY || 1;
    const pad = 100; // Margin padding

    const width = dimensions.width;
    const height = dimensions.height;

    const zoomX = (width - pad * 2) / graphWidth;
    const zoomY = (height - pad * 2) / graphHeight;
    const newZoom = Math.max(0.35, Math.min(zoomX, zoomY, 1.1));

    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;
    const newPan = {
      x: width / 2 - graphCenterX * newZoom,
      y: height / 2 - graphCenterY * newZoom
    };

    setZoom(newZoom);
    setPan(newPan);
  };

  // Run the force-directed simulation loop
  useEffect(() => {
    let animationId;
    
    const tick = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      
      if (nodes.length === 0) {
        animationId = requestAnimationFrame(tick);
        return;
      }
      
      const width = dimensions.width;
      const height = dimensions.height;
      
      // 1. Repulsion force between all nodes (Coulomb force)
      // INCREASED kRepulsion to 4500 to expand node spacing and prevent clumping
      const kRepulsion = 4500;
      const minDistance = 80;
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          
          let dx = n1.x - n2.x;
          let dy = n1.y - n2.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist === 0) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            dist = Math.sqrt(dx * dx + dy * dy);
          }
          
          if (dist < 500) {
            const force = kRepulsion / (dist * dist + minDistance);
            const fx = force * (dx / dist);
            const fy = force * (dy / dist);
            
            if (n1 !== dragNodeRef.current) {
              n1.vx += fx;
              n1.vy += fy;
            }
            if (n2 !== dragNodeRef.current) {
              n2.vx -= fx;
              n2.vy -= fy;
            }
          }
        }
      }
      
      // 2. Attraction force along links (Hooke's Law)
      // INCREASED restLength to 150 to spread connected nodes further apart
      const kAttraction = 0.045;
      const restLength = 150;
      
      links.forEach(link => {
        const source = link.sourceNode;
        const target = link.targetNode;
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        
        const force = (dist - restLength) * kAttraction;
        const fx = force * (dx / dist);
        const fy = force * (dy / dist);
        
        if (source !== dragNodeRef.current) {
          source.vx += fx;
          source.vy += fy;
        }
        if (target !== dragNodeRef.current) {
          target.vx -= fx;
          target.vy -= fy;
        }
      });
      
      // 3. Gravity / Center attraction force
      const kGravity = 0.015;
      const centerX = width / 2;
      const centerY = height / 2;
      
      nodes.forEach(node => {
        if (node === dragNodeRef.current) return;
        
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        
        node.vx += dx * kGravity;
        node.vy += dy * kGravity;
      });
      
      // 4. Update node positions and apply damping (friction)
      const damping = 0.8;
      nodes.forEach(node => {
        if (node === dragNodeRef.current) {
          node.vx = 0;
          node.vy = 0;
          return;
        }
        
        node.x += node.vx;
        node.y += node.vy;
        
        node.vx *= damping;
        node.vy *= damping;
        
        // Constrain to container boundaries
        const pad = 40;
        node.x = Math.max(pad, Math.min(width - pad, node.x));
        node.y = Math.max(pad, Math.min(height - pad, node.y));
      });
      
      // 5. Draw the canvas scene
      draw();
      
      animationId = requestAnimationFrame(tick);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      
      const nodes = nodesRef.current;
      const links = linksRef.current;

      const hasFocus = selectedNodeId || hoveredNode;
      const focusId = selectedNodeId || hoveredNode?.id;

      // Helper function to check if a link is connected to the focused node
      const isLinkConnectedToFocus = (link) => {
        if (!hasFocus) return true;
        return link.sourceNode.id === focusId || link.targetNode.id === focusId;
      };

      // Helper function to check if a node is the focused node or a direct neighbor
      const isNodeInFocusNeighborhood = (node) => {
        if (!hasFocus) return true;
        if (node.id === focusId) return true;
        // Check if any link connects this node to the focused node
        return links.some(l => 
          (l.sourceNode.id === focusId && l.targetNode.id === node.id) ||
          (l.targetNode.id === focusId && l.sourceNode.id === node.id)
        );
      };
      
      // Draw Links (relationships)
      links.forEach(link => {
        const { sourceNode: s, targetNode: t, type } = link;
        
        let isPathLink = false;
        if (highlightPath && highlightPath.links) {
          isPathLink = highlightPath.links.some(l => 
            (l.source === s.id && l.target === t.id) || 
            (l.source === t.id && l.target === s.id)
          );
        }
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        
        // FOCUS REDUCTION: Dim unrelated links to reduce clutter
        const isFocusLink = isLinkConnectedToFocus(link);
        
        if (isPathLink) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3.5;
          const offset = (Date.now() / 150) % 10;
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -offset;
        } else {
          if (hasFocus) {
            ctx.strokeStyle = isFocusLink ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.015)';
            ctx.lineWidth = isFocusLink ? 1.5 : 0.75;
          } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
          }
        }
        ctx.stroke();
        ctx.restore();
        
        // CLUTTER CLEANUP: Only draw edge labels for path links, hovered, or selected nodes
        const shouldDrawLabel = isPathLink || (hasFocus && isFocusLink);
        
        if (shouldDrawLabel && zoom > 0.6) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          
          ctx.save();
          ctx.font = '700 8.5px JetBrains Mono, monospace';
          
          let angle = Math.atan2(t.y - s.y, t.x - s.x);
          if (angle > Math.PI/2 || angle < -Math.PI/2) {
            angle += Math.PI;
          }
          
          ctx.translate(midX, midY);
          ctx.rotate(angle);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const labelWidth = ctx.measureText(type).width + 6;
          ctx.fillStyle = '#060913';
          ctx.fillRect(-labelWidth / 2, -5, labelWidth, 10);
          
          ctx.fillStyle = isPathLink ? '#f87171' : '#3b82f6';
          ctx.fillText(type, 0, 0);
          ctx.restore();
        }
      });
      
      // Draw Nodes
      nodes.forEach(node => {
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const style = nodeStyles[node.type] || { color: '#cccccc', radius: 20, glyph: '●' };
        
        let isPathNode = false;
        if (highlightPath && highlightPath.nodes) {
          isPathNode = highlightPath.nodes.some(n => n.id === node.id);
        }

        const inFocusNeighb = isNodeInFocusNeighborhood(node);
        
        ctx.save();

        // FOCUS REDUCTION: Dim out nodes not connected to selected/hovered nodes
        if (hasFocus && !inFocusNeighb) {
          ctx.globalAlpha = 0.15;
        }
        
        // Glowing halo for active nodes
        if (isSelected || isHovered || isPathNode) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + (isSelected ? 7 : 5), 0, 2 * Math.PI);
          ctx.fillStyle = isSelected 
            ? 'rgba(59, 130, 246, 0.16)' 
            : isPathNode 
              ? 'rgba(239, 68, 68, 0.16)' 
              : 'rgba(255, 255, 255, 0.04)';
          ctx.fill();
          
          ctx.strokeStyle = isSelected 
            ? '#3b82f6' 
            : isPathNode 
              ? '#ef4444' 
              : 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.stroke();
        }
        
        // Inner circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = style.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Render glyph icons or initials
        ctx.font = node.type === 'Developer' ? '12px sans-serif' : '700 9px JetBrains Mono, monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (node.type === 'Developer') {
          const initials = node.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          ctx.fillText(initials, node.x, node.y - 0.5);
        } else {
          ctx.fillText(style.glyph, node.x, node.y - 0.5);
        }
        
        // Node labels
        // Only draw node labels if focused, neighborhood, or zoomed in to avoid spaghetti labels
        const shouldDrawLabel = !hasFocus || inFocusNeighb || zoom > 0.7;
        if (shouldDrawLabel) {
          ctx.font = isSelected ? '700 11px Plus Jakarta Sans' : '500 11px Plus Jakarta Sans';
          ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(node.name, node.x, node.y + node.radius + 6);
          
          ctx.font = '700 7px JetBrains Mono';
          ctx.fillStyle = isSelected ? '#3b82f6' : '#475569';
          ctx.fillText(node.type.toUpperCase(), node.x, node.y + node.radius + 20);
        }
        
        ctx.restore();
      });
      
      ctx.restore();
    };

    tick();
    
    return () => cancelAnimationFrame(animationId);
  }, [dimensions, zoom, pan, selectedNodeId, hoveredNode, highlightPath]);

  // Coordinate conversion helper
  const screenToWorld = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom
    };
  };

  // Find node under mouse position
  const getNodeAtPosition = (clientX, clientY) => {
    const worldPos = screenToWorld(clientX, clientY);
    
    return nodesRef.current.find(node => {
      const dx = node.x - worldPos.x;
      const dy = node.y - worldPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= node.radius + 6;
    }) || null;
  };

  // Mouse/Touch Handlers
  const handleMouseDown = (e) => {
    const clickedNode = getNodeAtPosition(e.clientX, e.clientY);
    
    if (clickedNode) {
      dragNodeRef.current = clickedNode;
      const worldPos = screenToWorld(e.clientX, e.clientY);
      dragStartRef.current = {
        x: worldPos.x - clickedNode.x,
        y: worldPos.y - clickedNode.y
      };
    } else {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      };
    }
  };

  const handleMouseMove = (e) => {
    const hovered = getNodeAtPosition(e.clientX, e.clientY);
    setHoveredNode(hovered);
    
    if (dragNodeRef.current) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      dragNodeRef.current.x = worldPos.x - dragStartRef.current.x;
      dragNodeRef.current.y = worldPos.y - dragStartRef.current.y;
    } else if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  };

  const handleMouseUp = (e) => {
    if (dragNodeRef.current) {
      if (onNodeClick) {
        onNodeClick(dragNodeRef.current);
      }
    }
    dragNodeRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const newZoom = e.deltaY < 0 
      ? Math.min(zoom * zoomFactor, 3) 
      : Math.max(zoom / zoomFactor, 0.35);
      
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;
    
    setZoom(newZoom);
    setPan({
      x: mouseX - worldX * newZoom,
      y: mouseY - worldY * newZoom
    });
  };

  const handleZoomSliderChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    
    const width = dimensions.width;
    const height = dimensions.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const worldX = (centerX - pan.x) / zoom;
    const worldY = (centerY - pan.y) / zoom;
    
    setZoom(newZoom);
    setPan({
      x: centerX - worldX * newZoom,
      y: centerY - worldY * newZoom
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="graph-canvas-wrapper" ref={containerRef} style={{ height: '100%' }}>
      <div className="graph-legend">
        <div className="legend-item">
          <div className="legend-color developer"></div>
          <span>Developer</span>
        </div>
        <div className="legend-item">
          <div className="legend-color technology"></div>
          <span>Technology</span>
        </div>
        <div className="legend-item">
          <div className="legend-color project"></div>
          <span>Project</span>
        </div>
      </div>
      
      <div className="graph-controls">
        <button className="graph-btn" onClick={() => setZoom(z => Math.min(z + 0.15, 3))} title="Zoom In">+</button>
        
        <input
          type="range"
          min="0.35"
          max="3"
          step="0.05"
          value={zoom}
          onChange={handleZoomSliderChange}
          className="graph-zoom-slider"
          title="Zoom Level"
        />
        
        <button className="graph-btn" onClick={() => setZoom(z => Math.max(z - 0.15, 0.35))} title="Zoom Out">-</button>
        <button className="graph-btn" onClick={autoFitGraph} title="Auto-Fit All Nodes" style={{ fontSize: '12px' }}>⛶</button>
        <button className="graph-btn" onClick={handleResetZoom} title="Reset Scale">⊙</button>
      </div>

      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ display: 'block', cursor: dragNodeRef.current ? 'grabbing' : hoveredNode ? 'grab' : 'move' }}
      />
    </div>
  );
}
