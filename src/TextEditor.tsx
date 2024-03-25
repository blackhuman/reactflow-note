import { useEffect, useReducer, useRef } from "react";
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
  const textRef = useRef(text ?? '')
  const {updateText} = useReactFlowEx()
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  useEffect(() => {
    textRef.current = text
    forceUpdate()
  }, [text])

  const handleChange = (evt: ContentEditableEvent) => {
    textRef.current = evt.target.value
    updateText(nodeId, evt.target.value)
};

  return (
    <ContentEditable
      className='h-full w-full border-none outline-none rounded-md p-2'
      html={textRef.current} onChange={handleChange} />
  )
}

// class TextEditor extends React.Component<TextEditorProps, {text: string}> {
//   contentEditable = createRef()

//   constructor(props: TextEditorProps) {
//     super(props)
//     this.setState({text: ''})
//   }

//   handleChange(evt: ContentEditableEvent) {
//     this.setState({text: evt.target.value})
//     updateText(nodeId, evt.target.value)
//   }
// }

export default TextEditor