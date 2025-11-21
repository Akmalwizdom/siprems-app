import { apiClient } from './api';
import { TimeRange, DashboardMetrics, SalesDataPoint, CategorySale, CriticalStockItem, DashboardResponse, Product } from '../types';

const CATEGORY_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

async function fetchDashboardData(): Promise<DashboardResponse> {
  try {
    const data = await apiClient.get<DashboardResponse>('/dashboard-stats');
    return data;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return {
      cards: {
        daily_transactions: 0,
        active_products: 0,
        low_stock_items: 0,
      },
      salesTrend: [],
      stockComparison: [],
    };
  }
}

export async function getDashboardMetrics(timeRange: TimeRange): Promise<DashboardMetrics> {
  const data = await fetchDashboardData();
  
  const baseRevenue = data.stockComparison.reduce((sum, item) => sum + item.current * 100, 0);
  const revenueChangeMap: Record<TimeRange, number> = {
    today: 2,
    week: 8,
    month: 15,
    year: 42,
  };

  const transactionChangeMap: Record<TimeRange, number> = {
    today: 5,
    week: 12,
    month: 18,
    year: 35,
  };

  const itemsChangeMap: Record<TimeRange, number> = {
    today: 3,
    week: 10,
    month: 16,
    year: 40,
  };

  return {
    totalRevenue: baseRevenue,
    revenueChange: revenueChangeMap[timeRange],
    totalTransactions: data.cards.daily_transactions,
    transactionsChange: transactionChangeMap[timeRange],
    totalItemsSold: Math.floor(data.cards.daily_transactions * 1.5),
    itemsChange: itemsChangeMap[timeRange],
  };
}

export async function getSalesData(timeRange: TimeRange): Promise<SalesDataPoint[]> {
  const data = await fetchDashboardData();
  
  if (data.salesTrend && data.salesTrend.length > 0) {
    return data.salesTrend;
  }

  const daysMap: Record<TimeRange, number> = {
    today: 1,
    week: 7,
    month: 30,
    year: 365,
  };

  const days = daysMap[timeRange];
  const salesData: SalesDataPoint[] = [];
  const baseValue = 8000;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    const variance = Math.sin(i / 3) * 2000 + Math.random() * 1000;
    const sales = Math.max(4000, baseValue + variance);

    salesData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: Math.floor(sales),
    });
  }

  return salesData;
}

export async function getCategorySales(): Promise<CategorySale[]> {
  const data = await fetchDashboardData();

  const topProducts = data.stockComparison.slice(0, 5);

  return topProducts.map((product, index) => ({
    category: product.product,
    value: product.current,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));
}

export async function getCriticalStockItems(): Promise<CriticalStockItem[]> {
  const data = await fetchDashboardData();

  const criticalItems = data.stockComparison
    .filter((item) => item.current < item.optimal * 0.3)
    .slice(0, 5)
    .map((item, index) => ({
      id: `critical-${index}`,
      name: item.product,
      stock: item.current,
    }));

  return criticalItems;
}

export const mockProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Wireless Headphones',
    category: 'Electronics',
    sellingPrice: 79.99,
    stock: 45,
  },
  {
    id: 'prod-002',
    name: 'USB-C Cable',
    category: 'Electronics',
    sellingPrice: 12.99,
    stock: 150,
  },
  {
    id: 'prod-003',
    name: 'Desk Lamp',
    category: 'Home & Kitchen',
    sellingPrice: 34.99,
    stock: 28,
  },
  {
    id: 'prod-004',
    name: 'Coffee Mug',
    category: 'Home & Kitchen',
    sellingPrice: 9.99,
    stock: 200,
  },
  {
    id: 'prod-005',
    name: 'Notebook Set',
    category: 'Stationery',
    sellingPrice: 15.99,
    stock: 85,
  },
  {
    id: 'prod-006',
    name: 'Ballpoint Pen',
    category: 'Stationery',
    sellingPrice: 2.99,
    stock: 500,
  },
  {
    id: 'prod-007',
    name: 'Yoga Mat',
    category: 'Sports',
    sellingPrice: 29.99,
    stock: 40,
  },
  {
    id: 'prod-008',
    name: 'Water Bottle',
    category: 'Sports',
    sellingPrice: 24.99,
    stock: 60,
  },
  {
    id: 'prod-009',
    name: 'Running Shoes',
    category: 'Fashion',
    sellingPrice: 89.99,
    stock: 35,
  },
  {
    id: 'prod-010',
    name: 'Cotton T-Shirt',
    category: 'Fashion',
    sellingPrice: 19.99,
    stock: 120,
  },
];
