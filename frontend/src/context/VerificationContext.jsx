import React, { createContext, useContext, useState } from 'react';
import { verifyForward, FIXTURE_MAP, USE_MOCK } from '../services/verificationService';

const VerificationContext = createContext(null);

export function VerificationProvider({ children }) {
  const [screen, setScreen] = useState('input'); // 'input' | 'analysis' | 'result'
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

  const selectPreset = (fixtureKey) => {
    const fixture = FIXTURE_MAP[fixtureKey];
    if (!fixture) return;
    setActivePresetKey(fixtureKey);
    setActiveTab('text');
    setTextInput(fixture.data.input.raw_text);
    setSelectedFile(null);
    setUrlInput('');
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
      setScreen('result');
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'An unexpected error occurred during verification.');
      setScreen('input');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <VerificationContext.Provider
      value={{
        screen,
        setScreen,
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
        isMockMode: USE_MOCK
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
