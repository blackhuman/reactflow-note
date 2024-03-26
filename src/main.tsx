import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ReactFlowProvider } from 'reactflow'
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className='h-screen w-screen'>
      <ReactFlowProvider>
        <App/>
        <Analytics/>
        <SpeedInsights/>
      </ReactFlowProvider>
    </div>
  </React.StrictMode>
)
