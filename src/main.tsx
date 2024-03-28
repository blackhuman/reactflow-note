import React from 'react'
import ReactDOM from 'react-dom/client'
import 'reactflow/dist/style.css';
import './index.css'
import App from './App.tsx'
import { ReactFlowProvider } from 'reactflow'
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom"
import Dashboard from './Dashboard.tsx'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard/>,
  },
  {
    path: "/404",
    element: (
      <div>
        404
      </div>
    )
  },
  {
    path: "/flow/:flowId",
    element: (
      <ReactFlowProvider>
        <App/>
      </ReactFlowProvider>
    ),
  },
]);


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className='h-screen w-screen'>
      <RouterProvider router={router}/>
    </div>
    <Analytics/>
    <SpeedInsights/>
  </React.StrictMode>
)
