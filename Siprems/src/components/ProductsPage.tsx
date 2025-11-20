import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, Package, AlertCircle, AlertTriangle } from 'lucide-react';
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
import { productSchema, type ProductFormData } from '../utils/schemas';

interface RawProduct {
  product_id: number;
  name: string;
  category: string;
  variation: string | null;
  price: string | number;
  stock: string | number;
  sku: string;
  created_at: string;
}

interface Product extends Omit<RawProduct, 'price' | 'stock'> {
  id?: string | number;
  price: number;
  stock: number;
}

const categories = ['Electronics', 'Office', 'Accessories', 'Furniture', 'Supplies', 'F&B'];

const getStockStatus = (stock: number): { label: string; color: string } => {
  if (stock > 20) return { label: 'Sufficient', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
  if (stock > 5) return { label: 'Low', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' };
  return { label: 'Critical', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
};

const API_URL = 'http://localhost:5000';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data: RawProduct[] = await response.json();

      const cleanData: Product[] = data.map((p) => ({
        ...p,
        id: p.product_id,
        price: parseFloat(String(p.price)),
        stock: parseInt(String(p.stock), 10),
      }));

      setProducts(cleanData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      showToast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    reset();
    setSelectedProduct(null);
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (selectedProduct) {
        const response = await fetch(`${API_URL}/products/${selectedProduct.sku}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Failed to update product');

        await fetchProducts();
        setIsEditOpen(false);
        resetForm();
        showToast.success('Product updated successfully');
      } else {
        const response = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Failed to add product');

        await fetchProducts();
        setIsAddOpen(false);
        resetForm();
        showToast.success('Product added successfully');
      }
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Failed to save product');
    }
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setValue('name', product.name);
    setValue('sku', product.sku);
    setValue('category', product.category);
    setValue('variation', product.variation || '');
    setValue('price', product.price.toString());
    setValue('stock', product.stock.toString());
    setIsEditOpen(true);
  };

  const handleOpenDeleteConfirm = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      const response = await fetch(`${API_URL}/products/${selectedProduct.sku}`, {
        method: 'DELETE',
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete product');

      await fetchProducts();
      setIsDeleteOpen(false);
      setSelectedProduct(null);
      showToast.success('Product deleted successfully');
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStockItems = products.filter((p) => p.stock <= 5).length;

  const columns: Column<Product>[] = [
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
    },
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (value) => `$${parseFloat(value).toFixed(2)}`,
    },
    {
      key: 'stock',
      label: 'Stock',
      sortable: true,
      render: (value, row) => {
        const status = getStockStatus(row.stock);
        return (
          <div className="flex items-center space-x-2">
            <span>{value}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      render: (_, row) => (
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-500 transition-colors"
            title="Edit product"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenDeleteConfirm(row)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
            title="Delete product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
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
          <h1 className="text-gray-900 dark:text-white mb-2">Products</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your inventory items</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Add a new product to your inventory. Fill in all required fields.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Product Name</Label>
                <Input
                  id="add-name"
                  placeholder="Enter product name"
                  {...register('name')}
                  className="rounded-xl"
                  autoFocus
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-sku">SKU</Label>
                <Input
                  id="add-sku"
                  placeholder="Enter SKU code"
                  {...register('sku')}
                  className="rounded-xl"
                />
                {errors.sku && <p className="text-sm text-red-600">{errors.sku.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-category">Category</Label>
                  <Select {...register('category')}>
                    <SelectTrigger id="add-category" className="rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-variation">Variation</Label>
                  <Input
                    id="add-variation"
                    placeholder="e.g., Color, Size"
                    {...register('variation')}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-price">Price</Label>
                  <Input
                    id="add-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('price')}
                    className="rounded-xl"
                  />
                  {errors.price && <p className="text-sm text-red-600">{errors.price.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-stock">Stock</Label>
                  <Input
                    id="add-stock"
                    type="number"
                    placeholder="0"
                    {...register('stock')}
                    className="rounded-xl"
                  />
                  {errors.stock && <p className="text-sm text-red-600">{errors.stock.message}</p>}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false);
                    resetForm();
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
                  {isSubmitting ? 'Saving...' : 'Add Product'}
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
              <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Products</CardTitle>
              <Package className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-gray-900 dark:text-white">{products.length}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Value</CardTitle>
              <Package className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-gray-900 dark:text-white">${totalValue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Low Stock</CardTitle>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-gray-900 dark:text-white">{lowStockItems}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardContent className="pt-6">
          <Input
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl"
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Products Inventory</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">A complete list of all products</p>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <DataTable<Product>
              columns={columns}
              data={filteredProducts}
              isLoading={isLoading}
              pageSize={10}
              emptyMessage={searchTerm ? 'No products found matching your search.' : 'No products found. Add one to get started.'}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information. Click save when you're done.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter product name"
                {...register('name')}
                className="rounded-xl"
                autoFocus
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU</Label>
              <Input
                id="edit-sku"
                placeholder="Enter SKU code"
                {...register('sku')}
                className="rounded-xl"
              />
              {errors.sku && <p className="text-sm text-red-600">{errors.sku.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select {...register('category')}>
                  <SelectTrigger id="edit-category" className="rounded-xl">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-variation">Variation</Label>
                <Input
                  id="edit-variation"
                  placeholder="e.g., Color, Size"
                  {...register('variation')}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('price')}
                  className="rounded-xl"
                />
                {errors.price && <p className="text-sm text-red-600">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  placeholder="0"
                  {...register('stock')}
                  className="rounded-xl"
                />
                {errors.stock && <p className="text-sm text-red-600">{errors.stock.message}</p>}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  resetForm();
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
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedProduct?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteProduct}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
