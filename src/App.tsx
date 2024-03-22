// import { useState } from 'react'
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react';
import './App.css'
import ReactFlow, { Controls, Handle, Panel, Position, useReactFlow, useStoreApi, useUpdateNodeInternals, useViewport, useNodesState, useEdgesState } from 'reactflow';
import type {ConnectingHandle, Connection, Node, Edge, NodeDragHandler, NodeProps, NodeTypes, OnConnectEnd, OnConnectStart, OnConnectStartParams, OnNodesDelete, ReactFlowInstance, XYPosition, OnEdgesDelete} from 'reactflow'
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { useStoreLocal } from './store';
import { Cell, Gap, GridLine } from './LayoutManager';
import { Checkbox } from './components/ui/checkbox';

const GRID_NODE_TYPE_NAME = 'gridNode' as const

type GridNodeData = Cell

const useNodesStateEx: typeof useNodesState<GridNodeData> = (initialItems) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialItems)
  const updateNodeInternals = useUpdateNodeInternals()
  const layoutManager = useStoreLocal(state => state.layoutManager)
  const setNodesEx: typeof setNodes = (nodes) => {
    setNodes(nodes)
    if (typeof nodes === 'function') return
    updateNodeInternals(nodes.map(node => node.id))
    nodes.forEach(node => layoutManager.addNode(node.data))
  }
  return [
    nodes,
    setNodesEx,
    onNodesChange
  ]
}

const useEdgesStateEx: typeof useEdgesState = (initialItems) => {
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialItems)
  const {addEdge} = useReactFlowEx()
  const setEdgesEx: typeof setEdges = (edges) => {
    if (typeof edges === 'function') {
      setEdges(edges)
      return
    } else {
      for (const edge of edges) {
        addEdge({
          nodeId: edge.source,
          handleId: edge.sourceHandle,
          type: 'source',
        }, {
          nodeId: edge.target,
          handleId: edge.targetHandle,
          type: 'target',
        })
      }
    }
  }
  return [
    edges, 
    setEdgesEx, 
    onEdgesChange
  ]
}

type ReactFlowInstanceEx = ReactFlowInstance & {
  addNode(position: XYPosition): string
  insertNode(cell: Cell): void
  deleteNode(node: Node<GridNodeData>): void
  updateNode(nodeId: string, originData: GridNodeData, targetData: GridNodeData): void
  addEdge(source: ConnectingHandle, target: ConnectingHandle): void
  afterDeleteEdge(edge: Edge): void
  deleteEdge(edge: Edge): void
}

