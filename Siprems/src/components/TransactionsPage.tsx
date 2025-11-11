import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Plus, Calendar, Package, Hash, Loader2, AlertTriangle, DollarSign, AlertCircle, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import jsPDF from 'jspdf';

interface Transaction {
  transaction_id: number;
  transaction_date: string;
  product_name: string;
  quantity_sold: number;
  price_per_unit: number;
}

interface Product {
  product_id: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
}

interface TransactionSummary {
  totalSales: number;
  todayTransactions: number;
  outOfStockAlerts: number;
}

const API_URL = 'http://localhost:5000';

const debounce = <T extends any[]>(func: (...args: T) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<TransactionSummary>({
    totalSales: 0,
    todayTransactions: 0,
    outOfStockAlerts: 0,
  });

  const [newTransaction, setNewTransaction] = useState({
    product_sku: '',
    quantity: '',
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [transRes, prodRes] = await Promise.all([
        fetch(`${API_URL}/transactions`),
        fetch(`${API_URL}/products`),
      ]);

      if (!transRes.ok) throw new Error('Failed to fetch transactions');
      if (!prodRes.ok) throw new Error('Failed to fetch products');

      const transData: Transaction[] = await transRes.json();
      const prodData: Product[] = await prodRes.json();

      setTransactions(transData);
      setProducts(prodData);
      updateSummary(transData, prodData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSummary = (trans: Transaction[], prods: Product[]) => {
    const today = new Date().toDateString();
    const todayTrans = trans.filter((t) => new Date(t.transaction_date).toDateString() === today);
    const totalSales = trans.reduce((sum, t) => sum + t.quantity_sold * parseFloat(t.price_per_unit), 0);
    const outOfStock = prods.filter((p) => p.stock === 0).length;

    setSummary({
      totalSales: parseFloat(totalSales.toFixed(2)),
      todayTransactions: todayTrans.length,
      outOfStockAlerts: outOfStock,
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchProducts = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setFilteredProducts([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`${API_URL}/products?search=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setFilteredProducts(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  const handleProductSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setNewTransaction({ ...newTransaction, product_sku: '' });
    setSelectedProduct(null);
    setStockError(null);
    handleSearchProducts(query);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setNewTransaction({ ...newTransaction, product_sku: product.sku });
    setSearchQuery(product.name);
    setShowDropdown(false);
    setStockError(null);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = e.target.value;
    setNewTransaction({ ...newTransaction, quantity });

    if (selectedProduct) {
      const qty = parseInt(quantity) || 0;
      if (qty > selectedProduct.stock) {
        setStockError(`Only ${selectedProduct.stock} units available in stock`);
      } else if (qty > 0 && qty <= selectedProduct.stock) {
        setStockError(null);
      }
    }
  };

  const isSubmitDisabled =
    !newTransaction.product_sku ||
    !newTransaction.quantity ||
    parseInt(newTransaction.quantity) <= 0 ||
    (selectedProduct && parseInt(newTransaction.quantity) > selectedProduct.stock) ||
    stockError !== null;

  const handleAddTransaction = async () => {
    if (isSubmitDisabled) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to add transaction');

      const transactionData = resData;
      await fetchData();

      generateReceiptPDF(selectedProduct!, newTransaction.quantity, transactionData);

      setNewTransaction({ product_sku: '', quantity: '' });
      setSelectedProduct(null);
      setSearchQuery('');
      setStockError(null);
      setIsOpen(false);
      toast.success('Transaction completed successfully! PDF receipt generated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add transaction');
    }
  };

  const generateReceiptPDF = (product: Product, quantity: string, transaction: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    const storeName = 'SIPREMS Store';
    const currentDate = new Date().toLocaleString();
    const qty = parseInt(quantity);
    const totalPrice = qty * product.price;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(storeName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Sales Receipt', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    doc.setDrawColor(200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.text(`Date: ${currentDate}`, margin, yPosition);
    yPosition += 8;

    doc.text(`Receipt #: ${transaction.transaction_id}`, margin, yPosition);
    yPosition += 12;

    doc.setFont(undefined, 'bold');
    doc.text('Item Details:', margin, yPosition);
    yPosition += 7;

    doc.setFont(undefined, 'normal');
    doc.text(`Product: ${product.name}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`SKU: ${product.sku}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Quantity: ${qty} units`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Unit Price: $${product.price.toFixed(2)}`, margin + 5, yPosition);
    yPosition += 12;

    doc.setDrawColor(200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(`Total: $${totalPrice.toFixed(2)}`, pageWidth - margin - 50, yPosition, { align: 'right' });
    yPosition += 12;

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Thank you for your purchase!', pageWidth / 2, pageHeight - 20, { align: 'center' });

    doc.save(`receipt-${transaction.transaction_id}.pdf`);
  };

  const totalItemsSold = transactions.reduce((sum, t) => sum + t.quantity_sold, 0);
  const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 dark:text-white mb-2">Transactions</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your daily sales records</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100">
              <Plus className="w-4 h-4 mr-2" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Record a new sale transaction with real-time stock validation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2 relative">
                <Label htmlFor="product-search">Product Search</Label>
                <Input
                  id="product-search"
                  type="text"
                  placeholder="Search by product name or SKU..."
                  value={searchQuery}
                  onChange={handleProductSearch}
                  onFocus={() => searchQuery && setShowDropdown(true)}
                  className="rounded-xl"
                />
                {isSearching && (
                  <div className="absolute right-3 top-9">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}

                {showDropdown && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.sku}
                        onClick={() => handleSelectProduct(product)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          SKU: {product.sku} • Stock: {product.stock} • ${product.price.toFixed(2)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && filteredProducts.length === 0 && searchQuery && !isSearching && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No products found</p>
                  </div>
                )}

                {selectedProduct && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Selected: {selectedProduct.name}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      Price: ${selectedProduct.price.toFixed(2)} | Stock Available: {selectedProduct.stock}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={newTransaction.quantity}
                  onChange={handleQuantityChange}
                  disabled={!selectedProduct}
                  className="rounded-xl"
                />
                {stockError && (
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{stockError}</span>
                  </div>
                )}
              </div>

              {selectedProduct && newTransaction.quantity && parseInt(newTransaction.quantity) > 0 && !stockError && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <p className="text-sm font-medium text-green-900 dark:text-green-300">
                    Total: ${(parseInt(newTransaction.quantity) * selectedProduct.price).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setNewTransaction({ product_sku: '', quantity: '' });
                  setSelectedProduct(null);
                  setSearchQuery('');
                  setStockError(null);
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTransaction}
                disabled={isSubmitDisabled}
                className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Sale
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Sales</CardTitle>
            <DollarSign className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <div className="text-3xl text-gray-900 dark:text-white">${summary.totalSales.toFixed(2)}</div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time revenue</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Today's Transactions</CardTitle>
            <Hash className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <div className="text-3xl text-gray-900 dark:text-white">{summary.todayTransactions}</div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Today's sales</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Out-of-Stock</CardTitle>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <div className="text-3xl text-gray-900 dark:text-white">{summary.outOfStockAlerts}</div>
            )}
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">Products unavailable</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Items Sold</CardTitle>
            <Package className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <div className="text-3xl text-gray-900 dark:text-white">{totalItemsSold}</div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total units</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Recent Transactions</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">A list of all sales records</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price/Unit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.transaction_id}>
                        <TableCell>{new Date(transaction.transaction_date).toLocaleString()}</TableCell>
                        <TableCell>{transaction.product_name}</TableCell>
                        <TableCell>{transaction.quantity_sold}</TableCell>
                        <TableCell>${parseFloat(transaction.price_per_unit).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          ${(transaction.quantity_sold * parseFloat(transaction.price_per_unit)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
