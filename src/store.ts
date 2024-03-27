import { ConnectingHandle, HandleProps, Position, ReactFlowJsonObject } from "reactflow"
import { StateCreator, create } from "zustand"
import { persist } from 'zustand/middleware'
import { GridEdgeData, GridNodeData } from "./util"


interface ReactflowActionStore {

}

const reactflowActionStore: StateCreator<ReactflowActionStore, [], [], ReactflowActionStore> = () => {
  return {

  }
}

type HandleMap = Record<string, HandleProps[]>

type AppStore = {
  isConnecting: boolean
  setConnecting(isConnecting: boolean): void
  handleMap: HandleMap
  clearHandle(): void
  getHandles(nodeId: string): HandleProps[]
  addHandle(handle: ConnectingHandle): string
  deleteHandle(handle: ConnectingHandle): void
  relatedNodeIds: string[]
  setHighlitedNodeIds(nodeIds: string[]): void
}

const baseStore: StateCreator<AppStore, [], [], AppStore> = (set, get) => {
  const a: AppStore = {
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
  }
  console.log('storelocalxx', a)
  return a
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
  return flowRaw ? JSON.parse(flowRaw) : null
}

export function writeFlowData(flowId: string, flow: GridReactFlowJsonObject = EMPTY_FLOW_DATA) {
  localStorage.setItem(flowId, JSON.stringify(flow))
}

type FlowStore = {
  flowMetaList: FlowMetaStore[]
  createFlow(): string
  getFlow(flowId: string): FlowMetaStore | undefined
}

const FLOW_KEY = 'reactflow-note'

const flowStore = persist<FlowStore, [], [], FlowStore>(
  (set, get) => {
  
    return {
      flowMetaList: [],
      createFlow() {
        const flowId = `${FLOW_KEY}_${crypto.randomUUID()}`
        set({flowMetaList: [...get().flowMetaList, {id: flowId, title: 'New Flow'}]})
        writeFlowData(flowId)
        return flowId
      },
      getFlow(flowId) {
        return get().flowMetaList.find(f => f.id === flowId)
      },
    }
  },
  {
    name: FLOW_KEY, // name of the item in the storage (must be unique)
    // storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
  },
)

const useStoreLocal = create<AppStore & ReactflowActionStore & FlowStore>((...a) => {
  console.log('create useStoreLocal')
  return {
    ...baseStore(...a),
    ...reactflowActionStore(...a),
    ...flowStore(...a),
  }
})

export {
  useStoreLocal
}