function useReactFlowEx(): ReactFlowInstanceEx {
  const reactFlowInstance = useReactFlow<GridNodeData>()//
  const {getNodes, addNodes, setNodes, getEdges, setEdges} = reactFlowInstance
  const [addHandle, deleteHandle] = useStoreLocal(state => [state.addHandle, state.deleteHandle])
  const updateNodeInternals = useUpdateNodeInternals()
  const {addEdges} = useReactFlow()
  const layoutManager = useStoreLocal(state => state.layoutManager)
  const addNode: ReactFlowInstanceEx['addNode'] = (position) => {
    const cell = layoutManager.findCellAt(position)!
    const nodeId = `${getNodes().length + 1}`
    cell.nodeId = nodeId
    layoutManager.addNode(cell)
    addNodes({
      id: nodeId,
      type: GRID_NODE_TYPE_NAME,
      position: cell.rect,
      data: cell,
    })

    const leftNodeId = layoutManager.findAdjacentNode(cell, 'left')?.nodeId ?? null
    const rightNodeId = layoutManager.findAdjacentNode(cell, 'right')?.nodeId ?? null

    if (leftNodeId && rightNodeId) {
      let existEdge: Edge | undefined
      for (const edge of getEdges()) {
        if (edge.source === leftNodeId && edge.target === rightNodeId) {
          existEdge = edge
          break
        }
      }
      if (existEdge) {
        console.log('deleteEdge', existEdge)
        deleteEdge(existEdge)
        afterDeleteEdge(existEdge)
      }
    }

    if (leftNodeId) {
      addEdge(
        {nodeId: leftNodeId, type: 'source'},
        {nodeId, type: 'target'}
      )
    }
    if (rightNodeId) {
      addEdge(
        {nodeId, type: 'source'},
        {nodeId: rightNodeId, type: 'target'}
      )
    }
    console.log('addNode', leftNodeId, rightNodeId)
    return nodeId
  }
  const insertNode: ReactFlowInstanceEx['insertNode'] = (cell) => {
    const targetNodes = layoutManager.moveAllNodeToRight(cell)
    console.log('insertNode', targetNodes)
    setNodes(nodes => nodes.map(node => {
      const targetNode = targetNodes.find(n => n.nodeId === node.id)
      if (targetNode) {
        node.position = targetNode.rect
        node.data = targetNode
      }
      return node
    }))
    addNode(cell.rect)
  }
  const deleteNode: ReactFlowInstanceEx['deleteNode'] = (node) => {
    layoutManager.deleteNode(node.data)
  }
  const updateNode: ReactFlowInstanceEx['updateNode'] = (nodeId, originData, targetData) => {
    setNodes(nodes => nodes.map(n => {
      if (n.id === nodeId) {
        n.position = targetData.rect
        n.data = targetData
        targetData.nodeId = originData.nodeId
        layoutManager.updateNode(originData, targetData)
        return n
      } else {
        return n
      }
    }))
  }
  const addEdge: ReactFlowInstanceEx['addEdge'] = (source, target) => {
    const sourceHandleId = addHandle(source)
    const targetHandleId = addHandle(target)
    updateNodeInternals([source.nodeId, target.nodeId])
    const edge: Edge = {
      id: `${source.nodeId}_${sourceHandleId}:${target.nodeId}_${targetHandleId}`,
      source: source.nodeId,
      sourceHandle: sourceHandleId,
      target: target.nodeId,
      targetHandle: targetHandleId,
    }
    addEdges(edge)
  }
  const afterDeleteEdge: ReactFlowInstanceEx['afterDeleteEdge'] = (edge) => {
    deleteHandle({nodeId: edge.source, handleId: edge.sourceHandle, type: 'source'})
    deleteHandle({nodeId: edge.target, handleId: edge.targetHandle, type: 'target'})
    updateNodeInternals([edge.source, edge.target])
  }
  const deleteEdge: ReactFlowInstanceEx['deleteEdge'] = (edge) => {
    setEdges(edges => edges.filter(e => e.id !== edge.id))
  }
  return {
    ...reactFlowInstance,
    addNode,
    deleteNode,
    updateNode,
    addEdge,
    afterDeleteEdge,
    deleteEdge,
    insertNode,
  }
}

function useOperationReset(): () => void {
  const {setNodes, setEdges} = useReactFlow()
  const clearHandle = useStoreLocal(state => state.clearHandle)
  return () => {
    setNodes([])
    setEdges([])
    clearHandle()
  }
}

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
        style={{width: '100px', height: '50px'}} className='border-black rounded-md border-2'
        onMouseEnter={() => setToolbarVisible(true)}
        onMouseLeave={() => hideToolbarDelay()}
        >
        <p>{`[${data.row},${data.column}]`}</p>
        <p>{nodeId}</p>
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
  currentCell: Cell | null
  containerWidth: number
  containerHeight: number
}

