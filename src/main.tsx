import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ReactFlowProvider } from 'reactflow'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className='h-screen w-screen'>
      <ReactFlowProvider>
        <App/>
      </ReactFlowProvider>
    </div>
  </React.StrictMode>
)
