import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Loader2, CheckCircle, AlertTriangle, ArrowUp, ArrowDown, Package } from 'lucide-react';
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

// Tipe data untuk hasil API
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

// Tipe data Produk (untuk dropdown)
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

  // State untuk data dari API
  const [predictionData, setPredictionData] = useState<ChartData[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
  
  // State baru untuk dropdown produk
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>("");

  // Ambil daftar produk untuk dropdown saat halaman dimuat
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        const data: Product[] = await response.json();
        setProducts(data);
        // Set produk pertama sebagai default jika ada
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
      toast.error("Please select a product to predict.");
      return;
    }

    setIsRunning(true);
    setShowResults(false);
    setApiError(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_sku: selectedSku }) // Kirim SKU yang dipilih
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // --- PERBAIKAN PENTING ---
      // Konversi semua string angka dari JSON menjadi number
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
      setShowResults(true);

    } catch (error) {
      console.error('Failed to run prediction:', error);
      if (error instanceof Error) {
        setApiError(error.message);
      } else {
        setApiError('An unknown error occurred.');
      }
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
      {/* Header */}
      <div>
        <h1 className="text-gray-900 dark:text-white mb-2">Stock Prediction</h1>
        <p className="text-gray-600 dark:text-gray-400">Run AI-powered predictions for optimal inventory management</p>
      </div>

      {/* Run Prediction Section */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
            
            <div className="flex-1 w-full text-center md:text-left">
              <h2 className="text-gray-900 dark:text-white mb-2">Prophet AI Model</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select a product and click the button to run stock predictions.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                {/* --- DROPDOWN PRODUK BARU --- */}
                <div className="space-y-2 w-full sm:w-64">
                  <Label htmlFor="product-select" className="sr-only">Select Product</Label>
                  <Select value={selectedSku} onValueChange={setSelectedSku}>
                    <SelectTrigger id="product-select" className="rounded-xl">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <SelectValue placeholder="Select a product" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {products.length > 0 ? (
                        products.map((product) => (
                          <SelectItem key={product.sku} value={product.sku}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>Loading products...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* --- Tombol Run Prediction --- */}
                <AnimatePresence mode="wait">
                  {!isRunning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Button
                        size="lg"
                        onClick={handleRunPrediction}
                        disabled={!selectedSku}
                        className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100 w-full sm:w-auto"
                      >
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Run Stock Prediction
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* --- INDIKATOR LOADING & SUKSES --- */}
            <AnimatePresence mode="wait">
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-4 text-center w-48"
                >
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                  <div>
                    <p className="text-gray-900 dark:text-white">Running model...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Analyzing data...
                    </p>
                  </div>
                </motion.div>
              )}

              {showResults && !isRunning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 text-center w-48"
                >
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <div>
                    <p className="text-gray-900 dark:text-white">Prediction Complete!</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View results below</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tampilkan Pesan Error API */}
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4 mt-4"
            >
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Prediction Failed</AlertTitle>
                <AlertDescription>
                  {apiError}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      <AnimatePresence>
        {showResults && (
          <>
            {/* Prediction Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">
                    Prediction Results for <span className="text-blue-500">{recommendations[0]?.product || ''}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    7-day forecast with confidence intervals
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={predictionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="upper"
                        fill="#DBEAFE"
                        stroke="none"
                        fillOpacity={0.6}
                        name="Confidence Upper"
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        fill="#ffffff"
                        stroke="none"
                        fillOpacity={1}
                        name="Confidence Lower"
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#6B7280"
                        strokeWidth={2}
                        dot={{ fill: '#6B7280', r: 4 }}
                        name="Actual Sales"
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', r: 5 }}
                        name="Predicted Sales"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recommendations Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Restock Recommendations</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Optimal inventory levels based on predictions
                  </p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Optimal Stock</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead>Suggestion</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendations.map((rec) => (
                        <TableRow key={rec.product}>
                          <TableCell>{rec.product}</TableCell>
                          <TableCell>{rec.current}</TableCell>
                          <TableCell>{rec.optimal}</TableCell>
                          <TableCell>
                            {rec.trend === 'up' ? (
                              <ArrowUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>{rec.suggestion}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                rec.urgency === 'high'
                                  ? 'destructive'
                                  : rec.urgency === 'medium'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="rounded-lg"
                            >
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