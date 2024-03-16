// import { useState } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css'
import ReactFlow, { Background, Controls, Handle, Position, ReactFlowProvider, applyNodeChanges, useEdgesState, useNodesState, useReactFlow, useStore, useStoreApi, useViewport } from 'reactflow';
import type {Dimensions, Node, NodeChange, NodeProps, NodeTypes, Rect, XYPosition} from 'reactflow'
import 'reactflow/dist/style.css';

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

function GridNode({sourcePosition, isConnectable, data, id}: NodeProps<GridNodeData>) {
  return (
    <div style={{width: '100px', height: '50px'}} className='border-black rounded-md border-2'>
      <p>{data.column}</p>
      <p>{id}</p>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  )
}

const GRID_NODE_TYPE_NAME = 'gridNode' as const
type GRID_NODE = Node<GridNodeData, string | undefined>

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

  const nodeTypes: NodeTypes = useMemo(() => ({
    [GRID_NODE_TYPE_NAME]: GridNode
  }), [])

  const { fitView } = useReactFlow()
  const store = useStoreApi()
  const {width, height} = store.getState()
  const [nodes, setNodes] = useNodesState<GridNodeData>([
    {
      id: '1',
      data: { column: 1 },
      position: { x: 0, y: 0 },
      type: GRID_NODE_TYPE_NAME, 
    },
    {
      id: '2',
      data: { column: 2 },
      position: { x: 100, y: 100 },
      type: GRID_NODE_TYPE_NAME,
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([{ id: '1-2', source: '1', target: '2' }]);
  const { x, y, zoom } = useViewport()
  const layoutManager = useMemo(() => LayoutManager.defaultManager, [])
  const gridLine = useMemo(() => layoutManager.getGridLinesInViewPort({x: 0, y: 0, width: 100, height: 100}), [])
  const [currentCell, setCurrentCell] = useState<Cell|null>(null)
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // console.log('onNodesChange', changes)
    // for (const change of changes) {
    //   if (change.type === 'position') {
    //     const node = nodes.find(n => n.id === change.id)
    //     if (node) {
    //       const cell = layoutManager.findCellAt(change.position!)
    //       if (cell) {
    //         node.data.column = cell.column
    //         setCurrentCell(cell)
    //       }
    //     }
      
    //   }
    // }
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [nodes, setNodes])

  // useEffect(() => {

  //   console.log({x, y, zoom})
  // }, [x, y, zoom])

  useEffect(() => {
    setTimeout(() => {
      const positionNodes = layoutManager.layoutGridNodes(nodes)
      setNodes(positionNodes)
    }, 1000);
    // window.requestAnimationFrame(() => {
    //   fitView();
    // });
  }, [edges, setNodes, fitView])

  const onNodeDrag = useCallback((event: React.MouseEvent, node: Node, nodes: Node[]) => {
    const position: XYPosition = {
      x: (event.clientX - x) / zoom,
      y: (event.clientY - y) / zoom
    }
    const cell = layoutManager.findCellAt(position)
    console.log(`onNodeDrag, event client xy: ${event.clientX},${event.clientY}`)
    console.log(`onNodeDrag, event page xy: ${event.pageX},${event.pageY}`)
    console.log(`onNodeDrag, event movement xy: ${event.movementX},${event.movementY}`)
    if (cell) {
      node.data.column = cell.column
      setCurrentCell(cell)
    }
  }, [x, y, zoom])

  const onNodeDragStop = useCallback((event: React.MouseEvent, currentNode: Node) => {
    if (currentCell !== null) {
      console.log('onNodeDragStop', currentNode.id, 'nodes', nodes)
      setNodes(nodes => nodes.map(node => {
        if (node.id === currentNode.id) {
          node.position = currentCell.rect as XYPosition
        }
        return node
      }))
    }
    setCurrentCell(null)
  }, [currentCell, setNodes, nodes])

  return (
    <ReactFlow
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
    >
      <svg height={30} width={500} className='z-10 absolute'>
        <text x={20} y={20}>{`coor: ${x.toFixed(3)},${y.toFixed(3)}. zoom: ${zoom.toFixed(2)}. width/height: ${width}/${height}`}</text>
      </svg>
      <BackgroundGrid 
        containerHeight={height}
        containerWidth={width}
        gridLine={gridLine} 
        viewBox={`${-x/zoom} ${-y/zoom} ${width/zoom} ${height/zoom}`} 
        currentCell={currentCell} />
      <Controls />
    </ReactFlow>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <Main/>
    </ReactFlowProvider>
  )
}

export default App
