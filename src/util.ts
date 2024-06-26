import type { ConnectingHandle, Edge, Node, NodePositionChange, Rect, XYPosition } from 'reactflow';
import { applyNodeChanges, useEdgesState, useNodesState, useReactFlow, useUpdateNodeInternals } from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import { useLayout } from './LayoutManager';
import { useStoreLocal } from './store';
import { useCallback } from 'react';

export const GRID_NODE_TYPE_NAME = 'gridNode' as const

export interface Cell {
  row: number
  column: number
  text?: string 
}

interface A {

}

export function isContains(rect: Rect, position: XYPosition): boolean {
  return position.x >= rect.x && position.x <= rect.x + rect.width
    && position.y >= rect.y && position.y <= rect.y + rect.height
}

export type GridNodeData = Cell
export type GridEdgeData = A
export type GridNode = Node<GridNodeData>

export const useNodesStateEx: typeof useNodesState<GridNodeData> = (initialItems) => {
  const [nodes, setNodes] = useNodesState(initialItems)
  const updateNodeInternals = useUpdateNodeInternals()
  const { updateGrid, getRect } = useLayout()
  const setNodesEx: typeof setNodes = useCallback((nodes) => {
    setNodes(nodes)
    if (typeof nodes === 'function') return
    updateGrid(nodes)
    updateNodeInternals(nodes.map(node => node.id))
  }, [setNodes, updateGrid, updateNodeInternals])
  return [
    nodes,
    setNodesEx,
    (changes) => {
      const newNodes = applyNodeChanges(changes, nodes)
      const positionChangeNodeIds = changes.filter(change => change.type === 'position')
        .map(change => (change as NodePositionChange).id)

      updateGrid(newNodes)
      const updatedNodes = newNodes.map(node => {
        if (positionChangeNodeIds.includes(node.id)) return node
        const rect = getRect(node.data)
        node.position = rect
        return node
      })
      setNodes(updatedNodes)
    },
  ]
}

