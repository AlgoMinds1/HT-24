import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import InputScreen from './components/screens/InputScreen';
import AnalysisScreen from './components/screens/AnalysisScreen';
import ResultScreen from './components/screens/ResultScreen';
import { useVerification, VerificationProvider } from './context/VerificationContext';

function MainFlow() {
  const { screen } = useVerification();

  return (
    <main style={{ flex: 1, paddingBottom: '2rem' }}>
      {screen === 'input' && <InputScreen />}
      {screen === 'analysis' && <AnalysisScreen />}
      {screen === 'result' && <ResultScreen />}
    </main>
  );
}

export default function App() {
  return (
    <VerificationProvider>
      <div className="app-container">
        <Header />
        <MainFlow />
        <Footer />
      </div>
    </VerificationProvider>
  );
}
