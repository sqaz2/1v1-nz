import React, { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import Smackzone from './src/pages/Smackzone';
import { localCasinoWallet } from './src/lib/quantum-chips';

class CasinoBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <main className="p-6 text-sky-100">Smackzone could not load. Your saved chips have been kept. <a href="/">Return to 1v1</a></main>
      : this.props.children;
  }
}

// Access storage within the guarded render so a blocked browser setting has an exit.
function Arcade() {
  const [wallet] = React.useState(() => localCasinoWallet(localStorage));
  return <Smackzone wallet={wallet} onLeave={() => { location.href = '/'; }} />;
}
createRoot(document.getElementById('root')!).render(<CasinoBoundary><Arcade /></CasinoBoundary>);
