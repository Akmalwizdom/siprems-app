import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Package, ShoppingBag, AlertCircle, Activity, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from './ui/skeleton';
import { CardSkeleton } from './skeletons/CardSkeleton';

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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const API_URL = 'http://localhost:5000';

export default function Dashboard() {
  const [predictionPeriod, setPredictionPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
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

  const predictionData = {
    weekly: { value: '+18%', label: 'Expected increase', subtext: 'Next 7 days' },
    monthly: { value: '+24%', label: 'Expected increase', subtext: 'Next 30 days' },
    yearly: { value: '+42%', label: 'Expected increase', subtext: 'Next 365 days' },
  };

  const calculateTotalRevenue = () => {
    return stockComparison.reduce((sum, item) => sum + item.current * 100, 0);
  };

  const pieData = stockComparison.slice(0, 5).map((item) => ({
    name: item.product,
    value: item.current,
  }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your business performance and stock predictions in real-time
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Daily Transactions</CardTitle>
                <ShoppingBag className="w-5 h-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {cardStats?.daily_transactions}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">+12% from yesterday</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Products</CardTitle>
                <Package className="w-5 h-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {cardStats?.active_products}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In stock inventory</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</CardTitle>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {cardStats?.low_stock_items}
                </div>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">Need restocking soon</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Prediction</CardTitle>
                <Select value={predictionPeriod} onValueChange={(value: any) => setPredictionPeriod(value)}>
                  <SelectTrigger className="w-[100px] h-8 rounded-lg bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-xs">
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
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {predictionData[predictionPeriod].value}
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {predictionData[predictionPeriod].subtext}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Sales Trends
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days performance</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Skeleton className="h-full w-full rounded" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #4b5563',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', r: 5 }}
                      activeDot={{ r: 7 }}
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
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Stock Distribution
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Top 5 products</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[250px]">
                  <Skeleton className="h-full w-full rounded" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #4b5563',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Stock Comparison
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current vs Optimal levels</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Skeleton className="h-full w-full rounded" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stockComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
                    <XAxis dataKey="product" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #4b5563',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="current" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="optimal" fill="#93C5FD" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 shadow-sm">
            <CardHeader>
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <CardTitle className="text-blue-900 dark:text-blue-300">Key Insights</CardTitle>
                  <div className="text-sm text-blue-700 dark:text-blue-400 mt-4 space-y-3">
                    <div className="flex items-start space-x-2">
                      <span className="text-lg font-semibold">•</span>
                      <span>
                        <strong>Stock Status:</strong> {cardStats?.low_stock_items} items need restocking
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-lg font-semibold">•</span>
                      <span>
                        <strong>Daily Performance:</strong> {cardStats?.daily_transactions} transactions today
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-lg font-semibold">•</span>
                      <span>
                        <strong>Prediction:</strong> Expected {predictionData[predictionPeriod].value} growth{' '}
                        {predictionData[predictionPeriod].subtext.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-lg font-semibold">•</span>
                      <span>
                        <strong>Inventory Value:</strong> ${calculateTotalRevenue().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>
      </div>

      {error && (
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <p className="text-red-700 dark:text-red-300">
                <strong>Error:</strong> {error}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
