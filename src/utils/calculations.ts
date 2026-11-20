import {
  BudgetData,
  CategoryMeta,
  EXPENSE_CATEGORIES,
  FixedExpenseItem,
  HEBREW_MONTHS,
  INCOME_CATEGORIES,
} from '../types/budget';
import { getMonthKey, parseMonthKey } from './format';

export interface CategorySummaryRow {
  meta: CategoryMeta;
  target: number;
  actual: number;
  difference: number; // For income: actual - target; For expense: target - actual (remaining)
  ratio: number; // actual / target
}

export interface MonthlySummary {
  monthKey: string;
  incomeRows: CategorySummaryRow[];
  expenseRows: CategorySummaryRow[];
  totalIncomeTarget: number;
  totalIncomeActual: number;
  totalExpenseTarget: number;
  totalExpenseActual: number;
  netBalance: number;
  fixedRomPaid: number;
  fixedRomPlanned: number;
  fixedStavPaid: number;
  fixedStavPlanned: number;
}

export interface AnnualMonthPoint {
  monthIndex0: number;
  monthKey: string;
  monthName: string;
  shortName: string;
  income: number;
  expenses: number;
  net: number;
  byCategory: Record<string, number>;
  hasActivity: boolean;
}

export interface AnnualCategoryRow {
  meta: CategoryMeta;
  months: number[]; // length 12
  annualTotal: number;
  monthlyAverage: number;
}

export interface AnnualSummary {
  year: number;
  months: AnnualMonthPoint[];
  incomeCategories: AnnualCategoryRow[];
  expenseCategories: AnnualCategoryRow[];
  totalIncome: number;
  totalExpenses: number;
  totalNet: number;
  activeMonthCount: number;
  avgIncome: number;
  avgExpenses: number;
  avgNet: number;
}

export function sumFixedByOwner(fixedExpenses: FixedExpenseItem[]) {
  let romPlanned = 0;
  let romPaid = 0;
  let stavPlanned = 0;
  let stavPaid = 0;

  for (const item of fixedExpenses) {
    if (item.owner === 'rom') {
      romPlanned += Number(item.planned) || 0;
      romPaid += Number(item.paid) || 0;
    } else {
      stavPlanned += Number(item.planned) || 0;
      stavPaid += Number(item.paid) || 0;
    }
  }

  return { romPlanned, romPaid, stavPlanned, stavPaid };
}

export function computeMonthlySummary(
  data: BudgetData,
  monthKey: string,
  includeFixedExpenses = true
): MonthlySummary {
  const monthTxs = data.transactions.filter((t) => t.date.startsWith(monthKey));
  const fixed = sumFixedByOwner(data.fixedExpenses);

  const txSums: Record<string, number> = {};
  for (const tx of monthTxs) {
    const key = `${tx.type}::${tx.category}`;
    txSums[key] = (txSums[key] || 0) + (Number(tx.amount) || 0);
  }

  const incomeRows: CategorySummaryRow[] = INCOME_CATEGORIES.map((meta) => {
    const target = Number(data.targets[meta.name] ?? meta.defaultTarget) || 0;
    const actual = txSums[`הכנסה::${meta.name}`] || 0;
    return {
      meta,
      target,
      actual,
      difference: actual - target,
      ratio: target > 0 ? actual / target : 0,
    };
  });

  const expenseRows: CategorySummaryRow[] = EXPENSE_CATEGORIES.map((meta) => {
    const target = Number(data.targets[meta.name] ?? meta.defaultTarget) || 0;
    let actual = txSums[`הוצאה::${meta.name}`] || 0;

    if (includeFixedExpenses) {
      if (meta.name === 'הוצאות קבועות רום') {
        actual += fixed.romPaid;
      } else if (meta.name === 'הוצאות קבועות סתיו') {
        actual += fixed.stavPaid;
      }
    }

    return {
      meta,
      target,
      actual,
      difference: target - actual,
      ratio: target > 0 ? actual / target : actual > 0 ? 1.01 : 0,
    };
  });

  const totalIncomeTarget = incomeRows.reduce((acc, r) => acc + r.target, 0);
  const totalIncomeActual = incomeRows.reduce((acc, r) => acc + r.actual, 0);
  const totalExpenseTarget = expenseRows.reduce((acc, r) => acc + r.target, 0);
  const totalExpenseActual = expenseRows.reduce((acc, r) => acc + r.actual, 0);

  return {
    monthKey,
    incomeRows,
    expenseRows,
    totalIncomeTarget,
    totalIncomeActual,
    totalExpenseTarget,
    totalExpenseActual,
    netBalance: totalIncomeActual - totalExpenseActual,
    fixedRomPaid: fixed.romPaid,
    fixedRomPlanned: fixed.romPlanned,
    fixedStavPaid: fixed.stavPaid,
    fixedStavPlanned: fixed.stavPlanned,
  };
}

