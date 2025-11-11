import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, Package, AlertCircle, Loader2, AlertTriangle, Download, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
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

interface Product {
  product_id: number;
  name: string;
  category: string;
  variation: string | null;
  price: number;
  stock: number;
  sku: string;
  created_at: string;
}

interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  variation: string;
  price: string;
  stock: string;
}

const categories = ['Electronics', 'Office', 'Accessories', 'Furniture', 'Supplies'];

const getStockStatus = (stock: number): { label: string; color: string; borderColor: string } => {
  if (stock <= 10) return { 
    label: 'Critical', 
    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    borderColor: 'border-l-4 border-red-500'
  };
  if (stock <= 30) return { 
    label: 'Low', 
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-l-4 border-yellow-500'
  };
  return { 
    label: 'Sufficient', 
    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    borderColor: 'border-l-4 border-green-500'
  };
};

const API_URL = 'http://localhost:5000';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkStockOpen, setIsBulkStockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [editingStockValue, setEditingStockValue] = useState('');
  const [bulkStockValue, setBulkStockValue] = useState('');
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    category: '',
    variation: '',
    price: '',
    stock: '',
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const criticalStockCount = products.filter((p) => p.stock <= 10).length;

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === '' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.stock - b.stock;
      }
      return b.stock - a.stock;
    });

  const resetForm = () => {
    setFormData({ name: '', sku: '', category: '', variation: '', price: '', stock: '' });
    setSelectedProduct(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name || !formData.sku || !formData.category || !formData.price || !formData.stock) {
      toast.error('Please fill all required fields');
      return false;
    }
    if (parseFloat(formData.price) < 0 || parseInt(formData.stock) < 0) {
      toast.error('Price and stock must be positive values');
      return false;
    }
    return true;
  };

  const handleAddProduct = async () => {
    if (!validateForm()) return;

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to add product');
      
      await fetchProducts();
      resetForm();
      setIsAddOpen(false);
      toast.success('Product added successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add product');
    }
  };

  const handleEditProduct = async () => {
    if (!validateForm() || !selectedProduct) return;

    try {
      const response = await fetch(`${API_URL}/products/${selectedProduct.sku}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to update product');
      
      await fetchProducts();
      resetForm();
      setIsEditOpen(false);
      toast.success('Product updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product');
    }
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      variation: product.variation || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
    });
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
      toast.success('Product deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const handleInlineStockEdit = async (productId: number, newStock: string) => {
    const stock = parseInt(newStock);
    if (isNaN(stock) || stock < 0) {
      toast.error('Please enter a valid stock number');
      return;
    }

    const product = products.find(p => p.product_id === productId);
    if (!product) return;

    try {
      const response = await fetch(`${API_URL}/products/${product.sku}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          stock: stock.toString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to update stock');

      await fetchProducts();
      setEditingStockId(null);
      setEditingStockValue('');
      toast.success('Stock updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update stock');
    }
  };

  const handleSelectProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.product_id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const productsToDelete = products.filter(p => selectedProducts.has(p.product_id));
      let successCount = 0;

      for (const product of productsToDelete) {
        const response = await fetch(`${API_URL}/products/${product.sku}`, {
          method: 'DELETE',
        });
        if (response.ok) successCount++;
      }

      if (successCount === productsToDelete.length) {
        await fetchProducts();
        setSelectedProducts(new Set());
        setIsBulkDeleteOpen(false);
        toast.success(`${successCount} product(s) deleted successfully`);
      } else {
        toast.error(`Only ${successCount}/${productsToDelete.length} products were deleted`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete products');
    }
  };

  const handleBulkStockUpdate = async () => {
    const stock = parseInt(bulkStockValue);
    if (isNaN(stock) || stock < 0) {
      toast.error('Please enter a valid stock number');
      return;
    }

    try {
      const productsToUpdate = products.filter(p => selectedProducts.has(p.product_id));
      let successCount = 0;

      for (const product of productsToUpdate) {
        const response = await fetch(`${API_URL}/products/${product.sku}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...product,
            stock: stock.toString(),
          }),
        });
        if (response.ok) successCount++;
      }

      if (successCount === productsToUpdate.length) {
        await fetchProducts();
        setSelectedProducts(new Set());
        setIsBulkStockOpen(false);
        setBulkStockValue('');
        toast.success(`${successCount} product(s) updated successfully`);
      } else {
        toast.error(`Only ${successCount}/${productsToUpdate.length} products were updated`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update products');
    }
  };

  const handleExportCSV = () => {
    const selectedProductsData = products.filter(p => selectedProducts.has(p.product_id));
    const productsToExport = selectedProductsData.length > 0 ? selectedProductsData : filteredProducts;

    const headers = ['Product Name', 'SKU', 'Category', 'Variation', 'Price', 'Stock', 'Status'];
    const rows = productsToExport.map(p => {
      const status = getStockStatus(p.stock);
      return [
        p.name,
        p.sku,
        p.category,
        p.variation || '',
        parseFloat(p.price).toFixed(2),
        p.stock,
        status.label
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast.success('CSV exported successfully');
  };

  const navigateToPrediction = () => {
    window.location.hash = '#prediction';
    window.location.reload();
  };

  const totalValue = products.reduce((sum, p) => sum + parseFloat(p.price) * p.stock, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Low Stock Banner */}
      {criticalStockCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-200">
                ⚠️ {criticalStockCount} product{criticalStockCount !== 1 ? 's' : ''} below optimal level
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">Consider restocking these items to avoid shortages</p>
            </div>
          </div>
          <Button 
            onClick={navigateToPrediction}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
          >
            Restock Now
          </Button>
        </motion.div>
      )}

      {/* Header */}
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
              <DialogDescription>
                Add a new product to your inventory. Fill in all required fields.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Product Name *</Label>
                <Input
                  id="add-name"
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-sku">SKU *</Label>
                <Input
                  id="add-sku"
                  placeholder="Enter SKU code"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-variation">Variation</Label>
                  <Input
                    id="add-variation"
                    placeholder="e.g., Color, Size"
                    value={formData.variation}
                    onChange={(e) => setFormData({ ...formData, variation: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-price">Price ($) *</Label>
                  <Input
                    id="add-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-stock">Stock *</Label>
                  <Input
                    id="add-stock"
                    type="number"
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  resetForm();
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddProduct}
                className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100"
              >
                Add Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Products</CardTitle>
            <Package className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-3xl text-gray-900 dark:text-white">{products.length}</div>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Inventory Value</CardTitle>
            <Package className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-3xl text-gray-900 dark:text-white">${totalValue.toFixed(2)}</div>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</CardTitle>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-3xl text-gray-900 dark:text-white">{criticalStockCount}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Input
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-filter">Category Filter</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter" className="rounded-xl">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-sort">Sort by Stock</Label>
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                  <SelectTrigger id="stock-sort" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Highest Stock First</SelectItem>
                    <SelectItem value="asc">Lowest Stock First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
            {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleExportCSV}
              variant="outline"
              className="rounded-xl"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isBulkStockOpen} onOpenChange={setIsBulkStockOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl" size="sm">
                  Set Stock
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Set Stock for {selectedProducts.size} Product{selectedProducts.size !== 1 ? 's' : ''}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-stock">New Stock Value *</Label>
                    <Input
                      id="bulk-stock"
                      type="number"
                      placeholder="Enter stock quantity"
                      value={bulkStockValue}
                      onChange={(e) => setBulkStockValue(e.target.value)}
                      className="rounded-xl"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkStockOpen(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkStockUpdate}
                    className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Update Stock
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl text-red-600 hover:text-red-700" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Delete Products</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete {selectedProducts.size} selected product{selectedProducts.size !== 1 ? 's' : ''}? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkDeleteOpen(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
                  >
                    Delete Products
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>
      )}

      {/* Products Table */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Products Inventory</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">A complete list of all products with smart inventory controls</p>
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
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => {
                      const status = getStockStatus(product.stock);
                      const isSelected = selectedProducts.has(product.product_id);
                      const isEditing = editingStockId === product.product_id;

                      return (
                        <TableRow 
                          key={product.product_id}
                          className={`${status.borderColor} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectProduct(product.product_id)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>${parseFloat(product.price).toFixed(2)}</TableCell>
                          <TableCell>
                            <div 
                              className="flex items-center space-x-2 cursor-pointer"
                              onDoubleClick={() => {
                                setEditingStockId(product.product_id);
                                setEditingStockValue(product.stock.toString());
                              }}
                            >
                              {isEditing ? (
                                <div className="flex items-center space-x-1">
                                  <Input
                                    type="number"
                                    value={editingStockValue}
                                    onChange={(e) => setEditingStockValue(e.target.value)}
                                    className="w-16 h-8 rounded-lg"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleInlineStockEdit(product.product_id, editingStockValue)}
                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingStockId(null)}
                                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span>{product.stock}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                    {status.label}
                                  </span>
                                  <span className="text-xs text-gray-500">Double-click to edit</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleOpenEdit(product)}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-500 transition-colors"
                                title="Edit product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteConfirm(product)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                                title="Delete product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {products.length === 0 ? "No products found. Add one to get started." : "No products found matching your filters."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter product name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU *</Label>
              <Input
                id="edit-sku"
                placeholder="Enter SKU code"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-variation">Variation</Label>
                <Input
                  id="edit-variation"
                  placeholder="e.g., Color, Size"
                  value={formData.variation}
                  onChange={(e) => setFormData({ ...formData, variation: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price ($) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock *</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                resetForm();
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditProduct}
              className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
