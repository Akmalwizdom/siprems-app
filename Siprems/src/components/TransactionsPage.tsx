import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { Plus, Calendar, Package, Hash, AlertTriangle } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { DataTable, Column } from './ui/data-table';
import { CardSkeleton } from './skeletons/CardSkeleton';
import { showToast } from '../utils/toast';
import { transactionSchema, type TransactionFormData } from '../utils/schemas';

interface RawTransaction {
  transaction_id: number;
  transaction_date: string;
  product_name: string;
  quantity_sold: string | number;
  price_per_unit: string | number;
}

interface Transaction extends Omit<RawTransaction, 'quantity_sold' | 'price_per_unit'> {
  id?: string | number;
  quantity_sold: number;
  price_per_unit: number;
}

interface Product {
  product_id: number;
  name: string;
  sku: string;
  stock: number;
}

const API_URL = 'http://localhost:5000';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });

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

      const rawTransData: RawTransaction[] = await transRes.json();
      const prodData: Product[] = await prodRes.json();

      const cleanTransData: Transaction[] = rawTransData.map((t) => ({
        ...t,
        id: t.transaction_id,
        quantity_sold: parseInt(String(t.quantity_sold), 10),
        price_per_unit: parseFloat(String(t.price_per_unit)),
      }));

      setTransactions(cleanTransData);
      setProducts(prodData.filter((p) => p.stock > 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      showToast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: TransactionFormData) => {
    const quantityNum = parseInt(data.quantity);
    const selectedProduct = products.find((p) => p.sku === data.product_sku);

    if (selectedProduct && selectedProduct.stock < quantityNum) {
      showToast.error(`Insufficient stock. Available: ${selectedProduct.stock}`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to add transaction');
      }

      const newTransCleaned: Transaction = {
        ...resData,
        id: resData.transaction_id,
        quantity_sold: parseInt(String(resData.quantity_sold), 10),
        price_per_unit: parseFloat(String(resData.price_per_unit)),
      };

      setTransactions([newTransCleaned, ...transactions]);
      setProducts(
        products
          .map((p) =>
            p.sku === data.product_sku ? { ...p, stock: p.stock - quantityNum } : p
          )
          .filter((p) => p.stock > 0)
      );

      reset();
      setIsOpen(false);
      showToast.success('Transaction added successfully');
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Failed to add transaction');
    }
  };

  const totalItemsSold = transactions.reduce((sum, t) => sum + t.quantity_sold, 0);
  const todayDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const columns: Column<Transaction>[] = [
    {
      key: 'transaction_date',
      label: 'Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: 'product_name',
      label: 'Product',
      sortable: true,
    },
    {
      key: 'quantity_sold',
      label: 'Quantity',
      sortable: true,
    },
    {
      key: 'price_per_unit',
      label: 'Price/Unit',
      sortable: true,
      render: (value) => `$${parseFloat(value).toFixed(2)}`,
    },
    {
      key: 'total',
      label: 'Total',
      sortable: false,
      render: (_, row) => `$${(row.quantity_sold * row.price_per_unit).toFixed(2)}`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 dark:text-white mb-2">Transactions</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your daily sales records</p>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select {...register('product_sku')}>
                  <SelectTrigger id="product" className="rounded-xl">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.sku} value={product.sku}>
                        {product.name} (Stock: {product.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.product_sku && (
                  <p className="text-sm text-red-600">{errors.product_sku.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  {...register('quantity')}
                  className="rounded-xl"
                />
                {errors.quantity && (
                  <p className="text-sm text-red-600">{errors.quantity.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    reset();
                  }}
                  className="rounded-xl"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100"
                >
                  {isSubmitting ? 'Saving...' : 'Save Transaction'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</CardTitle>
              <Hash className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-gray-900 dark:text-white">{transactions.length}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Items Sold</CardTitle>
              <Package className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-gray-900 dark:text-white">{totalItemsSold}</div>
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
      )}

      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Recent Transactions</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">A list of all sales records</p>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <DataTable<Transaction>
              columns={columns}
              data={transactions}
              isLoading={isLoading}
              pageSize={10}
              emptyMessage="No transactions found. Add one to get started."
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
