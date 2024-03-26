import { useMemo } from "react"
import { Rect, useStoreApi, useViewport } from "reactflow"
import { useLayout, GridLine } from "./LayoutManager"

interface BackgroundGridComponentProps {
  currentRect: Rect | null
}

function BackgroundGridComponent(props: BackgroundGridComponentProps) {
  const {currentRect: currentCell} = props
  const store = useStoreApi()
  const {width, height} = store.getState()
  const { x, y, zoom } = useViewport()
  const layoutManager = useLayout()
  const gridLine = useMemo(() => layoutManager.getGridLinesInViewPort({x: 0, y: 0, width: 100, height: 100}), [layoutManager])
  
  return (

    <BackgroundGrid 
      containerHeight={height}
      containerWidth={width}
      gridLine={gridLine} 
      viewBox={`${-x/zoom} ${-y/zoom} ${width/zoom} ${height/zoom}`} 
      currentRect={currentCell}
      />
  )
}

interface BackgroundGridProps {
  gridLine: GridLine
  // offsetX: number
  // offsetY: number
  viewBox: string
  currentRect: Rect | null
  containerWidth: number
  containerHeight: number
}

function BackgroundGrid(props: BackgroundGridProps) {
  const {gridLine, viewBox, currentRect, containerHeight, containerWidth} = props
  const {minX, maxX, minY, maxY, xList, yList} = gridLine
  return (
    <svg x='0' y='0' height={containerHeight} width={containerWidth} viewBox={viewBox} >
    {
      currentRect && 
      <rect 
        x={currentRect.x} y={currentRect.y} 
        width={currentRect.width} height={currentRect.height}
        className="stroke-3 fill-red-500"
        ></rect>
    }
    <g>
      {
        // draw vertical lines
        xList.map((x, i) => {
          return (
            <line key={`x${i}`} x1={x} y1={minY} x2={x} y2={maxY} className="grid-separator grid-separator-vertical" />
          )
        })
      }
      {
        // draw horizontal lines
        yList.map((y, i) => {
          return (
            <line key={`y${i}`} x1={minX} y1={y} x2={maxX} y2={y} className='grid-separator' />
          )
        })
      }
    </g>
    </svg>
  )
}

export default BackgroundGridComponent
