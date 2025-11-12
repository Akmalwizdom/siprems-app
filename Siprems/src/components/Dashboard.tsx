import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Package, ShoppingBag, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from './ui/skeleton'; // Kita gunakan Skeleton untuk loading

// Tipe Data untuk state
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

export default function Dashboard() {
  const [predictionPeriod, setPredictionPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  // State untuk data dinamis
  const [cardStats, setCardStats] = useState<CardStats | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([]);
  const [stockComparison, setStockComparison] = useState<StockCompData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/dashboard-stats`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const data = await response.json();

        // Pastikan data di-parse sebagai angka
        const parsedCards: CardStats = {
          daily_transactions: parseInt(String(data.cards.daily_transactions), 10),
          active_products: parseInt(String(data.cards.active_products), 10),
          low_stock_items: parseInt(String(data.cards.low_stock_items), 10),
        };

        const parsedSalesTrend: SalesTrendData[] = data.salesTrend.map((d: any) => ({
          ...d,
          sales: parseInt(String(d.sales), 10),
        }));

        const parsedStockComp: StockCompData[] = data.stockComparison.map((d: any) => ({
          ...d,
          current: parseInt(String(d.current), 10),
          optimal: parseInt(String(d.optimal), 10),
        }));
        
        setCardStats(parsedCards);
        setSalesTrend(parsedSalesTrend);
        setStockComparison(parsedStockComp);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);
  
  // Data statis untuk kartu prediksi (sesuai permintaan Anda sebelumnya)
  const predictionData = {
    weekly: { value: '+18%', label: 'Expected increase' },
    monthly: { value: '+24%', label: 'Expected increase' },
    yearly: { value: '+42%', label: 'Expected increase' },
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
        {/* Kartu Daily Transactions */}
        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Daily Transactions</CardTitle>
            <ShoppingBag className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <div className="text-3xl text-gray-900 dark:text-white">{cardStats?.daily_transactions}</div>
            )}
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">+12% from yesterday</p>
          </CardContent>
        </Card>

        {/* Kartu Active Products */}
        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Products</CardTitle>
            <Package className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <div className="text-3xl text-gray-900 dark:text-white">{cardStats?.active_products}</div>
              )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In stock inventory</p>
          </CardContent>
        </Card>

        {/* Kartu Low Stock Items */}
        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</CardTitle>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-12 mt-1" />
              ) : (
                <div className="text-3xl text-gray-900 dark:text-white">{cardStats?.low_stock_items}</div>
              )}
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">Need restocking soon</p>
          </CardContent>
        </Card>
        
        {/* Kartu Prediction (Sesuai permintaan Anda) */}
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Top 5 Low Stock Items</p>
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

      {/* Insights Card (Statis) */}
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