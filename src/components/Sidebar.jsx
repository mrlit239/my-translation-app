import React from 'react';
import { Languages, Key, Settings, Book, Plus, X, LogIn, User, Zap } from 'lucide-react';
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
    user,
    onLoginClick,
    onLogoutClick
}) {
    return (
        <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-sm z-10 transition-colors duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-2 rounded-xl shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M3 5H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M7 5V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M7 13L4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M7 13L10 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M14 5C14 5 15 5 17 5C19 5 21 6 21 9C21 12 17 12 17 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                        <path d="M15 12L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    AITransTool
                </h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* User Profile Section - Temporarily hidden */}
                {user && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                        {user ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate max-w-[120px]">
                                            {user.email}
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Pro Plan</span>
                                    </div>
                                </div>
                                <button
                                    onClick={onLogoutClick}
                                    className="text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 font-medium px-2 py-1"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={onLoginClick}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                <LogIn className="w-4 h-4" /> Sign In / Sign Up
                            </button>
                        )}
                    </div>
                )}

                {/* API Config */}
                <section>
                    <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Key className="w-3 h-3" /> API Configuration
                    </h2>

                    <div className="space-y-3">
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Provider</label>
                                <select
                                    value={apiProvider}
                                    onChange={(e) => {
                                        setApiProvider(e.target.value);
                                        setModel(apiProviders[e.target.value].models[0]);
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-200"
                                >
                                    {Object.entries(apiProviders).map(([key, provider]) => (
                                        <option key={key} value={key}>{provider.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Model</label>
                                <select
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-200"
                                >
                                    {apiProviders[apiProvider].models.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {apiProviders[apiProvider]?.requiresKey !== false && (
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                                        {apiProvider === 'huggingface' ? 'HF Token (Optional)' : 'API Key'}
                                    </label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={apiProvider === 'huggingface' ? 'hf_...' : 'sk-...'}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-200"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Translation Settings */}
                <section>
                    <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Settings className="w-3 h-3" /> Settings
                    </h2>

                    <div className="space-y-3">
                        {/* Context Memory Settings */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-indigo-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Context Memory</span>
                                </div>
                                <button
                                    onClick={() => setEnableContextMemory(!enableContextMemory)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${enableContextMemory ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <span className={`${enableContextMemory ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                                </button>
                            </div>

                            {enableContextMemory && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500 dark:text-slate-400">Memory Size (chars)</span>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">{contextMemorySize}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="100"
                                        max="3000"
                                        step="100"
                                        value={contextMemorySize}
                                        onChange={(e) => setContextMemorySize(Number(e.target.value))}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                        Higher memory improves consistency but costs more tokens.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Auto-Glossary Settings */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Book className="w-4 h-4 text-indigo-500" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-Glossary</span>
                            </div>
                            <button
                                onClick={() => setAutoGlossary(!autoGlossary)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${autoGlossary ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <span className={`${autoGlossary ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Source Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-200"
                            >
                                <option value="Auto-detect">Auto-detect</option>
                                <option value="Chinese (中文)">Chinese (中文)</option>
                                <option value="Japanese (日本語)">Japanese (日本語)</option>
                                <option value="Korean (한국어)">Korean (한국어)</option>
                                <option value="Vietnamese (Tiếng Việt)">Vietnamese (Tiếng Việt)</option>
                                <option value="Russian (Русский)">Russian (Русский)</option>
                                <option value="English">English</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Chapter Split</label>
                            <div className="flex gap-2">
                                <select
                                    value={chapterDetection}
                                    onChange={(e) => setChapterDetection(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-200"
                                >
                                    <option value="auto">Auto</option>
                                    <option value="fixed">Fixed Length</option>
                                </select>
                                {chapterDetection === 'fixed' && (
                                    <input
                                        type="number"
                                        value={charsPerChapter}
                                        onChange={(e) => setCharsPerChapter(parseInt(e.target.value))}
                                        className="w-20 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-200"
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Custom Prompt</label>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-slate-900 dark:text-slate-200"
                                placeholder="Enter custom instructions..."
                            />
                        </div>
                    </div>
                </section>

                {/* Glossary */}
                <section>
                    <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Book className="w-3 h-3" /> Glossary
                    </h2>

                    <div className="space-y-2">
                        {glossary.map((term, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={term.source}
                                    onChange={(e) => {
                                        const newGlossary = [...glossary];
                                        newGlossary[index].source = e.target.value;
                                        setGlossary(newGlossary);
                                    }}
                                    placeholder="Original"
                                    className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-200"
                                />
                                <input
                                    type="text"
                                    value={term.target}
                                    onChange={(e) => {
                                        const newGlossary = [...glossary];
                                        newGlossary[index].target = e.target.value;
                                        setGlossary(newGlossary);
                                    }}
                                    placeholder="Translated"
                                    className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-200"
                                />
                                <button
                                    onClick={() => {
                                        const newGlossary = glossary.filter((_, i) => i !== index);
                                        setGlossary(newGlossary);
                                    }}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setGlossary([...glossary, { source: '', target: '' }])}
                            className="w-full py-1.5 border border-dashed border-slate-300 dark:border-slate-600 rounded text-xs text-slate-500 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Add Term
                        </button>
                    </div>
                </section>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>v1.2.0</span>
                    <span>Tailwind v4</span>
                </div>
            </div>
        </aside>
    );
}
