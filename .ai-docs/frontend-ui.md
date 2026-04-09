# Frontend UI/UX Consistency Rules

## 1. Design System
- **Fonts**: h1:`text-4xl`, h2:`text-3xl`, h3:`text-2xl`, h4:`text-xl`, h5:`text-lg`, p:`text-base`, small:`text-sm`, caption:`text-xs`
- **Colors**: Primary:`blue-600/500/100`, Secondary:`gray-600/500`, Success:`green-600`, Error:`red-600`, Warning:`yellow-600`, Info:`blue-600`
- **Spacing**: Use `p-4`, `m-4`, `gap-4`. Cards:`p-6`, Pages:`p-8`. Sections:`mb-6`/`mt-6`

## 2. Code Quality
- **File Limits**: Components≤300, Pages≤400, API≤500 lines
- **Reusability**: Create reusable buttons, cards, forms, tables, modals
- **Hooks**: `useApiQuery`, `useForm`, `useLocalStorage`
- **Utils**: `formatDate`, `formatCurrency`, `validateEmail`, `apiClient`

## 3. Performance
- **Lazy Load**: `React.lazy(() => import('./page'))`
- **API**: No waiting - use optimistic updates
- **Parallel**: `Promise.all([getUser(), getProfile()])`
- **Debounce**: Search inputs 300ms
- **Memo**: `React.memo`, `useMemo`, `useCallback`

## 4. Page Layout
```jsx
<div className="min-h-screen bg-gray-50">
  <Header />
  <main className="container mx-auto px-4 py-8">
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900">Title</h1>
      <p className="text-gray-600 mt-2">Description</p>
    </div>
    <div className="bg-white rounded-lg shadow p-6">
      {/* Content */}
    </div>
  </main>
  <Footer />
</div>
```

## 5. Big Tech Standards
- **a11y**: `aria-label`, semantic HTML, keyboard nav, contrast 4.5:1
- **i18n**: Translation files, RTL support
- **Tests**: 80%+ coverage
- **Docs**: JSDoc, README per feature
- **Security**: Input sanitization, HTTPS, CSRF, JWT validation

## 6. Enforcement
- **ESLint**: `max-lines:300`, `complexity:10`, `max-depth:4`, `max-params:3`
- **Pre-commit**: ESLint, Prettier, tests
- **Code Review**: Design system, file limits, reusability, lazy loading, no API waiting, a11y, tests, docs