import { Rect, XYPosition } from "reactflow"

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

  // nodes: GRID_NODE[] = []
  rows: Map<number, Row> = new Map()
  columns: Map<number, Column> = new Map()
  nodes: Map<string, Cell> = new Map()

  // static defaultManager = new LayoutManager()

  constructor() {
    const initLength = 100
    const initCount = 10
    for (let index = -initCount; index < initCount; index++) {
      this.rows.set(index, {
        index,
        origin: index * initLength,
        length: initLength,
      })
      this.columns.set(index, {
        index,
        origin: index * initLength,
        length: initLength,
      })
    }
    console.log('rows', this.rows)
    console.log('columns', this.columns)
  }

  private getNodeKey(index: GridIndex): string {
    return `${index.row},${index.column}`
  }

  addNode(cell: Cell) {
    const key = this.getNodeKey(cell)
    this.nodes.set(key, cell)
  }

  hasNode(index: GridIndex): boolean {
    return this.nodes.has(this.getNodeKey(index))
  }

  getNode(row: number, column: number): Cell | null {
    return this.nodes.get(this.getNodeKey({row, column})) ?? null
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
    const xList = [...this.columns.values()].map(v => v.origin)
    const yList = [...this.rows.values()].map(v => v.origin)
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

export {
  LayoutManager, type GridLine, type Cell
}
