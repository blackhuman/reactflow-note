
import { FC, PropsWithChildren, createContext, useRef } from "react"
import { StoreApi, createStore } from "zustand"
import { AppStore, FlowStore, ReactflowActionStore, baseStore, flowStore, reactflowActionStore } from "./store"

export const StoreContext = createContext<StoreApi<AppStore & ReactflowActionStore & FlowStore> | null>(null)

export const StoreProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const storeRef = useRef<StoreApi<AppStore & ReactflowActionStore & FlowStore>>()
  if (!storeRef.current) {
    storeRef.current = createStore<AppStore & ReactflowActionStore & FlowStore>((...a) => ({
      ...baseStore(...a),
      ...reactflowActionStore(...a),
      ...flowStore(...a),
    }))
  }
  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  )
}