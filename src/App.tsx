// import { useState } from 'react'
import { Button } from '@/components/ui/button';
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react';
import type { Connection, NodeDragHandler, NodeProps, NodeTypes, OnConnectEnd, OnConnectStart, OnConnectStartParams, OnEdgesDelete, OnNodesDelete, Rect, XYPosition } from 'reactflow';
import ReactFlow, { Controls, Handle, Panel, Position, useStoreApi, useViewport } from 'reactflow';
// import 'reactflow/dist/style.css';
import './App.css';
import { Gap, GridLine, useLayout } from './LayoutManager';
import { Checkbox } from './components/ui/checkbox';
import { useStoreLocal } from './store';
import { GRID_NODE_TYPE_NAME, GridNodeData, isContains, useEdgesStateEx, useNodesStateEx, useOperationReset, useReactFlowEx } from './util';
import TextEditor from './TextEditor';

function GridNode({data, id: nodeId}: NodeProps<GridNodeData>) {
  const [, setToolbarVisible] = useState(false)
  const handles = useStoreLocal(state => state.getHandles(nodeId))
  const isConnecting = useStoreLocal(state => state.isConnecting)

  function hideToolbarDelay() {
    setTimeout(() => setToolbarVisible(false), 500)
  }

  return (
    <>
      {/* <NodeToolbar position={Position.Top}>
        <Button onClick={() => addHandler(Position.Top)}>Top</Button>
        <Button onClick={() => addHandler(Position.Left)}>Left</Button>
        <Button onClick={() => addHandler(Position.Right)}>Right</Button>
      </NodeToolbar> */}
      <div
        style={{width: '100px', minHeight: '50px'}} className='border-black rounded-md border-2'
        onMouseEnter={() => setToolbarVisible(true)}
        onMouseLeave={() => hideToolbarDelay()}
        >
        <div className='note-drag-handle'>
        </div>
        <TextEditor nodeId={nodeId} text={data.text ?? ''}/>
        <Handle
          id='1'
          type='target'
          position={Position.Left}
          isConnectableStart={false}
          isConnectableEnd={true}
          isConnectable={true}
          style={{pointerEvents: `${isConnecting ? 'auto' : 'none'}`}}
          className='target-handle' 
          />
        <Handle
          id='2'
          type='source'
          position={Position.Right}
          isConnectableStart={true}
          isConnectableEnd={false}
          isConnectable={true}
          className='source-handle' 
          />
        {
          handles.map((props, _, array) => {
            const isConnectableStart = props.type === 'source'
            // const isConnectableEnd = props.type === 'target'
            const style: React.CSSProperties = {}
            if (isConnectableStart) {
              const filteredArray = array.filter(v => v.isConnectableStart)
              const index = filteredArray.findIndex(v => v.id === props.id)
              style.top = 50 / (filteredArray.length + 1) * (index + 1)
            } else {
              const filteredArray = array.filter(v => !v.isConnectableStart)
              const index = filteredArray.findIndex(v => v.id === props.id)
              style.top = 50 / (filteredArray.length + 1) * (index + 1)
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
                style={style}
                />
            )
          })
        }
      </div>
    </>
  )
}

interface BackgroundGridProps {
  gridLine: GridLine
  // offsetX: number
  // offsetY: number
  viewBox: string
  currentRect: Rect | null
  containerWidth: number
  containerHeight: number
}

function BackgroundGrid(props: BackgroundGridProps) {
  const {gridLine, viewBox, currentRect, containerHeight, containerWidth} = props
  const {minX, maxX, minY, maxY, xList, yList} = gridLine
  return (
    <svg x='0' y='0' height={containerHeight} width={containerWidth} viewBox={viewBox} >
    {
      currentRect && 
      <rect 
        x={currentRect.x} y={currentRect.y} 
        width={currentRect.width} height={currentRect.height}
        className="stroke-3 fill-red-500"
        ></rect>
    }
    <g>
      {
        // draw vertical lines
        xList.map((x, i) => {
          return (
            <line key={`x${i}`} x1={x} y1={minY} x2={x} y2={maxY} className="grid-separator grid-separator-vertical" />
          )
        })
      }
      {
        // draw horizontal lines
        yList.map((y, i) => {
          return (
            <line key={`y${i}`} x1={minX} y1={y} x2={maxX} y2={y} className='grid-separator' />
          )
        })
      }
    </g>
    </svg>
  )
}

