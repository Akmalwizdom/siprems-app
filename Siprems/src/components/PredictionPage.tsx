import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Loader2, CheckCircle, AlertTriangle, ArrowUp, ArrowDown, Download, Eye, EyeOff, Calendar } from 'lucide-react';
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
import { Skeleton } from './ui/skeleton';
import jsPDF from 'jspdf';

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

interface ExplanationData {
  factor: string;
  description: string;
  icon: string;
}

interface PredictionExplanation {
  explanations: ExplanationData[];
  summary: string;
}

const API_URL = 'http://localhost:5000';

export default function PredictionPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7);
  const [showConfidenceIntervals, setShowConfidenceIntervals] = useState(true);
  const [explanations, setExplanations] = useState<PredictionExplanation | null>(null);
  const [isLoadingExplanations, setIsLoadingExplanations] = useState(false);

  const [predictionData, setPredictionData] = useState<ChartData[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);

  const getTimeRangeLabel = (range: number) => {
    if (range === 7) return '7 Days';
    if (range === 30) return '30 Days';
    if (range === 90) return '90 Days';
    return '';
  };

  const fetchExplanations = async (range: number) => {
    setIsLoadingExplanations(true);
    try {
      const response = await fetch(`${API_URL}/predict/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_sku: 'LAP-001',
          time_range: range,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExplanations(data);
      }
    } catch (error) {
      console.error('Failed to fetch explanations:', error);
    } finally {
      setIsLoadingExplanations(false);
    }
  };

  const handleRunPrediction = async () => {
    setIsRunning(true);
    setShowResults(false);
    setApiError(null);
    setExplanations(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_sku: 'LAP-001',
          time_range: timeRange,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPredictionData(data.chartData);
      setRecommendations(data.recommendations);
      setShowResults(true);

      await fetchExplanations(timeRange);
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

  const downloadCSV = useCallback(() => {
    if (predictionData.length === 0) return;

    const headers = ['Date', 'Actual Sales', 'Predicted Sales', 'Lower Bound', 'Upper Bound'];
    const rows = predictionData.map((row) => [
      row.date,
      row.actual || '',
      row.predicted,
      row.lower,
      row.upper,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `prediction-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [predictionData]);

  const downloadPDF = useCallback(() => {
    if (predictionData.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Stock Prediction Report', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Time Range: ${getTimeRangeLabel(timeRange)}`, margin, yPosition);
    yPosition += 12;

    if (recommendations.length > 0) {
      const rec = recommendations[0];
      doc.setFont(undefined, 'bold');
      doc.text('Recommendations:', margin, yPosition);
      yPosition += 7;

      doc.setFont(undefined, 'normal');
      doc.text(`Product: ${rec.product}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Current Stock: ${rec.current} units`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Optimal Stock: ${rec.optimal} units`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Suggestion: ${rec.suggestion}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Trend: ${rec.trend === 'up' ? 'Upward' : 'Downward'}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Priority: ${rec.urgency.toUpperCase()}`, margin + 5, yPosition);
      yPosition += 12;
    }

    doc.setFont(undefined, 'bold');
    doc.text('Prediction Data:', margin, yPosition);
    yPosition += 7;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    const tableData = predictionData.map((row) => [
      row.date,
      row.actual || '-',
      row.predicted.toString(),
      row.lower.toString(),
      row.upper.toString(),
    ]);

    const tableHeaders = ['Date', 'Actual', 'Predicted', 'Lower', 'Upper'];

    const cellWidth = (pageWidth - 2 * margin) / tableHeaders.length;
    const cellHeight = 6;

    tableHeaders.forEach((header, index) => {
      doc.setFont(undefined, 'bold');
      doc.text(header, margin + index * cellWidth + 1, yPosition, { maxWidth: cellWidth - 2 });
    });
    yPosition += cellHeight;

    doc.setFont(undefined, 'normal');
    tableData.forEach((row) => {
      if (yPosition + cellHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      row.forEach((cell, index) => {
        doc.text(cell, margin + index * cellWidth + 1, yPosition, { maxWidth: cellWidth - 2 });
      });
      yPosition += cellHeight;
    });

    if (explanations) {
      doc.addPage();
      yPosition = margin;

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Trend Analysis', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Summary: ${explanations.summary}`, margin, yPosition, { maxWidth: pageWidth - 2 * margin });
      yPosition += 15;

      doc.setFont(undefined, 'bold');
      doc.text('Key Factors:', margin, yPosition);
      yPosition += 7;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      explanations.explanations.forEach((explanation) => {
        const wrappedText = doc.splitTextToSize(
          `• ${explanation.factor}: ${explanation.description}`,
          pageWidth - 2 * margin - 5
        );
        wrappedText.forEach((line: string) => {
          if (yPosition + 5 > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      });
    }

    doc.save(`prediction-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [predictionData, recommendations, explanations, timeRange]);

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
          <div className="text-center space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white mb-2">Prophet AI Model</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select a time range and click the button below to run stock predictions based on historical data
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="flex justify-center gap-3">
              {[7, 30, 90].map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTimeRange(range as 7 | 30 | 90);
                    setShowResults(false);
                    setExplanations(null);
                  }}
                  disabled={isRunning || showResults}
                  className="rounded-lg"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {getTimeRangeLabel(range)}
                </Button>
              ))}
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
                      Analyzing historical data and seasonal patterns for {getTimeRangeLabel(timeRange).toLowerCase()}
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

            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4"
              >
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Prediction Failed</AlertTitle>
                  <AlertDescription>{apiError}</AlertDescription>
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Prediction Results</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getTimeRangeLabel(timeRange)} forecast with confidence intervals
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfidenceIntervals(!showConfidenceIntervals)}
                    className="rounded-lg"
                  >
                    {showConfidenceIntervals ? (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Hide Intervals
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Show Intervals
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  {predictionData.length === 0 ? (
                    <div className="h-[400px] space-y-4">
                      <Skeleton className="h-full w-full rounded-lg" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={predictionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip />
                        <Legend />
                        {showConfidenceIntervals && (
                          <>
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
                          </>
                        )}
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
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Trend Explanation Panel */}
            {isLoadingExplanations ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Trend Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-20 rounded-lg" />
                    <Skeleton className="h-20 rounded-lg" />
                    <Skeleton className="h-20 rounded-lg" />
                  </CardContent>
                </Card>
              </motion.div>
            ) : explanations ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Trend Analysis</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{explanations.summary}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {explanations.explanations.map((explanation, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                        >
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {explanation.factor}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {explanation.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}

            {/* Recommendations Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
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

            {/* Download Reports Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Download Reports</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Export prediction data and analysis for further review or sharing
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={downloadCSV}
                      className="rounded-xl bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                    <Button
                      onClick={downloadPDF}
                      className="rounded-xl bg-red-600 hover:bg-red-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
