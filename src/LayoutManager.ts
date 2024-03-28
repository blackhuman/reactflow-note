import { useCallback, useMemo } from "react"
import type { Dimensions, Rect } from 'reactflow'
import { XYPosition } from "reactflow"
import { Column, Row, useStoreLocal } from './store'
import { Cell, GridNode, isContains } from "./util"

export interface GridLine {
  xList: number[]
  yList: number[]
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type Gap = {
  rect: Rect
  cell: Cell
}

export type Grid = {
  rows: Map<number, Row>
  columns: Map<number, Column>
}

export function findRectAtWithGrid(position: XYPosition, grid: Grid): [Rect, Cell] | null {
  let row: Row | undefined
  for (const [, item] of grid.rows.entries()) {
    if (position.y < item.origin) break
    row = item
  }
  let column: Column | undefined
  for (const [, item] of grid.columns.entries()) {
    if (position.x < item.origin) break
    column = item
  }
  if (!row || !column) return null
  return [
    {x: column.origin, y: row.origin, width: column.length, height: row.length},
    {row: row.index, column: column.index}
  ]
}

export function useLayout() {
  const initLength = 100
  const initCount = 10
  const initGap = 10

  const [grid, setGrid] = useStoreLocal(state => [state.grid, state.setGrid])
  const maxGridLines = useStoreLocal(state => state.maxGridLines)

  const refreshMaxGridLines = useCallback((nodes: GridNode[]) => {
    const rowsMax = maxGridLines.rows
    const columnsMax = maxGridLines.columns
    for (const node of nodes) {
      const row = node.data.row
      const height = node.height ?? initLength
      const rowMax = rowsMax.get(row)
      if (!rowMax || height > rowMax) {
        rowsMax.set(row, height)
      }
  
      const column = node.data.column
      const width = node.width ?? initLength
      const columnMax = columnsMax.get(column)
      if (!columnMax || width > columnMax) {
        columnsMax.set(column, width)
      }
    }
  }, [maxGridLines.columns, maxGridLines.rows])

  const _updateGrid = useCallback((cell: Cell, dimensions: Dimensions, grid: Grid): Grid => {
    const newGrid: Grid = {
      rows: new Map(grid.rows),
      columns: new Map(grid.columns),
    }

    // pan move right or bottom Cells in Grid
    const rowOffset = dimensions.height - grid.rows.get(cell.row)!.length
    const columnOffset = dimensions.width - grid.columns.get(cell.column)!.length

    const newRows = newGrid.rows
    const newColumns = newGrid.columns
  
    console.log('_updateRect', cell, dimensions, newGrid)
    // update current Cell in Grid
    const maxRows = maxGridLines.rows
    const maxColumns = maxGridLines.columns
    newRows.get(cell.row)!.length = Math.max(maxRows.get(cell.row)!, dimensions.height)
    newColumns.get(cell.column)!.length = Math.max(maxColumns.get(cell.column)!, dimensions.width)
  
    // newRows.forEach((row) => {
    //   if (row.index > cell.row) {
    //     row.origin += rowOffset
    //   }
    // })
    // newColumns.forEach((column) => {
    //   if (column.index > cell.column) {
    //     column.origin += columnOffset
    //   }
    // })
    return newGrid
  }, [maxGridLines.columns, maxGridLines.rows])
  
  const getDefaultLayout = useCallback((nodes: GridNode[]): Grid => {
    // default Grid
    const grid: Grid =  {
      rows: new Map<number, Row>(),
      columns: new Map<number, Column>(),
    }
    const rows = grid.rows
    const columns = grid.columns
    const rowsMax = maxGridLines.rows
    const columnsMax = maxGridLines.columns
    for (let index = -initCount; index < initCount; index++) {
      rows.set(index, {
        index,
        origin: index * (initLength + initGap),
        length: initLength,
      })
      rowsMax.set(index, initLength)
  
      columns.set(index, {
        index,
        origin: index * (initLength + initGap),
        length: initLength,
      })
      columnsMax.set(index, initLength)
    }

    refreshMaxGridLines(nodes)
  
    for(const node of nodes) {
      const newGrid = _updateGrid(node.data, {width: node.width ?? initLength, height: node.height ?? initLength}, grid)
      grid.rows = newGrid.rows
      grid.columns = newGrid.columns
    }
    
    return grid
  }, [_updateGrid, maxGridLines.columns, maxGridLines.rows, refreshMaxGridLines])
  

  const getRect = useCallback((cell: Cell): Rect => {
    const row = grid.rows.get(cell.row)!
    const column = grid.columns.get(cell.column)!
    return {x: column.origin, y: row.origin, width: column.length, height: row.length}
  }, [grid])

  const findRectAt = useCallback((position: XYPosition): [Rect, Cell] | null => {
    const result = findRectAtWithGrid(position, grid)
    // console.log('findRectAt result', result)
    return result
  }, [grid])

  // cell width is not included gap
  const findGapAt = useCallback((position: XYPosition): Gap | null => {
    const result = findRectAt(position)
    if (!result) return null
    const [rect,cell] = result
    if (!rect) return null
    const gapRect = {
      x: rect.x + rect.width, 
      y: rect.y, 
      width: initGap, 
      height: rect.height
    }
    if (isContains(gapRect, position)) return {rect: gapRect, cell}
    return null
  }, [findRectAt])

  // rect 限定区域
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const gridLinesInViewPort = useMemo((): GridLine => {
    // console.time("getGridLinesInViewPort")
    const xList = [...grid.columns.values()].flatMap(v => [v.origin, v.origin + v.length])
    const yList = [...grid.rows.values()].flatMap(v => [v.origin, v.origin + v.length])
    
    // minXX 画边缘
    const result: GridLine = {
      xList,
      yList,
      minX: xList[0],
      maxX: xList[xList.length - 1],
      minY: yList[0],
      maxY: yList[yList.length - 1],
    }
    // console.timeEnd("getGridLinesInViewPort")
    return result
  }, [grid])

  const moveAllNodeToRight = useCallback((baseCell: Cell, nodes: GridNode[]): GridNode[] => {
    return nodes.filter(node => node.data.column > baseCell.column)
      .map(node => {
        node.data.column += 1
        node.position = getRect(node.data)
        return node
      })
  }, [getRect])

  const findAdjacentNode = useCallback((node: GridNode, adjacent: 'left' | 'right', nodes: GridNode[]): GridNode | null => {
    nodes = nodes.filter(n => n.data.row === node.data.row)
      .sort((a, b) => a.data.column - b.data.column)
    const index = nodes.findIndex(n => n.id === node.id)
    if (index === -1) return null
    if (adjacent === 'left') {
      if (index - 1 < 0) return null
      return nodes[index - 1]
    } else {
      if (index + 1 >= nodes.length) return null
      return nodes[index + 1]
    }
  }, [])

  const updateGrid = useCallback((cell: Cell, dimensions: Dimensions, nodes: GridNode[]) => {
    // console.time("updateRect")
    refreshMaxGridLines(nodes)
    const newGrid = _updateGrid(cell, dimensions, grid)
    // console.timeEnd("updateRect")
    setGrid(newGrid)
  }, [_updateGrid, grid, refreshMaxGridLines, setGrid])

  return {
    getDefaultLayout,
    getRect,
    findRectAt,
    findGapAt,
    gridLinesInViewPort,
    moveAllNodeToRight,
    findAdjacentNode,
    updateRect: updateGrid,
    grid,
  }
  
}
