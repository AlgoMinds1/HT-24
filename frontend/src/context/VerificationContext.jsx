import React, { createContext, useContext, useState, useEffect } from 'react';
import { verifyForward, FIXTURE_MAP, DEFAULT_USE_MOCK } from '../services/verificationService';

const VerificationContext = createContext(null);

export function VerificationProvider({ children }) {
  // Screens: 'landing' | 'input' | 'analysis' | 'result'
  const [screen, setScreen] = useState('landing'); 
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image' | 'audio' | 'pdf' | 'url'
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null); // { message, code, warnings, canRetry, isConnectionError }

  // Interactive Live / Mock Toggle with persistent storage
  const [isMockMode, setIsMockModeState] = useState(() => {
    try {
      const saved = localStorage.getItem('truthlens_use_mock');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {}
    return DEFAULT_USE_MOCK;
  });

  const setMockMode = (mode) => {
    setIsMockModeState(mode);
    try {
      localStorage.setItem('truthlens_use_mock', mode ? 'true' : 'false');
    } catch {}
  };

  const toggleMockMode = () => {
    setMockMode(!isMockMode);
  };

  // Form State
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [activePresetKey, setActivePresetKey] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);

  const goToDashboard = () => {
    setScreen('input');
  };

  const goToLanding = () => {
    setScreen('landing');
  };

  const clearError = () => {
    setError(null);
  };

  const selectPreset = (fixtureKey, andVerifyDirectly = false) => {
    const fixture = FIXTURE_MAP[fixtureKey];
    if (!fixture) return;
    setActivePresetKey(fixtureKey);
    setActiveTab('text');
    setTextInput(fixture.data.input.raw_text);
    setSelectedFile(null);
    setUrlInput('');
    setScreen('input');
    setError(null);

    if (andVerifyDirectly) {
      setTimeout(() => {
        handleStartVerificationWithPreset(fixtureKey);
      }, 50);
    }
  };

  const resetAll = () => {
    setScreen('input');
    setCurrentStepIndex(0);
    setResultData(null);
    setIsAnalyzing(false);
    setError(null);
    setTextInput('');
    setSelectedFile(null);
    setUrlInput('');
    setActivePresetKey(null);
    setLastPayload(null);
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
    setLastPayload(payload);

    try {
      const result = await verifyForward(
        payload, 
        (stepIdx) => setCurrentStepIndex(stepIdx),
        { isMockMode }
      );
      setResultData(result);
      setScreen('result');
    } catch (err) {
      console.error('Verification error:', err);
      setError({
        message: err.message || 'An unexpected error occurred during verification.',
        code: err.code || 'UNKNOWN_ERROR',
        warnings: err.warnings || [],
        canRetry: err.canRetry !== false,
        isConnectionError: Boolean(err.isConnectionError)
      });
      setScreen('input');
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

    setLastPayload(payload);

    try {
      const result = await verifyForward(
        payload, 
        (stepIdx) => setCurrentStepIndex(stepIdx),
        { isMockMode }
      );
      setResultData(result);
      setScreen('result');
    } catch (err) {
      console.error('Verification error:', err);
      setError({
        message: err.message || 'An unexpected error occurred during verification.',
        code: err.code || 'UNKNOWN_ERROR',
        warnings: err.warnings || [],
        canRetry: err.canRetry !== false,
        isConnectionError: Boolean(err.isConnectionError)
      });
      setScreen('input');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retryVerification = () => {
    if (lastPayload) {
      if (lastPayload.presetKey) {
        handleStartVerificationWithPreset(lastPayload.presetKey);
      } else {
        handleStartVerification();
      }
    } else {
      handleStartVerification();
    }
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
        clearError,
        retryVerification,
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
        isMockMode,
        setMockMode,
        toggleMockMode
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
