import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#F9FAFB',
            border: '1px solid #1F2937',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#111827' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#111827' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
