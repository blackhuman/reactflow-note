import { ConnectingHandle, HandleProps, Position } from "reactflow"
import { StateCreator, create } from "zustand"
import { LayoutManager } from "./LayoutManager"


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
  layoutManager: LayoutManager
}

const baseStore: StateCreator<AppStore, [], [], AppStore> = (set, get) => {
  return {
    layoutManager: new LayoutManager(),
    isConnecting: false,
    setConnecting(isConnecting) {
      set(() => ({isConnecting}))
      console.log('isConnectings', get().isConnecting)
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
  }
}

const useStoreLocal = create<AppStore & ReactflowActionStore>((...a) => {
  console.log('create useStoreLocal')
  return {
    ...baseStore(...a),
    ...reactflowActionStore(...a),
  }
})

export {
  useStoreLocal
}