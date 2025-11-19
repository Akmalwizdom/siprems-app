import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Loader2, CheckCircle, AlertTriangle, ArrowUp, ArrowDown, Package, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface ChartData {
  date: string;
  actual: number | null;
  predicted: number;
  lower: number;
  upper: number;
}

interface RecommendationData {
  product: string;
  current: number;
  optimal: number;
  trend: 'up' | 'down';
  suggestion: string;
  urgency: 'high' | 'medium' | 'low';
}

interface Product {
  product_id: number;
  name: string;
  sku: string;
}

const API_URL = 'http://localhost:5000';

export default function PredictionPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [predictionData, setPredictionData] = useState<ChartData[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
  const [modelAccuracy, setModelAccuracy] = useState<number | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>("");
  
  // [BARU] State untuk periode prediksi
  const [forecastDays, setForecastDays] = useState<string>("30");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        const data: Product[] = await response.json();
        setProducts(data);
        if (data.length > 0) {
          setSelectedSku(data[0].sku);
        }
      } catch (err) {
        console.error(err);
        setApiError(err instanceof Error ? err.message : 'Failed to load products');
      }
    };
    fetchProducts();
  }, []);

  const handleRunPrediction = async () => {
    if (!selectedSku) {
      toast.error("Please select a product first.");
      return;
    }

    setIsRunning(true);
    setShowResults(false);
    setApiError(null);
    setModelAccuracy(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // [BARU] Kirim parameter days ke backend
        body: JSON.stringify({ 
          product_sku: selectedSku,
          days: parseInt(forecastDays) 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      const cleanChartData: ChartData[] = data.chartData.map((d: any) => ({
        ...d,
        actual: d.actual ? parseFloat(String(d.actual)) : null,
        predicted: parseFloat(String(d.predicted)),
        lower: parseFloat(String(d.lower)),
        upper: parseFloat(String(d.upper)),
      }));

      const cleanRecData: RecommendationData[] = data.recommendations.map((r: any) => ({
        ...r,
        current: parseInt(String(r.current), 10),
        optimal: parseInt(String(r.optimal), 10),
      }));

      setPredictionData(cleanChartData);
      setRecommendations(cleanRecData);
      
      if (data.accuracy !== undefined) {
        setModelAccuracy(data.accuracy);
      }
      
      setShowResults(true);

    } catch (error) {
      console.error('Failed to run prediction:', error);
      setApiError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-gray-900 dark:text-white mb-2">Stock Prediction</h1>
        <p className="text-gray-600 dark:text-gray-400">AI-powered inventory forecasting</p>
      </div>

      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col xl:flex-row items-center justify-center gap-8">
            <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-full w-20 h-20 flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
            
            <div className="flex-1 w-full space-y-4 text-center xl:text-left">
              <div>
                <h2 className="text-gray-900 dark:text-white font-semibold mb-1">Configuration</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Configure your prediction parameters below.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center xl:justify-start">
                {/* Product Selector */}
                <div className="space-y-2 w-full sm:w-64">
                  <Label className="text-xs text-gray-500 uppercase font-bold">Product</Label>
                  <Select value={selectedSku} onValueChange={setSelectedSku}>
                    <SelectTrigger className="rounded-xl">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <SelectValue placeholder="Select product" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.sku} value={p.sku}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* [BARU] Time Period Selector */}
                <div className="space-y-2 w-full sm:w-40">
                  <Label className="text-xs text-gray-500 uppercase font-bold">Period</Label>
                  <Select value={forecastDays} onValueChange={setForecastDays}>
                    <SelectTrigger className="rounded-xl">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <SelectValue placeholder="Duration" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days (Short)</SelectItem>
                      <SelectItem value="30">30 Days (Medium)</SelectItem>
                      <SelectItem value="60">60 Days (Long)</SelectItem>
                      <SelectItem value="90">90 Days (Quarter)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Run Button */}
                <div className="space-y-2 w-full sm:w-auto sm:self-end">
                   {/* Spacer label agar sejajar */}
                   <Label className="text-xs opacity-0 hidden sm:block">Action</Label> 
                   <Button
                    size="default"
                    onClick={handleRunPrediction}
                    disabled={isRunning || !selectedSku}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 w-full"
                  >
                    {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                    {isRunning ? 'Analyzing...' : 'Run Prediction'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {apiError && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showResults && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-gray-900 dark:text-white">
                        Forecast Results: <span className="text-blue-500">{recommendations[0]?.product}</span>
                      </CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing historical context & {forecastDays}-day future forecast
                      </p>
                    </div>
                    
                    {modelAccuracy !== null && (
                      <div className="flex items-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                        <div>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider leading-none">
                            Model Accuracy
                          </p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 leading-none mt-0.5">
                            {modelAccuracy}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={predictionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9CA3AF" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          // Jika periode panjang, kurangi jumlah label di sumbu X agar rapi
                          interval={parseInt(forecastDays) > 30 ? 'preserveStartEnd' : 0}
                        />
                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        
                        {/* Area Kepercayaan (Confidence Interval) */}
                        <Area
                          type="monotone"
                          dataKey="upper"
                          stroke="none"
                          fill="#BFDBFE"
                          fillOpacity={0.3}
                          name="Confidence Range"
                        />
                        <Area
                          type="monotone"
                          dataKey="lower"
                          stroke="none"
                          fill="#fff" // Hack untuk membuat 'lubang' di bawah lower bound agar terlihat seperti range
                          fillOpacity={1}
                          name="Hidden"
                          legendType='none'
                          tooltipType='none'
                        />
                        
                        {/* Garis Aktual */}
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#9CA3AF"
                          strokeWidth={2}
                          dot={parseInt(forecastDays) <= 30 ? { r: 3, fill: "#9CA3AF" } : false} // Hilangkan dot jika periode panjang
                          name="Actual Sales"
                          connectNulls
                        />
                        
                        {/* Garis Prediksi */}
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          stroke="#2563EB"
                          strokeWidth={3}
                          dot={false}
                          name="AI Forecast"
                          animationDuration={1500}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Actionable Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Target Stock</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead>Recommendation</TableHead>
                        <TableHead>Urgency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendations.map((rec) => (
                        <TableRow key={rec.product}>
                          <TableCell className="font-medium">{rec.product}</TableCell>
                          <TableCell>{rec.current}</TableCell>
                          <TableCell>{rec.optimal}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {rec.trend === 'up' ? <ArrowUp className="w-4 h-4 text-green-500" /> : <ArrowDown className="w-4 h-4 text-red-500" />}
                              <span className="text-xs text-gray-500 capitalize">{rec.trend}</span>
                            </div>
                          </TableCell>
                          <TableCell>{rec.suggestion}</TableCell>
                          <TableCell>
                            <Badge variant={rec.urgency === 'high' ? 'destructive' : rec.urgency === 'medium' ? 'default' : 'secondary'}>
                              {rec.urgency}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}