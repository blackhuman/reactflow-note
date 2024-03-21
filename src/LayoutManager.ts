import { Rect, XYPosition } from "reactflow"

interface GridLine {
  xList: number[]
  yList: number[]
  rects: Rect[]
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

class LayoutManager {

  rows: Map<number, Row> = new Map()
  columns: Map<number, Column> = new Map()
  nodes: Map<number, Map<number, Cell>> = new Map()

  constructor() {
    const initLength = 100
    const initCount = 10
    const gap = 10
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

  deleteNode(cell: Cell) {
    this.nodes.get(cell.row)?.delete(cell.column)
  }

  hasNode(index: GridIndex): boolean {
    return this.getNode(index.row, index.column) !== null
  }

  getNode(rowIndex: number, columnIndex: number): Cell | null {
    return this.nodes.get(rowIndex)?.get(columnIndex) ?? null
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

  // rect 限定区域
  getGridLinesInViewPort(rect: Rect): GridLine {
    console.log('getGridLinesInViewPort', rect)
    console.time("getGridLinesInViewPort")
    const xList = [...this.columns.values()].flatMap(v => [v.origin, v.origin + v.length])
    const yList = [...this.rows.values()].flatMap(v => [v.origin, v.origin + v.length])
    const rects: Rect[] = []
    for (const row of this.rows.values()) {
      for (const column of this.columns.values()) {
        rects.push({x: column.origin, y: row.origin, width: column.length, height: row.length})
      }
    }
    // const rectangles = 
    const result: GridLine = {
      xList,
      yList,
      rects,
      minX: xList[0],
      maxX: xList[xList.length - 1],
      minY: yList[0],
      maxY: yList[yList.length - 1],
    }
    console.log('rects', rects)
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
