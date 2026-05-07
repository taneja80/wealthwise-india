import { Routes, Route, useLocation } from "react-router";
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

function AppRoutes() {
  const location = useLocation();

  return (
    <AppLayout>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/financial-profile" element={<FinancialProfile />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/cash-flow" element={<CashFlowPage />} />
        <Route path="/allocation" element={<AllocationPage />} />
        <Route path="/advisor" element={<ChatPage />} />
        <Route path="/tax-planning" element={<TaxPage />} />
        <Route path="/assets" element={<AssetPage />} />
        <Route path="/retirement" element={<RetirementPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/sip-calculator" element={<SIPCalculatorPage />} />
        <Route path="/emi-calculator" element={<EMICalculatorPage />} />
        <Route path="/currency" element={<CurrencyPage />} />
        <Route path="/mf-search" element={<MFSearchPage />} />
        <Route path="/what-if" element={<WhatIfPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return <AppRoutes />;
}
