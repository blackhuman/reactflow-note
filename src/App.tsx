// import { useState } from 'react'
import { ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css'
import ReactFlow, { Controls, Handle, NodeToolbar, Panel, Position, ReactFlowProvider, applyEdgeChanges, applyNodeChanges, useReactFlow, useStore as useStoreReactFlow, useStoreApi, useUpdateNodeInternals, useViewport, useNodesState, useEdgesState } from 'reactflow';
import type {ConnectingHandle, Connection, Dimensions, Edge, EdgeChange, HandleProps, Node, NodeChange, NodeDragHandler, NodeProps, NodeTypes, OnConnect, OnConnectEnd, OnConnectStart, OnConnectStartParams, OnEdgesChange, OnNodesChange, ReactFlowInstance, Rect, XYPosition} from 'reactflow'
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import {StateCreator, create} from 'zustand'
import { UpdateIcon } from '@radix-ui/react-icons';

interface GridLine {
  xList: number[]
  yList: number[]
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface Cell {
  rect: Rect
  row: number
  column: number
  nodeId?: string
}

const GRID_NODE_TYPE_NAME = 'gridNode' as const
type GRID_NODE = Node<GridNodeData, string | undefined>

function zoomCell(cell: Cell | null, zoom: number): Cell | null {
  if (cell === null) return null
  return {
    ...cell,
    rect: {
      x: cell.rect.x * zoom,
      y: cell.rect.y * zoom,
      width: cell.rect.width * zoom,
      height: cell.rect.height * zoom
    }
  }
}

type Row = {
  index: number
  origin: number
  length: number
}

type Column = Row

class LayoutManager {

  // nodes: GRID_NODE[] = []
  cells: Cell[][] = []
  rows: Row[] = []
  columns: Column[] = []

  static defaultManager = new LayoutManager()

  constructor() {
    const initLength = 100
    const initCount = 10
    for (let naturalIndex = 0, index = -initCount; index < initCount; naturalIndex++, index++) {
      this.rows[naturalIndex] = {
        index,
        origin: index * initLength,
        length: initLength,
      }
      this.columns[naturalIndex] = {
        index,
        origin: index * initLength,
        length: initLength,
      }
    }
    console.log('rows', this.rows)
    console.log('columns', this.columns)
  }

  // getFirstCell(): Cell | null {
  //   return this.cells[0]
  // }

  // layoutGridNodes(nodes: GRID_NODE[]): GRID_NODE[] {
  //   this.nodes = nodes
  //   nodes.forEach(node => {
  //     node.position = { x: node.data.column * 100, y: 100 }
  //   })
  //   return this.nodes
  // }
  
  // addNodeToCell(node: GRID_NODE): GRID_NODE[] {
  //   this.nodes.push(node)
  //   for (const cell of this.cells) {
  //     if (cell.column === node.data.column && cell.row === node.data.row) {
  //       cell.nodeId = node.id
  //       break
  //     }
  //   }

  //   return this.nodes
  // }

  findCellAt(position: XYPosition): Cell | null {
    let row: Row | null = null
    for (const item of this.rows) {
      if (position.y < item.origin) break
      row = item
    }
    let column: Column | null = null
    for (const item of this.columns) {
      if (position.x < item.origin) break
      column = item
    }
    if (row === null || column === null) return null
    return {
      rect: {x: column.origin, y: row.origin, width: column.length, height: row.length},
      row: row.index,
      column: column.index
    }
  }

  // rect 限定区域
  getGridLinesInViewPort(rect: Rect): GridLine {
    console.time("getGridLinesInViewPort")
    const xList = this.columns.map(v => v.origin)
    const yList = this.rows.map(v => v.origin)
    const result: GridLine = {
      xList,
      yList,
      minX: xList[0],
      maxX: xList[xList.length - 1],
      minY: yList[0],
      maxY: yList[yList.length - 1],
    }
    console.timeEnd("getGridLinesInViewPort")
    return result
  }

  // getLeftNodeCell(cell: Cell): Cell | null {
    
  // }
}

type GridNodeData = {
  row: number
  column: number
  
}

type HandleMap = Record<string, HandleProps[]>

type AppStore = {
  isConnecting: boolean
  setConnecting(isConnecting: boolean): void
  handleMap: HandleMap
  clearHandle(): void
  getHandles(nodeId: string): HandleProps[]
  addHandle(handle: ConnectingHandle): string
}

const useNodesStateEx: typeof useNodesState = (initialItems) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialItems)
  const updateNodeInternals = useUpdateNodeInternals()
  return [
    nodes,
    (nodes) => {
      setNodes(nodes)
      if (typeof nodes === 'function') return
      updateNodeInternals(nodes.map(node => node.id))
    },
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

type NodeType = {
  cell: Cell
  data: GridNodeData
}

type ReactFlowInstanceEx = ReactFlowInstance & {
  addNode(node: NodeType): string
  updateNode(nodeId: string, modify: (node: Node) => void): void
  addEdge(source: ConnectingHandle, target: ConnectingHandle): void
}

function useReactFlowEx(): ReactFlowInstanceEx {
  const reactFlowInstance = useReactFlow()
  const {getNodes, addNodes, getNode, setNodes, setEdges, getEdges} = reactFlowInstance
  const addHandle = useStoreLocal(state => state.addHandle)
  const updateNodeInternals = useUpdateNodeInternals()
  const {addEdges} = useReactFlow()
  const addNode: ReactFlowInstanceEx['addNode'] = ({cell, data}) => {
    LayoutManager.defaultManager
    const nodeId = `${getNodes().length + 1}`
    addNodes({
      id: nodeId,
      type: GRID_NODE_TYPE_NAME,
      position: cell.rect,
      data,
    })
    return nodeId
  }
  const updateNode: ReactFlowInstanceEx['updateNode'] = (nodeId, modify) => {
    setNodes(nodes => nodes.map(n => {
      if (n.id === nodeId) {
        modify(n)
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
  return {
    ...reactFlowInstance,
    addNode,
    updateNode,
    addEdge,
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

interface ReactflowActionStore {

}

const reactflowActionStore: StateCreator<ReactflowActionStore, [], [], ReactflowActionStore> = (set, get) => {
  return {

  }
}

const baseStore: StateCreator<AppStore, [], [], AppStore> = (set, get) => {
  return {
    isConnecting: false,
    setConnecting(isConnecting) {
      set(() => ({isConnecting}))
      console.log('isConnectings', get().isConnecting)
    },
    handleMap: {},
    clearHandle() {
      set({handleMap: {}})
    },
    getHandles(nodeId) {
      return get().handleMap[nodeId] ?? []
    },
    addHandle: (handle): string => {
      const handles = get().handleMap[handle.nodeId] ?? []
      const type = handle.type
      if (handle.handleId === undefined) {
        handle.handleId = `${type}_${handles.length+1}`
      }
      set((state): Pick<AppStore, 'handleMap'> => {
        const newHandle: HandleProps = {
          id: handle.handleId!,
          type,
          position: type === 'source' ? Position.Right : Position.Left,
          isConnectable: true,
          isConnectableStart: type==='source',
          isConnectableEnd: type==='target',
        }
        return {handleMap: {...state.handleMap, [handle.nodeId]: [...handles, newHandle]}}
      })
      return handle.handleId!
    },
  }
}

const useStoreLocal = create<AppStore & ReactflowActionStore>((...a) => {
  return {
    ...baseStore(...a),
    ...reactflowActionStore(...a),
  }
})

function GridNode({sourcePosition, isConnectable, data, id: nodeId}: NodeProps<GridNodeData>) {
  const [toolbarVisible, setToolbarVisible] = useState(false)
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
        <p>{data.column}</p>
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
  const {minX, maxX, minY, maxY} = gridLine
  // console.log('viewBox', viewBox)
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
    {
      // draw vertical lines
      gridLine.xList.map((x, i) => {
        return (
          <line key={`x${i}`} x1={x} y1={minY} x2={x} y2={maxY} className="stroke-1 stroke-black" />
        )
      })
    }
    {
      // draw horizontal lines
      gridLine.yList.map((y, i) => {
        return (
          <line key={`y${i}`} x1={minX} y1={y} x2={maxX} y2={y} className='stroke-1 stroke-black' />
        )
      })
    }
    </svg>
  )
}

function Main() {

  const { fitView, screenToFlowPosition, toObject, addNode, updateNode, addEdge } = useReactFlowEx()
  const layoutManager = useMemo(() => LayoutManager.defaultManager, [])
  const [currentCell, setCurrentCell] = useState<Cell|null>(null)
  const connectStartRef = useRef<OnConnectStartParams>()

  const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
      const cell = layoutManager.findCellAt(position)
      if (cell) {
        console.log('dblclick add Node', cell)
        addNode({
          cell,
          data: { column: cell.column, row: cell.row },
        })
      }
  }, [addNode, layoutManager, screenToFlowPosition])

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

  const onNodeDragStop: NodeDragHandler = useCallback((event, currentNode) => {
    if (currentCell !== null) {
      updateNode(currentNode.id, node => node.position = currentCell.rect as XYPosition)
    }
    setCurrentCell(null)
  }, [currentCell, updateNode])

  const onConnectStart: OnConnectStart = useCallback((event, params) => {
    connectStartRef.current = {...params}
  }, [])

  const onPaneMouseMove: React.MouseEventHandler = useCallback((event) => {
    if (connectStartRef.current === undefined) return
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    const cell = layoutManager.findCellAt(position)
    if (cell) {
      setCurrentCell(cell)
    }
  }, [layoutManager, screenToFlowPosition])

  const onConnectEnd: OnConnectEnd = useCallback((event) => {
    if (event instanceof TouchEvent) return

    const originNodeId = connectStartRef.current!.nodeId!
    connectStartRef.current = undefined

    // for create in empty cell
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    const cell = layoutManager.findCellAt(position)
    if (cell === null) return
    const newNodeId = addNode({
      cell,
      data: { column: 1, row: 1 },
    })

    addEdge(
      { nodeId: originNodeId, type: 'source' }, 
      { nodeId: newNodeId, type: 'target' }
    )
  }, [screenToFlowPosition, layoutManager, addNode, addEdge])

  const onConnect = useCallback((params: Connection) => {
    const { source, target } = params
    if (source === null || target === null) return

    addEdge({nodeId: source, type: 'source'}, {nodeId: target, type: 'target'})
  }, [addEdge])

  return (
    <ReactFlowBase
      onNodeDrag={onNodeDrag}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onConnect={onConnect}
      isValidConnection={() => {
        return true
      }}
      onDoubleClick={onDoubleClick}
      onPaneMouseMove={onPaneMouseMove}
    >
      <BackgroundGridComponent
        currentCell={currentCell}
        />
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
  const layoutManager = useMemo(() => LayoutManager.defaultManager, [])
  const gridLine = useMemo(() => layoutManager.getGridLinesInViewPort({x: 0, y: 0, width: 100, height: 100}), [])
  
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

  const [nodes, setNodes, onNodesChange] = useNodesStateEx([{
    id: '1',
    data: { column: 1, row: 1 },
    position: {x: 0, y: 0},
    type: GRID_NODE_TYPE_NAME,
  }])
  const [edges, setEdges, onEdgesChange] = useEdgesStateEx([])
  // const connectNodes = useOperationConnectNodes()
  const reset = useOperationReset()
  const setConnecting = useStoreLocal(state => state.setConnecting)
  const { fitView, screenToFlowPosition, toObject, addNode, updateNode, addEdge } = useReactFlowEx()

  const flowKey = 'reactflow'

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
  }, [setNodes, setEdges]);

  return (
    <ReactFlow
      {...props}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      zoomOnDoubleClick={false}
    >
      <Controls />
      <Panel position="top-right">
        <Button onClick={onSave}>save</Button>
        <Button onClick={onRestore}>restore</Button>
      </Panel>
      {props?.children}
    </ReactFlow>
  )
}

function App() {
  return (
    <div className='h-screen w-screen'>
      <ReactFlowProvider>
        <Main/>
      </ReactFlowProvider>
    </div>
  )
}

export default App

