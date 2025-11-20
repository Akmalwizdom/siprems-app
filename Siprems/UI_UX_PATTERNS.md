# Frontend UI/UX Patterns & Guidelines

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Routing Structure](#routing-structure)
3. [Form Handling & Validation](#form-handling--validation)
4. [Data Fetching & Loading States](#data-fetching--loading-states)
5. [UI Components](#ui-components)
6. [Toast Notifications](#toast-notifications)
7. [Responsive Design](#responsive-design)
8. [Dark Mode Support](#dark-mode-support)
9. [Best Practices](#best-practices)

---

## Architecture Overview

The application follows a modern React architecture with the following structure:

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── skeletons/            # Loading skeleton components
│   ├── Dashboard.tsx         # Main dashboard page
│   ├── TransactionsPage.tsx  # Transactions management
│   ├── ProductsPage.tsx      # Products management
│   ├── LoginPage.tsx         # Authentication page
│   ├── Sidebar.tsx           # Navigation sidebar
│   ├── TopBar.tsx            # Top navigation bar
│   ├── MainLayout.tsx        # Main layout wrapper
│   └── ProtectedRoute.tsx    # Route protection wrapper
├── utils/
│   ├── api.ts               # API client with token management
│   ├── schemas.ts           # Zod validation schemas
│   ├── form.ts              # Form utilities
│   └── toast.ts             # Toast notification wrapper
├── App.tsx                   # Main app with routing
└── main.tsx                  # React entry point
```

---

## Routing Structure

### Overview
The app uses **react-router-dom v6** for client-side routing with protected routes for authenticated pages.

### Route Configuration

```typescript
// App.tsx
<Router>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/*"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/prediction" element={<PredictionPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </MainLayout>
        </ProtectedRoute>
      }
    />
  </Routes>
</Router>
```

### Navigation Patterns

#### Link Navigation
Use `useNavigate()` hook for programmatic navigation:

```typescript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/dashboard');
  };
  
  return <button onClick={handleClick}>Go to Dashboard</button>;
}
```

#### Sidebar Navigation
The sidebar uses `Link` components from react-router-dom and `useLocation()` to determine active routes:

```typescript
import { useLocation, Link } from 'react-router-dom';

<Link
  to="/products"
  className={location.pathname === '/products' ? 'active' : ''}
>
  Products
</Link>
```

---

## Form Handling & Validation

### Setup with React Hook Form + Zod

The application uses **react-hook-form** for form state management and **zod** for schema validation.

#### 1. Define Validation Schema

Create schema in `utils/schemas.ts`:

```typescript
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.string().pipe(z.coerce.number().positive('Price must be positive')),
  stock: z.string().pipe(z.coerce.number().int().nonnegative('Stock must be non-negative')),
});

export type ProductFormData = z.infer<typeof productSchema>;
```

#### 2. Use in Component

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '../utils/schemas';

function ProductForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Submit data
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      reset();
      showToast.success('Product saved successfully');
    } catch (err) {
      showToast.error('Failed to save product');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} placeholder="Product name" />
      {errors.name && <span className="error">{errors.name.message}</span>}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

#### 3. Validation Pattern Best Practices

- **String numbers**: Use `.pipe()` to convert strings to numbers before validation
- **Enum validation**: Use `.enum()` for select fields
- **Conditional validation**: Use `.refine()` for cross-field validation
- **Custom messages**: Always provide meaningful error messages
- **Async validation**: Use `.refine()` or `.superRefine()` for async validation (e.g., checking SKU uniqueness)

---

## Data Fetching & Loading States

### Loading States Pattern

#### 1. Card Skeletons
Use `CardSkeleton` component while loading stats:

```typescript
import { CardSkeleton } from './skeletons/CardSkeleton';

{isLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
  </div>
) : (
  // Actual content
)}
```

#### 2. Table Loading State
The `DataTable` component handles loading states internally:

```typescript
<DataTable
  columns={columns}
  data={data}
  isLoading={isLoading}
  pageSize={10}
  emptyMessage="No data found"
/>
```

#### 3. Loading Indicators
Use Loader2 icon with animation:

```typescript
import { Loader2 } from 'lucide-react';

<div className="flex justify-center items-center h-48">
  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
</div>
```

### API Client Usage

Use the `apiClient` for authenticated requests:

```typescript
import { apiClient } from '../utils/api';

// GET request
const data = await apiClient.get('/products');

// POST request
const response = await apiClient.post('/products', {
  name: 'Product Name',
  price: 99.99,
});

// PUT request
await apiClient.put(`/products/${id}`, { name: 'Updated Name' });

// DELETE request
await apiClient.delete(`/products/${id}`);
```

The client automatically handles:
- Bearer token authentication
- Token refresh on 401 responses
- JSON serialization/deserialization
- Error handling and retries

---

## UI Components

### DataTable Component

Reusable table component with pagination, sorting, and responsive design.

#### Features
- ✅ Sortable columns
- ✅ Pagination with page navigation
- ✅ Custom column rendering
- ✅ Loading state with skeleton rows
- ✅ Empty state message
- ✅ Click handlers for rows

#### Usage

```typescript
import { DataTable, Column } from './ui/data-table';

const columns: Column<Product>[] = [
  {
    key: 'name',
    label: 'Product Name',
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
    label: 'Stock Status',
    render: (value, row) => (
      <span className={value > 10 ? 'text-green-600' : 'text-red-600'}>
        {value} units
      </span>
    ),
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (_, row) => (
      <button onClick={() => handleEdit(row)}>Edit</button>
    ),
  },
];

<DataTable
  columns={columns}
  data={products}
  pageSize={15}
  isLoading={isLoading}
  emptyMessage="No products found"
  onRowClick={(row) => navigate(`/products/${row.id}`)}
/>
```

### Dialog Component

Used for modals and confirmation dialogs:

```typescript
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px] rounded-2xl">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

### Card Component

Container component for grouping related content:

```typescript
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

<Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
</Card>
```

---

## Toast Notifications

### Usage

The `showToast` utility provides a consistent toast notification API:

```typescript
import { showToast } from '../utils/toast';

// Success notification
showToast.success('Product created successfully');

// Error notification
showToast.error('Failed to delete product');

// Promise-based notification
showToast.promise(
  apiClient.post('/products', data),
  {
    loading: 'Creating product...',
    success: 'Product created!',
    error: 'Failed to create product',
  }
);

// Loading indicator (with manual dismiss)
const toastId = showToast.loading('Processing...');
// Later
showToast.dismiss(toastId);
```

### Best Practices

- Use success toasts for confirmations
- Use error toasts for failures with context
- Keep messages concise and actionable
- Use promise toasts for async operations
- Dismiss previous toasts before showing new ones in quick succession

---

## Responsive Design

### Breakpoints
The application uses Tailwind CSS responsive prefixes:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Layout Patterns

#### 1. Responsive Grid
```html
<!-- Stacks on mobile, 2 cols on tablet, 3 cols on desktop, 4 on xl -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <!-- Items -->
</div>
```

#### 2. Responsive Navigation
Sidebar hides on mobile, shown with hamburger menu pattern:

```html
<div class="flex h-screen">
  <!-- Sidebar: hidden on mobile, shown on md+ -->
  <aside class="hidden md:block w-64 bg-white">
    {/* Sidebar content */}
  </aside>
  
  <!-- Main content: full width on mobile -->
  <main class="flex-1">
    {/* Page content */}
  </main>
</div>
```

#### 3. Responsive Typography
```html
<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">
  Responsive Heading
</h1>
<p class="text-sm md:text-base lg:text-lg">
  Responsive paragraph
</p>
```

---

## Dark Mode Support

### Implementation
The application supports light and dark modes using CSS classes:

```typescript
// In MainLayout.tsx
<div className={darkMode ? 'dark' : ''}>
  {/* Content uses dark: prefix for dark mode colors */}
</div>
```

### Color Utilities

```html
<!-- Text colors -->
<span class="text-gray-900 dark:text-white">Adaptive text</span>

<!-- Background colors -->
<div class="bg-white dark:bg-gray-800">Adaptive background</div>

<!-- Border colors -->
<div class="border-gray-200 dark:border-gray-700">Adaptive border</div>
```

### Component Dark Mode Support
All UI components include dark mode support via the `dark:` prefix classes.

---

## Best Practices

### 1. **State Management**
- Use `useState` for local component state
- Lift state up when shared between components
- Use `useEffect` for side effects with proper cleanup

### 2. **Error Handling**
- Always catch and display errors to users
- Use specific error messages from the API
- Provide fallback UI for error states

### 3. **Performance**
- Use `React.memo()` for expensive components
- Implement pagination for large datasets
- Lazy load images and components
- Debounce search inputs

### 4. **Accessibility**
- Use semantic HTML (`button`, `form`, `table`, etc.)
- Include `htmlFor` on labels
- Provide alt text for images
- Use ARIA attributes for complex components
- Ensure keyboard navigation works

### 5. **Code Organization**
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks
- Group related utilities in folders
- Use TypeScript for type safety
- Comment complex logic

### 6. **Form Validation**
- Validate on blur for better UX
- Show errors immediately after submission
- Use visual feedback for invalid fields
- Provide clear, actionable error messages
- Prevent submission during async operations

### 7. **API Integration**
- Handle all HTTP status codes appropriately
- Implement proper token refresh logic
- Show loading states during requests
- Use consistent error handling patterns
- Log errors for debugging

### 8. **Testing Data Patterns**
When testing with the API:
- Create test products with various stock levels
- Test edge cases (very large numbers, special characters)
- Verify pagination works with different page sizes
- Test sorting on different column types
- Validate form submission with invalid data

---

## Example: Complete Feature Implementation

Here's a complete example of implementing a new management page:

```typescript
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DataTable, Column } from './ui/data-table';
import { CardSkeleton } from './skeletons/CardSkeleton';
import { showToast } from '../utils/toast';
import { itemSchema, type ItemFormData } from '../utils/schemas';

interface Item {
  id: string | number;
  name: string;
  description: string;
  created_at: string;
}

export default function ItemManagementPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/items');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setItems(data);
    } catch (err) {
      showToast.error('Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const onSubmit = async (data: ItemFormData) => {
    try {
      const method = selectedItem ? 'PUT' : 'POST';
      const url = selectedItem ? `/api/items/${selectedItem.id}` : '/api/items';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save');

      await fetchItems();
      reset();
      setIsOpen(false);
      showToast.success(selectedItem ? 'Updated successfully' : 'Created successfully');
    } catch (err) {
      showToast.error('Failed to save item');
    }
  };

  const columns: Column<Item>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description', sortable: true },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button onClick={() => { setSelectedItem(row); setIsOpen(true); }}>
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(row.id)}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleDelete = async (id: string | number) => {
    try {
      const response = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      await fetchItems();
      showToast.success('Deleted successfully');
    } catch (err) {
      showToast.error('Failed to delete item');
    }
  };

  return (
    <motion.div className="space-y-6">
      <h1 className="text-3xl font-bold">Items</h1>

      {isLoading ? (
        <CardSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Items</CardTitle>
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Add Item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedItem ? 'Edit' : 'Create'} Item</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <input {...register('name')} placeholder="Name" />
                    {errors.name && <span className="text-red-600">{errors.name.message}</span>}
                    <button type="submit" disabled={isSubmitting}>Save</button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={items} pageSize={10} isLoading={isLoading} />
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
```

---

## Resources

- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com)
- [React Hook Form Documentation](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)
- [Recharts Documentation](https://recharts.org)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Radix UI Documentation](https://www.radix-ui.com)

---

**Last Updated**: 2024
**Version**: 1.0.0
