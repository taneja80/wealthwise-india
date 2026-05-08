import { createBrowserRouter, RouterProvider } from "react-router";
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
import { AppLayout } from "./components/Navigation";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/login", element: <Login /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/profile-setup", element: <ProfileSetup /> },
      { path: "/financial-profile", element: <FinancialProfile /> },
      { path: "/goals", element: <GoalsPage /> },
      { path: "/cash-flow", element: <CashFlowPage /> },
      { path: "/allocation", element: <AllocationPage /> },
      { path: "/advisor", element: <ChatPage /> },
      { path: "/tax-planning", element: <TaxPage /> },
      { path: "/assets", element: <AssetPage /> },
      { path: "/retirement", element: <RetirementPage /> },
      { path: "/import", element: <ImportPage /> },
      { path: "/sip-calculator", element: <SIPCalculatorPage /> },
      { path: "/emi-calculator", element: <EMICalculatorPage /> },
      { path: "/currency", element: <CurrencyPage /> },
      { path: "/mf-search", element: <MFSearchPage /> },
      { path: "/what-if", element: <WhatIfPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