export function computeAnnualSummary(data: BudgetData, year: number): AnnualSummary {
  const fixed = sumFixedByOwner(data.fixedExpenses);

  const months: AnnualMonthPoint[] = HEBREW_MONTHS.map((monthName, monthIndex0) => {
    const monthKey = getMonthKey(year, monthIndex0);
    const monthTxs = data.transactions.filter((t) => t.date.startsWith(monthKey));
    const hasActivity = monthTxs.length > 0;
    const byCategory: Record<string, number> = {};

    for (const tx of monthTxs) {
      byCategory[tx.category] = (byCategory[tx.category] || 0) + (Number(tx.amount) || 0);
    }

    // Apply recurring fixed expenses to active months in the annual overview
    if (hasActivity) {
      byCategory['הוצאות קבועות רום'] =
        (byCategory['הוצאות קבועות רום'] || 0) + fixed.romPaid;
      byCategory['הוצאות קבועות סתיו'] =
        (byCategory['הוצאות קבועות סתיו'] || 0) + fixed.stavPaid;
    }

    const income = INCOME_CATEGORIES.reduce(
      (sum, c) => sum + (byCategory[c.name] || 0),
      0
    );
    const expenses = EXPENSE_CATEGORIES.reduce(
      (sum, c) => sum + (byCategory[c.name] || 0),
      0
    );

    return {
      monthIndex0,
      monthKey,
      monthName,
      shortName: monthName.slice(0, 3),
      income,
      expenses,
      net: income - expenses,
      byCategory,
      hasActivity,
    };
  });

  const activeMonthCount = months.filter((m) => m.hasActivity).length;
  const divisor = activeMonthCount > 0 ? activeMonthCount : 1;

  const buildCategoryRows = (categories: CategoryMeta[]): AnnualCategoryRow[] =>
    categories.map((meta) => {
      const vals = months.map((m) => m.byCategory[meta.name] || 0);
      const annualTotal = vals.reduce((s, v) => s + v, 0);
      return {
        meta,
        months: vals,
        annualTotal,
        monthlyAverage: activeMonthCount > 0 ? annualTotal / divisor : 0,
      };
    });

  const totalIncome = months.reduce((s, m) => s + m.income, 0);
  const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);
  const totalNet = totalIncome - totalExpenses;

  return {
    year,
    months,
    incomeCategories: buildCategoryRows(INCOME_CATEGORIES),
    expenseCategories: buildCategoryRows(EXPENSE_CATEGORIES),
    totalIncome,
    totalExpenses,
    totalNet,
    activeMonthCount,
    avgIncome: activeMonthCount > 0 ? totalIncome / divisor : 0,
    avgExpenses: activeMonthCount > 0 ? totalExpenses / divisor : 0,
    avgNet: activeMonthCount > 0 ? totalNet / divisor : 0,
  };
}

export interface MonthPaceForecast {
  status: 'current' | 'past' | 'future';
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number; // inclusive of today for current month
  timeProgressRatio: number; // 0..1
  budgetRemaining: number; // totalExpenseTarget - totalExpenseActual
  dailyBudgetAllowance: number; // remaining budget / daysRemaining
  dailyFreeNetAllowance: number; // netBalance / daysRemaining
  variableSpent: number;
  dailyVariablePace: number;
  projectedTotalExpenses: number;
  projectedNetBalance: number;
  isOnTrackBudget: boolean;
}

export function computeMonthPaceForecast(
  summary: MonthlySummary,
  now: Date = new Date()
): MonthPaceForecast {
  const { year, monthIndex0 } = parseMonthKey(summary.monthKey);
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();

  const currentYear = now.getFullYear();
  const currentMonth0 = now.getMonth();
  const todayDay = Math.min(daysInMonth, now.getDate());

  let status: MonthPaceForecast['status'] = 'current';
  if (year < currentYear || (year === currentYear && monthIndex0 < currentMonth0)) {
    status = 'past';
  } else if (year > currentYear || (year === currentYear && monthIndex0 > currentMonth0)) {
    status = 'future';
  }

  const daysElapsed = status === 'past' ? daysInMonth : status === 'future' ? 0 : todayDay;
  const daysRemaining =
    status === 'past' ? 0 : status === 'future' ? daysInMonth : Math.max(1, daysInMonth - todayDay + 1);
  const timeProgressRatio = daysInMonth > 0 ? daysElapsed / daysInMonth : 0;

  const fixedActual = summary.expenseRows
    .filter(
      (r) =>
        r.meta.name === 'הוצאות קבועות רום' || r.meta.name === 'הוצאות קבועות סתיו'
    )
    .reduce((sum, r) => sum + r.actual, 0);

  const variableSpent = Math.max(0, summary.totalExpenseActual - fixedActual);
  const budgetRemaining = summary.totalExpenseTarget - summary.totalExpenseActual;

  const dailyBudgetAllowance = daysRemaining > 0 ? budgetRemaining / daysRemaining : 0;
  const dailyFreeNetAllowance = daysRemaining > 0 ? summary.netBalance / daysRemaining : 0;

  const dailyVariablePace = daysElapsed > 0 ? variableSpent / daysElapsed : 0;
  const projectedVariable =
    status === 'current'
      ? dailyVariablePace * daysInMonth
      : status === 'past'
        ? variableSpent
        : Math.max(0, summary.totalExpenseTarget - fixedActual);

  const projectedTotalExpenses = fixedActual + projectedVariable;
  const projectedNetBalance =
    (summary.totalIncomeActual > 0 ? summary.totalIncomeActual : summary.totalIncomeTarget) -
    projectedTotalExpenses;

  const isOnTrackBudget =
    summary.totalExpenseTarget > 0
      ? projectedTotalExpenses <= summary.totalExpenseTarget
      : projectedNetBalance >= 0;

  return {
    status,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    timeProgressRatio,
    budgetRemaining,
    dailyBudgetAllowance,
    dailyFreeNetAllowance,
    variableSpent,
    dailyVariablePace,
    projectedTotalExpenses,
    projectedNetBalance,
    isOnTrackBudget,
  };
}
