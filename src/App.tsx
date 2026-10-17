import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import type { ReactNode } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ProfileSetup from "./pages/ProfileSetup";
import FinancialProfile from "./pages/FinancialProfile";
import GoalsPage from "./pages/GoalsPage";
import CashFlowPage from "./pages/CashFlowPage";
import AllocationPage from "./pages/AllocationPage";
import ChatPage from "./pages/ChatPage";
import TaxPage from "./pages/TaxPage";
import AssetPage from "./pages/AssetPage";
import RetirementPage from "./pages/RetirementPage";
import ImportPage from "./pages/ImportPage";
import SIPCalculatorPage from "./pages/SIPCalculatorPage";
import EMICalculatorPage from "./pages/EMICalculatorPage";
import CurrencyPage from "./pages/CurrencyPage";
import MFSearchPage from "./pages/MFSearchPage";
import WhatIfPage from "./pages/WhatIfPage";
import RecurringPage from "./pages/RecurringPage";
import FamilyPage from "./pages/FamilyPage";
import ExpensesPage from "./pages/ExpensesPage";
import { AppLayout } from "./components/Navigation";
import { useAuth } from "./hooks/useAuth";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#d4a843] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/login", element: <Login /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/dashboard", element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
      { path: "/profile-setup", element: <ProtectedRoute><ProfileSetup /></ProtectedRoute> },
      { path: "/financial-profile", element: <ProtectedRoute><FinancialProfile /></ProtectedRoute> },
      { path: "/goals", element: <ProtectedRoute><GoalsPage /></ProtectedRoute> },
      { path: "/cash-flow", element: <ProtectedRoute><CashFlowPage /></ProtectedRoute> },
      { path: "/allocation", element: <ProtectedRoute><AllocationPage /></ProtectedRoute> },
      { path: "/advisor", element: <ProtectedRoute><ChatPage /></ProtectedRoute> },
      { path: "/tax-planning", element: <ProtectedRoute><TaxPage /></ProtectedRoute> },
      { path: "/assets", element: <ProtectedRoute><AssetPage /></ProtectedRoute> },
      { path: "/retirement", element: <ProtectedRoute><RetirementPage /></ProtectedRoute> },
      { path: "/import", element: <ProtectedRoute><ImportPage /></ProtectedRoute> },
      { path: "/sip-calculator", element: <ProtectedRoute><SIPCalculatorPage /></ProtectedRoute> },
      { path: "/emi-calculator", element: <ProtectedRoute><EMICalculatorPage /></ProtectedRoute> },
      { path: "/currency", element: <ProtectedRoute><CurrencyPage /></ProtectedRoute> },
      { path: "/mf-search", element: <ProtectedRoute><MFSearchPage /></ProtectedRoute> },
      { path: "/what-if", element: <ProtectedRoute><WhatIfPage /></ProtectedRoute> },
      { path: "/recurring", element: <ProtectedRoute><RecurringPage /></ProtectedRoute> },
      { path: "/family", element: <ProtectedRoute><FamilyPage /></ProtectedRoute> },
      { path: "/expenses", element: <ProtectedRoute><ExpensesPage /></ProtectedRoute> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
