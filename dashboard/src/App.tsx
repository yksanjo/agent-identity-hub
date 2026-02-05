import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { SocialGraph } from './pages/SocialGraph';
import { Capabilities } from './pages/Capabilities';
import { Attestations } from './pages/Attestations';
import { websocket } from './utils/websocket';

function App() {
  useEffect(() => {
    // Connect WebSocket on mount
    websocket.connect();

    return () => {
      websocket.disconnect();
    };
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/graph" element={<SocialGraph />} />
          <Route path="/capabilities" element={<Capabilities />} />
          <Route path="/attestations" element={<Attestations />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
