import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, User, BarChart3, TrendingUp, Download, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chartData?: {
    type: 'bar' | 'line';
    data: any[];
  };
  timestamp: Date;
}

interface ChartDataPoint {
  [key: string]: string | number;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      "Hello! I'm your AI inventory assistant. I can help explain predictions, answer questions about stock trends, and provide seasonal insights. How can I assist you today?",
    timestamp: new Date(),
  },
];

const quickActionButtons = [
  'Show top-selling products',
  'Forecast next month',
  'Explain demand spike',
  'When should I restock?',
];

function InlineChart({ chartData }: { chartData: { type: 'bar' | 'line'; data: ChartDataPoint[] } }) {
  const height = 250;

  if (chartData.type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData.data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="name" stroke="rgba(0,0,0,0.6)" fontSize={12} />
          <YAxis stroke="rgba(0,0,0,0.6)" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <Legend />
          {chartData.data.length > 0 &&
            Object.keys(chartData.data[0])
              .filter((key) => key !== 'name' && key !== 'period')
              .map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={key === 'sold' ? '#3b82f6' : key === 'revenue' ? '#8b5cf6' : '#10b981'}
                  radius={[4, 4, 0, 0]}
                />
              ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData.data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
        <XAxis dataKey="day" stroke="rgba(0,0,0,0.6)" fontSize={12} />
        <YAxis stroke="rgba(0,0,0,0.6)" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} dot={false} />
        {chartData.data[0]?.lower && <Line type="monotone" dataKey="lower" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="5 5" dot={false} />}
        {chartData.data[0]?.upper && <Line type="monotone" dataKey="upper" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="5 5" dot={false} />}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function InsightsPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastProduct, setLastProduct] = useState('LAP-001');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const extractProductSKU = (text: string): string | null => {
    const skuPattern = /\b([A-Z]+-\d{3})\b/i;
    const match = text.match(skuPattern);
    return match ? match[1].toUpperCase() : null;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Extract product SKU if mentioned
    const mentionedSKU = extractProductSKU(inputValue);
    if (mentionedSKU) {
      setLastProduct(mentionedSKU);
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: inputValue,
          lastProduct: lastProduct,
        }),
      });

      const data = await response.json();

      if (data.error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I encountered an error: ${data.error}. Please try again.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          chartData: data.chartData,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        if (data.lastProduct) {
          setLastProduct(data.lastProduct);
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I could not connect to the server. Please check your connection and try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
  };

  const exportConversationAsPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    doc.setFontSize(16);
    doc.text('AI Insights Assistant - Conversation Export', margin, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    doc.text(`Exported: ${timestamp}`, margin, yPosition);
    yPosition += 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    messages.forEach((message) => {
      doc.setFontSize(11);
      doc.setTextColor(message.role === 'user' ? 0, 102, 204 : 50, 50, 50);
      const role = message.role === 'user' ? 'You' : 'AI Assistant';
      doc.text(`${role}:`, margin, yPosition);
      yPosition += 6;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(message.content, pageWidth - margin * 2);
      doc.text(lines, margin + 5, yPosition);
      yPosition += lines.length * 5 + 5;

      const time = message.timestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(`${time}`, margin + 5, yPosition);
      yPosition += 8;

      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    });

    doc.save('conversation-export.pdf');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-gray-900 dark:text-white mb-2">AI Insights Assistant</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Chat with our AI to understand predictions and get personalized recommendations
          </p>
        </div>
        <Button
          onClick={exportConversationAsPDF}
          variant="outline"
          className="rounded-xl flex items-center gap-2 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export PDF</span>
        </Button>
      </div>

      {/* Chat Interface */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 rounded-full p-2">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-gray-900 dark:text-white">StockPredict AI</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isLoading ? 'Processing...' : 'Online - Ready to help'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex space-x-3 max-w-[85%] ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback
                        className={
                          message.role === 'user' ? 'bg-gray-200 text-gray-700' : 'bg-blue-500 text-white'
                        }
                      >
                        {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col gap-2">
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {message.chartData && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-600"
                        >
                          <InlineChart chartData={message.chartData} />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-500 text-white">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-200" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Ask about predictions, trends, or recommendations..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="rounded-xl"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Buttons */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActionButtons.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="rounded-xl text-left justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-gray-700"
              >
                <TrendingUp className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{action}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Context Info Card */}
      {lastProduct && (
        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 flex items-center gap-3 text-blue-900 dark:text-blue-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">Current Context:</span> Analyzing data for product <span className="font-mono bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{lastProduct}</span>. Mention a different SKU to switch products.
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}