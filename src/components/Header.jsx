import React from 'react';
import { Download, FileText, Moon, Sun, Trash2, Upload, X } from 'lucide-react';

export default function Header({
    fileInputRef,
    handleFileUpload,
    uploadedFileName,
    clearUploadedFile,
    clearAll,
    downloadTranslation,
    isDarkMode,
    toggleDarkMode
}) {
    return (
        <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-900/70 dark:hover:bg-blue-900/20"
                >
                    <Upload className="h-4 w-4" /> Upload
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.md"
                />

                {uploadedFileName && (
                    <div className="inline-flex max-w-[380px] items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="truncate">{uploadedFileName}</span>
                        <button onClick={clearUploadedFile} className="rounded p-0.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={toggleDarkMode}
                    className="rounded-xl border border-slate-300 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                    onClick={clearAll}
                    className="rounded-xl border border-slate-300 bg-white p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                    title="Clear all"
                >
                    <Trash2 className="h-4 w-4" />
                </button>

                <button
                    onClick={() => downloadTranslation()}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                    <Download className="h-4 w-4" /> Download
                </button>
            </div>
        </header>
    );
}
