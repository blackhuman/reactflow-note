import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable';
import { useReactFlowEx } from "./util";

interface TextEditorProps {
  nodeId: string
  text: string
}

function TextEditor(props: TextEditorProps) {
  const {nodeId, text} = props
  // const tabIndex = (Number(data.row)+1)*100+Number(data.column)
  // const ref = useRef<HTMLDivElement|null>(null)
  const componentRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef(text ?? '')

  interface State {
    state: boolean
    event?: MouseEvent
  }
  const [disabled, setDisabled] = useState<State>({state: true})
  const {updateText} = useReactFlowEx()
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  useEffect(() => {
    textRef.current = text
    forceUpdate()
  }, [text])

  const handleChange = (evt: ContentEditableEvent) => {
    textRef.current = evt.target.value
    updateText(nodeId, evt.target.value)
  }

  const startComposing = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    console.log('startComposing', event.nativeEvent)
    setDisabled({state: false})
  }, [setDisabled])

  useEffect(() => {
    if(!disabled.state) {
      componentRef.current?.focus();
    }
    const onMouseDown = (event: MouseEvent) => {
      if(!disabled.state) {
        event.stopPropagation()
      }
    }
    const componentElement = componentRef.current
    componentElement?.addEventListener('mousedown', onMouseDown)
    return () => {
      componentElement?.removeEventListener('mousedown', onMouseDown)
    }
  }, [disabled])

  const stopComposing = useCallback(() => {
    console.log('stopComposing')
    setDisabled({state: true})
  }, [setDisabled])

  return (
    <ContentEditable
      className='w-full h-full text-balance break-all border-none outline-none rounded-md p-2 z-50'
      innerRef={componentRef}
      onDoubleClick={startComposing}
      onFocus={() => {
        console.log('focus')
      }}
      onBlur={stopComposing}
      disabled={disabled.state}
      html={textRef.current}
      onChange={handleChange} />
  )
}

export default TextEditor