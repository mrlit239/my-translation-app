import React from 'react';
import { Loader2, Plus, X, Trash2 } from 'lucide-react';

export default function TranslationPanel({
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    inputText,
    setInputText,
    setWordCount,
    analyzeText,
    wordCount,
    isTranslating,
    outputRef,
    outputText,
    streamingText,
    clearTranslation,
    selectedChapter,
    chapters
}) {
    const textareaRef = React.useRef(null);
    const mirrorRef = React.useRef(null);

    // Scroll to chapter when selected
    React.useEffect(() => {
        if (selectedChapter !== undefined && chapters && chapters.length > 0 && textareaRef.current && mirrorRef.current) {
            // Use absolute startIndex if available, otherwise fallback to calculation (legacy support)
            let startIndex = 0;
            let titleLength = 0;

            if (chapters[selectedChapter].startIndex !== undefined) {
                startIndex = chapters[selectedChapter].startIndex;
                titleLength = chapters[selectedChapter].title ? chapters[selectedChapter].title.length : 0;
            } else {
                for (let i = 0; i < selectedChapter; i++) {
                    startIndex += chapters[i].charCount;
                }
                // Fallback title length if not using absolute index (approximate)
                titleLength = chapters[selectedChapter].title ? chapters[selectedChapter].title.length : 10;
            }

            const textarea = textareaRef.current;
            const mirror = mirrorRef.current;

            // 1. Highlight the text
            textarea.focus();
            textarea.setSelectionRange(startIndex, startIndex + titleLength);

            // 2. Robust Scroll Calculation using Mirror Div
            // Sync width to ensure wrapping matches exactly
            mirror.style.width = `${textarea.clientWidth}px`;

            // Copy text up to the start index
            mirror.textContent = inputText.substring(0, startIndex);

            // Measure height
            // scrollHeight of the mirror div gives the height of the text content
            const textHeight = mirror.scrollHeight;

            // Calculate target scroll position
            // Center the target line (approx 1/3 down the screen)
            const targetScrollTop = textHeight - (textarea.clientHeight / 3);

            // Apply scroll
            textarea.scrollTop = Math.max(0, targetScrollTop);

            // Re-focus
            textarea.focus();
        }
    }, [selectedChapter, chapters, inputText]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-200">
            {/* Tab Bar */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-2 pt-2 gap-1 overflow-x-auto">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`
                            group flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-medium cursor-pointer transition-colors min-w-[120px] max-w-[200px]
                            ${activeTabId === tab.id
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t border-x border-slate-200 dark:border-slate-700 shadow-sm relative -mb-px z-10'
                                : 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'}
                        `}
                    >
                        <span className="truncate flex-1">{tab.title}</span>
                        <button
                            onClick={(e) => closeTab(tab.id, e)}
                            className={`p-0.5 rounded-full hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ${tabs.length === 1 ? 'hidden' : ''}`}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                <button
                    onClick={addTab}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors ml-1"
                    title="New Tab"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Input Column */}
                <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-w-0 relative">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source Text</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{wordCount.toLocaleString()} chars</span>
                    </div>

                    {/* Mirror Div for Scroll Calculation */}
                    <div
                        ref={mirrorRef}
                        className="absolute top-0 left-0 invisible pointer-events-none p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words -z-50"
                        aria-hidden="true"
                    />

                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            setWordCount(e.target.value.length);
                            analyzeText(e.target.value);
                        }}
                        className="flex-1 w-full p-6 resize-none outline-none font-mono text-sm text-slate-800 dark:text-slate-200 bg-transparent leading-relaxed"
                        placeholder="Paste text here or upload a file..."
                    />
                </div>

                {/* Output Column */}
                <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 min-w-0">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Translation</span>
                        <div className="flex items-center gap-2">
                            {(outputText || streamingText) && (
                                <button
                                    onClick={clearTranslation}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition-colors"
                                    title="Clear Translation"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {isTranslating && (
                                <span className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                </span>
                            )}
                        </div>
                    </div>
                    <div
                        ref={outputRef}
                        className="flex-1 w-full p-6 overflow-y-auto font-serif text-base text-slate-800 dark:text-slate-200 leading-loose whitespace-pre-wrap"
                    >
                        {outputText}
                        <span className="text-indigo-600 dark:text-indigo-400">{streamingText}</span>
                        {!outputText && !streamingText && <span className="text-slate-400 dark:text-slate-500 italic">Translation will appear here...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
