import * as d3 from 'd3'
import { useCallback, useEffect, useRef } from "react"
import type { Rect } from 'reactflow'
import { XYPosition } from "reactflow"
import { Cell, GridNode, isContains } from "./util"

export interface GridLine {
  xList: number[]
  yList: number[]
  seperatorPath: string
  rects: Rect[]
  rectsPath: string
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type Row = {
  index: number
  origin: number
  length: number
}

type Column = Row

export type Gap = {
  rect: Rect
  cell: Cell
}

export function useLayout() {
  const initLength = 100
  const initCount = 10
  const initGap = 10

  const rowsRef = useRef(new Map<number, Row>())
  const columnsRef = useRef(new Map<number, Column>())
  const rows = rowsRef.current
  const columns = columnsRef.current

  useEffect(() => {
    for (let index = -initCount; index < initCount; index++) {
      rowsRef.current.set(index, {
        index,
        origin: index * (initLength + initGap),
        length: initLength,
      })
      columnsRef.current.set(index, {
        index,
        origin: index * (initLength + initGap),
        length: initLength,
      })
    }
  }, [])

  const findRectAt = useCallback((position: XYPosition): [Rect, Cell] | null => {
    let row: Row | undefined
    for (const [, item] of rows.entries()) {
      if (position.y < item.origin) break
      row = item
    }
    let column: Column | undefined
    for (const [, item] of columns.entries()) {
      if (position.x < item.origin) break
      column = item
    }
    if (!row || !column) return null
    return [
      {x: column.origin, y: row.origin, width: column.length, height: row.length},
      {row: row.index, column: column.index}
    ]
  }, [columns, rows])

  const getRect = useCallback((cell: Cell): Rect => {
    const row = rows.get(cell.row)!
    const column = columns.get(cell.column)!
    return {x: column.origin, y: row.origin, width: column.length, height: row.length}
  }, [columns, rows])

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
  const getGridLinesInViewPort = useCallback((_rect: Rect): GridLine => {
    console.time("getGridLinesInViewPort")
    const xList = [...columns.values()].flatMap(v => [v.origin, v.origin + v.length])
    const yList = [...rows.values()].flatMap(v => [v.origin, v.origin + v.length])
    const minX = xList[0]
    const maxX = xList[xList.length - 1]
    const minY = yList[0]
    const maxY = yList[yList.length - 1]
    const seperatorPath = d3.path()
    for (const v of xList) {
      seperatorPath.moveTo(v, minY)
      seperatorPath.lineTo(v, maxY)
    }
    for (const v of yList) {
      seperatorPath.moveTo(minX, v)
      seperatorPath.lineTo(maxX, v)
    }

    const rects: Rect[] = []
    const rectsPath = d3.path();
    for (const row of rows.values()) {
      for (const column of columns.values()) {
        rects.push({x: column.origin, y: row.origin, width: column.length, height: row.length})
        // rectsPath.rect(column.origin, row.origin, column.length, row.length)
      }
    }
    const result: GridLine = {
      xList,
      yList,
      rects,
      seperatorPath: seperatorPath.toString(),
      rectsPath: rectsPath.toString(),
      minX: xList[0],
      maxX: xList[xList.length - 1],
      minY: yList[0],
      maxY: yList[yList.length - 1],
    }
    console.timeEnd("getGridLinesInViewPort")
    return result
  }, [columns, rows])

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

  return {
    getRect,
    findRectAt,
    findGapAt,
    getGridLinesInViewPort,
    moveAllNodeToRight,
    findAdjacentNode,
  }
  
}
