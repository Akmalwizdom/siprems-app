import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Package, AlertCircle } from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getDashboardMetrics, getSalesData, getCategorySales, getCriticalStockItems } from '../utils/mockData';
import { TimeRange, DashboardMetrics, SalesDataPoint, CategorySale, CriticalStockItem } from '../types';

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySale[]>([]);
  const [criticalStockItems, setCriticalStockItems] = useState<CriticalStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [metricsData, salesTrendData, categoriesData, criticalItems] = await Promise.all([
          getDashboardMetrics(selectedRange),
          getSalesData(selectedRange),
          getCategorySales(),
          getCriticalStockItems(),
        ]);

        setMetrics(metricsData);
        setSalesData(salesTrendData);
        setCategorySales(categoriesData);
        setCriticalStockItems(criticalItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedRange]);

  if (isLoading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-200 h-10 rounded-lg w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
              <div className="h-20 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return <div className="text-red-600">Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Dashboard</h1>
          <p className="text-slate-500">Welcome back! Here's your business overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                selectedRange === range.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
              +{metrics.revenueChange}%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-slate-900">${metrics.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">vs last period</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
              +{metrics.transactionsChange}%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Total Transactions</h3>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalTransactions.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">vs last period</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
              +{metrics.itemsChange}%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Items Sold</h3>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalItemsSold.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">vs last period</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Sales Performance</h2>
            <p className="text-sm text-slate-500">Track your revenue trends</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '0.875rem' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#4f46e5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Categories */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Top Categories</h2>
            <p className="text-sm text-slate-500">Best performing</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categorySales}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {categorySales.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {categorySales.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  ></div>
                  <span className="text-sm text-slate-700">{cat.category}</span>
                </div>
                <span className="text-sm font-medium text-slate-900">{cat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Stock Alert */}
      {criticalStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-lg flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-red-900 mb-2">Critical Stock Alert</h3>
              <p className="text-sm text-red-700 mb-4">
                {criticalStockItems.length} item(s) are running low on stock
              </p>
              <div className="flex flex-wrap gap-2">
                {criticalStockItems.map((item) => (
                  <span
                    key={item.id}
                    className="px-3 py-1 bg-white text-red-700 text-sm rounded-full border border-red-200"
                  >
                    {item.name} ({item.stock} left)
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-amber-900 font-semibold mb-1">Data Loading Error</h3>
              <p className="text-sm text-amber-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
