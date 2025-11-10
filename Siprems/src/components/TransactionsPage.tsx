import { useState, useEffect } from 'react'; // Import
import { motion } from 'motion/react';
import { Plus, Calendar, Package, Hash, Loader2, AlertTriangle } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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

// Tipe data dari database
interface Transaction {
  transaction_id: number;
  transaction_date: string;
  product_name: string; // Kita dapatkan dari JOIN di backend
  quantity_sold: number;
  price_per_unit: number;
}

// Tipe data Produk (untuk dropdown)
interface Product {
  product_id: number;
  name: string;
  sku: string;
}

const API_URL = 'http://localhost:5000';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]); // Untuk dropdown
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    product_sku: '', // Kita akan kirim SKU
    quantity: '',
  });

  // --- Fungsi Fetch Data ---
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Ambil transaksi dan produk secara bersamaan
      const [transRes, prodRes] = await Promise.all([
        fetch(`${API_URL}/transactions`),
        fetch(`${API_URL}/products`)
      ]);

      if (!transRes.ok) throw new Error('Failed to fetch transactions');
      if (!prodRes.ok) throw new Error('Failed to fetch products');

      const transData: Transaction[] = await transRes.json();
      const prodData: Product[] = await prodRes.json();
      
      setTransactions(transData);
      setProducts(prodData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddTransaction = async () => {
    if (!newTransaction.product_sku || !newTransaction.quantity) {
      toast.error('Please select a product and quantity');
      return;
    }
    
    if (parseInt(newTransaction.quantity) <= 0) {
      toast.error('Quantity must be positive');
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

      await fetchData(); // Muat ulang data
      setNewTransaction({ product_sku: '', quantity: '' });
      setIsOpen(false);
      toast.success('Transaction added successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add transaction');
    }
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
                Record a new sale transaction. Price will be taken from the product database.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select
                  value={newTransaction.product_sku}
                  onValueChange={(value) =>
                    setNewTransaction({ ...newTransaction, product_sku: value })
                  }
                >
                  <SelectTrigger id="product" className="rounded-xl">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.sku} value={product.sku}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={newTransaction.quantity}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, quantity: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTransaction}
                className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100"
              >
                Save Transaction
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</CardTitle>
            <Hash className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-3xl text-gray-900 dark:text-white">{transactions.length}</div>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Items Sold</CardTitle>
            <Package className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-3xl text-gray-900 dark:text-white">{totalItemsSold}</div>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Today's Date</CardTitle>
            <Calendar className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-gray-900 dark:text-white">{todayDate}</div>
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
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}