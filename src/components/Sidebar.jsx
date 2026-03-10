import React from 'react';
import { Book, Key, Languages, Plus, Settings, X, Zap } from 'lucide-react';
import { apiProviders } from '../constants/apiConfig';

export default function Sidebar({
    apiProvider,
    setApiProvider,
    setModel,
    model,
    apiKey,
    setApiKey,
    language,
    setLanguage,
    chapterDetection,
    setChapterDetection,
    charsPerChapter,
    setCharsPerChapter,
    customPrompt,
    setCustomPrompt,
    glossary,
    setGlossary,
    enableContextMemory,
    setEnableContextMemory,
    contextMemorySize,
    setContextMemorySize,
    autoGlossary,
    setAutoGlossary,
}) {
    const sectionClass = 'rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_6px_20px_-18px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/80';
    const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400';
    const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/40';

    return (
        <aside className="relative z-10 flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/40 max-md:w-full max-md:max-h-[42vh] max-md:border-r-0 max-md:border-b">
            <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <Languages className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Translation Workspace</p>
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">AITransTool</h1>
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
                <section className={sectionClass}>
                    <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        <Key className="h-3.5 w-3.5" /> API
                    </h2>

                    <div className="space-y-3">
                        <div>
                            <label className={labelClass}>Provider</label>
                            <select
                                value={apiProvider}
                                onChange={(e) => {
                                    setApiProvider(e.target.value);
                                    setModel(apiProviders[e.target.value].models[0]);
                                }}
                                className={fieldClass}
                            >
                                {Object.entries(apiProviders).map(([key, provider]) => (
                                    <option key={key} value={key}>{provider.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Model</label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className={fieldClass}
                            >
                                {apiProviders[apiProvider].models.map((providerModel) => (
                                    <option key={providerModel} value={providerModel}>
                                        {providerModel.startsWith('space:')
                                            ? `HF Space: ${providerModel.replace(/^space:/, '')}`
                                            : providerModel}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {apiProviders[apiProvider]?.requiresKey !== false && (
                            <div>
                                <label className={labelClass}>
                                    {apiProvider === 'huggingface' ? 'HF Token (Optional)' : 'API Key'}
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={apiProvider === 'huggingface' ? 'hf_...' : 'sk-...'}
                                    className={fieldClass}
                                />
                            </div>
                        )}
                    </div>
                </section>

                <section className={sectionClass}>
                    <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        <Settings className="h-3.5 w-3.5" /> Translation
                    </h2>

                    <div className="space-y-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Context Memory</span>
                                </div>

                                <button
                                    onClick={() => setEnableContextMemory(!enableContextMemory)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${enableContextMemory ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${enableContextMemory ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {enableContextMemory && (
                                <div>
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="text-slate-500 dark:text-slate-400">Memory size</span>
                                        <span className="font-medium text-blue-700 dark:text-blue-300">{contextMemorySize}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="100"
                                        max="3000"
                                        step="100"
                                        value={contextMemorySize}
                                        onChange={(e) => setContextMemorySize(Number(e.target.value))}
                                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-blue-600 dark:bg-slate-700"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-2">
                                <Book className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-Glossary</span>
                            </div>

                            <button
                                onClick={() => setAutoGlossary(!autoGlossary)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${autoGlossary ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${autoGlossary ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div>
                            <label className={labelClass}>Source Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className={fieldClass}
                            >
                                <option value="Auto-detect">Auto-detect</option>
                                <option value={'Chinese (\u4e2d\u6587)'}>Chinese</option>
                                <option value={'Japanese (\u65e5\u672c\u8a9e)'}>Japanese</option>
                                <option value={'Korean (\ud55c\uad6d\uc5b4)'}>Korean</option>
                                <option value={'Vietnamese (Ti\u1ebfng Vi\u1ec7t)'}>Vietnamese</option>
                                <option value={'Russian (\u0420\u0443\u0441\u0441\u043a\u0438\u0439)'}>Russian</option>
                                <option value="English">English</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Chapter Split</label>
                            <div className="flex gap-2">
                                <select
                                    value={chapterDetection}
                                    onChange={(e) => setChapterDetection(e.target.value)}
                                    className={fieldClass}
                                >
                                    <option value="auto">Auto</option>
                                    <option value="fixed">Fixed length</option>
                                </select>

                                {chapterDetection === 'fixed' && (
                                    <input
                                        type="number"
                                        value={charsPerChapter}
                                        onChange={(e) => setCharsPerChapter(parseInt(e.target.value, 10) || 8000)}
                                        className="w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/40"
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Prompt</label>
                            <textarea
                                value={customPrompt || ''}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                rows={4}
                                className={`${fieldClass} resize-none`}
                                placeholder="Enter translation rules..."
                            />
                        </div>
                    </div>
                </section>

                <section className={sectionClass}>
                    <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        <Book className="h-3.5 w-3.5" /> Glossary
                    </h2>

                    <div className="space-y-2">
                        {glossary.map((term, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={term.source}
                                    onChange={(e) => {
                                        const next = [...glossary];
                                        next[index].source = e.target.value;
                                        setGlossary(next);
                                    }}
                                    placeholder="Source"
                                    className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/40"
                                />
                                <input
                                    type="text"
                                    value={term.target}
                                    onChange={(e) => {
                                        const next = [...glossary];
                                        next[index].target = e.target.value;
                                        setGlossary(next);
                                    }}
                                    placeholder="Target"
                                    className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/40"
                                />
                                <button
                                    onClick={() => setGlossary(glossary.filter((_, itemIndex) => itemIndex !== index))}
                                    className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={() => setGlossary([...glossary, { source: '', target: '' }])}
                            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add term
                        </button>
                    </div>
                </section>
            </div>
        </aside>
    );
}
