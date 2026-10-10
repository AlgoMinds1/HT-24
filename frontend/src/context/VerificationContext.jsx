import React, { createContext, useContext, useState, useEffect } from 'react';
import { verifyForward, FIXTURE_MAP, USE_MOCK } from '../services/verificationService';
import { 
  getSavedVerifications, 
  saveVerificationToHistory, 
  removeVerificationFromHistory, 
  clearAllHistory 
} from './HistoryStorage';

const VerificationContext = createContext(null);

export function VerificationProvider({ children }) {
  // Screens: 'landing' | 'signin' | 'signup' | 'forgot_password' | 'dashboard' | 'analysis' | 'result' | 'history' | 'settings'
  const [screen, setScreenState] = useState(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (['landing', 'signin', 'signup', 'forgot_password', 'dashboard', 'result', 'history', 'settings'].includes(hash)) {
      return hash;
    }
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image' | 'audio' | 'pdf' | 'url'
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [activePresetKey, setActivePresetKey] = useState(null);

  // History State
  const [historyList, setHistoryList] = useState([]);

  // Session / Auth State
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('truthlens_user_session');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      name: 'Guest Reviewer',
      email: 'reviewer@truthlens.ai',
      isGuest: true,
      role: 'Fact-Checker'
    };
  });

  // Sync hash to screen
  const setScreen = (newScreen) => {
    setScreenState(newScreen);
    try {
      window.location.hash = newScreen === 'landing' ? '' : newScreen;
    } catch {}
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash && hash !== screen) {
        if (['landing', 'signin', 'signup', 'forgot_password', 'dashboard', 'result', 'history', 'settings'].includes(hash)) {
          setScreenState(hash);
        }
      } else if (!hash && screen !== 'landing') {
        setScreenState('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [screen]);

  // Load history on initial mount
  useEffect(() => {
    setHistoryList(getSavedVerifications());
  }, []);

  const login = (email, password) => {
    const sessionUser = {
      name: email.split('@')[0] || 'Fact-Checker',
      email: email,
      isGuest: false,
      role: 'Staff Fact-Checker'
    };
    setUser(sessionUser);
    try {
      localStorage.setItem('truthlens_user_session', JSON.stringify(sessionUser));
    } catch {}
    setScreen('dashboard');
  };

  const signup = (name, email, password) => {
    const sessionUser = {
      name: name || 'Reviewer',
      email: email,
      isGuest: false,
      role: 'Verified Analyst'
    };
    setUser(sessionUser);
    try {
      localStorage.setItem('truthlens_user_session', JSON.stringify(sessionUser));
    } catch {}
    setScreen('dashboard');
  };

  const logout = () => {
    const guestUser = {
      name: 'Guest Reviewer',
      email: 'reviewer@truthlens.ai',
      isGuest: true,
      role: 'Fact-Checker'
    };
    setUser(guestUser);
    try {
      localStorage.removeItem('truthlens_user_session');
    } catch {}
    setScreen('landing');
  };

  const goToDashboard = () => {
    setScreen('dashboard');
  };

  const goToLanding = () => {
    setScreen('landing');
  };

  const selectPreset = (fixtureKey, andVerifyDirectly = false) => {
    const fixture = FIXTURE_MAP[fixtureKey];
    if (!fixture) return;
    setActivePresetKey(fixtureKey);
    setActiveTab('text');
    setTextInput(fixture.data.input.raw_text);
    setSelectedFile(null);
    setUrlInput('');
    setScreen('dashboard');

    if (andVerifyDirectly) {
      setTimeout(() => {
        handleStartVerificationWithPreset(fixtureKey);
      }, 50);
    }
  };

  const resetAll = () => {
    setScreen('dashboard');
    setCurrentStepIndex(0);
    setResultData(null);
    setIsAnalyzing(false);
    setError(null);
    setTextInput('');
    setSelectedFile(null);
    setUrlInput('');
    setActivePresetKey(null);
  };

  const handleStartVerificationWithPreset = async (presetKey) => {
    setError(null);
    setIsAnalyzing(true);
    setScreen('analysis');
    setCurrentStepIndex(0);

    const payload = {
      type: 'text',
      presetKey: presetKey
    };

    try {
      const result = await verifyForward(payload, (stepIdx) => {
        setCurrentStepIndex(stepIdx);
      });
      setResultData(result);
      
      // Save to local history
      const updatedHistory = saveVerificationToHistory(result, 'text');
      setHistoryList(updatedHistory);

      setScreen('result');
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'An unexpected error occurred during verification.');
      setScreen('dashboard');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartVerification = async () => {
    setError(null);
    setIsAnalyzing(true);
    setScreen('analysis');
    setCurrentStepIndex(0);

    let payload = {
      type: activeTab,
      presetKey: activePresetKey
    };

    if (activeTab === 'text') {
      payload.content = textInput;
    } else if (activeTab === 'url') {
      payload.content = urlInput;
    } else {
      payload.content = selectedFile ? selectedFile.name : null;
      payload.file = selectedFile;
    }

    try {
      const result = await verifyForward(payload, (stepIdx) => {
        setCurrentStepIndex(stepIdx);
      });
      setResultData(result);

      // Save to local history
      const updatedHistory = saveVerificationToHistory(result, activeTab);
      setHistoryList(updatedHistory);

      setScreen('result');
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'An unexpected error occurred during verification.');
      setScreen('dashboard');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Open an existing historical record
  const openPastReport = (record) => {
    if (!record || !record.fullReport) return;
    setResultData(record.fullReport);
    setScreen('result');
  };

  // Delete an item from history
  const deleteHistoryItem = (id) => {
    const updated = removeVerificationFromHistory(id);
    setHistoryList(updated);
  };

  // Clear all history
  const clearHistory = () => {
    const cleared = clearAllHistory();
    setHistoryList(cleared);
  };

  return (
    <VerificationContext.Provider
      value={{
        screen,
        setScreen,
        goToDashboard,
        goToLanding,
        activeTab,
        setActiveTab,
        currentStepIndex,
        resultData,
        isAnalyzing,
        error,
        textInput,
        setTextInput,
        selectedFile,
        setSelectedFile,
        urlInput,
        setUrlInput,
        activePresetKey,
        selectPreset,
        startVerification: handleStartVerification,
        resetVerification: resetAll,
        isMockMode: USE_MOCK,
        // Authentication
        user,
        login,
        signup,
        logout,
        // History
        historyList,
        openPastReport,
        deleteHistoryItem,
        clearHistory
      }}
    >
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
}
