import React from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';

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
    chapters,
    sourceFocus
}) {
    const textareaRef = React.useRef(null);
    const mirrorRef = React.useRef(null);

    React.useEffect(() => {
        if (
            !sourceFocus?.active ||
            !textareaRef.current ||
            !mirrorRef.current
        ) {
            return;
        }

        const textarea = textareaRef.current;
        const mirror = mirrorRef.current;
        const startIndex = Math.max(0, Math.min(inputText.length, sourceFocus.start || 0));
        const desiredEnd = Math.max(sourceFocus.end || (startIndex + 1), startIndex + 1);
        const endIndex = Math.max(startIndex, Math.min(inputText.length, desiredEnd));

        textarea.focus();
        textarea.setSelectionRange(startIndex, endIndex);

        mirror.style.width = `${textarea.clientWidth}px`;
        mirror.textContent = inputText.substring(0, startIndex);

        const targetScrollTop = mirror.scrollHeight - (textarea.clientHeight / 3);
        textarea.scrollTop = Math.max(0, targetScrollTop);
    }, [sourceFocus?.token, sourceFocus?.active, sourceFocus?.start, sourceFocus?.end, inputText]);

    React.useEffect(() => {
        if (
            sourceFocus?.active ||
            selectedChapter === undefined ||
            !chapters ||
            chapters.length === 0 ||
            !textareaRef.current ||
            !mirrorRef.current
        ) {
            return;
        }

        const safeChapterIndex = Math.max(0, Math.min(selectedChapter, chapters.length - 1));
        const chapter = chapters[safeChapterIndex];
        if (!chapter) return;

        let startIndex = 0;
        let titleLength = 0;

        if (chapter.startIndex !== undefined) {
            startIndex = chapter.startIndex;
            titleLength = chapter.title ? chapter.title.length : 0;
        } else {
            for (let i = 0; i < safeChapterIndex; i++) {
                startIndex += chapters[i].charCount;
            }
            titleLength = chapter.title ? chapter.title.length : 10;
        }

        const textarea = textareaRef.current;
        const mirror = mirrorRef.current;

        textarea.focus();
        textarea.setSelectionRange(startIndex, startIndex + titleLength);

        mirror.style.width = `${textarea.clientWidth}px`;
        mirror.textContent = inputText.substring(0, startIndex);

        const targetScrollTop = mirror.scrollHeight - (textarea.clientHeight / 3);
        textarea.scrollTop = Math.max(0, targetScrollTop);
        textarea.focus();
    }, [selectedChapter, chapters, inputText, sourceFocus?.active]);

    return (
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-100/70 dark:bg-slate-950/70">
            <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`group flex min-w-[130px] max-w-[220px] cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${activeTabId === tab.id
                            ? 'relative z-10 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-900/60 dark:bg-blue-900/25 dark:text-blue-300'
                            : 'rounded-xl bg-transparent text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                            }`}
                    >
                        <span className="truncate">{tab.title}</span>
                        <button
                            onClick={(event) => closeTab(tab.id, event)}
                            className={`rounded-full p-0.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 ${tabs.length === 1 ? 'hidden' : ''}`}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}
                <button
                    onClick={addTab}
                    className="ml-1 rounded-xl p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                    title="New tab"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            <div className="flex flex-1 gap-3 overflow-hidden p-3 max-md:flex-col">
                <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-20px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Source Text</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{wordCount.toLocaleString()} chars</span>
                    </div>

                    <div
                        ref={mirrorRef}
                        className="pointer-events-none invisible absolute left-0 top-0 -z-50 whitespace-pre-wrap break-words p-6 font-mono text-sm leading-relaxed"
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
                        className="flex-1 resize-none bg-transparent p-6 font-mono text-sm leading-relaxed text-slate-800 outline-none dark:text-slate-200"
                        placeholder="Paste your source text here or upload a file..."
                    />
                </div>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-20px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Translation</span>
                        <div className="flex items-center gap-2">
                            {(outputText || streamingText) && (
                                <button
                                    onClick={clearTranslation}
                                    className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30"
                                    title="Clear translation"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {isTranslating && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-300">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Live
                                </span>
                            )}
                        </div>
                    </div>

                    <div
                        ref={outputRef}
                        className="flex-1 overflow-y-auto p-6 font-serif text-base leading-loose text-slate-800 whitespace-pre-wrap dark:text-slate-200"
                    >
                        {outputText}
                        <span className="text-blue-700 dark:text-blue-300">{streamingText}</span>
                        {!outputText && !streamingText && (
                            <span className="italic text-slate-400 dark:text-slate-500">Translation appears here...</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