function useCheckPositionInNode(): (position: XYPosition) => boolean {
  const {getNodes} = useReactFlowEx()
  return useCallback((position) => {
    const nodes = getNodes()
    return nodes.some(node => isContains({...node.position, width: node.width!, height: node.height!}, position))
  }, [getNodes])
}


function App() {

  const { screenToFlowPosition, flowToScreenPosition, addNode, hasNode, addEdge, afterDeleteEdge, insertNode, updateNodePosition, deleteNode, getNode, getZoom } = useReactFlowEx()
  const layoutManager = useLayout()
  const [currentRect, setCurrentRect] = useState<Rect|null>(null)
  const connectStartRef = useRef<OnConnectStartParams>()
  const setConnecting = useStoreLocal(state => state.setConnecting)
  const [showGrid, setShowGrid] = useState(true)
  const [gap, setGap] = useState<Gap | null>(null)
  const checkPositionInNode = useCheckPositionInNode()

  const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    if (checkPositionInNode(position)) return
    addNode(position)
  }, [addNode, checkPositionInNode, screenToFlowPosition])

  const onNodeDragStart: NodeDragHandler = useCallback(() => {
    // setConnecting(true)
  }, [])

  const onNodeDrag: NodeDragHandler = useCallback((event) => {
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    const [rect,] = layoutManager.findRectAt(position)!
    setCurrentRect(rect)
  }, [layoutManager, screenToFlowPosition])

  const onNodeDragStop: NodeDragHandler = useCallback((event, node) => {
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    updateNodePosition(node.id, position)
    setCurrentRect(null)
  }, [screenToFlowPosition, updateNodePosition])

  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    connectStartRef.current = {...params}
    setConnecting(true)
  }, [setConnecting])

  const onPaneMouseMove: React.MouseEventHandler = useCallback((event) => {
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})

    const gap = layoutManager.findGapAt(position)
    if (gap) {
      const zoom = getZoom()
      const {x: width, y: height} = {x: gap.rect.width * zoom, y: gap.rect.height * zoom}
      const {x, y} = flowToScreenPosition(gap.rect)
      gap.rect = {x, y, width, height}
    }
    setGap(gap)

    if (connectStartRef.current === undefined) return
    const [rect] = layoutManager.findRectAt(position)!
    setCurrentRect(rect)
  }, [flowToScreenPosition, getZoom, layoutManager, screenToFlowPosition])

  const onConnectEnd: OnConnectEnd = useCallback((event) => {
    if (event instanceof TouchEvent) return
    if (connectStartRef.current === undefined) return

    const source = connectStartRef.current!.nodeId!
    const sourceNode = getNode(source)!
    connectStartRef.current = undefined
    setCurrentRect(null)
    setConnecting(false)

    // for create in empty cell
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    const [rect,cell] = layoutManager.findRectAt(position)!
    if (hasNode(cell)) return
    const target = addNode(rect)

    if (sourceNode.data.row !== cell.row) {
      addEdge(
        { nodeId: source, type: 'source' }, 
        { nodeId: target, type: 'target' }
      )
    }
  }, [getNode, setConnecting, screenToFlowPosition, layoutManager, hasNode, addNode, addEdge])

  const onConnect = useCallback((params: Connection) => {
    const { source, target } = params
    if (source === null || target === null) return

    addEdge(
      {nodeId: source, type: 'source'}, 
      {nodeId: target, type: 'target'}
      )
  }, [addEdge])

  const onNodeDelete: OnNodesDelete = (nodes) => {
    nodes.forEach(deleteNode)
  }

  const onEdgesDelete: OnEdgesDelete = (edges) => {
    // edges.forEach(deleteEdge)
    edges.forEach(afterDeleteEdge)
  }

  const onClickInsertNode = useCallback(() => {
    if (gap) {
      insertNode(gap.cell)
    }
  }, [gap, insertNode])


  return (
    <ReactFlowBase
      onNodeDrag={onNodeDrag}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onConnect={onConnect}
      onEdgesDelete={onEdgesDelete}
      onNodesDelete={onNodeDelete}
      isValidConnection={() => {
        return true
      }}
      onDoubleClick={onDoubleClick}
      onPaneMouseMove={onPaneMouseMove}
    >
      { showGrid && <BackgroundGridComponent
        currentRect={currentRect}
        />}
      <Controls>
        <Checkbox checked={showGrid} onCheckedChange={checked => setShowGrid(checked === true)}/>
      </Controls>
      { gap &&
        <div 
          onClick={onClickInsertNode}
          className='bg-orange-200 absolute cursor-copy' 
          style={{
            top: gap.rect.y,
            left: gap.rect.x,
            height: gap.rect.height,
            width: gap.rect.width,
            zIndex: 1000,
          }}
        ></div>
      }
    </ReactFlowBase>
  )
}

