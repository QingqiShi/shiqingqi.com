import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { cononicalOrigin } from './utils/pathname';

(async () => {
  if (window.location.origin === cononicalOrigin) {
    const { initializeApp } = await import('firebase/app');
    const { getPerformance } = await import('firebase/performance');
    const { getAnalytics, isSupported, setAnalyticsCollectionEnabled } =
      await import('firebase/analytics');

    // Your web app's Firebase configuration
    const firebaseConfig = {
      apiKey: 'AIzaSyCCNVad_-hk_vjG2uAGNUfTY8KeiwlK7wE',
      authDomain: 'shiqingqi-27cab.firebaseapp.com',
      databaseURL: 'https://shiqingqi-27cab.firebaseio.com',
      projectId: 'shiqingqi-27cab',
      storageBucket: 'shiqingqi-27cab.appspot.com',
      messagingSenderId: '207610618557',
      appId: '1:207610618557:web:b3609648132bb22543cdd4',
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    getPerformance(app);
    getAnalytics(app);
  }
})();

ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('root')
);
