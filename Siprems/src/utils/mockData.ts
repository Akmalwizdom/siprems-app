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
    costPrice: 45.00,
    sellingPrice: 79.99,
    stock: 45,
    description: 'High-quality wireless headphones with noise cancellation',
  },
  {
    id: 'prod-002',
    name: 'USB-C Cable',
    category: 'Electronics',
    costPrice: 5.99,
    sellingPrice: 12.99,
    stock: 150,
    description: 'Durable USB-C charging and data transfer cable',
  },
  {
    id: 'prod-003',
    name: 'Desk Lamp',
    category: 'Home & Kitchen',
    costPrice: 18.00,
    sellingPrice: 34.99,
    stock: 28,
    description: 'LED desk lamp with adjustable brightness',
  },
  {
    id: 'prod-004',
    name: 'Coffee Mug',
    category: 'Home & Kitchen',
    costPrice: 4.50,
    sellingPrice: 9.99,
    stock: 200,
    description: 'Ceramic coffee mug with ergonomic handle',
  },
  {
    id: 'prod-005',
    name: 'Notebook Set',
    category: 'Stationery',
    costPrice: 8.00,
    sellingPrice: 15.99,
    stock: 85,
    description: 'Set of 3 lined notebooks for writing and planning',
  },
  {
    id: 'prod-006',
    name: 'Ballpoint Pen',
    category: 'Stationery',
    costPrice: 0.99,
    sellingPrice: 2.99,
    stock: 500,
    description: 'Smooth-writing ballpoint pen in black ink',
  },
  {
    id: 'prod-007',
    name: 'Yoga Mat',
    category: 'Sports',
    costPrice: 15.00,
    sellingPrice: 29.99,
    stock: 40,
    description: 'Non-slip yoga mat for exercise and meditation',
  },
  {
    id: 'prod-008',
    name: 'Water Bottle',
    category: 'Sports',
    costPrice: 12.00,
    sellingPrice: 24.99,
    stock: 60,
    description: 'Insulated water bottle keeps drinks cold for 24 hours',
  },
  {
    id: 'prod-009',
    name: 'Running Shoes',
    category: 'Fashion',
    costPrice: 50.00,
    sellingPrice: 89.99,
    stock: 35,
    description: 'Professional running shoes with cushioned sole',
  },
  {
    id: 'prod-010',
    name: 'Cotton T-Shirt',
    category: 'Fashion',
    costPrice: 8.00,
    sellingPrice: 19.99,
    stock: 120,
    description: '100% organic cotton t-shirt available in multiple colors',
  },
];

export const predictionData = [
  { date: 'Week 1', historical: 4200, predicted: 4100, isHoliday: false, holidayName: '' },
  { date: 'Week 2', historical: 4800, predicted: 4900, isHoliday: false, holidayName: '' },
  { date: 'Week 3', historical: 5100, predicted: 5200, isHoliday: false, holidayName: '' },
  { date: 'Week 4', historical: 4600, predicted: 4700, isHoliday: false, holidayName: '' },
  { date: 'Week 5', historical: 5400, predicted: 5500, isHoliday: false, holidayName: '' },
  { date: 'Week 6', historical: 7200, predicted: 8100, isHoliday: true, holidayName: 'Eid Al-Fitr' },
  { date: 'Week 7', historical: 8100, predicted: 9200, isHoliday: true, holidayName: 'Eid Al-Fitr' },
  { date: 'Week 8', historical: 5800, predicted: 5900, isHoliday: false, holidayName: '' },
  { date: 'Week 9', historical: 5300, predicted: 5400, isHoliday: false, holidayName: '' },
  { date: 'Week 10', historical: 6100, predicted: 6200, isHoliday: false, holidayName: '' },
  { date: 'Week 11', historical: 8900, predicted: 9800, isHoliday: true, holidayName: 'New Year' },
  { date: 'Week 12', historical: 7200, predicted: 7800, isHoliday: false, holidayName: '' },
];

export const restockRecommendations = [
  {
    productId: 'prod-004',
    productName: 'Coffee Mug',
    currentStock: 200,
    predictedDemand: 450,
    recommendedRestock: 350,
    urgency: 'high',
  },
  {
    productId: 'prod-003',
    productName: 'Desk Lamp',
    currentStock: 28,
    predictedDemand: 85,
    recommendedRestock: 75,
    urgency: 'high',
  },
  {
    productId: 'prod-001',
    productName: 'Wireless Headphones',
    currentStock: 45,
    predictedDemand: 120,
    recommendedRestock: 95,
    urgency: 'medium',
  },
  {
    productId: 'prod-009',
    productName: 'Running Shoes',
    currentStock: 35,
    predictedDemand: 88,
    recommendedRestock: 63,
    urgency: 'high',
  },
  {
    productId: 'prod-005',
    productName: 'Notebook Set',
    currentStock: 85,
    predictedDemand: 110,
    recommendedRestock: 35,
    urgency: 'low',
  },
];
