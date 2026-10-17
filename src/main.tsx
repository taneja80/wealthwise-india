import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "next-themes"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
      <TRPCProvider>
        <App />
        <Toaster position="top-right" richColors />
      </TRPCProvider>
    </ThemeProvider>
  </StrictMode>,
)
