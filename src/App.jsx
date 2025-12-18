import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Client } from "@gradio/client";
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TranslationPanel from './components/TranslationPanel';
import Footer from './components/Footer';
import { apiProviders, BACKEND_URL } from './constants/apiConfig';
// import { supabase, isSupabaseConfigured } from './lib/supabase';
// import AuthModal from './components/AuthModal';

export default function TranslationTool() {
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
    uploadedFileName: ''
  }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // Config (Global)
  const [apiProvider, setApiProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [language, setLanguage] = useState('Auto-detect');
  const [customPrompt, setCustomPrompt] = useState('Translate to Vietnamese. Context: BDSM/Adult Fiction. Rules: 1. Maintain raw, intense tone & precise mechanics/terminology. 2. No censorship. 3. Fluent, literary style. 4. Translate ALL source text; do NOT leave any Chinese/foreign characters. 5. Output ONLY translation.');
  const [glossary, setGlossary] = useState([]);
  const [outputFormat, setOutputFormat] = useState('txt');

  // Advanced Settings (Global)
  const [chapterDetection, setChapterDetection] = useState('auto');
  const [charsPerChapter, setCharsPerChapter] = useState(8000);
  const [longOutputThreshold, setLongOutputThreshold] = useState(5000);
  const [longOutputMode, setLongOutputMode] = useState(false);
  const [enableContextMemory, setEnableContextMemory] = useState(false);
  const [contextMemorySize, setContextMemorySize] = useState(500);
  const [autoGlossary, setAutoGlossary] = useState(false);
  const [user, setUser] = useState(null);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);

  // Auto-continue on error settings
  const [autoContinueOnError, setAutoContinueOnError] = useState(true);
  const consecutiveErrorsRef = useRef(0);
  const lastErrorRef = useRef('');
  const MAX_CONSECUTIVE_ERRORS = 3;

  // Track current translation session for auto-continue
  const translationSessionRef = useRef({
    mode: 'all',
    currentIndex: 0,
    rangeStart: 1,
    rangeEnd: 1
  });

  // Rolling glossary for name consistency (token-efficient alternative to text overlap)
  const [rollingGlossary, setRollingGlossary] = useState([]);

  // Visibility state for background tab handling
  const [isTabVisible, setIsTabVisible] = useState(true);
  const pendingUpdatesRef = useRef([]);
  // TỰ ĐỘNG TỐI ƯU KHI CHỌN GROK
  useEffect(() => {
    if (apiProvider === 'grok') {
      // Tăng chunk size lên max (Grok-4-fast có context 128k–256k tokens)
      // Tăng chunk size vừa phải (Grok context lớn nhưng output limit vẫn có hạn)
      // 30000 ký tự ~ 7500 tokens output -> An toàn với limit 8192 tokens của Grok
      if (charsPerChapter < 30000) {
        setCharsPerChapter(30000);
      }
      // Bật memory + cache để rẻ hơn 75%
      if (!enableContextMemory) {
        setEnableContextMemory(true);
      }
      // Tăng context memory cho truyện dài (100k+ ký tự)
      // 1000 chars (~250 tokens) là mức cân bằng tốt nhất cho GIÁ RẺ và ĐỦ CONTEXT
      // 4000 chars sẽ tốn thêm ~1000 tokens mỗi chunk (lặp lại), không tối ưu về chi phí
      if (contextMemorySize < 1000) {
        setContextMemorySize(1000);
      }
      setAutoGlossary(false);
    }
    // TỰ ĐỘNG TỐI ƯU KHI CHỌN DEEPSEEK
    // DeepSeek V3.2: Max output 8K tokens (default 4K), context 128K
    if (apiProvider === 'deepseek') {
      // 10000 ký tự ~ 3500 tokens input -> ~5000 tokens output (với 1.4x inflation)
      // An toàn trong giới hạn 8K max output của deepseek-chat
      setCharsPerChapter(10000);
      // Bật context memory để tận dụng cache (giảm 74% chi phí input)
      setEnableContextMemory(true);
      // 1000 chars (~250 tokens) - đủ context cho DeepSeek, tối ưu chi phí
      // DeepSeek đã được train tốt trên Chinese nên cần ít context hơn
      setContextMemorySize(1000);
      // Tắt auto glossary để tiết kiệm output tokens
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
      setIsTabVisible(visible);

      if (visible && pendingUpdatesRef.current.length > 0) {
        // Flush pending updates when tab becomes visible
        pendingUpdatesRef.current.forEach(update => update());
        pendingUpdatesRef.current = [];
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fileInputRef = useRef(null);
  const outputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isTranslatingRef = useRef(false);
  const commitBuffer = () => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t;
      return {
        ...t,
        outputText: (t.outputText || '') + (t.streamingText || ''),
        streamingText: ''
      };
    }));
  };
  // Helper to get active tab
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Helper to update active tab
  const updateActiveTab = (updates) => {
    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  };
  // Helper to update specific tab
  const updateTab = (id, updates) => {
    setTabs(prev => prev.map(tab =>
      tab.id === id ? { ...tab, ...updates } : tab
    ));
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

  // Extract character names from translation for rolling glossary (token-efficient)
  // This replaces expensive text overlap while maintaining name consistency
  const extractNamesFromTranslation = useCallback((originalText, translatedText) => {
    const newNames = [];

    // Pattern 1: Detect Chinese names (2-4 characters, common surname patterns)
    const chineseNamePattern = /[\u4e00-\u9fa5]{2,4}/g;
    const chineseNames = [...new Set((originalText.match(chineseNamePattern) || []))];

    // Pattern 2: Detect Vietnamese names in translation (capitalized words that could be names)
    const vietnameseNamePattern = /[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+)*/g;
    const vietnameseNames = [...new Set((translatedText.match(vietnameseNamePattern) || []))];

    // Filter to likely character names (exclude common Vietnamese words)
    const commonVietnamese = ['Hắn', 'Nàng', 'Cô', 'Anh', 'Chị', 'Em', 'Người', 'Chúng', 'Họ', 'Đó', 'Này', 'Kia', 'Nếu', 'Nhưng', 'Vậy', 'Thì', 'Được', 'Không', 'Có', 'Là', 'Và', 'Của', 'Trong', 'Với', 'Cho', 'Đến', 'Từ', 'Khi', 'Nếu', 'Mà', 'Như', 'Cũng', 'Để', 'Đã', 'Sẽ', 'Đang', 'Rằng', 'Vì', 'Bởi', 'Nên', 'Sau', 'Trước'];
    const filteredVietnamese = vietnameseNames.filter(name =>
      !commonVietnamese.includes(name) &&
      name.length >= 2 &&
      !rollingGlossary.some(g => g.target === name)
    );

    // Try to match Chinese names with Vietnamese translations by position/frequency
    // This is a heuristic - the AI's explicit glossary output is more reliable
    // But this provides a fallback for consistency
    chineseNames.slice(0, 10).forEach((chName, i) => {
      if (filteredVietnamese[i] && !rollingGlossary.some(g => g.source === chName)) {
        newNames.push({ source: chName, target: filteredVietnamese[i] });
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
    const newId = `tab-${Date.now()}`;
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
      uploadedFileName: ''
    }]);
    setActiveTabId(newId);
  };

  const closeTab = (id, e) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close last tab

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
      wordCount: 0,
      chapters: [],
      showChapterPreview: false,
      selectedChapter: 0,
      uploadedFileName: ''
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
    updateActiveTab({ isTranslating: false });
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
    if (/[\u4e00-\u9fa5]/.test(sample)) return 'Chinese (中文)';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) return 'Japanese (日本語)';
    if (/[\uac00-\ud7af]/.test(sample)) return 'Korean (한국어)';
    if (/[а-яА-ЯёЁ]/.test(sample)) return 'Russian (Русский)';
    if (/[à-ỹÀ-Ỹ]/.test(sample)) return 'Vietnamese (Tiếng Việt)';
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
        const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]+/g) || [paragraph];

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
              searchWindow.lastIndexOf('。'),
              searchWindow.lastIndexOf('.'),
              searchWindow.lastIndexOf('！'),
              searchWindow.lastIndexOf('!'),
              searchWindow.lastIndexOf('？'),
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
        /(?:^|\n)\s*(?:[\d_]+\s*)?第\s*[0-9一二三四五六七八九十百千万]+\s*[章卷].*/g,
        /(?:^|\n)\s*(?:[\d_]+\s*)?第\s*[0-9一二三四五六七八九十百千万]+\s*节.*/g,
        /(?:^|\n)\s*Chapter\s*\d+.*/gi
      ],
      japanese: [
        /(?:^|\n)\s*第[一二三四五六七八九十百千万\d]+章[^\n]*/g,
        /(?:^|\n)\s*第[一二三四五六七八九十百千万\d]+話[^\n]*/g,
        /(?:^|\n)\s*[０-９0-9]+章[^\n]*/g,
        /(?:^|\n)\s*[０-９0-9]+話[^\n]*/g
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
          } catch (e) {
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

  const scrollToBottom = () => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  const callAPI = async (text, onChunk = null, stream = true, previousContext = null) => {
    const provider = apiProviders[apiProvider];
    // Skip API key check for backend providers (keys are server-side) or providers that don't require it
    if (!provider?.useBackend && provider?.requiresKey !== false && !apiKey.trim()) {
      throw new Error('Please enter your API key');
    }

    // Abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // ────────────────────── PROMPT CONSTRUCTION ──────────────────────
    let finalPrompt = customPrompt;

    finalPrompt += '\n\nIMPORTANT: This is part of a larger text. Maintain consistency with the style and terminology you\'ve been using. Do NOT output any "Translating..." text or section headers. Output ONLY the translated text.';

    // Use lightweight glossary context instead of full text (saves ~80% tokens)
    const glossaryContext = buildGlossaryContext();
    if (glossaryContext && enableContextMemory) {
      finalPrompt += `\n\nCHARACTER/TERM NAMES (MUST use these exact translations):\n${glossaryContext}\n\nIMPORTANT: You MUST use the exact name translations listed above. Do NOT create alternative translations for the same characters.`;
    }

    if (previousContext && enableContextMemory) {
      // Fallback to old method if no glossary built yet (first chunk only)
      finalPrompt += `\n\nPREVIOUS CONTEXT (For continuity of names and style):\n${previousContext}\n\nEND OF CONTEXT\n\nIMPORTANT: You must maintain strict consistency with the names used in the PREVIOUS CONTEXT. If a character was called "Tiểu Lam" previously, do NOT switch to "Xiao Lan". Use the same naming convention.`;
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

    // ────────────────────── BACKEND API CALL (Server-side keys) ──────────────────────
    if (provider?.useBackend) {
      try {
        console.log('[Backend] Starting request to:', `${BACKEND_URL}/api/translate/${apiProvider}`);
        console.log('[Backend] Request payload size:', text?.length, 'chars');

        const response = await fetch(`${BACKEND_URL}/api/translate/${apiProvider}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            prompt: finalPrompt,
            text: text
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

        // Simulate streaming for UX (chunk the text)
        if (onChunk && fullText) {
          const sentences = fullText.split(/([.!?。！？\n])/).filter(s => s.trim());
          for (let i = 0; i < sentences.length; i++) {
            if (signal.aborted) break;
            onChunk(sentences[i]);
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        return fullText;
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error(`Backend: ${error.message}`);
      }
    }

    // ────────────────────── LEGACY: Direct Browser Calls ──────────────────────
    if (apiProvider === 'huggingface') {
      // Legacy support for specific Gradio Space
      if (model.includes('doof-ferb')) {
        const { Client } = await import('@gradio/client');
        const client = await Client.connect("doof-ferb/hirashiba-mt-zh-vi", {
          hf_token: apiKey.trim() || undefined
        });

        let processedText = text;
        // Simple pre-processing for HF MT model
        glossary.forEach(term => {
          if (term.source && term.target) {
            processedText = processedText.split(term.source).join(term.target);
          }
        });

        const result = await client.predict(1, [processedText]);
        const translatedText = result.data[0];

        if (onChunk) onChunk(translatedText);
        return translatedText;
      } else {
        // Generic Hugging Face Inference API using HfInference
        // We import from CDN to avoid build issues with node-only packages if any
        const { HfInference } = await import('https://esm.sh/@huggingface/inference');
        const hf = new HfInference(apiKey);

        try {
          // Internal chunking for HF models (max ~512 tokens)
          // We split by sentences or just fixed length to be safe
          const MAX_CHUNK_SIZE = 500;
          let chunks = [];

          if (text.length > MAX_CHUNK_SIZE) {
            // Split by sentence endings first
            const sentences = text.match(/[^.!?。！？]+[.!?。！？]+/g) || [text];
            let currentChunk = '';

            for (const sentence of sentences) {
              if ((currentChunk + sentence).length <= MAX_CHUNK_SIZE) {
                currentChunk += sentence;
              } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = sentence;
                // If a single sentence is too long, force split it
                while (currentChunk.length > MAX_CHUNK_SIZE) {
                  chunks.push(currentChunk.slice(0, MAX_CHUNK_SIZE));
                  currentChunk = currentChunk.slice(MAX_CHUNK_SIZE);
                }
              }
            }
            if (currentChunk) chunks.push(currentChunk);
          } else {
            chunks = [text];
          }

          let finalTranslatedText = '';

          for (const chunk of chunks) {
            if (!chunk.trim()) continue;

            // Try translation task
            let chunkResult = '';
            try {
              const result = await hf.translation({
                model: model,
                inputs: chunk
              });

              if (Array.isArray(result)) {
                chunkResult = result[0]?.translation_text || result[0]?.generated_text || JSON.stringify(result);
              } else {
                chunkResult = result.translation_text || result.generated_text || JSON.stringify(result);
              }
            } catch (err) {
              // Fallback to text generation
              if (err.message.includes('Task not supported') || err.message.includes('does not support')) {
                const result = await hf.textGeneration({
                  model: model,
                  inputs: chunk,
                  parameters: { max_new_tokens: 1024 }
                });
                chunkResult = result.generated_text;
              } else {
                throw err;
              }
            }

            finalTranslatedText += chunkResult + ' ';
            // Optional: Update progress for long chunks? 
            // For now, just stream the result as we get it
            if (onChunk) onChunk(chunkResult + ' ');
          }

          return finalTranslatedText.trim();

        } catch (err) {
          throw err;
        }
      }
    }

    // Google Translate (Direct browser call - works only in local development due to CORS)
    if (apiProvider === 'google_translate') {
      // Warn if on production
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocalhost) {
        throw new Error('Google Translate only works in local development (localhost). Use AI providers for production.');
      }

      const chunks = smartChunkText(text, 1500, 0); // Smaller chunks for URL limit
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

      return finalTranslatedText.trim();
    }

    // Gemini - ALWAYS non-stream
    if (apiProvider === 'gemini') {
      const bodyData = {
        contents: [{
          parts: [{ text: `${finalPrompt}\n\nText to translate:\n${text}` }]
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
      return fullText;
    }

    // Anthropic (user key)
    if (apiProvider === 'anthropic') {
      const bodyData = {
        model: model,
        max_tokens: 4096,
        stream: stream,
        messages: [{
          role: 'user',
          content: `${finalPrompt}\n\nText to translate:\n${text}`
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
        await processStream(response, onChunk, (err) => { throw err; }, 'claude', signal);
        return '';
      } else {
        const data = await response.json();
        return data.content[0].text;
      }
    }

    // ────────────────────── DEEPSEEK (via Netlify proxy to avoid CORS) ──────────────────────
    if (apiProvider === 'deepseek') {
      const proxyResponse = await fetch('/.netlify/functions/deepseek-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey,
          model: model,
          messages: [
            { role: 'system', content: finalPrompt },
            { role: 'user', content: `Text to translate:\n${text}` }
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

      return processGlossary(fullText);
    }

    // ────────────────────── GROK + OPENAI + GROQ + OPENROUTER + LOCAL (TỐI ƯU HOÀN HẢO) ──────────────────────
    const isGrok = apiProvider === 'grok';
    const isOpenAICompatible = ['openai', 'grok', 'groq', 'openrouter', 'local'].includes(apiProvider);

    const bodyData = {
      model: model,
      messages: (apiProvider === 'local') ? [
        { role: 'user', content: `### Instruction:\nYou are a professional translator. Translate the following text into Vietnamese.\n\n${finalPrompt}\n\n### Input Text:\n${text}\n\n### Response (Vietnamese Translation):` }
      ] : [
        { role: 'system', content: finalPrompt },
        { role: 'user', content: `Text to translate:\n${text}` }
      ],
      max_tokens: 8192,
      temperature: 0.3,
      stream: stream,
      // ─── LOCAL MODEL: Quality control to prevent repetition/garbage ───
      ...(apiProvider === 'local' && {
        repeat_penalty: 1.15,        // Penalize repetition
        top_p: 0.9,                  // Nucleus sampling
        frequency_penalty: 0.3,      // Reduce word frequency
        presence_penalty: 0.3,       // Encourage diverse vocabulary
        stop: ['### Input', '###', '\n\n\n', '---'],  // Stop sequences
      }),
      // ─── CHỈ GROK CÓ: Rẻ hơn 75% + Auto-glossary siêu mạnh ───
      ...(isGrok && {
        // Cache prompt → chỉ tính tiền input 1 lần cho các chunk tiếp theo
        cache_prompt: enableContextMemory === true,

        // Auto extract glossary bằng tool calls -> DISABLED to prevent truncation bug
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

    // ────────────────────── STREAMING (hỗ trợ Grok tool calls) ──────────────────────
    if (stream && onChunk) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
                  } catch (e) { }
                }
              });
            }

            // CONTENT – LUÔN GỬI, KHÔNG BỎ SÓT
            const content = delta.content || '';
            if (content) onChunk(content);

          } catch (e) { }
        }
      }

      // FORCE COMMIT SAU KHI XONG 1 CHUNK
      commitBuffer();
      return ''; // streaming hoàn tất
    }

    // ────────────────────── NON-STREAM (fallback) ──────────────────────
    const data = await response.json();

    // Xử lý tool calls trong non-stream
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
        } catch (e) { /* ignore */ }
      }
    }

    return data.choices?.[0]?.message?.content?.trim() || '';
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
        const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]+["']?|.+$/g) || [paragraph];
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

  const translateText = async (mode = 'all', chapterIndex = 0, argRangeStart = 0, argRangeEnd = 0) => {
    if (!activeTab.inputText.trim()) {
      alert('Please enter or upload text to translate');
      return;
    }

    if (activeTab.chapters.length === 0) {
      alert('No chapters detected. Please ensure text is analyzed.');
      return;
    }


    updateActiveTab({ isTranslating: true });
    isTranslatingRef.current = true;

    // Track session for auto-continue
    translationSessionRef.current = {
      mode: mode,
      currentIndex: chapterIndex,
      rangeStart: argRangeStart > 0 ? argRangeStart : rangeStart,
      rangeEnd: argRangeEnd > 0 ? argRangeEnd : rangeEnd
    };

    // Reset rolling glossary for new translation session (keeps user glossary)
    if (mode === 'all' || (mode === 'range' && (argRangeStart <= 1 || rangeStart <= 1))) {
      setRollingGlossary([]);
    }

    try {
      if (mode === 'single') {
        updateActiveTab({ progress: { current: 1, total: 1, percent: 0 } });
        const chapter = activeTab.chapters[chapterIndex];

        const chapterHeader = `\n\n${'='.repeat(60)}\n${chapter.title} (${chapter.charCount} chars)\n${'='.repeat(60)}\n\n`;
        const isLong = longOutputMode && chapter.charCount > longOutputThreshold;

        updateActiveTab({ tempTranslation: '' });

        let translatedChars = 0;
        const updateProgress = (chunk = '') => {
          translatedChars += chunk.length;
          const percent = Math.min(100, Math.round((translatedChars / chapter.charCount) * 100));
          setTabs(prev => prev.map(t =>
            t.id === activeTabId ? { ...t, progress: { ...t.progress, percent } } : t
          ));
        };

        let translation = '';
        try {
          const chunks = splitTextIntoChunks(chapter.content);

          for (const chunkContent of chunks) {
            if (!isTranslatingRef.current) break;

            if (apiProvider === 'gemini' || apiProvider === 'huggingface') {
              const chunkTranslation = await callAPI(chunkContent, null, false);
              translation += chunkTranslation;

              // Simulate streaming for UX
              await simulateStreaming(chunkTranslation, (chunk) => {
                updateProgress(chunk);
                setTabs(prev => prev.map(t => {
                  if (t.id !== activeTabId) return t;
                  if (!isLong) {
                    return { ...t, streamingText: (t.streamingText || '') + chunk };
                  } else {
                    return { ...t, tempTranslation: (t.tempTranslation || '') + chunk };
                  }
                }));
                if (!isLong) scrollToBottom();
              }, abortControllerRef.current.signal);

            } else {
              // STREAMING LOGIC - MEMORY OPTIMIZED
              // Capture the full text from callAPI even if streaming
              const chunkTranslation = await callAPI(chunkContent, (chunk) => {
                updateProgress(chunk);
                setTabs(prev => prev.map(t => {
                  if (t.id !== activeTabId) return t;
                  if (!isLong) {
                    return { ...t, streamingText: (t.streamingText || '') + chunk };
                  } else {
                    return { ...t, tempTranslation: (t.tempTranslation || '') + chunk };
                  }
                }));
                if (!isLong) scrollToBottom();
              }, true);

              // Accumulate for integrity
              if (chunkTranslation) {
                translation += chunkTranslation;
              }
            }
          }

          // Clear streaming buffer after all chunks
          setTabs(prev => prev.map(t => {
            if (t.id !== activeTabId) return t;
            return { ...t, streamingText: '' };
          }));

          // If we used real streaming, we need to commit the buffer to outputText
          if (apiProvider !== 'gemini' && apiProvider !== 'huggingface') {
            // COMMIT PHASE - Move streaming buffer to main output
            setTabs(prev => prev.map(t => {
              if (t.id !== activeTabId) return t;

              // Get the text that was streamed (or the fallback translation)
              // For multi-chunk, streamingText has the accumulated chunks
              const chunkText = t.streamingText || '';

              if (!isLong) {
                // Append to main output and CLEAR streaming buffer
                return {
                  ...t,
                  outputText: (t.outputText || '') + chunkText + '\n\n',
                  streamingText: ''
                };
              } else {
                return { ...t, tempTranslation: chunkText }; // tempTranslation is already the buffer for long mode
              }
            }));

            scrollToBottom();

            if (isLong) {
              // For long output mode, we still use tempTranslation
              const safeTitle = chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              downloadTranslation(activeTab.tempTranslation, `chapter_${safeTitle}.txt`);
            }
            updateActiveTab({ tempTranslation: '' });
            return;
          }

        } catch (streamErr) {
          // If aborted, don't retry
          if (streamErr.name === 'AbortError' || (streamErr.message && streamErr.message.includes('aborted'))) {
            updateActiveTab({ isTranslating: false });
            return; // STOP HERE
          }
          // Retry logic for chunks? Too complex for now, just fail or retry whole chapter
          // For now, let's just log and maybe try non-streaming fallback for the whole chapter if possible, 
          // but since we are chunking, fallback is hard.
          console.error("Translation error:", streamErr);
        }

        if (translation) {
          const safeTitle = chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          downloadTranslation(translation, `chapter_${safeTitle}.txt`);
        }
        updateActiveTab({ tempTranslation: '' });

      } else if (mode === 'next') {
        const nextIndex = activeTab.selectedChapter;
        if (nextIndex >= activeTab.chapters.length) {
          alert('No more chapters to translate');
          return;
        }

        updateActiveTab({ progress: { current: 1, total: 1, percent: 0 } });
        const chapter = activeTab.chapters[nextIndex];

        const chapterHeader = `\n\n${'='.repeat(60)}\n${chapter.title} (${chapter.charCount} chars)\n${'='.repeat(60)}\n\n`;
        const isLong = longOutputMode && chapter.charCount > longOutputThreshold;

        updateActiveTab({ tempTranslation: '' });

        let translatedChars = 0;
        const updateProgress = (chunk = '') => {
          translatedChars += chunk.length;
          const percent = Math.min(100, Math.round((translatedChars / chapter.charCount) * 100));
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, progress: { ...t.progress, percent } } : t));
        };

        let translation = '';
        try {
          const chunks = splitTextIntoChunks(chapter.content);

          for (const chunkContent of chunks) {
            if (!isTranslatingRef.current) break;

            if (apiProvider === 'gemini' || apiProvider === 'huggingface') {
              const chunkTranslation = await callAPI(chunkContent, null, false);
              translation += chunkTranslation;

              // Simulate streaming for UX
              await simulateStreaming(chunkTranslation, (chunk) => {
                updateProgress(chunk);
                setTabs(prev => prev.map(t => {
                  if (t.id !== activeTabId) return t;
                  if (!isLong) {
                    return { ...t, streamingText: (t.streamingText || '') + chunk };
                  } else {
                    return { ...t, tempTranslation: (t.tempTranslation || '') + chunk };
                  }
                }));
                if (!isLong) scrollToBottom();
              }, abortControllerRef.current.signal);

            } else {
              // STREAMING LOGIC - MEMORY OPTIMIZED
              const chunkTranslation = await callAPI(chunkContent, (chunk) => {
                updateProgress(chunk);
                setTabs(prev => prev.map(t => {
                  if (t.id !== activeTabId) return t;
                  if (!isLong) {
                    return { ...t, streamingText: (t.streamingText || '') + chunk };
                  } else {
                    return { ...t, tempTranslation: (t.tempTranslation || '') + chunk };
                  }
                }));
                if (!isLong) scrollToBottom();
              }, true);

              if (chunkTranslation) {
                translation += chunkTranslation;
              }
            }
          }

          // Clear streaming buffer after all chunks (for gemini/hf)
          if (apiProvider === 'gemini' || apiProvider === 'huggingface') {
            setTabs(prev => prev.map(t => {
              if (t.id !== activeTabId) return t;
              return { ...t, streamingText: '' };
            }));
          } else {
            // COMMIT PHASE for next (real streaming)
            commitBuffer();
            setTabs(prev => prev.map(t => {
              if (t.id !== activeTabId) return t;
              let chunkText = t.streamingText || '';

              // Process glossary
              chunkText = processGlossary(chunkText);

              if (!isLong) {
                return {
                  ...t,
                  outputText: (t.outputText || '') + chunkText + '\n\n',
                  streamingText: ''
                };
              } else {
                return { ...t, tempTranslation: chunkText };
              }
            }));

            // Post-stream logic for next
            setTabs(prev => prev.map(t => {
              if (t.id !== activeTabId) return t;
              if (isLong && t.tempTranslation) {
                const safeTitle = chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                downloadTranslation(t.tempTranslation, `chapter_${safeTitle}.txt`);
              }
              return { ...t, tempTranslation: '', selectedChapter: nextIndex + 1 };
            }));
            return;
          }

        } catch (streamErr) {
          // If aborted, don't retry
          if (streamErr.name === 'AbortError' || (streamErr.message && streamErr.message.includes('aborted'))) {
            updateActiveTab({ isTranslating: false });
            return; // STOP HERE
          }
          console.error("Translation error:", streamErr);
        }

        if (translation) {
          // Process glossary
          translation = processGlossary(translation);

          updateProgress(translation);
          setTabs(prev => prev.map(t => {
            if (t.id !== activeTabId) return t;
            if (!isLong) {
              return { ...t, outputText: t.outputText + translation + '\n\n' };
            } else {
              return { ...t, tempTranslation: translation };
            }
          }));
          scrollToBottom();
        }

        if (isLong) {
          const safeTitle = chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          downloadTranslation(translation, `chapter_${safeTitle}.txt`);
        }
        updateActiveTab({ tempTranslation: '', selectedChapter: nextIndex + 1 });

      } else {
        // Translate All OR Range
        let startFrom = 0;
        let endAt = activeTab.chapters.length;

        if (mode === 'range') {
          // Use arguments if provided, otherwise fallback to state
          const start = argRangeStart > 0 ? argRangeStart : rangeStart;
          const end = argRangeEnd > 0 ? argRangeEnd : rangeEnd;

          // If chapterIndex is provided (from auto-continue), use it as startFrom
          // Otherwise calculate from rangeStart
          if (chapterIndex > 0) {
            startFrom = chapterIndex; // Resume from this chapter
          } else {
            startFrom = Math.max(0, start - 1);
          }
          endAt = Math.min(activeTab.chapters.length, end);
        } else {
          // 'all' mode, but check for continue
          startFrom = chapterIndex || 0;
        }

        if (startFrom === 0 && mode !== 'range') {
          updateActiveTab({ progress: { current: 0, total: activeTab.chapters.length, percent: 0 } });
        } else if (mode === 'range') {
          updateActiveTab({ progress: { current: 0, total: endAt - startFrom, percent: 0 } });
        }

        let previousContext = '';

        for (let i = startFrom; i < endAt; i++) {
          if (!isTranslatingRef.current) break; // Check stop flag

          // Track current position for auto-continue
          translationSessionRef.current.currentIndex = i;

          const chapter = activeTab.chapters[i];
          // Update progress current chapter
          // setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, progress: { ...t.progress, current: i + 1, total: t.chapters.length, percent: 0 } } : t));

          const chapterHeader = `\n\n${'='.repeat(60)}\n${chapter.title} (${chapter.charCount} chars)\n${'='.repeat(60)}\n\n`;
          const isLong = longOutputMode && chapter.charCount > longOutputThreshold;

          updateActiveTab({ tempTranslation: '' });

          let translatedChars = 0;
          const updateProgress = (chunk = '') => {
            translatedChars += chunk.length;
            // Calculate global percent: (completed chapters + current chapter progress) / total chapters
            const currentChapterPercent = Math.min(100, (translatedChars / chapter.charCount));
            const globalPercent = Math.min(100, Math.round(((i + currentChapterPercent) / activeTab.chapters.length) * 100));

            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, progress: { ...t.progress, current: i + 1, percent: globalPercent } } : t));
          };

          try {
            const chunks = splitTextIntoChunks(chapter.content);

            for (const chunkContent of chunks) {
              if (!isTranslatingRef.current) break;

              if (apiProvider === 'gemini' || apiProvider === 'huggingface') {
                const chunkTranslation = await callAPI(chunkContent, null, false, previousContext);
                // Simulate streaming for UX
                await simulateStreaming(chunkTranslation, (chunk) => {
                  updateProgress(chunk);
                  setTabs(prev => prev.map(t => {
                    if (t.id !== activeTabId) return t;
                    if (!isLong) {
                      return { ...t, streamingText: (t.streamingText || '') + chunk };
                    } else {
                      return { ...t, tempTranslation: (t.tempTranslation || '') + chunk };
                    }
                  }));
                  if (!isLong) scrollToBottom();
                }, abortControllerRef.current.signal);

                // Add to output
                setTabs(prev => prev.map(t => {
                  if (t.id !== activeTabId) return t;
                  if (!isLong) {
                    return { ...t, outputText: (t.outputText || '') + t.streamingText + '\n\n', streamingText: '' };
                  } else {
                    return { ...t, tempTranslation: t.tempTranslation };
                  }
                }));
              } else {
                // Streaming providers (OpenAI, Grok, Anthropic, DeepSeek)
                await callAPI(chunkContent, (chunk) => {
                  updateProgress(chunk);
                  setTabs(prev => prev.map(t => {
                    if (t.id !== activeTabId) return t;
                    if (!isLong) {
                      return { ...t, streamingText: (t.streamingText || '') + chunk };
                    } else {
                      return { ...t, tempTranslation: (t.tempTranslation || '') + chunk };
                    }
                  }));
                  if (!isLong) scrollToBottom();
                }, true, previousContext);

                commitBuffer();
                // Add to output
                setTabs(prev => prev.map(t => {
                  if (t.id !== activeTabId) return t;
                  if (!isLong) {
                    return { ...t, outputText: (t.outputText || '') + t.streamingText + '\n\n', streamingText: '' };
                  } else {
                    return { ...t, tempTranslation: t.tempTranslation };
                  }
                }));
              }
            }

            // Extract names and update rolling glossary (token-efficient context)
            if (enableContextMemory) {
              const fullChapterText = isLong ? activeTab.tempTranslation : (activeTab.outputText || '');
              const newNames = extractNamesFromTranslation(chapter.content, fullChapterText);
              if (newNames.length > 0) {
                setRollingGlossary(prev => {
                  const updated = [...prev];
                  newNames.forEach(name => {
                    if (!updated.some(n => n.source === name.source)) {
                      updated.push(name);
                    }
                  });
                  // Keep only last 100 terms to prevent bloat
                  return updated.slice(-100);
                });
              }
              // Keep configured context usage
              previousContext = fullChapterText.slice(-contextMemorySize);
            }

          } catch (err) {
            if (err.name === 'AbortError' || (err.message && err.message.includes('aborted'))) {
              updateActiveTab({ isTranslating: false });
              consecutiveErrorsRef.current = 0;
              lastErrorRef.current = '';
              return;
            }
            throw err; // Re-throw to be caught by outer catch
          }

          // Reset error counter on successful chunk
          consecutiveErrorsRef.current = 0;
          lastErrorRef.current = '';

          if (isLong) {
            const safeTitle = chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            downloadTranslation(activeTab.tempTranslation, `chapter_${safeTitle}.txt`);
          }

          // Update progress to next chapter
          updateActiveTab({ tempTranslation: '', streamingText: '', progress: { ...activeTab.progress, current: i + 1 } });
        }
      }
    } catch (error) {
      // Don't show error if user aborted
      if (error.name !== 'AbortError' && !error.message.includes('aborted')) {
        const errorMsg = error.message || 'Unknown error';

        // Check if this is a non-retryable error
        const nonRetryableErrors = [
          'API key',
          'Invalid API',
          'authentication',
          'unauthorized',
          'forbidden',
          '401',
          '403',
          'quota exceeded',
          'rate limit'
        ];
        const isNonRetryable = nonRetryableErrors.some(e =>
          errorMsg.toLowerCase().includes(e.toLowerCase())
        );

        // Track consecutive errors
        if (lastErrorRef.current === errorMsg) {
          consecutiveErrorsRef.current++;
        } else {
          consecutiveErrorsRef.current = 1;
          lastErrorRef.current = errorMsg;
        }

        // Display error
        setTabs(prev => prev.map(t => t.id === activeTabId ? {
          ...t,
          outputText: t.outputText + `\n\n⚠️ Error: ${errorMsg}${autoContinueOnError ? ' (Auto-retrying...)' : ''}`
        } : t));
        scrollToBottom();

        // Auto-continue logic
        if (autoContinueOnError && !isNonRetryable && consecutiveErrorsRef.current < MAX_CONSECUTIVE_ERRORS) {
          // Wait a bit before retrying (exponential backoff)
          const retryDelay = Math.min(5000, 1000 * Math.pow(2, consecutiveErrorsRef.current - 1));

          setTabs(prev => prev.map(t => t.id === activeTabId ? {
            ...t,
            outputText: t.outputText + `\nRetrying in ${retryDelay / 1000}s... (Attempt ${consecutiveErrorsRef.current}/${MAX_CONSECUTIVE_ERRORS})`
          } : t));
          scrollToBottom();

          await new Promise(resolve => setTimeout(resolve, retryDelay));

          // Check if still should continue (user might have stopped)
          if (autoContinueOnError) {
            // Resume from where we stopped using session ref
            const session = translationSessionRef.current;
            const resumeIndex = session.currentIndex;

            if (session.mode === 'range') {
              const rangeEndIdx = Math.min(activeTab.chapters.length, session.rangeEnd);
              if (resumeIndex < rangeEndIdx) {
                isTranslatingRef.current = true;
                updateActiveTab({ isTranslating: true });
                translateText('range', resumeIndex, session.rangeStart, session.rangeEnd);
                return;
              }
            } else {
              // 'all' mode
              if (resumeIndex < activeTab.chapters.length) {
                isTranslatingRef.current = true;
                updateActiveTab({ isTranslating: true });
                translateText('all', resumeIndex);
                return;
              }
            }
          }
        } else if (isNonRetryable) {
          setTabs(prev => prev.map(t => t.id === activeTabId ? {
            ...t,
            outputText: t.outputText + `\n❌ Cannot auto-continue: This error requires manual intervention.`
          } : t));
          consecutiveErrorsRef.current = 0;
          lastErrorRef.current = '';
        } else if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          setTabs(prev => prev.map(t => t.id === activeTabId ? {
            ...t,
            outputText: t.outputText + `\n❌ Auto-continue stopped: Same error occurred ${MAX_CONSECUTIVE_ERRORS} times consecutively.`
          } : t));
          consecutiveErrorsRef.current = 0;
          lastErrorRef.current = '';
        }
      }
    } finally {
      updateActiveTab({ isTranslating: false }); // Don't reset progress here to allow resume
      scrollToBottom();
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
      updateActiveTab({ outputText: '', tempTranslation: '', streamingText: '', progress: { current: 0, total: 0, percent: 0 } });
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
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
      // onLoginClick={() => setIsAuthModalOpen(true)}
      // onLogoutClick={handleLogout}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          uploadedFileName={activeTab.uploadedFileName}
          clearUploadedFile={clearUploadedFile}
          clearAll={clearAll}
          downloadTranslation={downloadTranslation}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />

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
        />

        <Footer
          chapters={activeTab.chapters}
          selectedChapter={activeTab.selectedChapter}
          setSelectedChapter={(idx) => updateActiveTab({ selectedChapter: idx })}
          isTranslating={activeTab.isTranslating}
          translateText={translateText}
          stopTranslation={stopTranslation}
          progress={activeTab.progress}
          onContinue={() => translateText('all', activeTab.progress.current)}
          rangeStart={rangeStart}
          setRangeStart={setRangeStart}
          rangeEnd={rangeEnd}
          setRangeEnd={setRangeEnd}
          autoContinueOnError={autoContinueOnError}
          setAutoContinueOnError={setAutoContinueOnError}
        />
      </main>

      {/* AuthModal temporarily disabled */}
      {/* <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
            setUser(user);
            fetchUserSettings(user.id);
        }}
      /> */}
    </div>
  );
}