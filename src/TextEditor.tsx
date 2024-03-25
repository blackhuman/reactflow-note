import { useEffect, useRef, useState } from "react"
import { GridNodeData } from "./util"
import ContentEditable from 'react-contenteditable'
import {useKeyPress} from 'react-use';

interface TextEditorProps {
  data: GridNodeData
}

function TextEditor(props: TextEditorProps) {
  const {data} = props
  const tabIndex = (Number(data.row)+1)*100+Number(data.column)
  const ref = useRef<HTMLDivElement|null>(null)
  const handleClick = () => {
    console.log('TextEditor click')
    if (ref.current) {
      console.log('TextEditor focus', ref.current)
      ref.current.focus();
    }
  }
  useEffect(() => {
  }, [ref])
  useEffect(() => {
    ref.current?.addEventListener('focus', () => {
      console.log('TextEditor focus at tabIndex', tabIndex)
    })
    // ref.current?.addEventListener('mousedown', (e) => {
    //   e.stopPropagation()
    // })
  }, [tabIndex])

  const text = useRef('');

  const handleChange = evt => {
      text.current = evt.target.value;
  };

  const handleBlur = () => {
      console.log(text.current);
  };

  const [content, setContent] = useState("")

  const activeKey = useKeyPress('e')

  useEffect(() => {
    console.log('activeKey', document.activeElement)
  }, [activeKey])

  return (
    <div 
      onMouseDown={() => console.log('onMouseDown in Editor')}
      ref={ref} 
      className="h-full w-full bg-white border-none outline-none rounded-md p-2" 
      // role="textbox"
      // onDoubleClick={handleClick} 
      // id={String(tabIndex)} tabIndex={tabIndex} 
      contentEditable={true}
      >
    </div>
  )
}

export default TextEditor