type Grid = {
  rows: Map<number, Row>
  columns: Map<number, Column>
}

interface CustomEventMap {
  "gridChange": CustomEvent<Grid>;
}
declare global {
  interface Document { //adds definition to Document, but you can do the same with HTMLElement
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void): void;
    removeEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void): void;
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): void;
  }
}
export { CustomEventMap }; //keep that for TS compiler.
