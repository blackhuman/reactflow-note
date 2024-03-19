// import { useState } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css'
import ReactFlow, { Controls, Handle, NodeToolbar, Position, ReactFlowProvider, addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow, useStoreApi, useUpdateNodeInternals, useViewport } from 'reactflow';
import type {Connection, Dimensions, Edge, EdgeChange, HandleProps, Node, NodeChange, NodeProps, NodeTypes, OnConnect, OnConnectEnd, OnConnectStart, OnConnectStartParams, OnEdgesChange, OnNodesChange, ReactFlowInstance, Rect, XYPosition} from 'reactflow'
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import {create} from 'zustand'

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

class LayoutManager {

  nodes: GRID_NODE[] = []
  cells: Cell[] = []

  static defaultManager = new LayoutManager()
  static {
    this.defaultManager.initCells()
  }

  initCells() {
    const initDimension: Dimensions = {width: 100, height: 100}
    const initRow = 10
    const initColumn = 10
    for (let row = -initRow; row < initRow; row++) {
      for (let column = -initColumn; column < initColumn; column++) {
        const rect: Rect = {
          x: column * initDimension.width,
          y: row * initDimension.height,
          width: initDimension.width,
          height: initDimension.height
        }
        this.cells.push({rect, row, column})
      }
    }
  }

  getFirstCell(): Cell | null {
    return this.cells[0]
  }

  layoutGridNodes(nodes: GRID_NODE[]): GRID_NODE[] {
    this.nodes = nodes
    nodes.forEach(node => {
      node.position = { x: node.data.column * 100, y: 100 }
    })
    return this.nodes
  }
  
  addNodeToCell(node: GRID_NODE): GRID_NODE[] {
    this.nodes.push(node)
    for (const cell of this.cells) {
      if (cell.column === node.data.column && cell.row === node.data.row) {
        cell.nodeId = node.id
        break
      }
    }

    return this.nodes
  }

  findCellAt(position: XYPosition): Cell | null {
    for (const cell of this.cells) {
      if (cell.rect.x <= position.x && position.x <= cell.rect.x + cell.rect.width &&
          cell.rect.y <= position.y && position.y <= cell.rect.y + cell.rect.height) {
        return {...cell}
      }
    }
    return null
  }

  getGridLinesInViewPort(rect: Rect): GridLine {
    console.time("getGridLinesInViewPort")
    const result: GridLine = {
      xList: this.cells.map(cell => cell.rect.x),
      yList: this.cells.map(cell => cell.rect.y),
      minX: -1000,
      maxX: 1000,
      minY: -1000,
      maxY: 1000
    }
    console.timeEnd("getGridLinesInViewPort")
    return result
  }
}

type GridNodeData = {
  row: number
  column: number
  
}

type HandlePropsEx = HandleProps & {
  isInitialHandle: boolean,
}

type HandleMap = Record<string, HandlePropsEx[]>

type AppStore = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setNode: (nodeId: string, c: (node: Node) => void) => void
  addNode: (node: Omit<Node, 'id'>) => string
  getNode: (nodeId: string) => Node | null
  handleMap: HandleMap
  getHandles(nodeId: string): HandlePropsEx[]
  addHandle(nodeId: string, type: 'source' | 'target', isInitialHandle: boolean): string
  connectNodes(sourceNodeId: string, targetNodeId: string): void
  isConnecting: boolean
  setConnecting(isConnecting: boolean): void
  reset(): void
}

const useStore = create<AppStore>((set, get) => ({
  nodes: [],
  edges: [],
  isConnecting: false,
  setConnecting(isConnecting) {
      set({isConnecting})
  },
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setNodes: (nodes: Node[]) => {
    set({ nodes });
  },
  setNode: (nodeId, c) => {
    const node = get().nodes.filter(n => n.id === nodeId)[0]
    if (node === undefined) return
    c(node)
    set({ nodes: [...get().nodes, node]})
  },
  addNode: (node) => {
    const newNode = {
      ...node,
      type: GRID_NODE_TYPE_NAME,
      id: String(get().nodes.length + 1)
    }
    get().addHandle(newNode.id, 'source', true)
    get().addHandle(newNode.id, 'target', true)
    set({ nodes: [...get().nodes, newNode] })
    return newNode.id
  },
  getNode: (nodeId: string) => {
    return get().nodes.filter(n => n.id === nodeId)[0]
  },
  setEdges: (edges: Edge[]) => {
    set({ edges });
  },
  handleMap: {},
  getHandles(nodeId) {
    return get().handleMap[nodeId] ?? []
  },
  addHandle: (nodeId, type, isInitialHandle): string => {
    let handleId = ''
    set((state): Pick<AppStore, 'handleMap'> => {
      const handles = state.handleMap[nodeId] ?? []
      handleId = `${type}_${handles.length+1}_${isInitialHandle}`
      const newHandle: HandlePropsEx = {
        id: handleId,
        type,
        position: type === 'source' ? Position.Right : Position.Left,
        isConnectable: true,
        isConnectableStart: type==='source',
        isConnectableEnd: type==='target',
        isInitialHandle: isInitialHandle,
      }
      return {handleMap: {...state.handleMap, [nodeId]: [...handles, newHandle]}}
    })
    return handleId
  },
  connectNodes: (sourceNodeId: string, targetNodeId: string) => {
    const addHandle = get().addHandle
    const sourceHandleId = addHandle(sourceNodeId, 'source', false)
    const targetHandleId = addHandle(targetNodeId, 'target', false)
    const edge: Edge = {
      id: `${sourceNodeId}_${sourceHandleId}:${targetNodeId}_${targetHandleId}`,
      source: sourceNodeId,
      sourceHandle: sourceHandleId,
      target: targetNodeId,
      targetHandle: targetHandleId,
    }
    get().setEdges([...get().edges, edge])
  },
  reset() {
    get().setNodes([])
    get().setEdges([])
    get().handleMap = {}
  },
}))

