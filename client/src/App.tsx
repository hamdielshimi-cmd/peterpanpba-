import { Router, Route } from 'wouter';
import Home from './pages/Home';
import Admin from './pages/Admin';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/admin" component={Admin} />
      </Router>
      <Toaster position="top-center" />
    </>
  );
}
