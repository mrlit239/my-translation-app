import React from 'react';
import { Play, SkipForward, BookOpen, Check, StopCircle, FastForward, RotateCcw } from 'lucide-react';

export default function Footer({
    chapters,
    selectedChapter,
    setSelectedChapter,
    isTranslating,
    translateText,
    stopTranslation,
    progress,
    onContinue,
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    autoContinueOnError,
    setAutoContinueOnError
}) {
    return (
        <div className="h-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0 z-10 transition-colors duration-200">
            <div className="flex items-center gap-4 flex-1">
                {chapters.length > 0 ? (
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedChapter}
                            onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px] text-slate-900 dark:text-slate-200"
                        >
                            {chapters.map((chap, i) => (
                                <option key={i} value={i}>{i + 1}. {chap.title} ({chap.charCount}c)</option>
                            ))}
                        </select>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{chapters.length} chapters</span>
                    </div>
                ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">No chapters detected</span>
                )}
            </div>

            <div className="flex items-center gap-3">
                {isTranslating ? (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col min-w-[200px]">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Translating...</span>
                                    <span className="text-slate-500 dark:text-slate-400">{progress.percent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                                        style={{ width: `${progress.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={stopTranslation}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                        >
                            <StopCircle className="w-4 h-4" /> Stop
                        </button>
                    </div>
                ) : (
                    <>
                        {progress.current > 0 && progress.current < chapters.length && (
                            <button
                                onClick={onContinue}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
                            >
                                <FastForward className="w-4 h-4" /> Continue (Ch {progress.current + 1})
                            </button>
                        )}
                        <button
                            onClick={() => translateText('single', selectedChapter)}
                            disabled={isTranslating}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <Play className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Translate Chapter
                        </button>

                        {/* Range Translation */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-xs text-slate-500 font-medium">Range:</span>
                            <input
                                type="number"
                                min="1"
                                max={chapters.length}
                                value={rangeStart}
                                onChange={(e) => setRangeStart(Math.max(1, Math.min(chapters.length, parseInt(e.target.value) || 1)))}
                                className="w-12 px-1 py-1 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="number"
                                min="1"
                                max={chapters.length}
                                value={rangeEnd}
                                onChange={(e) => setRangeEnd(Math.max(1, Math.min(chapters.length, parseInt(e.target.value) || 1)))}
                                className="w-12 px-1 py-1 text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            <button
                                onClick={() => translateText('range')}
                                disabled={isTranslating}
                                className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400 transition-colors"
                                title="Translate Range"
                            >
                                <Play className="w-3 h-3" />
                            </button>
                        </div>

                        <button
                            onClick={() => translateText('all')}
                            disabled={isTranslating}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            <BookOpen className="w-4 h-4" /> Translate All
                        </button>

                        {/* Auto-Continue Toggle */}
                        <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${autoContinueOnError
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            onClick={() => setAutoContinueOnError(!autoContinueOnError)}
                            title="When enabled, automatically retry and continue translation when errors occur (max 3 retries)"
                        >
                            <RotateCcw className={`w-4 h-4 ${autoContinueOnError ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                            <span className={`text-xs font-medium ${autoContinueOnError ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                Auto-Continue
                            </span>
                            <div className={`w-8 h-4 rounded-full transition-colors ${autoContinueOnError ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform mt-0.5 ${autoContinueOnError ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`}></div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
