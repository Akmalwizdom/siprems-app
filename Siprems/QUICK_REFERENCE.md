# Frontend Refactoring - Quick Reference Guide

## 🚀 What's New

### Routing with React Router DOM
- **Auto routing** - No more manual page state
- **Protected routes** - Login required for dashboard pages
- **Deep linking** - Direct URL access to any page

```bash
/login → Login page
/ → Dashboard
/products → Products page
/transactions → Transactions page
```

### Form Validation with Zod + React Hook Form
- **Type-safe schemas** - Define what data looks like
- **Automatic validation** - No manual validation logic
- **Beautiful error messages** - User-friendly feedback

```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(productSchema)
});
```

### Smart DataTables
- **Sortable columns** - Click headers to sort
- **Pagination** - Handle large datasets efficiently
- **Custom rendering** - Format data however you want

```typescript
<DataTable columns={columns} data={products} pageSize={10} />
```

### Toast Notifications
- **Simple API** - One-liner success/error messages
- **Smart defaults** - Position, duration, styling auto-handled

```typescript
showToast.success('Product created!');
showToast.error('Something went wrong');
```

---

## 🎨 Key Components

### Available Components

| Component | Location | Use Case |
|-----------|----------|----------|
| DataTable | `components/ui/data-table.tsx` | Any paginated/sortable data |
| CardSkeleton | `components/skeletons/CardSkeleton.tsx` | Loading state for stat cards |
| Button | `components/ui/button.tsx` | Actions, links, submissions |
| Card | `components/ui/card.tsx` | Content containers |
| Dialog | `components/ui/dialog.tsx` | Modals, confirmations |
| Input | `components/ui/input.tsx` | Text fields |
| Select | `components/ui/select.tsx` | Dropdowns |
| Pagination | `components/ui/pagination.tsx` | Page navigation |

---

## 🛠️ Common Tasks

### Add a New Page
1. Create component: `src/components/NewPage.tsx`
2. Wrap with motion: `<motion.div className="space-y-6">`
3. Add route: `<Route path="/newpage" element={<NewPage />} />`
4. Add sidebar link (auto navigation with Link component)

### Add Form Validation
1. Define schema in `utils/schemas.ts`:
```typescript
export const newFormSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});
```

2. Use in component:
```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(newFormSchema)
});
```

### Display a Data Table
1. Define columns:
```typescript
const columns: Column<DataType>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status', render: (val) => <Badge>{val}</Badge> },
];
```

2. Render table:
```typescript
<DataTable columns={columns} data={data} pageSize={10} isLoading={loading} />
```

### Show Loading State
```typescript
{isLoading ? (
  <CardSkeleton />
) : (
  <Card>{content}</Card>
)}
```

### Handle Errors
```typescript
try {
  await apiClient.post('/endpoint', data);
  showToast.success('Success!');
} catch (err) {
  showToast.error(err.message);
}
```

---

## 📱 Responsive Design

### Breakpoint Prefixes
- `sm:` (640px) - Small phones
- `md:` (768px) - Tablets
- `lg:` (1024px) - Desktops
- `xl:` (1280px) - Large desktops

### Example
```html
<!-- 1 col on mobile, 2 on tablet, 3 on desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## 🌙 Dark Mode

### Automatic Support
All components use `dark:` prefix classes:
```html
<div class="bg-white dark:bg-gray-800">
  <span class="text-gray-900 dark:text-white">Text</span>
</div>
```

### Toggle
User can toggle in TopBar - preference is saved to component state.

---

## 🔐 Authentication

### Login Flow
1. User submits email + password on `/login`
2. API returns tokens
3. Tokens stored in localStorage
4. Redirect to `/` (Dashboard)
5. Protected routes verify tokens before rendering

### Logout
1. Clear tokens from localStorage
2. Redirect to `/login`
3. API client automatically clears cached tokens

---

## ⚡ Performance Tips

### Use Pagination
```typescript
<DataTable data={data} pageSize={10} /> // Not 1000 rows at once
```

### Lazy Load Components
```typescript
const HeavyComponent = React.lazy(() => import('./Heavy'));
```

### Debounce Search
```typescript
const [search, setSearch] = useState('');
const debouncedSearch = useMemo(
  () => debounce((val) => setSearch(val), 300),
  []
);
```

---

## 🧪 Testing Checklist

Before deploying a new page/feature:

- [ ] Form validation works (try invalid input)
- [ ] Error toast appears on API failure
- [ ] Success toast appears on success
- [ ] Loading state shows during async operation
- [ ] All buttons have proper disabled states
- [ ] Mobile responsive (resize browser to 375px)
- [ ] Pagination works (test on page 2+)
- [ ] Sorting works (click column headers)
- [ ] Dark mode works (toggle button)
- [ ] Logout redirects to login

---

## 📚 Learn More

- **Full Patterns Guide**: See `UI_UX_PATTERNS.md`
- **Refactoring Details**: See `FRONTEND_REFACTORING_SUMMARY.md`
- **React Router**: https://reactrouter.com
- **React Hook Form**: https://react-hook-form.com
- **Zod**: https://zod.dev
- **Recharts**: https://recharts.org
- **Tailwind**: https://tailwindcss.com

---

## 🚨 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Form not submitting | Check `handleSubmit()` wrapper on form |
| Validation not working | Ensure schema is imported correctly |
| Toast not showing | Use `showToast.success()` not `toast()` |
| Page not found after navigation | Verify route path matches in sidebar and App.tsx |
| Dark mode not applying | Check classes use `dark:` prefix |
| Table not paginating | Ensure data length > pageSize |
| Form fields not registering | Check `{...register('fieldName')}` is applied |

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: ✅ Ready for Development
