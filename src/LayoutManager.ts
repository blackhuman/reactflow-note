import { useCallback, useEffect } from "react"
import type { Rect } from 'reactflow'
import { XYPosition } from "reactflow"
import { Column, Row, useStoreLocal } from './store'
import { Cell, GridNode, isContains } from "./util"

export interface GridLine {
  xList: number[]
  yList: number[]
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
  for (const [, item] of grid.rows) {
    if (position.y < item.origin) break
    row = item
  }
  let column: Column | undefined
  for (const [, item] of grid.columns) {
    if (position.x < item.origin) break
    column = item
  }
  if (!row || !column) return null
  return [
    {x: column.origin, y: row.origin, width: column.length, height: row.length},
    {row: row.index, column: column.index}
  ]
}

export function findGapAtWithGrid(position: XYPosition, grid: Grid): [Rect, Cell] | null {
  let row: Row | undefined
  for (const [, item] of grid.rows) {
    if (position.y < item.origin) break
    row = item
  }
  let column: Column | undefined
  for (const [, item] of grid.columns) {
    if (item.origin - 10 < position.x) {
      column = item
    } else {
      break
    }
  }
  if (!row || !column) return null
  return [
    {x: column.origin, y: row.origin, width: column.length, height: row.length},
    {row: row.index, column: column.index}
  ]
}

export function dispatchGridChangeEvent(grid: Grid) {
  const event = new CustomEvent<Grid>('gridChange', {detail: grid})
  document.dispatchEvent(event)
}

export function useGridChange(callback: (grid: Grid) => void) {
  useEffect(() => {
    const listener = (event: CustomEvent<Grid>) => {
      callback(event.detail)
    }
    document.addEventListener('gridChange', listener)
    return () => {
      document.removeEventListener('gridChange', listener)
    }
  }, [callback])
}

export function useLayout() {
  const initLength = 100
  const initGap = 10
  const additionalRedundancy = 5

  const [gridRef, setGrid] = useStoreLocal(state => [state.gridRef, state.setGrid])

  const refreshMaxGridLines = useCallback((nodes: GridNode[]) => {
    const maxGridLines = gridRef.maxGridLines
    maxGridLines.rows.clear()
    maxGridLines.columns.clear()
    for (const node of nodes) {
      const row = node.data.row
      const height = node.height ?? initLength
      const rowMax = maxGridLines.rows.get(row)
      if (!rowMax || height > rowMax) {
        maxGridLines.rows = maxGridLines.rows.set(row, height)
      }
  
      const column = node.data.column
      const width = node.width ?? initLength
      const columnMax = maxGridLines.columns.get(column)
      if (!columnMax || width > columnMax) {
        maxGridLines.columns = maxGridLines.columns.set(column, width)
      }
    }
  }, [gridRef])

  function getMaxRowAndColumn(nodes: GridNode[]): [number, number] {
    const maxRow = Math.max(...nodes.map(node => node.data.row), 0) + additionalRedundancy
    const maxColumn = Math.max(...nodes.map(node => node.data.column), 0) + additionalRedundancy
    return [maxRow, maxColumn]
  }

  const buildGrid = useCallback((nodes: GridNode[]): Grid => {
    const [maxRow, maxColumn] = getMaxRowAndColumn(nodes)
    const maxGridLines = gridRef.maxGridLines
    const gridCount = gridRef.gridCount

    const grid = {
      rows: new Map(),
      columns: new Map(),
    }

    let lastRowStop = initGap
    let lastColumnStop = initGap
    for (let index = 0; index <= maxRow; index++) {
      const height = maxGridLines.rows.get(index) ?? initLength
      grid.rows.set(index, {
        index,
        origin: lastRowStop,
        length: height
      })
      lastRowStop += height + initGap
    }

    for (let index = 0; index <= maxColumn; index++) {
      const width = maxGridLines.columns.get(index) ?? initLength
      grid.columns.set(index, {
        index,
        origin: lastColumnStop,
        length: width
      })
      lastColumnStop += width + initGap
    }
    gridCount.rowCount = maxRow + 1
    gridCount.columnCount = maxColumn + 1
    return grid
  }, [gridRef])
  
  const getRect = useCallback((cell: Cell): Rect => {
    const grid = gridRef.grid
    const row = grid.rows.get(cell.row)!
    const column = grid.columns.get(cell.column)!
    return {x: column.origin, y: row.origin, width: column.length, height: row.length}
  }, [gridRef])

  const findRectAt = useCallback((position: XYPosition): [Rect, Cell] | null => {
    const result = findRectAtWithGrid(position, gridRef.grid)
    // console.log('findRectAt result', result)
    return result
  }, [gridRef])

  // cell width is not included gap
  const findGapAt = useCallback((position: XYPosition): Gap | null => {
    const result = findGapAtWithGrid(position, gridRef.grid)
    if (!result) return null
    const [rect,cell] = result
    const gapRect = {
      x: rect.x - initGap, 
      y: rect.y, 
      width: initGap, 
      height: rect.height
    }
    if (isContains(gapRect, position)) return {rect: gapRect, cell}
    return null
  }, [gridRef])

  // rect 限定区域
  const getGridLinesInViewPort = useCallback((): GridLine => {
    // console.time("getGridLinesInViewPort")
    const grid = gridRef.grid
    const gridCount = gridRef.gridCount
    const xList = [...grid.columns.values()].flatMap(v => [v.origin - initGap, v.origin])
    if (gridCount.columnCount > 0) {
      const lastColumn = grid.columns.get(gridCount.columnCount - 1)!
      xList.push(lastColumn.origin + lastColumn.length)
    }
    const yList = [...grid.rows.values()].flatMap(v => [v.origin - initGap, v.origin])
    if (gridCount.rowCount > 0) {
      const lastRow = grid.rows.get(gridCount.rowCount - 1)!
      yList.push(lastRow.origin + lastRow.length)
    }
    
    // minXX 画边缘
    const result: GridLine = {
      xList,
      yList,
    }
    // console.timeEnd("getGridLinesInViewPort")
    return result
  }, [gridRef])

  const moveAllNodeToRight = useCallback((baseCell: Cell, nodes: GridNode[]): GridNode[] => {
    return nodes.filter(node => node.data.column >= baseCell.column)
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
  
  const getDefaultLayout = useCallback((nodes: GridNode[]): Grid => {
    refreshMaxGridLines(nodes)
    return buildGrid(nodes)
  }, [buildGrid, refreshMaxGridLines])

  const updateGrid = useCallback((nodes: GridNode[]) => {
    // console.time("updateRect")

    // const [maxRow, maxColumn] = getMaxRowAndColumn(nodes)
    // const [maxGridRow, maxGridColumn] = [
    //   Math.max(...[...grid.rows.keys()]),
    //   Math.max(...[...grid.columns.keys()])
    // ]
    // console.log('maxRow', maxRow, 'maxColumn', maxColumn, 'maxGridRow', maxGridRow, 'maxGridColumn', maxGridColumn)
    // if (maxRow == maxGridRow && maxColumn == maxGridColumn && !firstTime) return

    refreshMaxGridLines(nodes)
    const newGrid = buildGrid(nodes)
    // console.timeEnd("updateRect")

    setGrid(newGrid)
    dispatchGridChangeEvent(newGrid)
  }, [buildGrid, refreshMaxGridLines, setGrid])

  return {
    getDefaultLayout,
    getRect,
    findRectAt,
    findGapAt,
    getGridLinesInViewPort,
    moveAllNodeToRight,
    findAdjacentNode,
    updateGrid,
    gridRef,
  }
  
}
