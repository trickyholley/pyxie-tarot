# Vite+ Frontend Configuration

This frontend project is configured with **Vite+ (Vite 8.1.1)**, a modern and optimized build tool for React applications.

## Features

### Performance Optimization
- **Code Splitting**: Automatic splitting of React vendor code for better caching
- **Minification**: Using Terser for aggressive JS minification
- **CSS Minification**: Built-in CSS minification with Lightning CSS
- **Bundle Analysis**: Rollup Plugin Visualizer for analyzing bundle size and composition

### Development Experience
- **Fast HMR**: Hot Module Replacement for instant updates during development
- **TypeScript Support**: Full TypeScript support with strict type checking
- **TSConfig Paths**: Native tsconfig paths resolution
- **React Compiler**: Integration with Babel React Compiler for optimized React code

### Build Optimization
- **Target**: ESNext (latest JavaScript features)
- **Terser Minification**: Aggressive minification for production builds
- **Vendor Chunking**: Separate vendor chunks for better caching strategy
- **Gzip & Brotli Analysis**: Automatic analysis of compression sizes

## Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint
```

## Environment Variables

Environment variables are automatically loaded from `.env.local` (create this from `.env.example`).

### Accessing Environment Variables

```typescript
// Access via import.meta.env
const apiUrl = import.meta.env.VITE_API_URL
const appTitle = import.meta.env.VITE_APP_TITLE

// TypeScript intellisense is supported via vite-env.d.ts
```

### Available Variables

- `VITE_APP_TITLE`: Application title
- `VITE_API_URL`: Backend API URL

## Build Output

The production build is output to the `dist/` directory with:
- `index.html`: Entry point
- `assets/`: JavaScript, CSS, and image files
- Automatic vendor code splitting for React dependencies
- Gzipped and Brotli compressed size metrics

## Dependencies

### Core
- `react`: ^19.2.7 - React UI library
- `react-dom`: ^19.2.7 - React DOM binding

### Build Tools
- `vite`: ^8.1.1 - Next generation build tool
- `@vitejs/plugin-react`: ^6.0.3 - Vite React plugin with JSX and refresh
- `@rolldown/plugin-babel`: ^0.2.3 - Babel integration
- `babel-plugin-react-compiler`: ^1.0.0 - React compiler optimization
- `rollup-plugin-visualizer`: ^5.12.0 - Bundle analysis
- `terser`: ^5.31.0 - JavaScript minifier

### Development
- `typescript`: ~6.0.2 - TypeScript language support
- `@types/react`: ^19.2.17
- `@types/react-dom`: ^19.2.3
- `@types/node`: ^24.13.2
- `@types/babel__core`: ^7.20.5
- `oxlint`: ^1.71.0 - Linting tool

## Configuration Files

- `vite.config.ts`: Main Vite configuration
- `tsconfig.json`: TypeScript configuration root
- `tsconfig.app.json`: Application TypeScript settings
- `tsconfig.node.json`: Node/build TypeScript settings
- `.env.example`: Environment variables template
- `vite-env.d.ts`: Type definitions for environment variables

## Tips

1. **Bundle Analysis**: Check `dist/stats.html` after building to visualize bundle composition
2. **Development**: Use `npm run dev` for fastest development feedback with HMR
3. **Environment Variables**: Create `.env.local` for local overrides (ignored by git)
4. **Performance**: React Compiler is enabled automatically for better performance

## Troubleshooting

If you encounter issues:

1. Clear cache: `rm -rf node_modules dist .vite`
2. Reinstall: `npm install`
3. Check Node version: `node --version` (requires Node 18+)
4. Check npm version: `npm --version` (requires npm 8+)