function GridNode({sourcePosition, isConnectable, data, id: nodeId}: NodeProps<GridNodeData>) {
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const handles = useStore(state => state.getHandles(nodeId))
  const isConnecting = useStore(state => state.isConnecting)

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
        {
          handles.map((props, _, array) => {
            const initialSourceHandleClass = props.isInitialHandle && props.type === 'source' ? 'source-handle' : ''
            const initialTargetHandleClass = props.isInitialHandle && props.type === 'target' ? 'target-handle' : ''
            const isConnectableStart = props.type === 'source'
            const isConnectableEnd = props.type === 'target'
            const style: React.CSSProperties = {}
            if (!props.isInitialHandle) {
              if (isConnectableStart) {
                const filteredArray = array.filter(v => !v.isInitialHandle && v.isConnectableStart)
                const index = filteredArray.findIndex(v => v.id === props.id)
                style.top = 50 / (filteredArray.length + 1) * (index + 1)
              } else {
                const filteredArray = array.filter(v => !v.isInitialHandle && !v.isConnectableStart)
                const index = filteredArray.findIndex(v => v.id === props.id)
                style.top = 50 / (filteredArray.length + 1) * (index + 1)
              }
            } else {
              if (isConnectableEnd) {
                // style.zIndex = isConnecting ? 1000 : 0
                style.pointerEvents = isConnecting ? 'auto' : 'none'
                // style.opacity = isConnecting ? 1 : 1
                // console.log('style', style)
              }
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
                className={`${initialSourceHandleClass} ${initialTargetHandleClass}`} 
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
  currentTargetCell: Cell | null
  containerWidth: number
  containerHeight: number
}

function BackgroundGrid(props: BackgroundGridProps) {
  const {gridLine, viewBox, currentCell, currentTargetCell, containerHeight, containerWidth} = props
  const {minX, maxX, minY, maxY} = gridLine
  // console.log('viewBox', viewBox)
  const cellRect = currentCell?.rect
  const targetCellRect = currentTargetCell?.rect
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
      targetCellRect && 
      <rect 
        x={targetCellRect.x} y={targetCellRect.y} 
        width={targetCellRect.width} height={targetCellRect.height}
        className="stroke-3 fill-yellow-500"
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

  const nodeTypes: NodeTypes = useMemo(() => ({
    [GRID_NODE_TYPE_NAME]: GridNode
  }), [])

  const {
    nodes, setNode, addNode, setNodes, onNodesChange,
    edges, onEdgesChange,
    connectNodes,
    reset, setConnecting,
  } = useStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setNode: state.setNode,
    addNode: state.addNode,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    connectNodes: state.connectNodes,
    reset: state.reset,
    setConnecting: state.setConnecting,
  }))

  const updateNodeInternals = useUpdateNodeInternals()
  const { fitView, screenToFlowPosition } = useReactFlow()
  const store = useStoreApi()
  const {width, height} = store.getState()
  const { x, y, zoom } = useViewport()
  const layoutManager = useMemo(() => LayoutManager.defaultManager, [])
  const gridLine = useMemo(() => layoutManager.getGridLinesInViewPort({x: 0, y: 0, width: 100, height: 100}), [])
  const [currentCell, setCurrentCell] = useState<Cell|null>(null)
  const [currentTargetCell, setCurrentTargetCell] = useState<Cell|null>(null)

  useEffect(() => {
    const nodeId = addNode({
      data: { column: 1, row: 1 },
      position: {x: 0, y: 0},
    })
    updateNodeInternals(nodeId)
    return () => reset()
  }, [])

  useEffect(() => {

    const listener = (event: MouseEvent) => {
      const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
      const cell = layoutManager.findCellAt(position)
      if (cell) {
        console.log('dblclick add Node')
        addNode({
          position: {x: cell.rect.x, y: cell.rect.y},
          data: { column: cell.column, row: cell.row },
          type: GRID_NODE_TYPE_NAME,
        })
      }
    }
    document.addEventListener('dblclick', listener)  
    return () => {
      document.removeEventListener('dblclick', listener)
    }
  }, [zoom])

  const onInit = useCallback((_: ReactFlowInstance<NodeData, EdgeData>) => {
    // const nodeId = addNode({
    //   data: { column: 1, row: 1 },
    //   position: {x: 0, y: 0},
    // })
    // updateNodeInternals(nodeId)

    console.log('onInit')
  }, [])

  const onNodeDrag = useCallback((event: React.MouseEvent, node: Node, nodes: Node[]) => {
    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    const cell = layoutManager.findCellAt(position)
    if (cell) {
      node.data.column = cell.column
      setCurrentCell(cell)
    }
  }, [x, y, zoom])

  const onNodeDragStop = useCallback((event: React.MouseEvent, currentNode: Node) => {
    if (currentCell !== null) {
      setNode(currentNode.id, node => node.position = currentCell.rect as XYPosition)
    }
    setCurrentCell(null)
  }, [currentCell, setNode, nodes])

  interface Refs {
    hasConnected: boolean
  }
  const ref = useRef<Refs>({
    hasConnected: false
  })
  const isConnectStartRef = useRef<OnConnectStartParams>()
  const onConnectStart: OnConnectStart = useCallback((event, params) => {
    isConnectStartRef.current = {...params}
    ref.current.hasConnected = false
    setConnecting(true)
  }, [setConnecting])

  const onConnectEnd: OnConnectEnd = useCallback((event) => {
    const isConnectStart = {...isConnectStartRef.current}
    isConnectStartRef.current = undefined
    setCurrentTargetCell(null)
    setConnecting(false)
    if (ref.current.hasConnected) return
    if (event instanceof TouchEvent) return

    const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
    const cell = layoutManager.findCellAt(position)
    if (cell === null) return
    const newNodeId = String(nodes.length + 1) 
    const newNodeDef: Node<GridNodeData> = {
      id: newNodeId,
      position: {x: cell.rect.x, y: cell.rect.y},
      data: { column: 1, row: 1 },
      type: GRID_NODE_TYPE_NAME,
    }
    addNode(newNodeDef)

    const originalNodeId = isConnectStart.nodeId!

    connectNodes(originalNodeId, newNodeId)
    updateNodeInternals([originalNodeId, newNodeId])
  }, [nodes, setNodes, store, ref])

  const onConnect = useCallback((params: Connection) => {
    const { source, target } = params
    if (source === null || target === null) return
    ref.current.hasConnected = true
    connectNodes(source, target)
    updateNodeInternals([source, target])
  }, [connectNodes, updateNodeInternals])

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      // console.log('mousemove', event.clientX, event.clientY)
      // const elems = document.elementsFromPoint(event.clientX, event.clientY);
      // console.log('elems', elems)
      if (isConnectStartRef.current === undefined) return
      const position = screenToFlowPosition({x: event.clientX, y: event.clientY})
      const cell = layoutManager.findCellAt(position)
      if (cell) {
        setCurrentTargetCell(cell)
      }
    }
    document.addEventListener('mousemove', listener)
    return (() => document.removeEventListener('mousemove', listener))
  }, [layoutManager, screenToFlowPosition])

  // const storeApi = useStoreApi()
  // useEffect(() => {
  //   storeApi.subscribe((state) => {
  //     console.log('state', state)
  //   })
  // }, [storeApi])

  return (
    <ReactFlow
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      // onClickConnectStart={() => console.log('onClickConnectStart')}
      // onClickConnectEnd={() => console.log('onClickConnectEnd')}
      onConnect={onConnect}
      isValidConnection={() => {
        return true
      }}
      onInit={onInit}
      zoomOnDoubleClick={false}
    >
      <BackgroundGrid 
        containerHeight={height}
        containerWidth={width}
        gridLine={gridLine} 
        viewBox={`${-x/zoom} ${-y/zoom} ${width/zoom} ${height/zoom}`} 
        currentCell={currentCell}
        currentTargetCell={currentTargetCell} />
      <Controls />
    </ReactFlow>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <div className='h-screen w-screen'>
        <Main/>
      </div>
    </ReactFlowProvider>
  )
}

export default App

