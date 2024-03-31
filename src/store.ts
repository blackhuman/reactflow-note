import { useContext } from "react"
import { ConnectingHandle, HandleProps, Position, ReactFlowJsonObject } from "reactflow"
import { StateCreator, StoreApi, useStore } from "zustand"
import { persist } from 'zustand/middleware'
import { Grid } from "./LayoutManager"
import { StoreContext } from "./store-provider"
import { GridEdgeData, GridNodeData } from "./util"

export interface ReactflowActionStore {

}

export const reactflowActionStore: StateCreator<ReactflowActionStore, [], [], ReactflowActionStore> = () => {
  return {

  }
}

type HandleMap = Record<string, HandleProps[]>

export type Row = {
  index: number
  origin: number
  length: number
}

export type Column = Row

type GridEx = {
  grid: Grid
  gridCount: {
    rowCount: number,
    columnCount: number,
  }
  maxGridLines: {
    rows: Map<number, number>
    columns: Map<number, number>
  }
}

export type AppStore = {
  isConnecting: boolean
  setConnecting(isConnecting: boolean): void
  handleMap: HandleMap
  clearHandle(): void
  getHandles(nodeId: string): HandleProps[]
  addHandle(handle: ConnectingHandle): string
  deleteHandle(handle: ConnectingHandle): void
  relatedNodeIds: string[]
  setHighlitedNodeIds(nodeIds: string[]): void
  gridRef: GridEx
  // gridCount: {
  //   rowCount: number,
  //   columnCount: number,
  // }
  setGrid(grid: Grid): void
  // maxGridLines: {
  //   rows: Map<number, number>
  //   columns: Map<number, number>
  // }
}

export const baseStore: StateCreator<AppStore, [], [], AppStore> = (set, get) => {
  console.log('init baseStore')
  return {
    isConnecting: false,
    setConnecting(isConnecting) {
      set({isConnecting})
    },
    handleMap: {},
    clearHandle() {
      set({handleMap: {}})
    },
    getHandles(nodeId) {
      return get().handleMap[nodeId] ?? []
    },
    addHandle: (handle): string => {
      const handles = get().handleMap[handle.nodeId] ?? []
      const type = handle.type
      if (handle.handleId === undefined) {
        handle.handleId = `${type}_${handles.length+1}`
      }
      set((state): Pick<AppStore, 'handleMap'> => {
        const newHandle: HandleProps = {
          id: handle.handleId!,
          type,
          position: type === 'source' ? Position.Right : Position.Left,
          isConnectable: true,
          isConnectableStart: type==='source',
          isConnectableEnd: type==='target',
        }
        return {handleMap: {...state.handleMap, [handle.nodeId]: [...handles, newHandle]}}
      })
      return handle.handleId!
    },
    deleteHandle(handle) {
      set((state): Pick<AppStore, 'handleMap'> => {
        const handles = state.handleMap[handle.nodeId] ?? []
        const newHandles = handles.filter(h => h.id !== handle.handleId)
        return {handleMap: {...state.handleMap, [handle.nodeId]: newHandles}}
      })
    },
    relatedNodeIds: [],
    setHighlitedNodeIds(nodeIds) {
      console.log('setHighlitedNodeIds', nodeIds)
      set({relatedNodeIds: [...nodeIds]})
    },
    gridRef: {
      grid: {rows: new Map(), columns: new Map()},
      gridCount: {
        rowCount: 0,
        columnCount: 0,
      },
      maxGridLines: {
        rows: new Map(),
        columns: new Map(),
      },
    },
    setGrid(grid) {
      get().gridRef.grid = grid
    },
  }
}

export type GridReactFlowJsonObject = ReactFlowJsonObject<GridNodeData, GridEdgeData>

const EMPTY_FLOW_DATA: GridReactFlowJsonObject = {
  nodes: [],
  edges: [],
  viewport: {
    x: 0, y: 0, zoom: 1,
  }
} as const

type FlowMetaStore = {
  id: string
  title: string
}

export function readFlowData(flowId: string): GridReactFlowJsonObject | null {
  const flowRaw = localStorage.getItem(flowId)
  const flow = flowRaw ? JSON.parse(flowRaw) : null
  return flow
}

export function writeFlowData(flowId: string, flow: GridReactFlowJsonObject = EMPTY_FLOW_DATA) {
  const flowRaw = JSON.stringify(flow)
  localStorage.setItem(flowId, flowRaw)
}

export function deleteFlowData(flowId: string) {
  localStorage.removeItem(flowId)
}

export type FlowStore = {
  flowMetaList: FlowMetaStore[]
  createFlow(): string
  deleteFlow(flowId: string): void
  getFlow(flowId: string): FlowMetaStore | undefined
}

const FLOW_KEY = 'reactflow-note'

export const flowStore = persist<FlowStore, [], [], Pick<FlowStore, 'flowMetaList'>>(
  (set, get) => {
  
    return {
      flowMetaList: [],
      createFlow() {
        const flowId = `${FLOW_KEY}_${crypto.randomUUID()}`
        set({flowMetaList: [...get().flowMetaList, {id: flowId, title: 'New Flow'}]})
        writeFlowData(flowId)
        return flowId
      },
      deleteFlow(flowId) {
        set({flowMetaList: [...get().flowMetaList.filter(v => v.id !== flowId)]})
        deleteFlowData(flowId)
      },
      getFlow(flowId) {
        return get().flowMetaList.find(f => f.id === flowId)
      },
    }
  },
  {
    name: FLOW_KEY, // name of the item in the storage (must be unique)
    // storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    partialize(state) {
      return {
        flowMetaList: state.flowMetaList,
      }
    },
  },
)

// const useStoreLocal = create<AppStore & ReactflowActionStore & FlowStore>((...a) => {
//   console.log('create useStoreLocal')
//   return {
//     ...baseStore(...a),
//     ...reactflowActionStore(...a),
//     ...flowStore(...a),
//   }
// })

const useStoreLocal = <T>(
  selector: (state: ExtractState<StoreApi<AppStore & ReactflowActionStore & FlowStore>>) => T
) => {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error('Missing StoreProvider')
  }
  return useStore(store, selector)
}

type ExtractState<S> = S extends { getState: () => infer X } ? X : never

export {
  useStoreLocal
}
