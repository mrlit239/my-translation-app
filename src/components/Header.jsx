import React from 'react';
import { Upload, FileText, X, Trash2, Download, Moon, Sun } from 'lucide-react';

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
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm flex-shrink-0 transition-colors duration-200">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                    <Upload className="w-4 h-4" /> Upload File
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.md"
                />
                {uploadedFileName && (
                    <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <FileText className="w-3 h-3" /> {uploadedFileName}
                        <button onClick={clearUploadedFile} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                )}
            </div>

            <div className="flex-center gap-3 flex">
                <button
                    onClick={toggleDarkMode}
                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button
                    onClick={clearAll}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Clear All"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button
                    onClick={() => downloadTranslation()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                    <Download className="w-4 h-4" /> Download
                </button>
            </div>
        </header>
    );
}
