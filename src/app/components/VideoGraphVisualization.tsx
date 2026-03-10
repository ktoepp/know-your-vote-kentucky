'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface VideoNode {
  id: string;
  type: string;
  metadata: {
    title: string;
    date: string;
    duration: number;
    url: string;
    chamber: string;
    eventType: string;
    videoId: string;
    transcript: string;
    summary: string;
    wordCount: number;
    keyTopics: string[];
  };
}

interface Speaker {
  id: string;
  name: string;
  title?: string;
  party?: string;
  state?: string;
}

interface Topic {
  id: string;
  subject: string;
  category?: string;
}

interface Bill {
  id: string;
  billNumber: string;
  title?: string;
  status?: string;
}

interface GraphNode {
  id: string;
  type: 'video' | 'speaker' | 'topic' | 'bill';
  label: string;
  data: VideoNode | Speaker | Topic | Bill;
  x: number;
  y: number;
  size: number;
  color: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'FEATURES' | 'DISCUSSES' | 'REFERENCES' | 'SPEAKS_ON' | 'SPONSORS' | 'RELATED';
  strength: number;
}

interface VideoGraphVisualizationProps {
  videoId: string;
  className?: string;
}

export default function VideoGraphVisualization({ videoId, className = '' }: VideoGraphVisualizationProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'speakers' | 'topics' | 'bills'>('all');

  // Node colors and sizes
  const nodeStyles = {
    video: { color: '#3B82F6', size: 80 },
    speaker: { color: '#10B981', size: 60 },
    topic: { color: '#F59E0B', size: 50 },
    bill: { color: '#8B5CF6', size: 45 }
  };

  // Edge colors
  const edgeColors = {
    FEATURES: '#3B82F6',
    DISCUSSES: '#F59E0B',
    REFERENCES: '#8B5CF6',
    SPEAKS_ON: '#10B981',
    SPONSORS: '#EF4444',
    RELATED: '#6B7280'
  };

  // Filter nodes by type - memoized to prevent unnecessary recalculations
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      if (viewMode === 'all') return true;
      if (viewMode === 'speakers' && node.type === 'speaker') return true;
      if (viewMode === 'topics' && node.type === 'topic') return true;
      if (viewMode === 'bills' && node.type === 'bill') return true;
      return false;
    });
  }, [nodes, viewMode]);

  const filteredEdges = useMemo(() => {
    return edges.filter(edge => {
      if (viewMode === 'all') return true;
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (viewMode === 'speakers' && (sourceNode?.type === 'speaker' || targetNode?.type === 'speaker')) return true;
      if (viewMode === 'topics' && (sourceNode?.type === 'topic' || targetNode?.type === 'topic')) return true;
      if (viewMode === 'bills' && (sourceNode?.type === 'bill' || targetNode?.type === 'bill')) return true;
      return false;
    });
  }, [edges, nodes, viewMode]);

  useEffect(() => {
    const loadGraphData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load main video and related data
        const [videoRes, speakersRes, topicsRes, billsRes] = await Promise.all([
          fetch(`/api/graph-data?nodeId=${videoId}`),
          fetch(`/api/graph-data?nodeId=${videoId}&relationshipType=FEATURES`),
          fetch(`/api/graph-data?nodeId=${videoId}&relationshipType=DISCUSSES`),
          fetch(`/api/graph-data?nodeId=${videoId}&relationshipType=REFERENCES`)
        ]);

        const graphNodes: GraphNode[] = [];
        const graphEdges: GraphEdge[] = [];

        // Add main video node
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          if (videoData.success && videoData.data) {
            const video = videoData.data;
            graphNodes.push({
              id: video.id,
              type: 'video',
              label: video.metadata?.title || 'Untitled Video',
              data: video,
              x: 0,
              y: 0,
              size: nodeStyles.video.size,
              color: nodeStyles.video.color
            });
          }
        }

        // Add speaker nodes
        if (speakersRes.ok) {
          const speakersData = await speakersRes.json();
          if (speakersData.success && speakersData.data) {
            speakersData.data.forEach((speaker: Speaker, index: number) => {
              const angle = (index / speakersData.data.length) * 2 * Math.PI;
              const radius = 200;
              graphNodes.push({
                id: speaker.id,
                type: 'speaker',
                label: speaker.name,
                data: speaker,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                size: nodeStyles.speaker.size,
                color: nodeStyles.speaker.color
              });
              graphEdges.push({
                source: videoId,
                target: speaker.id,
                type: 'FEATURES',
                strength: 1
              });
            });
          }
        }

        // Add topic nodes
        if (topicsRes.ok) {
          const topicsData = await topicsRes.json();
          if (topicsData.success && topicsData.data) {
            topicsData.data.forEach((topic: Topic, index: number) => {
              const angle = (index / topicsData.data.length) * 2 * Math.PI + Math.PI / 2;
              const radius = 300;
              graphNodes.push({
                id: topic.id,
                type: 'topic',
                label: topic.subject,
                data: topic,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                size: nodeStyles.topic.size,
                color: nodeStyles.topic.color
              });
              graphEdges.push({
                source: videoId,
                target: topic.id,
                type: 'DISCUSSES',
                strength: 1
              });
            });
          }
        }

        // Add bill nodes
        if (billsRes.ok) {
          const billsData = await billsRes.json();
          if (billsData.success && billsData.data) {
            billsData.data.forEach((bill: Bill, index: number) => {
              const angle = (index / billsData.data.length) * 2 * Math.PI + Math.PI;
              const radius = 250;
              graphNodes.push({
                id: bill.id,
                type: 'bill',
                label: bill.billNumber,
                data: bill,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                size: nodeStyles.bill.size,
                color: nodeStyles.bill.color
              });
              graphEdges.push({
                source: videoId,
                target: bill.id,
                type: 'REFERENCES',
                strength: 1
              });
            });
          }
        }

        setNodes(graphNodes);
        setEdges(graphEdges);

      } catch (err) {
        setError('Failed to load graph data');
        console.error('Graph data loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      loadGraphData();
    }
  }, [videoId]);

  // Animation and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Center the graph
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw edges
      filteredEdges.forEach(edge => {
        const sourceNode = filteredNodes.find(n => n.id === edge.source);
        const targetNode = filteredNodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(centerX + sourceNode.x, centerY + sourceNode.y);
          ctx.lineTo(centerX + targetNode.x, centerY + targetNode.y);
          ctx.strokeStyle = edgeColors[edge.type];
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Draw edge label
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          ctx.fillStyle = '#374151';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(edge.type, centerX + midX, centerY + midY - 10);
        }
      });

      // Draw nodes
      filteredNodes.forEach(node => {
        const x = centerX + node.x;
        const y = centerY + node.y;
        
        // Node circle
        ctx.beginPath();
        ctx.arc(x, y, node.size / 2, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Node border
        ctx.strokeStyle = selectedNode === node.id ? '#1F2937' : '#6B7280';
        ctx.lineWidth = selectedNode === node.id ? 3 : 1;
        ctx.stroke();

        // Hover effect
        if (hoveredNode === node.id) {
          ctx.beginPath();
          ctx.arc(x, y, node.size / 2 + 5, 0, 2 * Math.PI);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Node label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.label.substring(0, 15), x, y + 4);
        
        // Node type icon
        const icons = {
          video: '🎥',
          speaker: '👤',
          topic: '🏷️',
          bill: '📜'
        };
        ctx.font = '16px Arial';
        ctx.fillText(icons[node.type], x, y - node.size / 2 - 10);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [filteredNodes, filteredEdges, selectedNode, hoveredNode, loading]);

  // Handle canvas interactions
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Check if click is on a node
    for (const node of filteredNodes) {
      const nodeX = centerX + node.x;
      const nodeY = centerY + node.y;
      const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
      
      if (distance <= node.size / 2) {
        setSelectedNode(node.id);
        if (node.type === 'video') {
          router.push(`/video/${node.id}`);
        }
        return;
      }
    }
    
    setSelectedNode(null);
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    let hovered = null;
    for (const node of filteredNodes) {
      const nodeX = centerX + node.x;
      const nodeY = centerY + node.y;
      const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
      
      if (distance <= node.size / 2) {
        hovered = node.id;
        break;
      }
    }
    
    setHoveredNode(hovered);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading graph visualization...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-red-600 text-center">
          <p>Error loading graph: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Video Network Graph</h3>
        <div className="flex space-x-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'all' | 'speakers' | 'topics' | 'bills')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Connections</option>
            <option value="speakers">Speakers Only</option>
            <option value="topics">Topics Only</option>
            <option value="bills">Bills Only</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-200 rounded-lg cursor-pointer"
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
        />
        
        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow">
          <div className="text-sm font-medium mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <span>Videos</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <span>Speakers</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <span>Topics</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
              <span>Bills</span>
            </div>
          </div>
        </div>

        {/* Node info tooltip */}
        {hoveredNode && (
          <div className="absolute bg-gray-900 text-white p-2 rounded text-xs pointer-events-none z-10">
            {(() => {
              const node = nodes.find(n => n.id === hoveredNode);
              if (!node) return null;
              
              switch (node.type) {
                case 'video': {
                  const data = node.data as VideoNode;
                  return (
                    <div>
                      <div className="font-medium">{data.metadata?.title}</div>
                      <div>{data.metadata?.date}</div>
                      <div>{Math.round((data.metadata?.duration || 0) / 60)} min</div>
                    </div>
                  );
                }
                case 'speaker': {
                  const data = node.data as Speaker;
                  return (
                    <div>
                      <div className="font-medium">{data.name}</div>
                      <div>{data.title || '—'}</div>
                      {data.party && <div>{data.party}</div>}
                    </div>
                  );
                }
                case 'topic': {
                  const data = node.data as Topic;
                  return (
                    <div>
                      <div className="font-medium">{data.subject}</div>
                      {data.category && <div>{data.category}</div>}
                    </div>
                  );
                }
                case 'bill': {
                  const data = node.data as Bill;
                  return (
                    <div>
                      <div className="font-medium">{data.billNumber}</div>
                      {data.title && <div>{data.title}</div>}
                    </div>
                  );
                }
                default:
                  return null;
              }
            })()}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-center">
        <div className="bg-blue-50 p-3 rounded">
          <div className="text-2xl font-bold text-blue-600">{nodes.filter(n => n.type === 'video').length}</div>
          <div className="text-sm text-blue-800">Videos</div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <div className="text-2xl font-bold text-green-600">{nodes.filter(n => n.type === 'speaker').length}</div>
          <div className="text-sm text-green-800">Speakers</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded">
          <div className="text-2xl font-bold text-yellow-600">{nodes.filter(n => n.type === 'topic').length}</div>
          <div className="text-sm text-yellow-800">Topics</div>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <div className="text-2xl font-bold text-purple-600">{nodes.filter(n => n.type === 'bill').length}</div>
          <div className="text-sm text-purple-800">Bills</div>
        </div>
      </div>
    </div>
  );
}
