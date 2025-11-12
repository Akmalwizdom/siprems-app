import { useState, useEffect } from 'react'; // Import useEffect
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, Package, AlertCircle, Loader2, AlertTriangle } from 'lucide-react'; // Import Loader2 & AlertTriangle
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
import { Alert, AlertDescription, AlertTitle } from './ui/alert'; // Import Alert

// Tipe data dari database (string/number)
interface RawProduct {
  product_id: number;
  name: string;
  category: string;
  variation: string | null;
  price: string | number; // Bisa jadi string
  stock: string | number; // Bisa jadi string
  sku: string;
  created_at: string;
}

// Tipe data yang bersih (sudah di-parse)
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

// Tipe data untuk form
interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  variation: string;
  price: string;
  stock: string;
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
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    category: '',
    variation: '',
    price: '',
    stock: '',
  });

  // --- Fungsi Fetch Data ---
  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data: RawProduct[] = await response.json();
      
      // --- PERBAIKAN PENTING ---
      // Konversi semua string angka dari JSON menjadi number
      const cleanData: Product[] = data.map(p => ({
        ...p,
        price: parseFloat(String(p.price)),
        stock: parseInt(String(p.stock), 10)
      }));

      setProducts(cleanData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Load data saat komponen pertama kali di-mount ---
  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // --- Fungsi CRUD ---
  const handleAddProduct = async () => {
    if (!validateForm()) return;

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to add product');
      }
      
      await fetchProducts(); // Muat ulang data
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
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update product');
      }
      
      await fetchProducts(); // Muat ulang data
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

      await fetchProducts(); // Muat ulang data
      setIsDeleteOpen(false);
      setSelectedProduct(null);
      toast.success('Product deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  // --- Menghitung Statistik Kartu ---
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStockItems = products.filter((p) => p.stock <= 5).length;

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
            {/* Konten Dialog Tambah Produk */}
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
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-3xl text-gray-900 dark:text-white">{lowStockItems}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
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

      {/* Products Table */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Products Inventory</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">A complete list of all products</p>
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
                    return (
                      <TableRow key={product.product_id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        {/* Data sudah bersih (number), .toFixed() aman */}
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{product.stock}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
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
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {products.length === 0 ? "No products found. Add one to get started." : "No products found matching your search."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          {/* Konten Dialog Edit Produk */}
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