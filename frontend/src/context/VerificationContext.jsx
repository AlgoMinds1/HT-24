import React, { createContext, useContext, useState, useEffect } from 'react';
import { verifyForward, abortVerification, FIXTURE_MAP, USE_MOCK } from '../services/verificationService';
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

  // Dual-mode state (Live AI vs Demo Fixtures) with localStorage persistence
  const [isMockMode, setIsMockModeState] = useState(() => {
    try {
      const saved = localStorage.getItem('truthlens_use_mock');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {}
    return USE_MOCK;
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

  const clearError = () => {
    setError(null);
  };

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

  // Investigation Sandbox State
  const initialInvestigationState = {
    status: 'idle', // 'idle' | 'running' | 'completed' | 'aborted' | 'failed'
    verificationId: null,
    claim: '',
    claimMeta: null,
    rawInputSnippet: '',
    inputType: 'text',
    events: [],
    activeSource: null,
    agent1: {
      status: 'idle', // 'idle' | 'in_progress' | 'completed' | 'failed'
      query: '',
      provider: 'Google News RSS / Real-time Web Search',
      domains: [],
      results: [],
      resultsCount: 0,
      fetchedCount: 0,
      blockedCount: 0,
      currentUrl: null
    },
    agent2: {
      status: 'idle', // 'idle' | 'in_progress' | 'completed' | 'empty' | 'failed'
      query: '',
      provider: 'Google Fact Check Tools API',
      matches: [],
      matchCount: 0,
      empty: false,
      error: null
    },
    evidenceLedger: [],
    exifForensics: null,
    synthesis: {
      status: 'idle',
      totalCompared: 0
    },
    finalVerdict: null
  };

  const [investigationState, setInvestigationState] = useState(initialInvestigationState);
  const activeAbortControllerRef = React.useRef(null);

  const setActiveSourcePreview = (source) => {
    if (!source) return;
    setInvestigationState((prev) => ({
      ...prev,
      activeSource: {
        ...source,
        domain: source.domain || (source.url ? (() => { try { return new URL(source.url).hostname; } catch { return 'source'; } })() : 'source')
      }
    }));
  };

  const processStreamEvent = (ev) => {
    setInvestigationState((prevState) => {
      const nextEvents = [
        ...prevState.events,
        {
          ...ev,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: ev.timestamp || new Date().toISOString()
        }
      ];

      let nextActiveSource = prevState.activeSource;
      let nextAgent1 = { ...prevState.agent1 };
      let nextAgent2 = { ...prevState.agent2 };
      let nextEvidenceLedger = [...prevState.evidenceLedger];
      let nextClaim = prevState.claim;
      let nextClaimMeta = prevState.claimMeta;
      let nextSynthesis = { ...prevState.synthesis };
      let nextStatus = prevState.status;
      let nextVerificationId = ev.verificationId || prevState.verificationId;
      let nextExifForensics = prevState.exifForensics;

      if (ev.eventType === 'verification_started') {
        nextStatus = 'running';
        if (ev.verificationId) nextVerificationId = ev.verificationId;
      } else if (ev.eventType === 'claim_extracted') {
        nextClaim = ev.data?.claimText || ev.message;
        nextClaimMeta = ev.data || null;
      } else if (ev.eventType === 'metadata_extracted') {
        nextExifForensics = ev.data;
      } else if (ev.eventType === 'search_started') {
        nextAgent1.status = 'in_progress';
        nextAgent1.query = ev.query || nextClaim;
        nextAgent1.provider = ev.provider || 'Google News RSS';
      } else if (ev.eventType === 'search_completed') {
        nextAgent1.resultsCount = ev.data?.resultCount || (ev.data?.articles?.length || 0);
        nextAgent1.results = ev.data?.articles || [];
        if (ev.status === 'failed') nextAgent1.status = 'failed';
      } else if (ev.eventType === 'url_selected' || ev.eventType === 'page_fetch_started') {
        nextAgent1.currentUrl = ev.url;
        let domainName = 'source';
        try { domainName = new URL(ev.url).hostname; } catch {}
        nextActiveSource = {
          url: ev.url,
          domain: domainName,
          title: ev.title || domainName,
          status: 'fetching',
          excerpt: 'Inspecting webpage content and evaluating claim correspondence...',
          publishedDate: ev.publishedDate || null,
          retrieved_by: 'Agent 1 (Web Research)'
        };
      } else if (ev.eventType === 'page_fetch_completed') {
        nextAgent1.fetchedCount = (nextAgent1.fetchedCount || 0) + 1;
        let domainName = ev.domain;
        try { if (!domainName && ev.url) domainName = new URL(ev.url).hostname; } catch {}
        nextActiveSource = {
          url: ev.url,
          domain: domainName || 'source',
          title: ev.title || 'Source Verified',
          excerpt: ev.excerpt || 'Page content inspected.',
          status: 'completed',
          httpStatus: ev.httpStatus || 200,
          publishedDate: ev.publishedDate,
          retrieved_by: 'Agent 1 (Web Research)'
        };
        if (!nextAgent1.domains.some(d => d.url === ev.url)) {
          nextAgent1.domains = [...nextAgent1.domains, { url: ev.url, domain: domainName, title: ev.title, status: 200, excerpt: ev.excerpt }];
        }
      } else if (ev.eventType === 'page_fetch_failed') {
        nextAgent1.blockedCount = (nextAgent1.blockedCount || 0) + 1;
        let domainName = ev.domain;
        try { if (!domainName && ev.url) domainName = new URL(ev.url).hostname; } catch {}
        nextActiveSource = {
          url: ev.url,
          domain: domainName || 'source',
          title: 'Direct Scraper Restricted',
          excerpt: `Origin restricted (${ev.httpStatus || 403}): ${ev.error || 'Server policy prevents automated direct browsing. Search snippet and publication metadata preserved.'}`,
          status: 'blocked',
          httpStatus: ev.httpStatus || 403,
          retrieved_by: 'Agent 1 (Web Research)'
        };
        if (!nextAgent1.domains.some(d => d.url === ev.url)) {
          nextAgent1.domains = [...nextAgent1.domains, { url: ev.url, domain: domainName, title: 'Protected Origin', status: ev.httpStatus || 403, error: ev.error }];
        }
      } else if (ev.eventType === 'fact_check_started') {
        nextAgent2.status = 'in_progress';
        nextAgent2.query = ev.query || nextClaim;
        nextAgent2.provider = ev.provider || 'Google Fact Check Tools API';
      } else if (ev.eventType === 'fact_check_matches') {
        nextAgent2.status = 'completed';
        nextAgent2.matchCount = ev.data?.matchCount || (ev.data?.records?.length || 0);
        nextAgent2.matches = ev.data?.records || [];
        if (ev.data?.records?.length > 0) {
          const topRecord = ev.data.records[0];
          let domainName = 'factcheck';
          try { domainName = new URL(topRecord.url).hostname; } catch {}
          nextActiveSource = {
            url: topRecord.url,
            domain: domainName,
            title: topRecord.publisher ? `${topRecord.publisher}: ${topRecord.rating}` : topRecord.title,
            excerpt: `Certified Fact-Check Review: Rated "${topRecord.rating}" by ${topRecord.publisher}.`,
            status: 'completed',
            stance: topRecord.stance || 'REFUTES',
            publishedDate: topRecord.date,
            retrieved_by: 'Agent 2 (Fact-Check Tools)'
          };
        }
      } else if (ev.eventType === 'fact_check_empty') {
        nextAgent2.status = 'empty';
        nextAgent2.empty = true;
      } else if (ev.eventType === 'fact_check_failed') {
        nextAgent2.status = 'failed';
        nextAgent2.error = ev.error;
      } else if (ev.eventType === 'evidence_extracted') {
        const exists = nextEvidenceLedger.some(item => (item.url && item.url === ev.url) || (item.title && item.title === ev.title));
        if (!exists) {
          let domainName = ev.domain;
          try { if (!domainName && ev.url) domainName = new URL(ev.url).hostname; } catch {}
          nextEvidenceLedger = [...nextEvidenceLedger, {
            id: `ev-${Date.now()}-${nextEvidenceLedger.length}`,
            title: ev.title,
            url: ev.url,
            domain: domainName || 'source',
            excerpt: ev.excerpt,
            stance: ev.stance || 'CONTEXTUALIZES',
            classificationType: ev.classificationType || 'direct_evidence',
            publishedDate: ev.publishedDate,
            agent: ev.agent === 'fact_check' ? 'Agent 2 (Fact-Check)' : 'Agent 1 (Web Research)'
          }];
        }
      } else if (ev.eventType === 'evidence_comparison_started') {
        nextSynthesis.status = 'in_progress';
      } else if (ev.eventType === 'evidence_comparison_completed') {
        nextSynthesis.status = 'completed';
        nextSynthesis.totalCompared = ev.data?.totalEvidenceItems || nextEvidenceLedger.length;
        nextAgent1.status = 'completed';
        if (nextAgent2.status === 'in_progress') nextAgent2.status = 'completed';
      } else if (ev.eventType === 'verification_completed') {
        nextStatus = 'completed';
        nextSynthesis.status = 'completed';
      } else if (ev.eventType === 'verification_aborted') {
        nextStatus = 'aborted';
      } else if (ev.eventType === 'verification_failed') {
        nextStatus = 'failed';
      }

      return {
        ...prevState,
        events: nextEvents,
        activeSource: nextActiveSource,
        agent1: nextAgent1,
        agent2: nextAgent2,
        evidenceLedger: nextEvidenceLedger,
        claim: nextClaim,
        claimMeta: nextClaimMeta,
        exifForensics: nextExifForensics,
        synthesis: nextSynthesis,
        status: nextStatus,
        verificationId: nextVerificationId
      };
    });
  };

  const abortCurrentVerification = async () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const currentId = investigationState.verificationId;
    if (currentId && !isMockMode) {
      try {
        await abortVerification(currentId);
      } catch (e) {
        console.warn('Failed to notify backend abort:', e);
      }
    }
    setInvestigationState((prev) => ({
      ...prev,
      status: 'aborted',
      events: [
        ...prev.events,
        {
          id: `abort-${Date.now()}`,
          agent: 'system',
          eventType: 'verification_aborted',
          status: 'failed',
          message: 'Investigation aborted by analyst.',
          timestamp: new Date().toISOString()
        }
      ]
    }));
    setIsAnalyzing(false);
  };

  const resetAll = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    setScreen('dashboard');
    setCurrentStepIndex(0);
    setResultData(null);
    setIsAnalyzing(false);
    setError(null);
    setTextInput('');
    setSelectedFile(null);
    setUrlInput('');
    setActivePresetKey(null);
    setInvestigationState(initialInvestigationState);
  };

  const handleStartVerificationWithPreset = async (presetKey) => {
    setError(null);
    setIsAnalyzing(true);
    setScreen('analysis');
    setCurrentStepIndex(0);

    const fixture = FIXTURE_MAP[presetKey];
    const initialText = fixture ? fixture.data.input.raw_text : 'Custom forward claim';

    activeAbortControllerRef.current = new AbortController();

    setInvestigationState({
      ...initialInvestigationState,
      status: 'running',
      rawInputSnippet: initialText,
      inputType: 'text'
    });

    const payload = {
      type: 'text',
      content: initialText,
      presetKey: presetKey
    };

    try {
      const result = await verifyForward(
        payload, 
        processStreamEvent,
        { isMockMode, abortController: activeAbortControllerRef.current }
      );
      setResultData(result);
      setInvestigationState((prev) => ({
        ...prev,
        status: 'completed',
        finalVerdict: result
      }));
      
      // Save to local history
      const updatedHistory = saveVerificationToHistory(result, 'text');
      setHistoryList(updatedHistory);

    } catch (err) {
      console.error('Verification error:', err);
      if (err.isAborted || err.code === 'ABORTED') {
        setInvestigationState((prev) => ({ ...prev, status: 'aborted' }));
      } else {
        setInvestigationState((prev) => ({ ...prev, status: 'failed' }));
        setError({
          message: err.message || 'An unexpected error occurred during verification.',
          code: err.code || 'VERIFICATION_ERROR',
          warnings: err.warnings || [],
          canRetry: err.canRetry !== false
        });
      }
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

    let snippet = '';
    if (activeTab === 'text') {
      payload.content = textInput;
      snippet = textInput;
    } else if (activeTab === 'url') {
      payload.content = urlInput;
      snippet = urlInput;
    } else {
      payload.content = selectedFile ? selectedFile.name : null;
      payload.file = selectedFile;
      snippet = selectedFile ? selectedFile.name : activeTab;
    }

    activeAbortControllerRef.current = new AbortController();

    setInvestigationState({
      ...initialInvestigationState,
      status: 'running',
      rawInputSnippet: snippet,
      inputType: activeTab
    });

    try {
      const result = await verifyForward(
        payload, 
        processStreamEvent,
        { isMockMode, abortController: activeAbortControllerRef.current }
      );
      setResultData(result);
      setInvestigationState((prev) => ({
        ...prev,
        status: 'completed',
        finalVerdict: result
      }));

      // Save to local history
      const updatedHistory = saveVerificationToHistory(result, activeTab);
      setHistoryList(updatedHistory);

    } catch (err) {
      console.error('Verification error:', err);
      if (err.isAborted || err.code === 'ABORTED') {
        setInvestigationState((prev) => ({ ...prev, status: 'aborted' }));
      } else {
        setInvestigationState((prev) => ({ ...prev, status: 'failed' }));
        setError({
          message: err.message || 'An unexpected error occurred during verification.',
          code: err.code || 'VERIFICATION_ERROR',
          warnings: err.warnings || [],
          canRetry: err.canRetry !== false
        });
      }
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
        clearError,
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
        toggleMockMode,
        // Investigation Sandbox
        investigationState,
        setActiveSourcePreview,
        abortCurrentVerification,
        goToSandbox: () => setScreen('analysis'),
        goToResult: () => setScreen('result'),
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
