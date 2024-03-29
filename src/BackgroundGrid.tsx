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
  const {gridLinesInViewPort} = useLayout()
  
  return (
    <BackgroundGrid 
      containerHeight={height}
      containerWidth={width}
      gridLine={gridLinesInViewPort} 
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
  const {xList, yList} = gridLine
  const minX = xList[0], maxX = xList[xList.length - 1]
  const minY = yList[0], maxY = yList[yList.length - 1]
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
