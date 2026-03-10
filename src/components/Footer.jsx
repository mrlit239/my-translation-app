import React from 'react';
import { BookOpen, FastForward, Play, RotateCcw, SkipForward, StopCircle } from 'lucide-react';

export default function Footer({
    chapters,
    selectedChapter,
    setSelectedChapter,
    isTranslating,
    translateText,
    stopTranslation,
    progress,
    onContinue,
    canContinue = false,
    onSkipChunk,
    canSkipChunk = false,
    continueChapterLabel = 1,
    chunkIssueMessage = '',
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    autoContinueOnError,
    setAutoContinueOnError
}) {
    return (
        <div className="border-t border-slate-200 bg-slate-50/90 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/80">
            {chunkIssueMessage && (
                <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                    {chunkIssueMessage}
                </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {chapters.length > 0 ? (
                        <>
                            <select
                                value={selectedChapter}
                                onChange={(e) => setSelectedChapter(parseInt(e.target.value, 10))}
                                className="min-w-[220px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/40"
                            >
                                {chapters.map((chapter, index) => (
                                    <option key={index} value={index}>
                                        {index + 1}. {chapter.title} ({chapter.charCount}c)
                                    </option>
                                ))}
                            </select>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{chapters.length} chapters</span>
                        </>
                    ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500">No chapters detected</span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {isTranslating ? (
                        <>
                            <div className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <span className="font-medium">Translating</span>
                                    <span>{progress.percent}%</span>
                                </div>
                                <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-700">
                                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                                </div>
                            </div>
                            <button
                                onClick={stopTranslation}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
                            >
                                <StopCircle className="h-4 w-4" /> Stop
                            </button>
                        </>
                    ) : (
                        <>
                            {canContinue && (
                                <button
                                    onClick={onContinue}
                                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40"
                                >
                                    <FastForward className="h-4 w-4" /> Retry Chunk (Ch {continueChapterLabel})
                                </button>
                            )}
                            {canSkipChunk && (
                                <button
                                    onClick={onSkipChunk}
                                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                                >
                                    <SkipForward className="h-4 w-4" /> Next Chunk
                                </button>
                            )}

                            <button
                                onClick={() => translateText('single', selectedChapter)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Translate Chapter
                            </button>

                            <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Range</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={chapters.length || 1}
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(Math.max(1, Math.min(chapters.length || 1, parseInt(e.target.value, 10) || 1)))}
                                    className="w-14 rounded border border-slate-300 bg-white px-1.5 py-1 text-center text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={chapters.length || 1}
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(Math.max(1, Math.min(chapters.length || 1, parseInt(e.target.value, 10) || 1)))}
                                    className="w-14 rounded border border-slate-300 bg-white px-1.5 py-1 text-center text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                                />
                                <button
                                    onClick={() => translateText('range')}
                                    className="rounded p-1 text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                    title="Translate range"
                                >
                                    <Play className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            <button
                                onClick={() => translateText('all')}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                            >
                                <BookOpen className="h-4 w-4" /> Translate All
                            </button>

                            <button
                                onClick={() => setAutoContinueOnError(!autoContinueOnError)}
                                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${autoContinueOnError
                                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                                    }`}
                                title="Automatically retry and continue translation when recoverable errors happen"
                            >
                                <RotateCcw className="h-3.5 w-3.5" /> Auto-Continue
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
