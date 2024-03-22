import { Rect, XYPosition } from "reactflow"
import * as d3 from 'd3'

interface GridLine {
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

interface Cell {
  rect: Rect
  row: number
  column: number
  nodeId?: string
}

type Row = {
  index: number
  origin: number
  length: number
}

type Column = Row

type GridIndex = {
  row: number
  column: number
}

export type Gap = {
  rect: Rect
  cell: Cell
}

function isContains(rect: Rect, position: XYPosition): boolean {
  return position.x >= rect.x && position.x <= rect.x + rect.width
    && position.y >= rect.y && position.y <= rect.y + rect.height
}

class LayoutManager {

  rows: Map<number, Row> = new Map()
  columns: Map<number, Column> = new Map()
  nodes: Map<number, Map<number, Cell>> = new Map()
  gap = 10

  constructor() {
    const initLength = 100
    const initCount = 10
    const gap = this.gap
    for (let index = -initCount; index < initCount; index++) {
      this.rows.set(index, {
        index,
        origin: index * (initLength + gap),
        length: initLength,
      })
      this.columns.set(index, {
        index,
        origin: index * (initLength + gap),
        length: initLength,
      })
      this.nodes.set(index, new Map())
    }
    console.log('rows', this.rows)
    console.log('columns', this.columns)
  }

  addNode(cell: Cell) {
    this.nodes.get(cell.row)?.set(cell.column, cell)
  }

  updateNode(index: GridIndex, cell: Cell) {
    this.nodes.get(index.row)?.delete(index.column)
    this.addNode(cell)
  }

  moveAllNodeToRight(cell: Cell): Cell[] {
    const nodesMap = this.nodes.get(cell.row)
    if (!nodesMap) return []
    const nodes = [...nodesMap.entries()]
      .sort(([column1,], [column2,]) => column1 - column2)
      .filter(([column,]) => column >= cell.column)
      .map(([, node]) => ({...node}))
    for (const node of nodes) {
      nodesMap.delete(node.column)
      node.column = node.column + 1
      const cell = this.getCell(node.row, node.column)
      node.rect = cell.rect
      nodesMap.set(node.column, node)
    }
    return nodes
  }

  insertNode(cell: Cell) {
    this.moveAllNodeToRight(cell)
    this.addNode(cell)
  }

  deleteNode(cell: Cell) {
    this.nodes.get(cell.row)?.delete(cell.column)
  }

  hasNode(index: GridIndex): boolean {
    return this.getNode(index.row, index.column) !== null
  }

  getNode(rowIndex: number, columnIndex: number): Cell | null {
    return this.nodes.get(rowIndex)?.get(columnIndex) ?? null
  }

  getCell(rowIndex: number, columnIndex: number): Cell {
    const row = this.rows.get(rowIndex)!
    const column = this.columns.get(columnIndex)!
    return {
      rect: {x: column.origin, y: row.origin, width: column.length, height: row.length},
      row: rowIndex,
      column: columnIndex
    }
  }

  findCellAt(position: XYPosition): Cell | null {
    let row: Row | undefined
    for (const [, item] of this.rows.entries()) {
      if (position.y < item.origin) break
      row = item
    }
    let column: Column | undefined
    for (const [, item] of this.columns.entries()) {
      if (position.x < item.origin) break
      column = item
    }
    if (!row || !column) return null
    const recordedNode = this.getNode(row.index, column.index)
    if (recordedNode) return recordedNode
    return {
      rect: {x: column.origin, y: row.origin, width: column.length, height: row.length},
      row: row.index,
      column: column.index
    }
  }

  findGapAt(position: XYPosition): Gap | null {
    const cell = this.findCellAt(position)
    if (!cell) return null
    const gap = {
      x: cell.rect.x + cell.rect.width, 
      y: cell.rect.y, 
      width: this.gap, 
      height: cell.rect.height
    }
    if (isContains(gap, position)) return {rect: gap, cell}
    return null
  }

  // rect 限定区域
  getGridLinesInViewPort(rect: Rect): GridLine {
    console.log('getGridLinesInViewPort', rect)
    console.time("getGridLinesInViewPort")
    const xList = [...this.columns.values()].flatMap(v => [v.origin, v.origin + v.length])
    const yList = [...this.rows.values()].flatMap(v => [v.origin, v.origin + v.length])
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
    for (const row of this.rows.values()) {
      for (const column of this.columns.values()) {
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
  }

  findAdjacentNode(cell: Cell, adjacent: 'left' | 'right'): Cell | null {
    const row = this.nodes.get(cell.row)
    if (!row) return null;
    const columns = [...row.keys()]
    if (columns.length < 2) return null
    const findedIndex = columns.sort((a, b) => adjacent === 'left' ? a - b : b - a)
      .findIndex(v => v === cell.column)
    if (findedIndex === -1 || findedIndex - 1 < 0) return null;
    const conlumnIndex = columns[findedIndex - 1]
    return row.get(conlumnIndex) ?? null
  }

}

export {
  LayoutManager, type GridLine, type Cell
}
