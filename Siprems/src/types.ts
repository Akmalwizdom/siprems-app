export type TimeRange = 'today' | 'week' | 'month' | 'year';

export interface DashboardMetrics {
  totalRevenue: number;
  revenueChange: number;
  totalTransactions: number;
  transactionsChange: number;
  totalItemsSold: number;
  itemsChange: number;
}

export interface SalesDataPoint {
  date: string;
  sales: number;
}

export interface CategorySale {
  category: string;
  value: number;
  color: string;
}

export interface CriticalStockItem {
  id: string;
  name: string;
  stock: number;
}

export interface DashboardResponse {
  cards: {
    daily_transactions: number;
    active_products: number;
    low_stock_items: number;
  };
  salesTrend: SalesDataPoint[];
  stockComparison: Array<{
    product: string;
    current: number;
    optimal: number;
  }>;
}