function BackgroundGrid(props: BackgroundGridProps) {
  const {gridLine, viewBox, currentCell, containerHeight, containerWidth} = props
  const {minX, maxX, minY, maxY, xList, yList} = gridLine
  const cellRect = currentCell?.rect
  return (
    <svg x='0' y='0' height={containerHeight} width={containerWidth} viewBox={viewBox} >
      <line x1='0' y1='-200' x2='0' y2='200'></line>
      <rect x='0' y='0' width={15} height={15}></rect>
      <line x1='-200' y1='0' x2='-200' y2='0'></line>
    {
      cellRect && 
      <rect 
        x={cellRect.x} y={cellRect.y} 
        width={cellRect.width} height={cellRect.height}
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

function App() {

  const { screenToFlowPosition, addNode, deleteNode, updateNode, addEdge, afterDeleteEdge, insertNode } = useReactFlowEx()
  const layoutManager = useStoreLocal(state => state.layoutManager)
  const [currentCell, setCurrentCell] = useState<Cell|null>(null)
  const connectStartRef = useRef<OnConnectStartParams>()
  const setConnecting = useStoreLocal(state => state.setConnecting)
  const [showGrid, setShowGrid] = useState(true)
  const [gap, setGap] = useState<Gap | null>(null)

  const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    addNode(position)
  }, [addNode, screenToFlowPosition])

  const onNodeDragStart: NodeDragHandler = useCallback(() => {
    // setConnecting(true)
  }, [])

  const onNodeDrag: NodeDragHandler = useCallback((event) => {
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    const cell = layoutManager.findCellAt(position)
    if (cell) {
      setCurrentCell(cell)
    }
  }, [layoutManager, screenToFlowPosition])

  const onNodeDragStop: NodeDragHandler = useCallback((_, currentNode) => {
    if (currentCell !== null) {
      updateNode(currentNode.id, currentNode.data, currentCell)
    }
    setCurrentCell(null)
  }, [currentCell, updateNode])

  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    connectStartRef.current = {...params}
    setConnecting(true)
  }, [setConnecting])

  const onPaneMouseMove: React.MouseEventHandler = useCallback((event) => {
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})

    const gap = layoutManager.findGapAt(position)
    setGap(gap)

    if (connectStartRef.current === undefined) return
    const cell = layoutManager.findCellAt(position)
    if (cell) {
      setCurrentCell(cell)
    }
  }, [layoutManager, screenToFlowPosition])

  const onConnectEnd: OnConnectEnd = useCallback((event) => {
    if (event instanceof TouchEvent) return

    const source = connectStartRef.current!.nodeId!
    connectStartRef.current = undefined
    setCurrentCell(null)
    setConnecting(false)

    // for create in empty cell
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    const cell = layoutManager.findCellAt(position)
    if (!cell || cell.nodeId) return
    const target = addNode(cell.rect)

    addEdge(
      { nodeId: source, type: 'source' }, 
      { nodeId: target, type: 'target' }
    )
  }, [setConnecting, screenToFlowPosition, layoutManager, addNode, addEdge])

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
    edges.forEach(afterDeleteEdge)
  }

  const onClickInsertNode = useCallback(() => {
    if (gap) {
      const cell = layoutManager.getCell(gap.cell.row, gap.cell.column + 1)
      insertNode(cell)
    }
  }, [gap, insertNode, layoutManager])


  return (
    <ReactFlowBase
      onNodeDrag={onNodeDrag}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onConnect={onConnect}
      onNodesDelete={onNodeDelete}
      onEdgesDelete={onEdgesDelete}
      isValidConnection={() => {
        return true
      }}
      onDoubleClick={onDoubleClick}
      onPaneMouseMove={onPaneMouseMove}
    >
      { showGrid && <BackgroundGridComponent
        currentCell={currentCell}
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
  currentCell: Cell | null
}

function BackgroundGridComponent(props: BackgroundGridComponentProps) {
  const {currentCell} = props
  const store = useStoreApi()
  const {width, height} = store.getState()
  const { x, y, zoom } = useViewport()
  const layoutManager = useStoreLocal(state => state.layoutManager)
  const gridLine = useMemo(() => layoutManager.getGridLinesInViewPort({x: 0, y: 0, width: 100, height: 100}), [layoutManager])
  
  return (

    <BackgroundGrid 
      containerHeight={height}
      containerWidth={width}
      gridLine={gridLine} 
      viewBox={`${-x/zoom} ${-y/zoom} ${width/zoom} ${height/zoom}`} 
      currentCell={currentCell}
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
  const layoutManager = useStoreLocal(state => state.layoutManager)

  const onInit = useCallback(() => {
    console.log('onInit')
    const cell = layoutManager.findCellAt({x: 0, y: 0})!
    addNode(cell.rect)
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

