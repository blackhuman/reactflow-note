import { useEffect, useState } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { useStoreLocal } from './store';
import { GridNodeData } from './util';
import TextEditor from './TextEditor';

export function GridNode({ data, id: nodeId }: NodeProps<GridNodeData>) {
  const [, setToolbarVisible] = useState(false);
  const handles = useStoreLocal(state => state.getHandles(nodeId));
  const isConnecting = useStoreLocal(state => state.isConnecting);
  const highlitedNodeIds = useStoreLocal(state => state.relatedNodeIds)
  const [highlited, setHighlited] = useState(false)

  useEffect(() => {
    const highlited = highlitedNodeIds.some(v => v === nodeId)
    setHighlited(highlited)
  }, [highlitedNodeIds, nodeId])

  function hideToolbarDelay() {
    setTimeout(() => setToolbarVisible(false), 500);
  }

  /* <NodeToolbar position={Position.Top}>
    <Button onClick={() => addHandler(Position.Top)}>Top</Button>
    <Button onClick={() => addHandler(Position.Left)}>Left</Button>
    <Button onClick={() => addHandler(Position.Right)}>Right</Button>
  </NodeToolbar> */
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
  );

  return (
    <div
      className={`border-black rounded-md border-2 w-auto h-auto ${highlited ? 'bg-yellow-200' : ''}`}
      onMouseEnter={() => setToolbarVisible(true)}
      onMouseLeave={() => hideToolbarDelay()}
    >
      <TextEditor nodeId={nodeId} text={data.text ?? ''} />

      {/* rest container */}
      <div className='note-drag-handle' />
      {initHandles}
      {restHandles}
    </div>
  );
}
