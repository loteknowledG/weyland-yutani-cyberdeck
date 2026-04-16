import React, { useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  {
    id: '1',
    position: { x: 100, y: 100 },
    data: { label: 'Card 1' },
    type: 'default',
  },
  {
    id: '2',
    position: { x: 400, y: 100 },
    data: { label: 'Card 2' },
    type: 'default',
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'default' },
];

export default function CardFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
