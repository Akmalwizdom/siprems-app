import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Package, ShoppingBag, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from './ui/skeleton';
import InsightCard from './InsightCard';

interface CardStats {
  daily_transactions: number;
  active_products: number;
  low_stock_items: number;
}

interface SalesTrendData {
  date: string;
  sales: number;
}

interface StockCompData {
  product: string;
  current: number;
  optimal: number;
}

interface InsightData {
  product_name: string;
  sku: string;
  change_percent: string;
  reason: string;
}

interface ChartExplanation {
  date: string;
  explanation: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const API_URL = 'http://localhost:5000';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
  explanation?: string;
}

const CustomLineTooltip = ({ active, payload, label, explanation }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg cursor-help">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Sales: {payload[0].value}</p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-gray-900 dark:bg-gray-950 text-white text-xs">
            {explanation || 'Sales data for this date'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [predictionPeriod, setPredictionPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [cardStats, setCardStats] = useState<CardStats | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([]);
  const [stockComparison, setStockComparison] = useState<StockCompData[]>([]);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [explanations, setExplanations] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState('');
  const [restockMessage, setRestockMessage] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [dashboardRes, insightsRes] = await Promise.all([
          fetch(`${API_URL}/dashboard-stats`),
          fetch(`${API_URL}/api/predictions/insights`),
        ]);

        if (!dashboardRes.ok) throw new Error('Failed to fetch dashboard data');
        const dashboardData = await dashboardRes.json();

        setCardStats(dashboardData.cards);
        setSalesTrend(dashboardData.salesTrend);
        setStockComparison(dashboardData.stockComparison);

        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setInsights(Array.isArray(insightsData) ? insightsData.slice(0, 3) : []);
        }

        if (dashboardData.salesTrend && dashboardData.salesTrend.length > 0) {
          const dates = dashboardData.salesTrend.map((item: SalesTrendData) => item.date);
          const explanationPromises = dates.map((date: string) =>
            fetch(`${API_URL}/api/predictions/explain?date=${date}`)
              .then((res) => (res.ok ? res.json() : null))
              .catch(() => null)
          );

          const explanationResults = await Promise.all(explanationPromises);
          const explanationMap = new Map<string, string>();
          dates.forEach((date: string, index: number) => {
            if (explanationResults[index]?.explanation) {
              explanationMap.set(date, explanationResults[index].explanation);
            }
          });
          setExplanations(explanationMap);
        }
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);
  

  const predictionData = {
    weekly: { value: '+18%', label: 'Expected increase' },
    monthly: { value: '+24%', label: 'Expected increase' },
    yearly: { value: '+42%', label: 'Expected increase' },
  };

  const handleRestockNow = async (sku: string) => {
    try {
      const response = await fetch(`${API_URL}/api/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, quantity: 100 }),
      });
      if (!response.ok) throw new Error('Failed to submit restock request');
      setRestockMessage('Restock request submitted successfully!');
      setTimeout(() => {
        setRestockModalOpen(false);
        setRestockMessage('');
      }, 2000);
    } catch (error) {
      console.error('Restock error:', error);
      setRestockMessage('Failed to submit restock request. Please try again.');
    }
  };

  const handleNavigateProduct = (sku: string) => {
    window.location.href = `/products/${sku}`;
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard-stats/export`);
      if (!response.ok) throw new Error('Failed to export report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-gray-900 dark:text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-600 dark:text-gray-400">Track your business performance and stock predictions</p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Daily Transactions</CardTitle>
            <ShoppingBag className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl text-gray-900 dark:text-white">{cardStats?.daily_transactions}</div>}
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Products</CardTitle>
            <Package className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
          {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl text-gray-900 dark:text-white">{cardStats?.active_products}</div>}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In stock inventory</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</CardTitle>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </CardHeader>
          <CardContent>
          {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-3xl text-gray-900 dark:text-white">{cardStats?.low_stock_items}</div>}
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">Need restocking soon</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Prediction</CardTitle>
          <Select value={predictionPeriod} onValueChange={(value: any) => setPredictionPeriod(value)}>
            <SelectTrigger className="w-[120px] h-8 rounded-lg bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline space-x-2">
            <div className="text-3xl text-gray-900 dark:text-white">{predictionData[predictionPeriod].value}</div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{predictionData[predictionPeriod].label}</p>
        </CardContent>
      </Card>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Sales Trends</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days performance</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Stock Comparison</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current vs Optimal (Top 5 Low Stock)</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stockComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="product" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="optimal" fill="#93C5FD" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Insight Card (Tetap statis untuk saat ini) */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 shadow-sm">
          <CardHeader>
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1" />
              <div>
                <CardTitle className="text-blue-900 dark:text-blue-300">AI Insight</CardTitle>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
                  Stock for <span className="font-semibold">Laptop</span> is expected to increase next
                  week by <span className="font-semibold">+20%</span> due to seasonal trends. Consider
                  restocking to meet demand.
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    </motion.div>
  );
}
