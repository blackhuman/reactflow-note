// import { useState } from 'react'
import { ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Connection, NodeDragHandler, NodeMouseHandler, NodeTypes, OnConnectEnd, OnConnectStart, OnConnectStartParams, OnEdgesDelete, OnNodesDelete, Rect, XYPosition } from 'reactflow';
import ReactFlow, { Controls, Panel } from 'reactflow';
import BackgroundGrid from './BackgroundGrid';
import { GridNode } from './GridNode';
import { Gap, useLayout } from './LayoutManager';
import { Checkbox } from './components/ui/checkbox';
import { GridReactFlowJsonObject, readFlowData, useStoreLocal, writeFlowData } from './store';
import { GRID_NODE_TYPE_NAME, getReleatedAllNodes, isContains, useEdgesStateEx, useNodesStateEx, useOperationReset, useReactFlowEx } from './util';

function useCheckPositionInNode(): (position: XYPosition) => boolean {
  const {getNodes} = useReactFlowEx()
  return useCallback((position) => {
    const nodes = getNodes()
    return nodes.some(node => isContains({...node.position, width: node.width!, height: node.height!}, position))
  }, [getNodes])
}


function App() {

  const { screenToFlowPosition, flowToScreenPosition, addNode, hasNode, addEdge, afterDeleteEdge, insertNode, updateNodePosition, deleteNode, getNode, getZoom, getEdges } = useReactFlowEx()
  const layoutManager = useLayout()
  const [currentRect, setCurrentRect] = useState<Rect|null>(null)
  const connectStartRef = useRef<OnConnectStartParams>()
  const setConnecting = useStoreLocal(state => state.setConnecting)
  const [showGrid, setShowGrid] = useState(true)
  const [gap, setGap] = useState<Gap | null>(null)
  const checkPositionInNode = useCheckPositionInNode()
  const setHighlitedNodeIds = useStoreLocal(state => state.setHighlitedNodeIds)

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

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    const edges = getEdges()
    const relatedNodeIds = getReleatedAllNodes([node.id], edges)
    setHighlitedNodeIds(relatedNodeIds)
  }, [getEdges, setHighlitedNodeIds])

  const onPaneClick = useCallback(() => {
    setHighlitedNodeIds([])
  }, [setHighlitedNodeIds])

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
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
    >
      { showGrid && <BackgroundGrid
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
  const params = useParams();
  const flowId = params.flowId!
  const getFlow = useStoreLocal(state => state.getFlow)
  const [title, setTitle] = useState('')
  const navigate = useNavigate()
  const [grid, setGrid] = useStoreLocal(state => [state.grid, state.setGrid])
  const {getRect, getDefaultLayout} = useLayout()

  const restore = useCallback((flowData: GridReactFlowJsonObject) => {
    reset()
    setNodes(flowData.nodes || [])
    setEdges(flowData.edges || [])
  }, [reset, setEdges, setNodes])

  const save = useCallback(() => {
    const flowData = toObject()
    if (flowData.nodes.length === 0) return
    flowData.nodes.forEach(node => node.selected = false)
    writeFlowData(flowId, flowData)
  }, [flowId, toObject])

  useEffect(() => {
    save()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  const onInit = useCallback(() => {
    console.log('onInit')
    const flowMeta = getFlow(flowId)!
    if (!flowMeta) {
      navigate('/404')
      throw new Error('flow not exist')
    }
    setTitle(flowMeta.title)

    const flowData = readFlowData(flowId)
    if (flowData) {
      console.log('restore flow', flowId, flowData)
      const grid = getDefaultLayout(flowData.nodes)
      setGrid(grid)

      if (flowData.nodes.length > 0) {
        restore(flowData)
      } else {
        console.log('init flow')
        addNode({x: 0, y: 0}, false)
      }
    } else {
      throw new Error('flow not exist')
    }

  }, [addNode, flowId, getDefaultLayout, getFlow, navigate, restore, setGrid])

  useEffect(() => {
    setNodes(nodes => {
      return nodes.map(node => {
        const rect = getRect(node.data)
        node.position = rect
        return node
      })
    })
  }, [getRect, grid, setNodes])
  
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
      translateExtent={[[0, 0], [Infinity, Infinity]]}
      nodeExtent={[[0, 0], [Infinity, Infinity]]}
    >
      <Panel position='top-center'>
        {title}
      </Panel>
      <Panel position='top-left'>
        <Link to={'/'}>Dashboard</Link>
      </Panel>
      {props?.children}
    </ReactFlow>
  )
}

export default App