interface BackgroundGridComponentProps {
  currentRect: Rect | null
}

function BackgroundGridComponent(props: BackgroundGridComponentProps) {
  const {currentRect: currentCell} = props
  const store = useStoreApi()
  const {width, height} = store.getState()
  const { x, y, zoom } = useViewport()
  const layoutManager = useLayout()
  const gridLine = useMemo(() => layoutManager.getGridLinesInViewPort({x: 0, y: 0, width: 100, height: 100}), [layoutManager])
  
  return (

    <BackgroundGrid 
      containerHeight={height}
      containerWidth={width}
      gridLine={gridLine} 
      viewBox={`${-x/zoom} ${-y/zoom} ${width/zoom} ${height/zoom}`} 
      currentRect={currentCell}
      />
  )
}

type ReactFlowProps = ComponentProps<typeof ReactFlow>

function ReactFlowBase(props: ReactFlowProps) {
  const nodeTypes: NodeTypes = useMemo(() => ({
    [GRID_NODE_TYPE_NAME]: GridNode
  }), [])

  const [nodes, setNodes, onNodesChange] = useNodesStateEx([])
  const [edges, setEdges, onEdgesChange] = useEdgesStateEx([])
  // const connectNodes = useOperationConnectNodes()
  const reset = useOperationReset()
  const { toObject, addNode } = useReactFlowEx()
  const layoutManager = useLayout()

  const onInit = useCallback(() => {
    console.log('onInit')
    const [rect] = layoutManager.findRectAt({x: 0, y: 0})!
    addNode(rect)
  }, [addNode, layoutManager])

  const flowKey = 'reactflow'//23

  const onSave = useCallback(() => {
    const flow = toObject();
    localStorage.setItem(flowKey, JSON.stringify(flow));
  }, [toObject]);

  const onRestore = useCallback(() => {
    const restoreFlow = async () => {
      const flow = JSON.parse(localStorage.getItem(flowKey)!);

      if (flow) {
        // const { x = 0, y = 0, zoom = 1 } = flow.viewport;
        reset()
        setNodes(flow.nodes || [])
        setEdges(flow.edges || [])
        // setViewport({ x, y, zoom });
      }
    };

    restoreFlow();
  }, [reset, setNodes, setEdges]);

  return (
    <ReactFlow
      {...props}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      zoomOnDoubleClick={false}
      onInit={onInit}
      defaultViewport={{x: 50, y: 50, zoom: 1}}
    >
      <Panel position="top-right">
        <Button onClick={onSave}>save</Button>
        <Button onClick={onRestore}>restore</Button>
      </Panel>
      {props?.children}
    </ReactFlow>
  )
}

export default App

