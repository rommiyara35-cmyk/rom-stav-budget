import React from 'react';
import { AnnualTracker } from './components/AnnualTracker';
import { FixedExpenses } from './components/FixedExpenses';
import { HouseholdGate } from './components/HouseholdGate';
import { Layout } from './components/Layout';
import { MonthlyDashboard } from './components/MonthlyDashboard';
import { QuickAddSheet } from './components/QuickAddSheet';
import { ToastContainer } from './components/ToastContainer';
import { TransactionsLog } from './components/TransactionsLog';
import { BudgetProvider, useBudget } from './context/BudgetContext';

const BudgetAppShell: React.FC = () => {
  const { session, activeTab } = useBudget();

  if (!session) {
    return (
      <>
        <ToastContainer />
        <HouseholdGate />
      </>
    );
  }

  return (
    <>
      <ToastContainer />
      <Layout>
        {activeTab === 'dashboard' && <MonthlyDashboard />}
        {activeTab === 'transactions' && <TransactionsLog />}
        {activeTab === 'fixed' && <FixedExpenses />}
        {activeTab === 'annual' && <AnnualTracker />}
      </Layout>
      <QuickAddSheet />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BudgetProvider>
      <BudgetAppShell />
    </BudgetProvider>
  );
};

export default App;
