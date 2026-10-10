import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/screens/LandingPage';
import InputScreen from './components/screens/InputScreen';
import AnalysisScreen from './components/screens/AnalysisScreen';
import ResultScreen from './components/screens/ResultScreen';
import HistoryScreen from './components/screens/HistoryScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import SignInScreen from './components/auth/SignInScreen';
import SignUpScreen from './components/auth/SignUpScreen';
import ForgotPasswordModal from './components/auth/ForgotPasswordModal';
import { useVerification, VerificationProvider } from './context/VerificationContext';

function MainFlow() {
  const { screen } = useVerification();

  return (
    <main className="main-content-flow" role="main">
      {screen === 'landing' && <LandingPage />}
      {screen === 'signin' && <SignInScreen />}
      {screen === 'signup' && <SignUpScreen />}
      {screen === 'forgot_password' && <ForgotPasswordModal />}
      {screen === 'dashboard' && <InputScreen />}
      {screen === 'analysis' && <AnalysisScreen />}
      {screen === 'result' && <ResultScreen />}
      {screen === 'history' && <HistoryScreen />}
      {screen === 'settings' && <SettingsScreen />}
    </main>
  );
}

export default function App() {
  return (
    <VerificationProvider>
      <div className="app-shell-root">
        <Header />
        <MainFlow />
        <Footer />
      </div>
    </VerificationProvider>
  );
}
