import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Languages, Download, Loader2, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BACKEND_URL } from '../constants/apiConfig';

export default function ExcelTranslationPanel({
    customPrompt,
    model,
    apiKey,
    onBack
}) {
    // State
    const [file, setFile] = useState(null);
    const [originalArrayBuffer, setOriginalArrayBuffer] = useState(null); // Store original file
    const [workbook, setWorkbook] = useState(null);
    const [sheets, setSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState('');
    const [previewData, setPreviewData] = useState([]);
    const [isTranslating, setIsTranslating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
    const [translatedWorkbook, setTranslatedWorkbook] = useState(null);
    const [translatedData, setTranslatedData] = useState([]);
    const [error, setError] = useState('');
    const [translateAllSheets, setTranslateAllSheets] = useState(true);

    const fileInputRef = useRef(null);
    const dropZoneRef = useRef(null);

    // Handle file drop
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            processFile(droppedFile);
        } else {
            setError('Please upload an Excel file (.xlsx or .xls)');
        }
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Process uploaded file
    const processFile = async (uploadedFile) => {
        setError('');
        setFile(uploadedFile);
        setTranslatedWorkbook(null);
        setTranslatedData([]);

        try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            setOriginalArrayBuffer(arrayBuffer.slice(0)); // Store a copy

            // Read workbook with full options to preserve everything
            const wb = XLSX.read(arrayBuffer, {
                type: 'array',
                cellStyles: true,
                cellDates: true,
                cellNF: true,
                cellFormula: true,
                sheetStubs: true,
                bookVBA: true,
                bookImages: true
            });

            setWorkbook(wb);
            setSheets(wb.SheetNames);
            setSelectedSheet(wb.SheetNames[0]);

            // Parse first sheet for preview
            setPreviewData(parseSheetForPreview(wb, wb.SheetNames[0]));

        } catch (err) {
            setError(`Error reading Excel file: ${err.message}`);
        }
    };

    // Parse sheet data for preview only
    const parseSheetForPreview = (wb, sheetName) => {
        const sheet = wb.Sheets[sheetName];
        if (!sheet || !sheet['!ref']) return [];

        const range = XLSX.utils.decode_range(sheet['!ref']);
        const data = [];

        for (let row = range.s.r; row <= Math.min(range.e.r, 100); row++) {
            const rowData = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = sheet[cellAddress];
                rowData.push(cell ? (cell.w || cell.v || '') : '');
            }
            data.push(rowData);
        }

        return data;
    };

    // Handle sheet selection change
    const handleSheetChange = (sheetName) => {
        setSelectedSheet(sheetName);
        if (workbook) {
            setPreviewData(parseSheetForPreview(workbook, sheetName));
            setTranslatedData([]);
        }
    };

    // Check if cell contains translatable text (Japanese/Chinese characters)
    const hasTranslatableText = (text) => {
        const str = String(text || '');
        return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(str);
    };

    // Get all translatable cells from a sheet
    const getTranslatableCells = (sheet) => {
        if (!sheet || !sheet['!ref']) return [];

        const range = XLSX.utils.decode_range(sheet['!ref']);
        const cells = [];

        for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = sheet[cellAddress];

                if (cell && cell.t === 's' && cell.v && hasTranslatableText(cell.v)) {
                    cells.push({
                        address: cellAddress,
                        row,
                        col,
                        value: String(cell.v),
                        cell
                    });
                }
            }
        }

        return cells;
    };

    // Count total translatable cells
    const countTranslatableCells = () => {
        if (!workbook) return 0;

        let count = 0;
        const sheetsToCount = translateAllSheets ? sheets : [selectedSheet];

        sheetsToCount.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            count += getTranslatableCells(sheet).length;
        });

        return count;
    };

    // Translate all content - MODIFYING CELLS IN-PLACE
    const translateAll = async () => {
        if (!workbook || !originalArrayBuffer) return;

        setIsTranslating(true);
        setError('');

        const sheetsToTranslate = translateAllSheets ? sheets : [selectedSheet];

        // Count total translatable cells
        let totalCells = 0;
        sheetsToTranslate.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            totalCells += getTranslatableCells(sheet).length;
        });

        if (totalCells === 0) {
            setError('No translatable content found (Japanese/Chinese text)');
            setIsTranslating(false);
            return;
        }

        try {
            setProgress({ current: 0, total: totalCells, phase: 'Preparing translation...' });

            // Create a fresh copy of the workbook from original buffer
            const translatedWb = XLSX.read(originalArrayBuffer.slice(0), {
                type: 'array',
                cellStyles: true,
                cellDates: true,
                cellNF: true,
                cellFormula: true,
                sheetStubs: true,
                bookVBA: true,
                bookImages: true
            });

            let processedCells = 0;

            // Translate each sheet
            for (const sheetName of sheetsToTranslate) {
                const sheet = translatedWb.Sheets[sheetName];
                const cellsToTranslate = getTranslatableCells(sheet);

                if (cellsToTranslate.length === 0) continue;

                setProgress({
                    current: processedCells,
                    total: totalCells,
                    phase: `Translating: ${sheetName}...`
                });

                // Batch translate cells (group by ~15 cells or 2500 chars)
                const batches = [];
                let currentBatch = [];
                let currentBatchChars = 0;

                cellsToTranslate.forEach(cellInfo => {
                    if (currentBatch.length >= 15 || currentBatchChars + cellInfo.value.length > 2500) {
                        if (currentBatch.length > 0) batches.push(currentBatch);
                        currentBatch = [cellInfo];
                        currentBatchChars = cellInfo.value.length;
                    } else {
                        currentBatch.push(cellInfo);
                        currentBatchChars += cellInfo.value.length;
                    }
                });
                if (currentBatch.length > 0) batches.push(currentBatch);

                // Process batches
                for (const batch of batches) {
                    const batchText = batch.map((cellInfo, i) => `【${i}】${cellInfo.value}`).join('\n');

                    try {
                        const response = await fetch(`${BACKEND_URL}/api/translate/gemini`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: model || 'gemini-3-flash',
                                prompt: `${customPrompt || 'Translate the following Japanese/Chinese text to Vietnamese. Maintain professional tone.'}

EXCEL CELL FORMAT RULES:
- Each cell is marked with 【number】 (e.g., 【0】, 【1】)
- Translate each cell and KEEP the 【number】 markers in your output
- Keep translations concise - these are spreadsheet cells
- Preserve numbers, dates, file names, and technical terms
- Output format: 【0】translation【1】translation...

Example:
Input: 【0】給与計算【1】自動化ツール
Output: 【0】Tính lương【1】Công cụ tự động hóa`,
                                text: batchText
                            })
                        });

                        if (!response.ok) {
                            throw new Error('Translation request failed');
                        }

                        const result = await response.json();
                        const translatedText = result.translation || '';

                        // Parse translations
                        const regex = /【(\d+)】([^【]*)/g;
                        let match;
                        const translations = {};

                        while ((match = regex.exec(translatedText)) !== null) {
                            const index = parseInt(match[1]);
                            const text = match[2].trim();
                            if (text) translations[index] = text;
                        }

                        // Apply translations IN-PLACE to the sheet cells
                        batch.forEach((cellInfo, i) => {
                            if (translations[i]) {
                                const cell = sheet[cellInfo.address];
                                if (cell) {
                                    cell.v = translations[i]; // Update value
                                    cell.w = translations[i]; // Update formatted value
                                    if (cell.h) cell.h = translations[i]; // Update HTML if present
                                }
                            }
                            processedCells++;
                        });

                        setProgress({
                            current: processedCells,
                            total: totalCells,
                            phase: `Translating: ${sheetName} (${processedCells}/${totalCells})`
                        });

                    } catch (batchErr) {
                        console.error('Batch error:', batchErr);
                        processedCells += batch.length;
                    }
                }
            }

            setTranslatedWorkbook(translatedWb);

            // Update preview for selected sheet
            setTranslatedData(parseSheetForPreview(translatedWb, selectedSheet));

            setProgress({ current: totalCells, total: totalCells, phase: 'Translation complete!' });

        } catch (err) {
            setError(`Translation error: ${err.message}`);
        } finally {
            setIsTranslating(false);
        }
    };

    // Download translated Excel - preserves original structure
    const downloadTranslatedExcel = () => {
        if (!translatedWorkbook) return;

        const originalName = file?.name?.replace(/\.(xlsx|xls)$/i, '') || 'document';
        const filename = `${originalName}_translated.xlsx`;

        XLSX.writeFile(translatedWorkbook, filename, {
            bookSST: true,
            bookType: 'xlsx',
            cellStyles: true
        });
    };

    // Clear all
    const clearAll = () => {
        setFile(null);
        setOriginalArrayBuffer(null);
        setWorkbook(null);
        setSheets([]);
        setSelectedSheet('');
        setPreviewData([]);
        setTranslatedWorkbook(null);
        setTranslatedData([]);
        setError('');
        setProgress({ current: 0, total: 0, phase: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const totalCellsCount = countTranslatableCells();

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
                        <p className="text-sm text-slate-500 dark:text-slate-400">Translate cells while preserving formatting</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {file && (
                        <button
                            onClick={clearAll}
                            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Prompt Info Banner */}
            <div className="px-6 py-2 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                📝 Using sidebar prompt: "{(customPrompt || 'Default').substring(0, 60)}..."
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
                        ref={dropZoneRef}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer bg-white dark:bg-slate-800"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => e.target.files[0] && processFile(e.target.files[0])}
                            className="hidden"
                        />
                        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Drop your Excel file here
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            or click to browse (.xlsx, .xls)
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            ✓ Preserves formatting, images, charts, and tables
                        </p>
                    </div>
                )}

                {/* File Loaded */}
                {file && (
                    <div className="space-y-6">
                        {/* File Info & Controls */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {sheets.length} sheet(s) • {totalCellsCount} translatable cells
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={translateAllSheets}
                                            onChange={(e) => setTranslateAllSheets(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <Layers className="w-4 h-4" />
                                        All sheets
                                    </label>

                                    {sheets.length > 1 && (
                                        <select
                                            value={selectedSheet}
                                            onChange={(e) => handleSheetChange(e.target.value)}
                                            className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                                        >
                                            {sheets.map(sheet => (
                                                <option key={sheet} value={sheet}>{sheet}</option>
                                            ))}
                                        </select>
                                    )}

                                    <button
                                        onClick={translateAll}
                                        disabled={isTranslating || totalCellsCount === 0}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        {isTranslating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Translating...
                                            </>
                                        ) : (
                                            <>
                                                <Languages className="w-4 h-4" />
                                                Translate
                                            </>
                                        )}
                                    </button>

                                    {translatedWorkbook && (
                                        <button
                                            onClick={downloadTranslatedExcel}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {isTranslating && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
                                        <span>{progress.phase}</span>
                                        <span>{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 transition-all duration-300"
                                            style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sheet Tabs */}
                        {sheets.length > 1 && (
                            <div className="flex gap-1 overflow-x-auto pb-2">
                                {sheets.map(sheet => (
                                    <button
                                        key={sheet}
                                        onClick={() => handleSheetChange(sheet)}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${selectedSheet === sheet
                                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {sheet}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Data Preview */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <h3 className="font-medium text-slate-900 dark:text-white">
                                    {translatedData.length > 0 ? '✓ Translated' : 'Preview'} - {selectedSheet}
                                </h3>
                                <span className="text-xs text-slate-500">
                                    {(translatedData.length > 0 ? translatedData : previewData).length} rows
                                </span>
                            </div>
                            <div className="overflow-auto max-h-96">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {(translatedData.length > 0 ? translatedData : previewData).slice(0, 100).map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="px-2 py-1 text-xs text-slate-400 border-r border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 w-8 text-center">
                                                    {rowIndex + 1}
                                                </td>
                                                {Array.isArray(row) && row.map((cell, colIndex) => (
                                                    <td
                                                        key={colIndex}
                                                        className={`px-3 py-2 border-r border-slate-100 dark:border-slate-700 last:border-0 max-w-xs ${hasTranslatableText(cell)
                                                            ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20'
                                                            : 'text-slate-700 dark:text-slate-300'
                                                            }`}
                                                        title={String(cell || '')}
                                                    >
                                                        <div className="truncate max-w-[200px]">
                                                            {String(cell || '')}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 100 && (
                                    <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 text-center bg-slate-50 dark:bg-slate-800/50">
                                        Showing first 100 rows of {previewData.length}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>ℹ️ Note:</strong> The translated file preserves all original formatting, charts, images, and formulas.
                                Only text cells containing Japanese/Chinese characters (highlighted in purple) are translated.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
