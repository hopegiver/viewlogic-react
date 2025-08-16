# ViewLogic React

A modern React application with a clean separation of concerns: **View**, **Logic**, and **Style** components.

## 🏗️ Architecture

This project demonstrates a unique approach to React application structure:

- **`/src/view/`** - UI Components (JSX)
- **`/src/logic/`** - Business Logic & React Hooks (JSX)  
- **`/src/style/`** - Page-specific Styles (CSS)
- **`/css/`** - Global Base Styles (CSS)

## ✨ Features

- **Dynamic Module Loading** - Loads components at runtime
- **JSX Transformation** - Browser-side JSX compilation using Sucrase
- **Smart Caching** - LRU cache with TTL and ETag versioning
- **Hash & Path Routing** - Flexible routing modes
- **Error Boundaries** - Graceful error handling
- **Hot Reloading** - Dynamic CSS injection

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/hopegiver/viewlogic-react.git
   cd viewlogic-react
   ```

2. **Start the development server**
   ```bash
   python -m http.server 8000
   ```

3. **Open your browser**
   Navigate to `http://localhost:8000`

## 📁 Project Structure

```
viewlogic-react/
├── src/
│   ├── view/           # UI Components
│   │   └── todo.jsx    # Todo list component
│   ├── logic/          # Business Logic
│   │   └── todo.jsx    # Todo logic & hooks
│   └── style/          # Page Styles
│       └── todo.css    # Todo-specific styles
├── js/
│   ├── router.js       # Dynamic router & loader
│   └── cache.js        # LRU cache implementation
├── css/
│   └── base.css        # Global base styles
├── app.js              # Application entry point
└── index.html          # Main HTML file
```

## 🔧 How It Works

### Dynamic Loading
The router dynamically fetches and transforms:
- **View components** from `/src/view/[route].jsx`
- **Logic hooks** from `/src/logic/[route].jsx`  
- **Style sheets** from `/src/style/[route].css`

### JSX Transformation
Uses Sucrase to compile JSX to JavaScript in the browser:
```javascript
const { code: viewCode } = transform(wrapView(viewSrcRaw), { transforms: ["jsx"] });
const { code: logicCode } = transform(logicSrcRaw, { transforms: ["jsx"] });
```

### Smart Caching
- **LRU Cache** with configurable TTL
- **ETag Versioning** for cache invalidation
- **Inflight Request Merging** to prevent duplicate requests

## 🎯 Example: Todo App

The included Todo application demonstrates:

- **View Component** (`src/view/todo.jsx`): Clean UI with CSS classes
- **Logic Hook** (`src/logic/todo.jsx`): State management and business logic
- **Page Styles** (`src/style/todo.css`): Component-specific styling
- **Global Styles** (`css/base.css`): Base typography and utilities

## 🛠️ Configuration

### Router Options
```javascript
initRouter({
  root: ReactDOM.createRoot(document.getElementById('root')),
  defaultRoute: "todo",
  basePath: "/src",
  router: { 
    mode: "hash",        // 'hash' | 'path'
    interceptLinks: true 
  },
  version: "2025-01-13",
  useETagVersion: true,
  cacheOptions: {
    maxEntries: 50,
    ttlMs: 30 * 60 * 1000
  }
});
```

### Cache Management
```javascript
const router = initRouter({...});

// Clear specific route cache
router.clearRouteCache("todo");

// Clear all cache
router.clearAllCache();

// Get cache statistics
console.log(router.stats());
```

## 🌟 Benefits

1. **Separation of Concerns** - Clear boundaries between UI, logic, and styling
2. **Dynamic Loading** - Load only what you need, when you need it
3. **Performance** - Smart caching and request deduplication
4. **Developer Experience** - Clean file organization and hot reloading
5. **Scalability** - Easy to add new routes and components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **React** - For the amazing component library
- **Sucrase** - For fast JSX transformation
- **Modern Web Standards** - For dynamic imports and ES modules

---

Built with ❤️ by [hopegiver](https://github.com/hopegiver)
