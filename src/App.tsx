import { HelmetProvider } from 'react-helmet-async';
import Home from './components/Home';
import { ThemeProvider } from './contexts/theme';

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
