import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Loader2, CheckCircle, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from './ui/alert'; // Import Alert

// Tentukan tipe data untuk hasil API
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

export default function PredictionPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // State untuk menyimpan data dari API
  const [predictionData, setPredictionData] = useState<ChartData[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);

  const handleRunPrediction = async () => {
    setIsRunning(true);
    setShowResults(false);
    setApiError(null); // Bersihkan error sebelumnya

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Anda dapat mengirim body jika diperlukan, misal:
        // body: JSON.stringify({ product_sku: 'LAP-001' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Simpan data dari API ke state
      setPredictionData(data.chartData);
      setRecommendations(data.recommendations);
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
          <div className="text-center space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white mb-2">Prophet AI Model</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Click the button below to run stock predictions based on historical data
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!isRunning && !showResults && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    size="lg"
                    onClick={handleRunPrediction}
                    className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100"
                  >
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Run Stock Prediction
                  </Button>
                </motion.div>
              )}

              {isRunning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-4"
                >
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                  <div>
                    <p className="text-gray-900 dark:text-white">Running Prophet AI model...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Analyzing historical data and seasonal patterns
                    </p>
                  </div>
                </motion.div>
              )}

              {showResults && !isRunning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <div>
                    <p className="text-gray-900 dark:text-white">Prediction Complete!</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View results below</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tampilkan Pesan Error API */}
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4"
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
          </div>
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
                  <CardTitle className="text-gray-900 dark:text-white">Prediction Results</CardTitle>
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