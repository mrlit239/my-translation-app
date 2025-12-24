import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Languages, Download, Loader2, AlertCircle, CheckCircle, X, Layers } from 'lucide-react';

// Python Excel service URL - change this when deployed
const PYTHON_EXCEL_URL = import.meta.env.VITE_PYTHON_EXCEL_URL || 'http://localhost:8000';

export default function ExcelTranslationPanel({
    customPrompt,
    model,
    apiKey,
    onBack
}) {
    // State
    const [file, setFile] = useState(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0, batch: 0, sample: '' });
    const [translatedBlob, setTranslatedBlob] = useState(null);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const fileInputRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Handle file drop
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
            setTranslatedBlob(null);
            setError('');
            setProgress({ current: 0, total: 0, percent: 0, batch: 0, sample: '' });
        } else {
            setError('Please upload an Excel file (.xlsx or .xls)');
        }
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setTranslatedBlob(null);
            setError('');
            setProgress({ current: 0, total: 0, percent: 0, batch: 0, sample: '' });
        }
    };

    // Translate with streaming progress
    const translateFile = async () => {
        if (!file) return;

        setIsTranslating(true);
        setError('');
        setStatusMessage('Uploading file...');
        setProgress({ current: 0, total: 0, percent: 0, batch: 0, sample: '' });

        abortControllerRef.current = new AbortController();

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prompt', customPrompt || 'Translate Japanese/Chinese to Vietnamese. Professional tone.');
            formData.append('model', model || 'gemini-2.0-flash');
            formData.append('api_key', apiKey || '');

            const response = await fetch(`${PYTHON_EXCEL_URL}/translate-excel-stream`, {
                method: 'POST',
                body: formData,
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Translation failed');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const data = JSON.parse(line);

                        if (data.type === 'start') {
                            setStatusMessage(`Found ${data.total} cells to translate in ${data.sheets.length} sheets`);
                        } else if (data.type === 'progress') {
                            setProgress({
                                current: data.current,
                                total: data.total,
                                percent: data.percent,
                                batch: data.batch,
                                sample: data.sample
                            });
                            setStatusMessage(`Translating: ${data.current}/${data.total} cells (${data.percent}%)`);
                        } else if (data.type === 'info') {
                            setStatusMessage(data.message);
                        } else if (data.type === 'complete') {
                            // Decode base64 and create blob
                            const binaryString = atob(data.data);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const blob = new Blob([bytes], {
                                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                            });
                            setTranslatedBlob(blob);
                            setStatusMessage('Translation complete!');
                            setProgress(prev => ({ ...prev, percent: 100 }));
                        } else if (data.type === 'error') {
                            throw new Error(data.message);
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse progress line:', line);
                    }
                }
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                setStatusMessage('Translation cancelled');
            } else {
                console.error('Translation error:', err);
                setError(`Translation error: ${err.message}`);
            }
        } finally {
            setIsTranslating(false);
            abortControllerRef.current = null;
        }
    };

    // Cancel translation
    const cancelTranslation = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    // Download the translated file
    const downloadTranslatedFile = () => {
        if (!translatedBlob) return;

        const url = URL.createObjectURL(translatedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.(xlsx|xls)$/i, '_translated.$1');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Clear all
    const clearAll = () => {
        cancelTranslation();
        setFile(null);
        setTranslatedBlob(null);
        setError('');
        setStatusMessage('');
        setProgress({ current: 0, total: 0, percent: 0, batch: 0, sample: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Excel Translation</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Preserves all formatting, images, and charts</p>
                    </div>
                </div>

                {file && (
                    <button
                        onClick={clearAll}
                        className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Prompt Info */}
            <div className="px-6 py-2 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                📝 Using prompt: "{(customPrompt || 'Default Vietnamese translation').substring(0, 80)}..."
            </div>

            <div className="flex-1 overflow-auto p-6">
                {/* Error Display */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-red-700 dark:text-red-400">{error}</p>
                        </div>
                        <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Upload Zone */}
                {!file && (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors cursor-pointer bg-white dark:bg-slate-800"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Drop your Excel file here
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            or click to browse (.xlsx, .xls)
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">✓ Images preserved</span>
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">✓ Charts preserved</span>
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">✓ Real-time progress</span>
                        </div>
                    </div>
                )}

                {/* File Loaded */}
                {file && (
                    <div className="space-y-6">
                        {/* File Info Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                        <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-lg text-slate-900 dark:text-white">{file.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {!translatedBlob && !isTranslating && (
                                        <button
                                            onClick={translateFile}
                                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <Languages className="w-5 h-5" />
                                            Translate File
                                        </button>
                                    )}

                                    {isTranslating && (
                                        <button
                                            onClick={cancelTranslation}
                                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}

                                    {translatedBlob && (
                                        <button
                                            onClick={downloadTranslatedFile}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <Download className="w-5 h-5" />
                                            Download Translated File
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {(isTranslating || progress.percent > 0) && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {statusMessage}
                                        </span>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">
                                            {progress.percent}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${translatedBlob
                                                    ? 'bg-emerald-500'
                                                    : 'bg-indigo-500 animate-pulse'
                                                }`}
                                            style={{ width: `${progress.percent}%` }}
                                        />
                                    </div>
                                    {progress.total > 0 && (
                                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                                            <span>Batch {progress.batch} • {progress.current} of {progress.total} cells</span>
                                            {progress.sample && (
                                                <span className="italic truncate max-w-[200px]">"{progress.sample}..."</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Success State */}
                        {translatedBlob && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-emerald-800 dark:text-emerald-300 mb-2">
                                    Translation Complete!
                                </h3>
                                <p className="text-emerald-700 dark:text-emerald-400 mb-4">
                                    {progress.total} cells translated. All images, charts, and formatting are preserved.
                                </p>
                                <button
                                    onClick={downloadTranslatedFile}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                                >
                                    <Download className="w-5 h-5" />
                                    Download Now
                                </button>
                            </div>
                        )}

                        {/* Info */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>ℹ️ How it works:</strong> Your file is processed with <code>openpyxl</code> which
                                preserves images, charts, and formatting. Only Japanese/Chinese text cells are translated.
                                Progress updates in real-time.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
