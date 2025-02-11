import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router';
import './index.css'
import "../../dist";
import App from './App.tsx'
import Duel from './Duel.tsx';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/duel" element={<Duel />} />
    </Routes>
  </BrowserRouter>
)
