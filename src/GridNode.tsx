import { useCallback, useEffect, useState } from 'react';
import type { NodeProps, OnResize } from 'reactflow';
import { Handle, NodeResizeControl, Position } from 'reactflow';
import TextEditor from './TextEditor';
import { useStoreLocal } from './store';
import { GridNodeData, useReactFlowEx } from './util';
import { useLayout } from './LayoutManager';

export function GridNode({ data, id: nodeId }: NodeProps<GridNodeData>) {
  const [, setToolbarVisible] = useState(false);
  const handles = useStoreLocal(state => state.getHandles(nodeId));
  const isConnecting = useStoreLocal(state => state.isConnecting);
  const highlitedNodeIds = useStoreLocal(state => state.relatedNodeIds)
  const [highlited, setHighlited] = useState(false)
  const { updateRect } = useLayout()
  const { getNodes } = useReactFlowEx()

  useEffect(() => {
    const highlited = highlitedNodeIds.some(v => v === nodeId)
    setHighlited(highlited)
  }, [highlitedNodeIds, nodeId])

  function hideToolbarDelay() {
    setTimeout(() => setToolbarVisible(false), 500);
  }

  const initHandles = (
    <>
      <Handle
        id='1'
        type='target'
        position={Position.Left}
        isConnectableStart={false}
        isConnectableEnd={true}
        isConnectable={true}
        style={{ pointerEvents: `${isConnecting ? 'auto' : 'none'}` }}
        className='target-handle' />
      <Handle
        id='2'
        type='source'
        position={Position.Right}
        isConnectableStart={true}
        isConnectableEnd={false}
        isConnectable={true}
        className='source-handle' />
    </>
  );

  const restHandles = (
    handles.map((props, _, array) => {
      const isConnectableStart = props.type === 'source';
      // const isConnectableEnd = props.type === 'target'
      const style: React.CSSProperties = {};
      if (isConnectableStart) {
        const filteredArray = array.filter(v => v.isConnectableStart);
        const index = filteredArray.findIndex(v => v.id === props.id);
        style.top = 50 / (filteredArray.length + 1) * (index + 1);
      } else {
        const filteredArray = array.filter(v => !v.isConnectableStart);
        const index = filteredArray.findIndex(v => v.id === props.id);
        style.top = 50 / (filteredArray.length + 1) * (index + 1);
      }

      return (
        <Handle
          key={props.id}
          id={props.id}
          type={props.type}
          position={props.position}
          isConnectableStart={isConnectableStart}
          isConnectableEnd={!isConnectableStart}
          isConnectable={true}
          style={style} />
      );
    })
  )

  const onResize: OnResize = useCallback((_, params) => {
    console.log('direction', params.direction)
    updateRect(data, params, getNodes())
  }, [data, getNodes, updateRect])

  return (
    <div
      className={`border-black w-full h-full rounded-md border-2 ${highlited ? 'bg-yellow-200' : ''}`}
      onMouseEnter={() => setToolbarVisible(true)}
      onMouseLeave={() => hideToolbarDelay()}
    >
      <TextEditor nodeId={nodeId} text={data.text ?? ''} />

      {/* rest container */}
      <NodeResizeControl 
        className='resize-control' 
        minWidth={100} minHeight={100}
        onResize={onResize}>
        <ResizeIcon />
      </NodeResizeControl>
      <div className='note-drag-handle' />
      {initHandles}
      {restHandles}
    </div>
  )
}

function ResizeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="#ff0071"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <polyline points="16 20 20 20 20 16" />
      <line x1="14" y1="14" x2="20" y2="20" />
      <polyline points="8 4 4 4 4 8" />
      <line x1="4" y1="4" x2="10" y2="10" />
    </svg>
  );
}
