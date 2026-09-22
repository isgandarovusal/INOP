import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SpeedInsights } from "@vercel/speed-insights/react"
import "./i18n";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {import.meta.env.VITE_ENABLE_SPEED_INSIGHTS === "true" && <SpeedInsights />}
  </React.StrictMode>,
)
