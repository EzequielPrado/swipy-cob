"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import FinancialAgenda from '@/components/financial/FinancialAgenda';

const FinancialCalendar = () => {
  return (
    <AppLayout>
      <div className="pb-12">
        <FinancialAgenda />
      </div>
    </AppLayout>
  );
};

export default FinancialCalendar;