export const useEdgesStateEx: typeof useEdgesState = (initialItems) => {
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

export function useReactFlowEx() {
  const reactFlowInstance = useReactFlow<GridNodeData>()
  const {getNodes, setNodes, getEdges, setEdges, getNode, getZoom} = reactFlowInstance
  const [addHandle, deleteHandle] = useStoreLocal(state => [state.addHandle, state.deleteHandle])
  const updateNodeInternals = useUpdateNodeInternals()
  const {addEdges} = useReactFlow()
  const {getRect, findRectAt, findAdjacentNode, moveAllNodeToRight} = useLayout()

  function addNode(position: XYPosition, findInGrid: boolean = true): string | null {
    const nodes = getNodes()
    let rect: Rect = {x: position.x, y: position.y, width: 100, height: 100}
    let cell: Cell = {row: 0, column: 0}
    if (findInGrid) {
      [rect, cell] = findRectAt(position)!
    }
    const isNodeExist = nodes.some(n => n.data.row === cell.row && n.data.column === cell.column)
    if (isNodeExist) return null
    const existIds = [...nodes.map(n => Number(n.id)), 0]
    const nodeId = `${Math.max(...existIds) + 1}`
    const node = {
      id: nodeId,
      type: GRID_NODE_TYPE_NAME,
      position: {x: rect.x, y: rect.y},
      data: cell,
      style: {
        width: 100,
        height: 100,
      }
      // dragHandle: '.note-drag-handle'
    } as Node<Cell>
    
    nodes.push(node)
    setNodes(nodes)
    const leftNode = findAdjacentNode(node, 'left', nodes)
    const rightNode = findAdjacentNode(node, 'right', nodes)

    // 插入到两个Node中间时
    if (leftNode && rightNode) {
      let existEdge: Edge | undefined
      for (const edge of getEdges()) {
        if (edge.source === leftNode.id && edge.target === rightNode.id) {
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

    // 添加左右连线
    if (leftNode) {
      addEdge(
        {nodeId: leftNode.id, type: 'source'},
        {nodeId, type: 'target'}
      )
    }
    if (rightNode) {
      addEdge(
        {nodeId, type: 'source'},
        {nodeId: rightNode.id, type: 'target'}
      )
    }
    return nodeId
  }
  function insertNode(cell: Cell): void {
    const nodes = getNodes()
    const targetNodes = moveAllNodeToRight({
      row: cell.row, 
      column: cell.column
    }, nodes).reduce((acc, node) => {
      acc.set(node.id, node)
      return acc
    }, new Map<string, GridNode>())
    setNodes(nodes => nodes.map(node => {
      if (targetNodes.has(node.id)) {
        const targetNode = targetNodes.get(node.id)!
        node.position = targetNode.position
        return targetNode
      } else {
        return node
      }
    }))
    const rect = getRect(cell)
    addNode(rect)
  }
  function deleteNode(node: GridNode) {
    const nodes = getNodes()
    const leftNode = findAdjacentNode(node, 'left', nodes)
    const rightNode = findAdjacentNode(node, 'right', nodes)

    if (leftNode && rightNode) {
      addEdge(
        {nodeId: leftNode.id, type: 'source'},
        {nodeId: rightNode.id, type: 'target'}
      )
    }
  }
  function updateNodePosition(nodeId: string, position: XYPosition): void {
    setNodes(nodes => nodes.map(n => {
      if (n.id !== nodeId) return n
      const [rect, cell] = findRectAt(position)!
      n.position = rect
      n.data = {...n.data, ...cell}
      return n
    }))
  }
  function addEdge(source: ConnectingHandle, target: ConnectingHandle): void {
    const sourceHandleId = addHandle(source)
    const targetHandleId = addHandle(target)
    updateNodeInternals([source.nodeId, target.nodeId])
    requestAnimationFrame(() => {
      const edge: Edge = {
        id: `${source.nodeId}_${sourceHandleId}:${target.nodeId}_${targetHandleId}`,
        source: source.nodeId,
        sourceHandle: sourceHandleId,
        target: target.nodeId,
        targetHandle: targetHandleId,
      }
      addEdges(edge)
    })
  }
  function afterDeleteEdge(edge: Edge): void {
    console.log('afterDeleteEdge for egde', edge.id)
    requestAnimationFrame(() => {
      deleteHandle({nodeId: edge.source, handleId: edge.sourceHandle, type: 'source'})
      deleteHandle({nodeId: edge.target, handleId: edge.targetHandle, type: 'target'})
      updateNodeInternals([edge.source, edge.target])
    })
  }
  function deleteEdge(edge: Edge): void {
    console.log('deleteEdge')
    setEdges(edges => edges.filter(e => e.id !== edge.id))
  }
  function hasNode(cell: Cell): boolean {
    return getNodes().filter(node => node.data.row === cell.row && node.data.column === cell.column).length > 0
  }
  function updateText(nodeId: string, text: string): void {
    setNodes(nodes => nodes.map(node => {
      if (node.id !== nodeId) return node
      node.data.text = text
      return node
    }))
  }
  return {
    ...reactFlowInstance,
    addNode,
    deleteNode,
    // updateNode,
    updateNodePosition,
    addEdge,
    afterDeleteEdge,
    deleteEdge,
    insertNode,
    hasNode,
    getNode,
    getZoom,
    updateText,
  }
}

export function useOperationReset(): () => void {
  const {setNodes, setEdges} = useReactFlow()
  const clearHandle = useStoreLocal(state => state.clearHandle)
  return () => {
    setNodes([])
    setEdges([])
    clearHandle()
  }
}

function getRelatedNodes(originalNodeIds: string[], edges: Edge[], direction: 'incoming' | 'outgoing'): string[] {
  const relatedNodes = new Set<string>(originalNodeIds)
  const queue = [...originalNodeIds]
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    for (const edge of edges) {
      if (direction === 'incoming' && edge.target === nodeId) {
        relatedNodes.add(edge.source)
        queue.push(edge.source)
      }
      if (direction === 'outgoing' && edge.source === nodeId) {
        relatedNodes.add(edge.target)
        queue.push(edge.target)
      }
    }
  }
  return Array.from(relatedNodes)
}

export function getReleatedAllNodes(originalNodeIds: string[], edges: Edge[]): string[] {
  return [
    ...getRelatedNodes(originalNodeIds, edges, 'incoming'),
    ...getRelatedNodes(originalNodeIds, edges, 'outgoing'),
  ]
}