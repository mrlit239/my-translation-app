import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TranslationPanel from './components/TranslationPanel';
import Footer from './components/Footer';
import { apiProviders, BACKEND_URL } from './constants/apiConfig';
// import { supabase, isSupabaseConfigured } from './lib/supabase';
// import AuthModal from './components/AuthModal';

export default function TranslationTool() {
  const createResumeState = (overrides = {}) => ({
    mode: 'all',
    chapterIndex: 0,
    chunkIndex: 0,
    rangeStart: 1,
    rangeEnd: 1,
    hasCheckpoint: false,
    ...overrides
  });

  const createSourceFocusState = (overrides = {}) => ({
    active: false,
    start: 0,
    end: 0,
    token: 0,
    ...overrides
  });

  const createChunkIssueState = (overrides = {}) => ({
    hasIssue: false,
    message: '',
    isRestricted: false,
    ...overrides
  });

  // State
  // Auth (Temporarily disabled)
  // const [user, setUser] = useState(null);
  // const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Auth Listener (Temporarily disabled to fix blank screen)
  // useEffect(() => {
  //   if (!isSupabaseConfigured()) return;

  //   // Check active session
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     setUser(session?.user ?? null);
  //     if (session?.user) fetchUserSettings(session.user.id);
  //   });

  //   const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  //     setUser(session?.user ?? null);
  //     if (session?.user) fetchUserSettings(session.user.id);
  //   });

  //   return () => subscription.unsubscribe();
  // }, []);

  // const fetchUserSettings = async (userId) => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('user_settings')
  //       .select('*')
  //       .eq('id', userId)
  //       .single();

  //     if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
  //       console.error('Error fetching settings:', error);
  //       return;
  //     }

  //     if (data) {
  //       if (data.openai_key) setApiKey(data.openai_key); // Or logic to set based on provider
  //       if (data.custom_prompt) setCustomPrompt(data.custom_prompt);
  //       if (data.glossary) setGlossary(data.glossary);
  //       // Add other fields as needed
  //     }
  //   } catch (err) {
  //     console.error('Error loading settings:', err);
  //   }
  // };

  // Debounced Save Settings
  // useEffect(() => {
  //   if (!user || !isSupabaseConfigured()) return;

  //   const timer = setTimeout(async () => {
  //     try {
  //       const updates = {
  //         id: user.id,
  //         custom_prompt: customPrompt,
  //         glossary: glossary,
  //         updated_at: new Date(),
  //         // We might want to be careful about saving API keys automatically for security, 
  //         // but for this MVP we'll save the current one if it looks like a key
  //         // [apiProvider + '_key']: apiKey 
  //       };

  //       // Only save keys if they are present
  //       if (apiKey) {
  //         if (apiProvider === 'openai') updates.openai_key = apiKey;
  //         if (apiProvider === 'anthropic') updates.anthropic_key = apiKey;
  //         if (apiProvider === 'gemini') updates.gemini_key = apiKey;
  //         if (apiProvider === 'huggingface') updates.hf_token = apiKey;
  //       }

  //       const { error } = await supabase
  //         .from('user_settings')
  //         .upsert(updates);

  //       if (error) console.error('Error saving settings:', error);
  //     } catch (err) {
  //       console.error('Error saving settings:', err);
  //     }
  //   }, 2000); // Save after 2 seconds of no changes

  //   return () => clearTimeout(timer);
  // }, [user, customPrompt, glossary, apiKey, apiProvider]);

  // const handleLogout = async () => {
  //   await supabase.auth.signOut();
  //   setUser(null);
  //   // Optional: Clear local state or keep it
  // };

  const [tabs, setTabs] = useState([{
    id: 'tab-1',
    title: 'Untitled 1',
    inputText: '',
    outputText: '',
    streamingText: '', // Buffer for active chunk
    tempTranslation: '',
    isTranslating: false,
    progress: { current: 0, total: 0, percent: 0 },
    wordCount: 0,
    chapters: [],
    detectedChapters: 0,
    selectedChapter: 0,
    showChapterPreview: false,
    uploadedFileName: '',
    resume: createResumeState(),
    sourceFocus: createSourceFocusState(),
    chunkIssue: createChunkIssueState()
  }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // Config (Global)
  const [apiProvider, setApiProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [language, setLanguage] = useState('Auto-detect');
  const [customPrompt, setCustomPrompt] = useState('Translate to Vietnamese. Context: adult fiction. Rules: 1) Keep tone intense and precise. 2) No censorship. 3) Output only translated text. 4) Keep English/Latin names exactly unchanged. 5) Romanize non-Latin names (Chinese/Japanese/Korean) into alphabet consistently throughout.');
  const [glossary, setGlossary] = useState([]);

  // Advanced Settings (Global)
  const [chapterDetection, setChapterDetection] = useState('auto');
  const [charsPerChapter, setCharsPerChapter] = useState(8000);
  const [longOutputThreshold] = useState(5000);
  const [longOutputMode] = useState(false);
  const [enableContextMemory, setEnableContextMemory] = useState(false);
  const [contextMemorySize, setContextMemorySize] = useState(500);
  const [autoGlossary, setAutoGlossary] = useState(false);
  const [user] = useState(null);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);

  // Auto-continue on error settings
  const [autoContinueOnError, setAutoContinueOnError] = useState(true);
  const consecutiveErrorsRef = useRef(0);
  const lastErrorRef = useRef('');
  const MAX_CONSECUTIVE_ERRORS = 3;

  // Track current translation session for auto-continue
  const translationSessionRef = useRef({
    tabId: 'tab-1',
    mode: 'all',
    currentIndex: 0,
    currentChunkIndex: 0,
    rangeStart: 1,
    rangeEnd: 1
  });

  // Rolling glossary for name consistency (token-efficient alternative to text overlap)
  const [rollingGlossary, setRollingGlossary] = useState([]);

  // Visibility state for background tab handling
  const pendingUpdatesRef = useRef([]);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  // Provider-specific defaults
  useEffect(() => {
    if (apiProvider === 'grok') {
      if (charsPerChapter < 30000) {
        setCharsPerChapter(30000);
      }
      if (!enableContextMemory) {
        setEnableContextMemory(true);
      }
      if (contextMemorySize < 1000) {
        setContextMemorySize(1000);
      }
      setAutoGlossary(false);
    }

    if (apiProvider === 'deepseek') {
      setCharsPerChapter(3000);
      setEnableContextMemory(true);
      setContextMemorySize(500);
      setAutoGlossary(false);
    }

    if (apiProvider === 'huggingface') {
      if (!enableContextMemory) {
        setEnableContextMemory(true);
      }
      if (contextMemorySize < 600) {
        setContextMemorySize(600);
      }
      setAutoGlossary(false);
    }
  }, [apiProvider, model]);

  // WAKE UP BACKEND ON APP LOAD (Render free tier sleeps after 15min)
  useEffect(() => {
    const wakeUpBackend = async () => {
      try {
        console.log('[Backend] Waking up server...');
        const start = Date.now();
        await fetch(`${BACKEND_URL}/health`);
        console.log(`[Backend] Server ready in ${Date.now() - start}ms`);
      } catch (e) {
        console.log('[Backend] Wake-up ping failed:', e.message);
      }
    };
    wakeUpBackend();
  }, []);

  // Handle visibility change - prevent throttling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';

      if (visible && pendingUpdatesRef.current.length > 0) {
        // Flush pending updates when tab becomes visible
        pendingUpdatesRef.current.forEach(update => update());
        pendingUpdatesRef.current = [];
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  const fileInputRef = useRef(null);
  const outputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isTranslatingRef = useRef(false);
  const hfSpaceClientRef = useRef({ spaceId: '', token: '', client: null });
  // Helper to get active tab
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const getTabById = (id) => tabsRef.current.find(t => t.id === id);

  // Helper to update active tab
  const updateActiveTab = (updates) => {
    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  };
  // Helper to update specific tab
  const updateTab = (id, updatesOrUpdater) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== id) return tab;
      if (typeof updatesOrUpdater === 'function') {
        return updatesOrUpdater(tab);
      }
      return { ...tab, ...updatesOrUpdater };
    }));
  };

  // Helper to parse glossary and clean text
  const processGlossary = (text) => {
    if (!autoGlossary || !text.includes('---GLOSSARY---')) return text;

    const parts = text.split('---GLOSSARY---');
    const cleanText = parts[0].trim();
    const glossaryText = parts[1];

    // Parse glossary terms
    const newTerms = [];
    const lines = glossaryText.split('\n');
    lines.forEach(line => {
      const match = line.match(/["']?(.+?)["']?:\s*["']?(.+?)["']?$/);
      if (match) {
        const source = match[1].trim();
        const target = match[2].trim();
        // Check if already exists
        if (!glossary.some(t => t.source.toLowerCase() === source.toLowerCase())) {
          newTerms.push({ source, target });
        }
      }
    });

    if (newTerms.length > 0) {
      setGlossary(prev => [...prev, ...newTerms]);
    }

    return cleanText;
  };

  const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const preprocessTextForTranslation = (sourceText) => {
    const placeholderMap = {};
    const seenNames = new Map();
    const latinNamePattern = /\b[A-Z][A-Za-z]+(?:['ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢-][A-Za-z]+)?(?:\s+[A-Z][A-Za-z]+(?:['ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢-][A-Za-z]+)?){0,2}\b/g;
    const commonTitleCaseWords = new Set([
      'A', 'An', 'The', 'This', 'That', 'These', 'Those', 'And', 'But', 'Or', 'Nor', 'For', 'So', 'Yet',
      'I', 'You', 'He', 'She', 'It', 'They', 'We', 'His', 'Her', 'Their', 'Our', 'Your',
      'In', 'On', 'At', 'To', 'From', 'With', 'Without', 'After', 'Before', 'During', 'Under', 'Over',
      'Chapter', 'Part', 'Book', 'Prologue', 'Epilogue'
    ]);

    let tokenIndex = 1;
    const processedText = sourceText.replace(latinNamePattern, (match) => {
      const normalized = match.trim();
      if (!normalized) return match;

      const isSingleWord = normalized.indexOf(' ') === -1;
      if (isSingleWord && commonTitleCaseWords.has(normalized)) return match;
      if (/^[IVXLCDM]+$/.test(normalized)) return match;

      let token = seenNames.get(normalized);
      if (!token) {
        token = `[[NAME_${String(tokenIndex).padStart(3, '0')}]]`;
        seenNames.set(normalized, token);
        placeholderMap[token] = normalized;
        tokenIndex += 1;
      }
      return token;
    });

    const nonLatinCandidates = [...new Set((sourceText.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]{1,4}/g) || []))]
      .filter(term => term.length > 0 && term.length <= 4)
      .slice(0, 40);

    return {
      processedText,
      placeholderMap,
      protectedTokens: Object.keys(placeholderMap),
      nonLatinCandidates
    };
  };

  const restoreProtectedNames = (translatedText, placeholderMap = {}) => {
    let restored = translatedText || '';

    Object.entries(placeholderMap).forEach(([token, value]) => {
      restored = restored.replace(new RegExp(escapeRegExp(token), 'g'), value);
    });

    restored = restored.replace(/\[\[\s*NAME_(\d{3})\s*\]\]/g, (match, id) => {
      const canonical = `[[NAME_${id}]]`;
      return placeholderMap[canonical] || match;
    });

    return restored;
  };

  const finalizeTranslationOutput = (rawText, preprocessMeta) => {
    const glossaryCleaned = processGlossary(rawText || '');
    return restoreProtectedNames(glossaryCleaned, preprocessMeta?.placeholderMap);
  };

  const buildTermProtectionPayload = (sourceText = '') => {
    if (!sourceText) {
      return { processedText: sourceText, tokenToTarget: {} };
    }

    const mergedTerms = [...glossary, ...rollingGlossary];
    if (!mergedTerms.length) {
      return { processedText: sourceText, tokenToTarget: {} };
    }

    const uniqueBySource = new Map();
    mergedTerms.forEach((term) => {
      const source = (term?.source || '').trim();
      const target = (term?.target || '').trim();
      if (!source || !target || uniqueBySource.has(source)) return;
      uniqueBySource.set(source, target);
    });

    const orderedTerms = Array.from(uniqueBySource.entries()).sort((a, b) => b[0].length - a[0].length);
    let processedText = sourceText;
    const tokenToTarget = {};
    let tokenIndex = 1;

    orderedTerms.forEach(([source, target]) => {
      if (!processedText.includes(source)) return;

      const token = `TKN${String(tokenIndex).padStart(4, '0')}X`;
      const sourceRegex = new RegExp(escapeRegExp(source), 'g');

      processedText = processedText.replace(sourceRegex, token);
      tokenToTarget[token] = target;
      tokenIndex += 1;
    });

    return { processedText, tokenToTarget };
  };

  const restoreProtectedTerms = (translatedText = '', tokenToTarget = {}) => {
    let restored = translatedText || '';
    const entries = Object.entries(tokenToTarget);

    entries.forEach(([token, target]) => {
      restored = restored.replace(new RegExp(escapeRegExp(token), 'g'), target);
    });

    // Some NMT models may insert spaces in synthetic tokens (e.g. "TKN 0001 X")
    restored = restored.replace(/TKN\s*(\d{4})\s*X/gi, (match, id) => {
      const canonical = `TKN${id}X`;
      return tokenToTarget[canonical] || match;
    });

    return restored;
  };

  const getHfSpaceClient = async (spaceId, token = '') => {
    const cleanToken = (token || '').trim();
    const cached = hfSpaceClientRef.current;
    if (cached.client && cached.spaceId === spaceId && cached.token === cleanToken) {
      return cached.client;
    }

    const { Client } = await import('@gradio/client');
    const options = cleanToken ? { hf_token: cleanToken } : {};
    const client = await Client.connect(spaceId, options);

    hfSpaceClientRef.current = {
      spaceId,
      token: cleanToken,
      client
    };

    return client;
  };

  // Extract character names from translation for rolling glossary (token-efficient)
  // This replaces expensive text overlap while maintaining name consistency
  // Extract source/target name pairs to keep naming consistent across chunks
  const extractNamesFromTranslation = useCallback((originalText, translatedText) => {
    const newNames = [];

    const sourceNamePattern = /[\u4e00-\u9fff]{2,4}/g;
    const sourceNames = [...new Set((originalText.match(sourceNamePattern) || []))];

    const targetNamePattern = /\b\p{Lu}[\p{L}\p{M}'-]*(?:\s+\p{Lu}[\p{L}\p{M}'-]*){0,2}\b/gu;
    const targetNames = [...new Set((translatedText.match(targetNamePattern) || []))];

    const stopWords = new Set(['The', 'This', 'That', 'With', 'From', 'When', 'Then', 'After', 'Before', 'And', 'But']);
    const filteredTargets = targetNames.filter((name) => (
      !stopWords.has(name) &&
      !rollingGlossary.some((item) => item.target === name)
    ));

    sourceNames.slice(0, 10).forEach((sourceName, index) => {
      const targetName = filteredTargets[index];
      if (targetName && !rollingGlossary.some((item) => item.source === sourceName)) {
        newNames.push({ source: sourceName, target: targetName });
      }
    });

    return newNames;
  }, [rollingGlossary]);

  // Build context from rolling glossary (much cheaper than full text overlap)
  const buildGlossaryContext = useCallback(() => {
    if (rollingGlossary.length === 0 && glossary.length === 0) return '';

    const allTerms = [...glossary, ...rollingGlossary];
    if (allTerms.length === 0) return '';

    // Only send unique, most recent terms (limit to save tokens)
    const uniqueTerms = allTerms.reduce((acc, term) => {
      if (!acc.some(t => t.source === term.source)) {
        acc.push(term);
      }
      return acc;
    }, []).slice(-50); // Keep last 50 terms max

    return uniqueTerms.map(t => `${t.source} = ${t.target}`).join(', ');
  }, [rollingGlossary, glossary]);

  const addTab = () => {
    const randomId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const newId = `tab-${randomId}`;
    setTabs(prev => [...prev, {
      id: newId,
      title: `Untitled ${prev.length + 1}`,
      inputText: '',
      outputText: '',
      streamingText: '', // Buffer for active chunk to save memory
      tempTranslation: '',
      isTranslating: false,
      progress: { current: 0, total: 0, percent: 0 },
      wordCount: 0,
      chapters: [],
      detectedChapters: 0,
      selectedChapter: 0,
      showChapterPreview: false,
      uploadedFileName: '',
      resume: createResumeState(),
      sourceFocus: createSourceFocusState(),
      chunkIssue: createChunkIssueState()
    }]);
    setActiveTabId(newId);
  };

  const closeTab = (id, e) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close last tab
    const tabToClose = tabs.find(t => t.id === id);
    if (tabToClose?.isTranslating) {
      alert('Stop translation in this tab before closing it.');
      return;
    }

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  // Debounce analysis
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab.inputText.length > 0) {
        analyzeText(activeTab.inputText);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [activeTab.inputText, chapterDetection, charsPerChapter, language]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result.replace(/\r\n/g, '\n');
      updateActiveTab({
        uploadedFileName: file.name,
        title: file.name,
        inputText: text,
        wordCount: text.length
      });
      // Analysis triggered by useEffect
    };
    reader.readAsText(file);
  };

  const clearUploadedFile = () => {
    updateActiveTab({ uploadedFileName: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAll = () => {
    updateActiveTab({
      inputText: '',
      outputText: '',
      tempTranslation: '',
      streamingText: '',
      wordCount: 0,
      chapters: [],
      showChapterPreview: false,
      selectedChapter: 0,
      uploadedFileName: '',
      progress: { current: 0, total: 0, percent: 0 },
      resume: createResumeState(),
      sourceFocus: createSourceFocusState(),
      chunkIssue: createChunkIssueState()
    });
    setGlossary([]); // Global glossary clear? Or maybe keep it? User asked to clear all.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stopTranslation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isTranslatingRef.current = false;

    const session = translationSessionRef.current;
    const sessionTabId = session.tabId || activeTabIdRef.current;
    const stopResume = createResumeState({
      mode: session.mode || 'all',
      chapterIndex: Math.max(0, session.currentIndex || 0),
      chunkIndex: Math.max(0, session.currentChunkIndex || 0),
      rangeStart: session.rangeStart || rangeStart,
      rangeEnd: session.rangeEnd || rangeEnd,
      hasCheckpoint: true
    });

    updateTab(sessionTabId, (t) => ({
      ...t,
      isTranslating: false,
      streamingText: '',
      resume: stopResume
    }));

    applyChunkFocus(
      sessionTabId,
      stopResume,
      'Stopped at current chunk. You can retry this chunk or skip to the next chunk.'
    );
  };

  const analyzeText = useCallback((text) => {
    // Auto-detect language if set to auto-detect
    let currentLang = language;
    if (language === 'Auto-detect') {
      const detected = detectLanguage(text);
      if (detected !== 'Auto-detect') {
        setLanguage(detected);
        currentLang = detected;
      }
    }

    // Try to detect chapters first using patterns
    let chunks = [];
    if (chapterDetection === 'auto') {
      // Map UI language to internal language for detection
      let internalLang = 'chinese'; // default
      if (currentLang.includes('Japanese')) internalLang = 'japanese';

      const detectedChapters = detectAndMarkChapters(text, internalLang);

      // If we found actual chapters (more than 1, or 1 that isn't just the whole text)
      if (detectedChapters.length > 1 || (detectedChapters.length === 1 && detectedChapters[0].title !== 'Section 1')) {
        chunks = detectedChapters;
      } else {
        // Fallback to smart chunking
        chunks = smartChunkText(text, charsPerChapter, 200);
      }
    } else {
      // Manual or other modes
      chunks = smartChunkText(text, charsPerChapter, 200);
    }

    updateActiveTab({
      chapters: chunks,
      detectedChapters: chunks.length,
      showChapterPreview: true
    });
  }, [chapterDetection, charsPerChapter, language, activeTabId]);

  // Trigger analysis when settings or text change
  useEffect(() => {
    if (activeTab.inputText) {
      analyzeText(activeTab.inputText);
    }
  }, [analyzeText, activeTab.inputText]);

  const detectLanguage = (text) => {
    // Simple heuristic based on character sets
    const sample = text.substring(0, 500);
    if (/[\u4e00-\u9fa5]/.test(sample)) return 'Chinese (\u4e2d\u6587)';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) return 'Japanese (\u65e5\u672c\u8a9e)';
    if (/[\uac00-\ud7af]/.test(sample)) return 'Korean (\ud55c\uad6d\uc5b4)';
    if (/[\u0400-\u04ff]/.test(sample)) return 'Russian (\u0420\u0443\u0441\u0441\u043a\u0438\u0439)';
    if (/[\u00c0-\u1ef9]/.test(sample)) return 'Vietnamese (Ti\u1ebfng Vi\u1ec7t)';
    return 'Auto-detect';
  };
  const smartChunkText = (text, maxChunkSize = 8000, overlapSize = 200) => {
    const chunks = [];

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;
    let previousOverlap = '';

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];

      // If adding this paragraph would exceed max size
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          title: `Section ${chunkIndex + 1}`,
          content: previousOverlap + currentChunk,
          charCount: (previousOverlap + currentChunk).length,
          index: chunkIndex
        });

        // Get overlap from end of current chunk
        previousOverlap = currentChunk.slice(-Math.min(overlapSize, currentChunk.length));

        // Start new chunk with current paragraph
        currentChunk = paragraph;
        chunkIndex++;
      } else if (paragraph.length > maxChunkSize) {
        // Paragraph itself is too large, split by sentences
        const sentences = paragraph.match(/[^.!?ÃƒÂ£Ã¢â€šÂ¬Ã¢â‚¬Å¡ÃƒÂ¯Ã‚Â¼Ã‚ÂÃƒÂ¯Ã‚Â¼Ã…Â¸]+[.!?ÃƒÂ£Ã¢â€šÂ¬Ã¢â‚¬Å¡ÃƒÂ¯Ã‚Â¼Ã‚ÂÃƒÂ¯Ã‚Â¼Ã…Â¸]+/g) || [paragraph];

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push({
              title: `Section ${chunkIndex + 1}`,
              content: previousOverlap + currentChunk,
              charCount: (previousOverlap + currentChunk).length,
              index: chunkIndex
            });

            // Update previous context for next iteration (keep last 2000 chars)
            previousOverlap = currentChunk.slice(-Math.min(overlapSize, currentChunk.length));
            currentChunk = sentence;
            chunkIndex++;
          } else {
            currentChunk += sentence;
          }
        }
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        title: `Section ${chunkIndex + 1}`,
        content: previousOverlap + currentChunk,
        charCount: (previousOverlap + currentChunk).length,
        index: chunkIndex
      });
    }

    return chunks.length > 0 ? chunks : [{
      title: 'Section 1',
      content: text,
      charCount: text.length,
      index: 0
    }];
  };

  const detectAndMarkChapters = (text, language = 'chinese') => {
    if (chapterDetection === 'manual' || chapterDetection === 'fixed') {
      const chunks = [];
      let startIndex = 0;

      while (startIndex < text.length) {
        let endIndex = Math.min(startIndex + charsPerChapter, text.length);

        // If we're not at the end, try to find a safe break point
        if (endIndex < text.length) {
          const searchWindow = text.slice(startIndex, endIndex);
          // Try to split at the last newline in the last 20% of the chunk
          const lastNewline = searchWindow.lastIndexOf('\n');

          if (lastNewline > charsPerChapter * 0.8) {
            endIndex = startIndex + lastNewline + 1; // Include the newline
          } else {
            // If no newline, try punctuation (Chinese/English)
            const lastPunctuation = Math.max(
              searchWindow.lastIndexOf('ÃƒÂ£Ã¢â€šÂ¬Ã¢â‚¬Å¡'),
              searchWindow.lastIndexOf('.'),
              searchWindow.lastIndexOf('ÃƒÂ¯Ã‚Â¼Ã‚Â'),
              searchWindow.lastIndexOf('!'),
              searchWindow.lastIndexOf('ÃƒÂ¯Ã‚Â¼Ã…Â¸'),
              searchWindow.lastIndexOf('?')
            );

            if (lastPunctuation > charsPerChapter * 0.8) {
              endIndex = startIndex + lastPunctuation + 1; // Include the punctuation
            }
          }
        }

        const chunk = text.slice(startIndex, endIndex);
        chunks.push({
          title: `Section ${chunks.length + 1}`,
          content: chunk,
          charCount: chunk.length
        });

        startIndex = endIndex;
      }
      return chunks;
    }

    const patterns = {
      chinese: [
        /(?:^|\n)\s*(?:[\d_]+\s*)?\u7b2c\s*[0-9\u4e00-\u5341\u767e\u5343\u4e07]+\s*[\u7ae0\u5377].*/g,
        /(?:^|\n)\s*(?:[\d_]+\s*)?\u7b2c\s*[0-9\u4e00-\u5341\u767e\u5343\u4e07]+\s*\u8282.*/g,
        /(?:^|\n)\s*Chapter\s*\d+.*/gi
      ],
      japanese: [
        /(?:^|\n)\s*\u7b2c[\u4e00-\u5341\u767e\u5343\u4e07\d]+\u7ae0[^\n]*/g,
        /(?:^|\n)\s*\u7b2c[\u4e00-\u5341\u767e\u5343\u4e07\d]+\u8a71[^\n]*/g,
        /(?:^|\n)\s*[0-9]+\u7ae0[^\n]*/g,
        /(?:^|\n)\s*[0-9]+\u8a71[^\n]*/g
      ]
    };
    const currentPatterns = language === 'chinese' ? patterns.chinese : patterns.japanese;
    const matches = [];

    currentPatterns.forEach(pattern => {
      const found = [...text.matchAll(pattern)];
      matches.push(...found.map(m => ({ index: m.index, title: m[0].trim() })));
    });

    matches.sort((a, b) => a.index - b.index);

    if (matches.length === 0) {
      const chunks = [];
      for (let i = 0; i < text.length; i += charsPerChapter) {
        const chunk = text.slice(i, i + charsPerChapter);
        chunks.push({
          title: `Section ${chunks.length + 1}`,
          content: chunk,
          charCount: chunk.length
        });
      }
      return chunks;
    }

    const chapters = [];

    // Check for prologue (text before first chapter)
    if (matches.length > 0 && matches[0].index > 0) {
      const prologueContent = text.substring(0, matches[0].index);
      if (prologueContent.trim().length > 0) {
        chapters.push({
          title: "Prologue / Start",
          content: prologueContent,
          charCount: prologueContent.length,
          startIndex: 0
        });
      }
    }

    matches.forEach((match, i) => {
      const nextIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;
      const content = text.substring(match.index, nextIndex);
      chapters.push({
        title: match.title,
        content: content,
        charCount: content.length,
        startIndex: match.index
      });
    });

    return chapters;
  };

  const processStream = async (response, onChunk, onError, providerType, signal) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const processLine = (line) => {
      let chunk = '';
      if (providerType === 'gemini') {
        return; // Non-stream for Gemini
      } else {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0]?.delta?.content) {
              chunk = parsed.choices[0].delta.content;
            } else if (parsed.delta && parsed.delta.text) {
              chunk = parsed.delta.text;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (chunk) {
        onChunk(chunk);
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal && signal.aborted) break; // Explicit check
        // Check if aborted during read
        // Note: fetch signal abort usually throws AbortError on read, but good to be safe

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          processLine(line);
        }
        buffer = lines[lines.length - 1];
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        processLine(buffer.trim());
      }

    } catch (error) {
      onError(error);
    } finally {
      reader.releaseLock();
    }
  };

  const scrollToBottom = (tabId = activeTabIdRef.current) => {
    if (tabId !== activeTabIdRef.current) return;
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  const callAPI = async (text, onChunk = null, stream = true, previousContext = null, preprocessMeta = null) => {
    const provider = apiProviders[apiProvider];
    const modelValue = String(model || '');
    const isPublicHfSpaceModel = apiProvider === 'huggingface' && (
      modelValue.startsWith('space:') ||
      modelValue.includes('doof-ferb/hirashiba-mt-zh-vi')
    );
    // Skip API key check for backend providers (keys are server-side) or providers that don't require it
    if (!provider?.useBackend && provider?.requiresKey !== false && !apiKey.trim() && !isPublicHfSpaceModel) {
      throw new Error('Please enter your API key');
    }

    // Abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    const prepared = preprocessMeta || preprocessTextForTranslation(text);
    const textForModel = prepared.processedText || text;

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ PROMPT CONSTRUCTION ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    let finalPrompt = customPrompt;

    finalPrompt += '\n\nIMPORTANT: This is part of a larger text. Keep style and terminology consistent. Output translation only.';
    finalPrompt += '\n\nNAME RULES: 1) Keep English/Latin names exactly unchanged. 2) Romanize non-Latin names (Chinese/Japanese/Korean). 3) Keep romanization consistent.';

    if (prepared.protectedTokens?.length) {
      finalPrompt += `\n\nPROTECTED NAME TOKENS:\n${prepared.protectedTokens.map(token => `- ${token}`).join('\n')}\nKeep these tokens exactly unchanged in output.`;
    }

    if (prepared.nonLatinCandidates?.length) {
      finalPrompt += `\n\nPOSSIBLE NON-LATIN NAMES TO ROMANIZE:\n${prepared.nonLatinCandidates.map(name => `- ${name}`).join('\n')}`;
    }

    // Use lightweight glossary context instead of full text (saves ~80% tokens)
    const glossaryContext = buildGlossaryContext();
    if (glossaryContext && enableContextMemory) {
      finalPrompt += `\n\nCHARACTER/TERM NAMES (MUST use these exact translations):\n${glossaryContext}\n\nIMPORTANT: You MUST use the exact name translations listed above. Do NOT create alternative translations for the same characters.`;
    }

    if (previousContext && enableContextMemory) {
      // Fallback to old method if no glossary built yet (first chunk only)
      finalPrompt += `\n\nPREVIOUS CONTEXT (For continuity of names and style):\n${previousContext}\n\nEND OF CONTEXT\n\nIMPORTANT: You must maintain strict consistency with the names used in the PREVIOUS CONTEXT. If a character was called "TiÃƒÂ¡Ã‚Â»Ã†â€™u Lam" previously, do NOT switch to "Xiao Lan". Use the same naming convention.`;
    }

    if (glossary.length > 0) {
      finalPrompt += '\n\nGlossary (Strictly follow these translations):\n';
      glossary.forEach(term => {
        finalPrompt += `- ${term.source} -> ${term.target}\n`;
      });
    }

    if (autoGlossary) {
      finalPrompt += '\n\nAt the very end of your response, output a separator line "---GLOSSARY---" followed by a list of any NEW proper names or specific terms you identified and translated in this text, one per line in this format: "Source: Target". Do not include terms already in the provided glossary.';
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ BACKEND API CALL (Server-side keys) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    if (provider?.useBackend) {
      try {
        console.log('[Backend] Starting request to:', `${BACKEND_URL}/api/translate/${apiProvider}`);
        console.log('[Backend] Request payload size:', textForModel?.length, 'chars');

        const response = await fetch(`${BACKEND_URL}/api/translate/${apiProvider}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            prompt: finalPrompt,
            text: textForModel
          }),
          signal
        });

        console.log('[Backend] Response status:', response.status);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Backend error: ${response.status}`);
        }

        const data = await response.json();
        const fullText = data.translation || '';

        console.log('[Backend Response]', { provider: apiProvider, chars: fullText.length, preview: fullText.slice(0, 100) });

        // Simulate streaming for UX - preserve all whitespace/newlines
        if (onChunk && fullText) {
          // Just send the whole text at once to preserve formatting
          // The backend already returns complete response, no need to chunk
          onChunk(fullText);
        }

        return finalizeTranslationOutput(fullText, prepared);
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error(`Backend: ${error.message}`);
      }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ LEGACY: Direct Browser Calls ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    if (apiProvider === 'huggingface') {
      const selectedModel = String(model || '');
      const isSpaceModel = selectedModel.startsWith('space:') || selectedModel.includes('doof-ferb/hirashiba-mt-zh-vi');

      if (isSpaceModel) {
        const spaceId = selectedModel.startsWith('space:') ? selectedModel.replace(/^space:/, '') : selectedModel;
        const client = await getHfSpaceClient(spaceId, apiKey);
        const termProtection = buildTermProtectionPayload(textForModel);

        const result = await client.predict('/translate', {
          input_text: termProtection.processedText
        });

        const rawTranslated = Array.isArray(result?.data)
          ? (result.data[0] || '')
          : (typeof result === 'string' ? result : '');

        const restoredText = restoreProtectedTerms(rawTranslated, termProtection.tokenToTarget);
        if (onChunk && restoredText) onChunk(restoredText);
        return finalizeTranslationOutput(restoredText, prepared);
      }

      if (!apiKey.trim()) {
        throw new Error('HF token is required for non-Space Hugging Face models.');
      }

      // Generic Hugging Face Inference API using HfInference
      const { HfInference } = await import('https://esm.sh/@huggingface/inference');
      const hf = new HfInference(apiKey);
      const termProtection = buildTermProtectionPayload(textForModel);
      const protectedInput = termProtection.processedText;

      const MAX_CHUNK_SIZE = 700;
      let chunks = [];

      if (protectedInput.length > MAX_CHUNK_SIZE) {
        const sentences = protectedInput.match(/[^.!?\\u3002\\uff01\\uff1f]+[.!?\\u3002\\uff01\\uff1f]+|.+$/g) || [protectedInput];
        let currentChunk = '';

        for (const sentence of sentences) {
          if ((currentChunk + sentence).length <= MAX_CHUNK_SIZE) {
            currentChunk += sentence;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
            while (currentChunk.length > MAX_CHUNK_SIZE) {
              chunks.push(currentChunk.slice(0, MAX_CHUNK_SIZE));
              currentChunk = currentChunk.slice(MAX_CHUNK_SIZE);
            }
          }
        }
        if (currentChunk) chunks.push(currentChunk);
      } else {
        chunks = [protectedInput];
      }

      let finalTranslatedText = '';

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;

        let chunkResult = '';
        try {
          const result = await hf.translation({
            model: selectedModel,
            inputs: chunk
          });

          if (Array.isArray(result)) {
            chunkResult = result[0]?.translation_text || result[0]?.generated_text || JSON.stringify(result);
          } else {
            chunkResult = result.translation_text || result.generated_text || JSON.stringify(result);
          }
        } catch (err) {
          if (err.message.includes('Task not supported') || err.message.includes('does not support')) {
            const result = await hf.textGeneration({
              model: selectedModel,
              inputs: chunk,
              parameters: { max_new_tokens: 1024 }
            });
            chunkResult = result.generated_text || '';
            if (chunkResult.startsWith(chunk)) {
              chunkResult = chunkResult.slice(chunk.length).trim();
            }
          } else {
            throw err;
          }
        }

        finalTranslatedText += `${chunkResult} `;
      }

      const restoredText = restoreProtectedTerms(finalTranslatedText.trim(), termProtection.tokenToTarget);
      if (onChunk && restoredText) onChunk(restoredText);
      return finalizeTranslationOutput(restoredText, prepared);
    }

    // Google Translate (Direct browser call - works only in local development due to CORS)
    if (apiProvider === 'google_translate') {
      // Warn if on production
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocalhost) {
        throw new Error('Google Translate only works in local development (localhost). Use AI providers for production.');
      }

      const chunks = smartChunkText(textForModel, 1500, 0); // Smaller chunks for URL limit
      let finalTranslatedText = '';

      for (let i = 0; i < chunks.length; i++) {
        let processedChunk = chunks[i].content || chunks[i];
        if (!processedChunk?.trim()) continue;

        // Apply glossary: Replace source terms with target translations BEFORE sending
        glossary.forEach(term => {
          if (term.source && term.target) {
            processedChunk = processedChunk.split(term.source).join(term.target);
          }
        });

        // Direct call to Google Translate (browser-side, works on localhost)
        const baseUrl = 'https://translate.googleapis.com/translate_a/single';
        const url = `${baseUrl}?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(processedChunk)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Google Translate failed');

        const data = await response.json();
        // Structure: [[["Translated", "Original", null, null, ...], ...], ...]
        const translatedChunk = data[0].map(item => item[0]).join('');

        finalTranslatedText += translatedChunk + ' ';
        if (onChunk) onChunk(translatedChunk + ' '); // Simulate streaming

        // Rate limit protection: Add 300ms delay between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      return finalizeTranslationOutput(finalTranslatedText.trim(), prepared);
    }

    // Gemini - ALWAYS non-stream
    if (apiProvider === 'gemini') {
      const bodyData = {
        contents: [{
          parts: [{ text: `${finalPrompt}\n\nText to translate:\n${textForModel}` }]
        }],
        generationConfig: {
          response_mime_type: 'text/plain',
          max_output_tokens: model.includes('1.5') ? 8192 : 65536
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      };

      const response = await fetch(`${provider.endpoint}${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
        signal
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'API request failed');
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        // Check for safety ratings or other reasons
        if (data.promptFeedback && data.promptFeedback.blockReason) {
          throw new Error(`Blocked by safety filters: ${data.promptFeedback.blockReason}`);
        }
        throw new Error('No response generated by AI');
      }

      const candidate = data.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Response blocked by safety filters');
        }
        throw new Error('Empty response from AI');
      }

      const fullText = candidate.content.parts[0].text || '';
      if (onChunk) {
        // Simulate gradual for UX
        const sentences = fullText.split(/([.!?])/).filter(s => s.trim());
        for (let sent of sentences) {
          if (signal.aborted) break; // STOP if aborted
          onChunk(sent);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      return finalizeTranslationOutput(fullText, prepared);
    }

    // Anthropic (user key)
    if (apiProvider === 'anthropic') {
      const bodyData = {
        model: model,
        max_tokens: 4096,
        stream: stream,
        messages: [{
          role: 'user',
          content: `${finalPrompt}\n\nText to translate:\n${textForModel}`
        }]
      };

      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(bodyData),
        signal
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'API request failed');
      }

      if (stream && onChunk) {
        let streamedText = '';
        await processStream(response, (chunk) => {
          streamedText += chunk;
          onChunk(chunk);
        }, (err) => { throw err; }, 'claude', signal);
        return finalizeTranslationOutput(streamedText, prepared);
      } else {
        const data = await response.json();
        return finalizeTranslationOutput(data.content[0].text, prepared);
      }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ DEEPSEEK (via Netlify proxy to avoid CORS) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    if (apiProvider === 'deepseek') {
      const proxyResponse = await fetch('/.netlify/functions/deepseek-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey,
          model: model,
          messages: [
            { role: 'system', content: finalPrompt },
            { role: 'user', content: `Text to translate:\n${textForModel}` }
          ],
        }),
        signal
      });

      if (!proxyResponse.ok) {
        const errData = await proxyResponse.json().catch(() => ({}));
        throw new Error(errData.error?.message || errData.error || `HTTP ${proxyResponse.status}`);
      }

      const data = await proxyResponse.json();
      const fullText = data.choices?.[0]?.message?.content || '';

      // Simulate streaming for UX
      if (onChunk && fullText) {
        await simulateStreaming(fullText, onChunk, signal);
      }

      return finalizeTranslationOutput(fullText, prepared);
    }

    // GROK + OPENAI + GROQ + OPENROUTER + LOCAL
    const isGrok = apiProvider === 'grok';
    const bodyData = {
      model: model,
      messages: (apiProvider === 'local') ? [
        { role: 'user', content: `### Instruction:\nYou are a professional translator. Translate the following text into Vietnamese.\n\n${finalPrompt}\n\n### Input Text:\n${textForModel}\n\n### Response (Vietnamese Translation):` }
      ] : [
        { role: 'system', content: finalPrompt },
        { role: 'user', content: `Text to translate:\n${textForModel}` }
      ],
      max_tokens: 8192,
      temperature: 0.3,
      stream: stream,
      // Local model safeguards to reduce repetition
      ...(apiProvider === 'local' && {
        repeat_penalty: 1.15,        // Penalize repetition
        top_p: 0.9,                  // Nucleus sampling
        frequency_penalty: 0.3,      // Reduce word frequency
        presence_penalty: 0.3,       // Encourage diverse vocabulary
        stop: ['### Input', '###', '\n\n\n', '---'],  // Stop sequences
      }),
      // Grok-specific options
      ...(isGrok && {
        // Cache prompt to reduce repeated input cost across chunks
        cache_prompt: enableContextMemory === true,

        // Auto extract glossary bÃƒÂ¡Ã‚ÂºÃ‚Â±ng tool calls -> DISABLED to prevent truncation bug
        // We rely on text-based glossary extraction instead
        /*
        ...(autoGlossary && {
          tools: [{
            type: "function",
            function: {
              name: "extract_new_terms",
              description: "Extract new proper names, character names, sect names, item names from the translation",
              parameters: {
                type: "object",
                properties: {
                  terms: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        source: { type: "string", description: "Original Chinese text" },
                        target: { type: "string", description: "Vietnamese translation" },
                        note: { type: "string", description: "Optional note (person/place/item/sect)" }
                      },
                      required: ["source", "target"]
                    }
                  }
                },
                required: ["terms"]
              }
            }
          }],
          tool_choice: "auto"
        })
        */
      })
    };

    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(isGrok && { 'x-client-name': 'AITransTool-GrokOptimized' }),
        ...(apiProvider === 'openrouter' && {
          'HTTP-Referer': 'https://aitranstool.netlify.app', // Site URL
          'X-Title': 'Modern AI Translation Tool', // Site Title
        })
      },
      body: JSON.stringify(bodyData),
      signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ STREAMING (hÃƒÂ¡Ã‚Â»Ã¢â‚¬â€ trÃƒÂ¡Ã‚Â»Ã‚Â£ Grok tool calls) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    if (stream && onChunk) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line === 'data: [DONE]' || !line.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta || {};

            // TOOL CALLS (Auto-Glossary)
            if (isGrok && delta.tool_calls) {
              delta.tool_calls.forEach(tc => {
                if (tc?.function?.arguments) {
                  try {
                    const args = JSON.parse(tc.function.arguments);
                    if (Array.isArray(args.terms)) {
                      args.terms.forEach(t => {
                        if (t.source && t.target && !glossary.some(g => g.source === t.source)) {
                          setGlossary(prev => [...prev, { source: t.source, target: t.target }]);
                        }
                      });
                    }
                  } catch {
                    // Ignore malformed tool call payloads
                  }
                }
              });
            }

            // CONTENT ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ LUÃƒÆ’Ã¢â‚¬ÂN GÃƒÂ¡Ã‚Â»Ã‚Â¬I, KHÃƒÆ’Ã¢â‚¬ÂNG BÃƒÂ¡Ã‚Â»Ã…Â½ SÃƒÆ’Ã¢â‚¬Å“T
            const content = delta.content || '';
            if (content) {
              streamedContent += content;
              onChunk(content);
            }

          } catch {
            // Ignore malformed streaming chunks
          }
        }
      }

      return finalizeTranslationOutput(streamedContent, prepared);
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ NON-STREAM (fallback) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    const data = await response.json();

    // XÃƒÂ¡Ã‚Â»Ã‚Â­ lÃƒÆ’Ã‚Â½ tool calls trong non-stream
    if (isGrok && data.choices?.[0]?.message?.tool_calls) {
      const toolCall = data.choices[0].message.tool_calls[0];
      if (toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          if (Array.isArray(args.terms)) {
            args.terms.forEach(t => {
              if (t.source && t.target && !glossary.some(g => g.source === t.source)) {
                setGlossary(prev => [...prev, { source: t.source, target: t.target }]);
              }
            });
          }
        } catch { /* ignore */ }
      }
    }

    return finalizeTranslationOutput(data.choices?.[0]?.message?.content?.trim() || '', prepared);
  };

  // Helper for simulated streaming (visibility-aware to prevent background throttling)
  const simulateStreaming = async (fullText, onChunk, signal) => {
    const chunkSize = 5; // Words per chunk
    const words = fullText.split(' ');

    for (let i = 0; i < words.length; i += chunkSize) {
      if (signal.aborted || !isTranslatingRef.current) break;

      const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';

      // If tab is hidden, queue the update to be processed when visible
      if (document.hidden) {
        pendingUpdatesRef.current.push(() => onChunk(chunk));
        // No delay when hidden - just queue and continue
      } else {
        // Process any pending updates first
        if (pendingUpdatesRef.current.length > 0) {
          pendingUpdatesRef.current.forEach(update => update());
          pendingUpdatesRef.current = [];
        }
        onChunk(chunk);

        // Variable delay to feel more natural (only when visible)
        const delay = Math.random() * 30 + 20;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Ensure any remaining pending updates are flushed
    if (pendingUpdatesRef.current.length > 0) {
      pendingUpdatesRef.current.forEach(update => update());
      pendingUpdatesRef.current = [];
    }
  };

  // Helper to split text into chunks
  const splitTextIntoChunks = (text, maxLength = 5000) => {
    if (!text) return [];
    if (text.length <= maxLength) return [text];

    const chunks = [];
    let currentChunk = '';
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      // If paragraph itself is huge, split it by sentences
      if (paragraph.length > maxLength) {
        // Push current chunk if any
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }

        // Split huge paragraph
        const sentences = paragraph.match(/[^.!?ÃƒÂ£Ã¢â€šÂ¬Ã¢â‚¬Å¡ÃƒÂ¯Ã‚Â¼Ã‚ÂÃƒÂ¯Ã‚Â¼Ã…Â¸]+[.!?ÃƒÂ£Ã¢â€šÂ¬Ã¢â‚¬Å¡ÃƒÂ¯Ã‚Â¼Ã‚ÂÃƒÂ¯Ã‚Â¼Ã…Â¸]+["']?|.+$/g) || [paragraph];
        let currentSentenceChunk = '';

        for (const sentence of sentences) {
          if ((currentSentenceChunk.length + sentence.length) > maxLength) {
            if (currentSentenceChunk) chunks.push(currentSentenceChunk);
            currentSentenceChunk = sentence;
            // If single sentence is still huge, hard split
            while (currentSentenceChunk.length > maxLength) {
              chunks.push(currentSentenceChunk.slice(0, maxLength));
              currentSentenceChunk = currentSentenceChunk.slice(maxLength);
            }
          } else {
            currentSentenceChunk += sentence;
          }
        }
        if (currentSentenceChunk) chunks.push(currentSentenceChunk);
        continue;
      }

      if ((currentChunk.length + paragraph.length + 1) > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      currentChunk += (currentChunk ? '\n' : '') + paragraph;
    }
    if (currentChunk) chunks.push(currentChunk);

    return chunks;
  };

  const splitTextIntoChunkSpans = (text, maxLength = 5000) => {
    const chunks = splitTextIntoChunks(text, maxLength);
    const spans = [];
    let searchFrom = 0;

    chunks.forEach((content, index) => {
      if (!content) return;

      let start = text.indexOf(content, searchFrom);
      if (start < 0) {
        start = searchFrom;
      }

      const end = start + content.length;
      spans.push({ index, content, start, end });
      searchFrom = Math.max(end, searchFrom);
    });

    return spans;
  };

  const getChapterStartIndex = (tab, chapterIndex) => {
    const chapter = tab?.chapters?.[chapterIndex];
    if (!chapter) return 0;
    if (chapter.startIndex !== undefined) return chapter.startIndex;

    let start = 0;
    for (let i = 0; i < chapterIndex; i++) {
      start += tab.chapters[i]?.charCount || 0;
    }
    return start;
  };

  const getChunkLocation = (tab, chapterIndex, chunkIndex) => {
    const chapter = tab?.chapters?.[chapterIndex];
    if (!chapter) return null;

    const spans = splitTextIntoChunkSpans(chapter.content);
    if (spans.length === 0) return null;

    const safeChunkIndex = Math.max(0, Math.min(chunkIndex, spans.length - 1));
    const span = spans[safeChunkIndex];
    const chapterStart = getChapterStartIndex(tab, chapterIndex);

    return {
      chapterIndex,
      chunkIndex: safeChunkIndex,
      start: chapterStart + span.start,
      end: chapterStart + span.end
    };
  };

  const getResumeEndAt = (tab, resumeState) => {
    if (!tab?.chapters?.length) return 0;
    const mode = resumeState?.mode || 'all';
    if (mode === 'range') {
      return Math.min(tab.chapters.length, resumeState?.rangeEnd || tab.chapters.length);
    }
    if (mode === 'single') {
      return Math.min(tab.chapters.length, (resumeState?.chapterIndex || 0) + 1);
    }
    return tab.chapters.length;
  };

  const buildNextChunkResume = (tab, resumeState) => {
    if (!tab?.chapters?.length) return createResumeState();

    const chapterIndex = Math.max(0, resumeState?.chapterIndex || 0);
    const chunkIndex = Math.max(0, resumeState?.chunkIndex || 0);
    const chapter = tab.chapters[chapterIndex];
    if (!chapter) return createResumeState();

    const spans = splitTextIntoChunkSpans(chapter.content);
    if (spans.length === 0) return createResumeState();

    let nextChapterIndex = chapterIndex;
    let nextChunkIndex = chunkIndex + 1;

    if (nextChunkIndex >= spans.length) {
      nextChapterIndex += 1;
      nextChunkIndex = 0;
    }

    const endAt = getResumeEndAt(tab, resumeState);
    const hasCheckpoint = nextChapterIndex < endAt;

    return createResumeState({
      mode: resumeState?.mode || 'all',
      chapterIndex: hasCheckpoint ? nextChapterIndex : chapterIndex,
      chunkIndex: hasCheckpoint ? nextChunkIndex : 0,
      rangeStart: resumeState?.rangeStart || 1,
      rangeEnd: resumeState?.rangeEnd || tab.chapters.length,
      hasCheckpoint
    });
  };

  const applyChunkFocus = (tabId, resumeState, issueMessage = '', isRestricted = false) => {
    const tab = getTabById(tabId);
    if (!tab) return;

    const location = getChunkLocation(
      tab,
      Math.max(0, resumeState?.chapterIndex || 0),
      Math.max(0, resumeState?.chunkIndex || 0)
    );

    updateTab(tabId, (t) => ({
      ...t,
      selectedChapter: location ? location.chapterIndex : t.selectedChapter,
      sourceFocus: location ? createSourceFocusState({
        active: true,
        start: location.start,
        end: location.end,
        token: Date.now()
      }) : createSourceFocusState(),
      chunkIssue: issueMessage
        ? createChunkIssueState({
          hasIssue: true,
          message: issueMessage,
          isRestricted
        })
        : t.chunkIssue
    }));
  };

  const isModerationBlockError = (errorMsg = '') => {
    const normalized = String(errorMsg).toLowerCase();
    const moderationMarkers = [
      'content violates',
      'usage guidelines',
      'failed check',
      'safety_check',
      'safety check',
      'blocked by safety',
      'moderation',
      'csam'
    ];
    return moderationMarkers.some((marker) => normalized.includes(marker));
  };

  const translateText = async (
    mode = 'all',
    chapterIndex = 0,
    argRangeStart = 0,
    argRangeEnd = 0,
    argChunkIndex = 0,
    targetTabId = activeTabIdRef.current
  ) => {
    const tabId = targetTabId || activeTabIdRef.current;
    const tabSnapshot = getTabById(tabId);

    if (!tabSnapshot) return;

    if (isTranslatingRef.current && translationSessionRef.current.tabId && translationSessionRef.current.tabId !== tabId) {
      alert('Another tab is currently translating. Stop it before starting translation in this tab.');
      return;
    }

    if (!tabSnapshot.inputText.trim()) {
      alert('Please enter or upload text to translate');
      return;
    }

    if (tabSnapshot.chapters.length === 0) {
      alert('No chapters detected. Please ensure text is analyzed.');
      return;
    }

    const startRange = argRangeStart > 0 ? argRangeStart : rangeStart;
    const endRange = argRangeEnd > 0 ? argRangeEnd : rangeEnd;

    let startFrom = chapterIndex || 0;
    let endAt = tabSnapshot.chapters.length;
    let chunkStartIndex = Math.max(0, argChunkIndex || 0);

    if (mode === 'single') {
      startFrom = Math.max(0, chapterIndex);
      endAt = Math.min(tabSnapshot.chapters.length, startFrom + 1);
    } else if (mode === 'next') {
      startFrom = Math.max(0, tabSnapshot.selectedChapter || 0);
      endAt = Math.min(tabSnapshot.chapters.length, startFrom + 1);
    } else if (mode === 'range') {
      const requestedStart = Math.max(0, startRange - 1);
      const requestedEnd = Math.min(tabSnapshot.chapters.length, endRange);
      startFrom = chapterIndex > 0 ? chapterIndex : requestedStart;
      endAt = requestedEnd;
    }

    if (startFrom >= tabSnapshot.chapters.length || startFrom >= endAt) {
      alert('No more chapters to translate');
      return;
    }

    const sessionMode = mode === 'next' ? 'all' : mode;
    const totalWorkChapters = Math.max(1, endAt - startFrom);

    translationSessionRef.current = {
      tabId,
      mode: sessionMode,
      currentIndex: startFrom,
      currentChunkIndex: chunkStartIndex,
      rangeStart: startRange,
      rangeEnd: endRange
    };

    if (sessionMode === 'all' && startFrom === 0 && chunkStartIndex === 0) {
      setRollingGlossary([]);
    }

    updateTab(tabId, (t) => ({
      ...t,
      isTranslating: true,
      sourceFocus: createSourceFocusState(),
      chunkIssue: createChunkIssueState(),
      resume: createResumeState({
        mode: sessionMode,
        chapterIndex: startFrom,
        chunkIndex: chunkStartIndex,
        rangeStart: startRange,
        rangeEnd: endRange,
        hasCheckpoint: true
      }),
      progress: {
        current: startFrom,
        total: totalWorkChapters,
        percent: t.progress?.percent || 0
      }
    }));

    isTranslatingRef.current = true;

    let previousContext = '';
    if (enableContextMemory && tabSnapshot.outputText) {
      previousContext = tabSnapshot.outputText.slice(-contextMemorySize);
    }

    let handedOffToRetry = false;
    let completed = false;

    try {
      for (let i = startFrom; i < endAt; i++) {
        if (!isTranslatingRef.current) break;

        const liveTab = getTabById(tabId);
        if (!liveTab) break;

        const chapter = liveTab.chapters[i];
        if (!chapter) continue;

        const isLong = longOutputMode && chapter.charCount > longOutputThreshold;
        const chunkSpans = splitTextIntoChunkSpans(chapter.content);
        let startChunk = 0;

        if (i === startFrom) {
          if (chunkStartIndex > 0) {
            startChunk = chunkStartIndex;
          } else if (mode === 'next' && liveTab.resume?.hasCheckpoint && liveTab.resume.chapterIndex === i) {
            startChunk = liveTab.resume.chunkIndex || 0;
          }
        }

        startChunk = Math.max(0, Math.min(startChunk, chunkSpans.length));
        let translatedChars = 0;
        let chapterOutput = '';

        for (let j = startChunk; j < chunkSpans.length; j++) {
          if (!isTranslatingRef.current) break;

          const chunkContent = chunkSpans[j].content;
          const preprocessMeta = preprocessTextForTranslation(chunkContent);

          translationSessionRef.current.currentIndex = i;
          translationSessionRef.current.currentChunkIndex = j;

          updateTab(tabId, (t) => ({
            ...t,
            resume: createResumeState({
              mode: sessionMode,
              chapterIndex: i,
              chunkIndex: j,
              rangeStart: startRange,
              rangeEnd: endRange,
              hasCheckpoint: true
            }),
            progress: {
              ...t.progress,
              current: i,
              total: totalWorkChapters
            }
          }));

          const updateChunkProgress = (deltaText = '') => {
            translatedChars += deltaText.length;
            const chapterRatio = chapter.charCount > 0 ? Math.min(1, translatedChars / chapter.charCount) : 0;
            const globalPercent = Math.min(100, Math.round(((i - startFrom + chapterRatio) / totalWorkChapters) * 100));

            updateTab(tabId, (t) => ({
              ...t,
              progress: {
                ...t.progress,
                current: i,
                total: totalWorkChapters,
                percent: globalPercent
              }
            }));
          };

          const shouldStream = !['gemini', 'huggingface'].includes(apiProvider);
          let chunkTranslation = '';

          if (shouldStream) {
            chunkTranslation = await callAPI(chunkContent, (chunkText) => {
              updateChunkProgress(chunkText);
              updateTab(tabId, (t) => ({
                ...t,
                streamingText: (t.streamingText || '') + chunkText
              }));
              scrollToBottom(tabId);
            }, true, previousContext, preprocessMeta);
          } else {
            chunkTranslation = await callAPI(chunkContent, null, false, previousContext, preprocessMeta);
            await simulateStreaming(chunkTranslation, (chunkText) => {
              updateChunkProgress(chunkText);
              updateTab(tabId, (t) => ({
                ...t,
                streamingText: (t.streamingText || '') + chunkText
              }));
              scrollToBottom(tabId);
            }, abortControllerRef.current.signal);
          }

          chapterOutput += chunkTranslation;

          updateTab(tabId, (t) => {
            const nextOutput = isLong ? (t.outputText || '') : `${t.outputText || ''}${chunkTranslation}`;
            const nextTemp = isLong ? `${t.tempTranslation || ''}${chunkTranslation}` : t.tempTranslation;

            return {
              ...t,
              outputText: nextOutput,
              tempTranslation: nextTemp,
              streamingText: '',
              resume: createResumeState({
                mode: sessionMode,
                chapterIndex: i,
                chunkIndex: j + 1,
                rangeStart: startRange,
                rangeEnd: endRange,
                hasCheckpoint: true
              })
            };
          });

          translationSessionRef.current.currentChunkIndex = j + 1;
          scrollToBottom(tabId);
        }

        if (!isTranslatingRef.current) break;

        if ((enableContextMemory || apiProvider === 'huggingface') && chapterOutput) {
          const newNames = extractNamesFromTranslation(chapter.content, chapterOutput);
          if (newNames.length > 0) {
            setRollingGlossary((prev) => {
              const updated = [...prev];
              newNames.forEach((name) => {
                if (!updated.some((item) => item.source === name.source)) {
                  updated.push(name);
                }
              });
              return updated.slice(-100);
            });
          }
          previousContext = chapterOutput.slice(-contextMemorySize);
        }

        if (isLong) {
          const safeTitle = chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const tempText = getTabById(tabId)?.tempTranslation || chapterOutput;
          if (tempText) {
            downloadTranslation(tempText, `chapter_${safeTitle}.txt`);
          }
        } else {
          updateTab(tabId, (t) => ({
            ...t,
            outputText: `${t.outputText || ''}\n\n`
          }));
        }

        updateTab(tabId, (t) => ({
          ...t,
          tempTranslation: isLong ? '' : t.tempTranslation,
          streamingText: '',
          selectedChapter: Math.min(i + 1, Math.max(0, t.chapters.length - 1)),
          progress: {
            ...t.progress,
            current: i + 1
          },
          resume: createResumeState({
            mode: sessionMode,
            chapterIndex: i + 1,
            chunkIndex: 0,
            rangeStart: startRange,
            rangeEnd: endRange,
            hasCheckpoint: i + 1 < endAt
          })
        }));

        translationSessionRef.current.currentIndex = i + 1;
        translationSessionRef.current.currentChunkIndex = 0;
        consecutiveErrorsRef.current = 0;
        lastErrorRef.current = '';
      }

      completed = isTranslatingRef.current && translationSessionRef.current.currentIndex >= endAt;
      if (completed) {
        updateTab(tabId, (t) => ({
          ...t,
          sourceFocus: createSourceFocusState(),
          chunkIssue: createChunkIssueState(),
          resume: createResumeState(),
          progress: {
            ...t.progress,
            current: endAt,
            total: totalWorkChapters,
            percent: 100
          }
        }));
      }
    } catch (error) {
      if (error.name !== 'AbortError' && !(error.message || '').includes('aborted')) {
        const errorMsg = error.message || 'Unknown error';
        const normalizedError = errorMsg.toLowerCase();

        const nonRetryableErrors = [
          'api key',
          'invalid api',
          'authentication',
          'unauthorized',
          'forbidden',
          '401',
          '403',
          'quota exceeded',
          'rate limit'
        ];
        const isNonRetryable = nonRetryableErrors.some((term) => normalizedError.includes(term));
        const looksLikePolicy403 = normalizedError.includes('403') && ![
          'api key',
          'invalid api',
          'authentication',
          'unauthorized',
          'forbidden'
        ].some((term) => normalizedError.includes(term));
        const isModerationBlock = isModerationBlockError(errorMsg) || looksLikePolicy403;

        if (lastErrorRef.current === errorMsg) {
          consecutiveErrorsRef.current += 1;
        } else {
          consecutiveErrorsRef.current = 1;
          lastErrorRef.current = errorMsg;
        }

        const canAutoRetry = autoContinueOnError && !isNonRetryable && consecutiveErrorsRef.current < MAX_CONSECUTIVE_ERRORS;

        updateTab(tabId, (t) => ({
          ...t,
          outputText: `${t.outputText || ''}\n\nError: ${errorMsg}${canAutoRetry ? ' (Auto-retrying...)' : ''}`
        }));
        scrollToBottom(tabId);

        if (canAutoRetry) {
          const retryDelay = Math.min(5000, 1000 * Math.pow(2, consecutiveErrorsRef.current - 1));

          updateTab(tabId, (t) => ({
            ...t,
            outputText: `${t.outputText || ''}\nRetrying in ${retryDelay / 1000}s... (Attempt ${consecutiveErrorsRef.current}/${MAX_CONSECUTIVE_ERRORS})`
          }));

          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          if (autoContinueOnError) {
            const session = translationSessionRef.current;
            if (session.tabId === tabId) {
              handedOffToRetry = true;
              isTranslatingRef.current = true;
              updateTab(tabId, { isTranslating: true });
              translateText(
                session.mode,
                session.currentIndex,
                session.rangeStart,
                session.rangeEnd,
                session.currentChunkIndex,
                session.tabId
              );
              return;
            }
          }
        } else if (isNonRetryable) {
          const session = translationSessionRef.current;
          const retryResume = createResumeState({
            mode: session.mode || sessionMode,
            chapterIndex: Math.max(0, session.currentIndex || 0),
            chunkIndex: Math.max(0, session.currentChunkIndex || 0),
            rangeStart: session.rangeStart || startRange,
            rangeEnd: session.rangeEnd || endRange,
            hasCheckpoint: true
          });

          translationSessionRef.current.currentIndex = retryResume.chapterIndex;
          translationSessionRef.current.currentChunkIndex = retryResume.chunkIndex;
          const issueMessage = isModerationBlock
            ? 'Provider safety policy blocked this chunk. Retry this chunk or skip to the next chunk.'
            : 'This chunk failed and needs manual action. Retry this chunk or skip to the next chunk.';

          updateTab(tabId, (t) => ({
            ...t,
            outputText: `${t.outputText || ''}\n${issueMessage}`,
            resume: retryResume,
            progress: {
              ...t.progress,
              current: retryResume.chapterIndex
            }
          }));
          applyChunkFocus(tabId, retryResume, issueMessage, isModerationBlock);

          consecutiveErrorsRef.current = 0;
          lastErrorRef.current = '';
        } else if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          const session = translationSessionRef.current;
          const retryResume = createResumeState({
            mode: session.mode || sessionMode,
            chapterIndex: Math.max(0, session.currentIndex || 0),
            chunkIndex: Math.max(0, session.currentChunkIndex || 0),
            rangeStart: session.rangeStart || startRange,
            rangeEnd: session.rangeEnd || endRange,
            hasCheckpoint: true
          });
          const pauseMessage = `Auto-continue paused after ${MAX_CONSECUTIVE_ERRORS} failed retries. Retry this chunk or skip to the next chunk.`;

          updateTab(tabId, (t) => ({
            ...t,
            outputText: `${t.outputText || ''}\n${pauseMessage}`,
            resume: retryResume
          }));
          applyChunkFocus(tabId, retryResume, pauseMessage);
          consecutiveErrorsRef.current = 0;
          lastErrorRef.current = '';
        }
      }
    } finally {
      if (!handedOffToRetry) {
        updateTab(tabId, (t) => ({
          ...t,
          isTranslating: false,
          streamingText: ''
        }));
      }
      scrollToBottom(tabId);
    }
  };
  const downloadTranslation = (text = activeTab.outputText, filename = null) => {
    // Generate filename from uploaded file if available
    let finalFilename = filename;
    if (!finalFilename && activeTab.uploadedFileName) {
      // Remove extension and add _translation
      const nameWithoutExt = activeTab.uploadedFileName.replace(/\.[^/.]+$/, '');
      finalFilename = `${nameWithoutExt}_translation.txt`;
    } else if (!finalFilename) {
      finalFilename = 'translation.txt';
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearTranslation = () => {
    if (window.confirm('Are you sure you want to clear the translation output?')) {
      updateActiveTab({
        outputText: '',
        tempTranslation: '',
        streamingText: '',
        progress: { current: 0, total: 0, percent: 0 },
        resume: createResumeState(),
        sourceFocus: createSourceFocusState(),
        chunkIssue: createChunkIssueState()
      });
    }
  };

  const activeResume = activeTab.resume || createResumeState();
  const hasResumePoint = !!activeResume.hasCheckpoint && !activeTab.isTranslating;
  const canSkipChunk = hasResumePoint;
  const continueChapterLabel = activeResume.chapterIndex + 1;
  const chunkIssueMessage = activeTab.chunkIssue?.hasIssue ? activeTab.chunkIssue.message : '';

  const handleContinue = () => {
    if (activeResume.hasCheckpoint) {
      applyChunkFocus(activeTabId, activeResume, chunkIssueMessage, !!activeTab.chunkIssue?.isRestricted);
      translateText(
        activeResume.mode || 'all',
        activeResume.chapterIndex || 0,
        activeResume.rangeStart || rangeStart,
        activeResume.rangeEnd || rangeEnd,
        activeResume.chunkIndex || 0,
        activeTabId
      );
      return;
    }

    translateText('all', activeTab.progress.current || 0, rangeStart, rangeEnd, 0, activeTabId);
  };

  const handleSkipChunk = () => {
    if (!activeResume.hasCheckpoint) return;

    const nextResume = buildNextChunkResume(activeTab, activeResume);
    if (!nextResume.hasCheckpoint) {
      updateActiveTab({
        resume: createResumeState(),
        sourceFocus: createSourceFocusState(),
        chunkIssue: createChunkIssueState(),
        outputText: `${activeTab.outputText || ''}\nReached the end of the current translation scope after skipping the chunk.`
      });
      return;
    }

    updateActiveTab({
      resume: nextResume,
      chunkIssue: createChunkIssueState()
    });

    applyChunkFocus(activeTabId, nextResume, 'Skipped to the next chunk. Review this chunk, then continue.');
    translateText(
      nextResume.mode || 'all',
      nextResume.chapterIndex,
      nextResume.rangeStart,
      nextResume.rangeEnd,
      nextResume.chunkIndex,
      activeTabId
    );
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_62%)]" />

      <div className="relative z-10 m-3 flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-950 max-md:m-0 max-md:rounded-none">
        <Sidebar
          apiProvider={apiProvider}
          setApiProvider={setApiProvider}
          setModel={setModel}
          model={model}
          apiKey={apiKey}
          setApiKey={setApiKey}
          language={language}
          setLanguage={setLanguage}
          chapterDetection={chapterDetection}
          setChapterDetection={setChapterDetection}
          charsPerChapter={charsPerChapter}
          setCharsPerChapter={setCharsPerChapter}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
          glossary={glossary}
          setGlossary={setGlossary}
          enableContextMemory={enableContextMemory}
          setEnableContextMemory={setEnableContextMemory}
          contextMemorySize={contextMemorySize}
          setContextMemorySize={setContextMemorySize}
          autoGlossary={autoGlossary}
          setAutoGlossary={setAutoGlossary}
          user={user}
        />

        <main className="relative flex h-full flex-1 flex-col overflow-hidden max-md:min-h-0">
          <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <Header
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              uploadedFileName={activeTab.uploadedFileName}
              clearUploadedFile={clearUploadedFile}
              clearAll={clearAll}
              downloadTranslation={downloadTranslation}
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
              isInline={true}
            />
          </div>

        <TranslationPanel
          tabs={tabs}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
            addTab={addTab}
            closeTab={closeTab}
            inputText={activeTab.inputText}
            setInputText={(text) => updateActiveTab({ inputText: text })}
            setWordCount={(count) => updateActiveTab({ wordCount: count })}
            analyzeText={analyzeText}
            wordCount={activeTab.wordCount}
            isTranslating={activeTab.isTranslating}
            outputRef={outputRef}
            outputText={activeTab.outputText}
            streamingText={activeTab.streamingText}
          clearTranslation={clearTranslation}
          selectedChapter={activeTab.selectedChapter}
          chapters={activeTab.chapters}
          sourceFocus={activeTab.sourceFocus}
        />

        <Footer
          chapters={activeTab.chapters}
          selectedChapter={activeTab.selectedChapter}
          setSelectedChapter={(idx) => updateActiveTab({
            selectedChapter: idx,
            sourceFocus: createSourceFocusState()
          })}
          isTranslating={activeTab.isTranslating}
          translateText={translateText}
          stopTranslation={stopTranslation}
          progress={activeTab.progress}
          onContinue={handleContinue}
          canContinue={hasResumePoint}
          onSkipChunk={handleSkipChunk}
          canSkipChunk={canSkipChunk}
          continueChapterLabel={continueChapterLabel}
          chunkIssueMessage={chunkIssueMessage}
          rangeStart={rangeStart}
          setRangeStart={setRangeStart}
            rangeEnd={rangeEnd}
            setRangeEnd={setRangeEnd}
            autoContinueOnError={autoContinueOnError}
            setAutoContinueOnError={setAutoContinueOnError}
          />
        </main>
      </div>
    </div>
  );
}






