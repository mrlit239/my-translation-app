import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Languages, Download, Loader2, Image, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp, Layers } from 'lucide-react';
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
    const [workbook, setWorkbook] = useState(null);
    const [sheets, setSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState('');
    const [allSheetsData, setAllSheetsData] = useState({}); // Store all sheets data
    const [previewData, setPreviewData] = useState([]);
    const [images, setImages] = useState([]);
    const [isTranslating, setIsTranslating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
    const [translatedWorkbook, setTranslatedWorkbook] = useState(null); // Store translated workbook
    const [translatedData, setTranslatedData] = useState([]);
    const [imageTranslations, setImageTranslations] = useState([]);
    const [error, setError] = useState('');
    const [showImageResults, setShowImageResults] = useState(true);
    const [translateAllSheets, setTranslateAllSheets] = useState(true); // Option to translate all sheets

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

        try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            // Read with all options to preserve as much data as possible
            const wb = XLSX.read(arrayBuffer, {
                type: 'array',
                cellStyles: true,
                cellDates: true,
                cellNF: true,
                sheetStubs: true // Include empty cells
            });

            setWorkbook(wb);
            setSheets(wb.SheetNames);
            setSelectedSheet(wb.SheetNames[0]);

            // Parse all sheets
            const allData = {};
            wb.SheetNames.forEach(sheetName => {
                allData[sheetName] = parseSheetData(wb, sheetName);
            });
            setAllSheetsData(allData);

            // Set preview for first sheet
            setPreviewData(allData[wb.SheetNames[0]] || []);

            // Extract images
            extractImages(wb);

        } catch (err) {
            setError(`Error reading Excel file: ${err.message}`);
        }
    };

    // Parse sheet data - improved to handle all cell types
    const parseSheetData = (wb, sheetName) => {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) return [];

        // Get the range of the sheet
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        const data = [];

        for (let row = range.s.r; row <= range.e.r; row++) {
            const rowData = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = sheet[cellAddress];

                if (cell) {
                    // Get the formatted value or raw value
                    let value = '';
                    if (cell.w !== undefined) {
                        // Formatted text representation
                        value = cell.w;
                    } else if (cell.v !== undefined) {
                        // Raw value
                        value = String(cell.v);
                    }
                    rowData.push(value);
                } else {
                    rowData.push('');
                }
            }
            data.push(rowData);
        }

        return data;
    };

    // Extract embedded images from Excel
    const extractImages = (wb) => {
        const extractedImages = [];

        // Check workbook for media
        if (wb.Workbook && wb.Workbook.Media) {
            wb.Workbook.Media.forEach((media, index) => {
                if (media.data && media.type?.startsWith('image/')) {
                    extractedImages.push({
                        id: `media-${index}`,
                        name: media.name || `Image ${index + 1}`,
                        data: typeof media.data === 'string' ? media.data : arrayBufferToBase64(media.data),
                        mimeType: media.type,
                        cell: 'Embedded',
                        translated: null
                    });
                }
            });
        }

        // Also check each sheet for images
        wb.SheetNames.forEach(sheetName => {
            const sheet = wb.Sheets[sheetName];
            if (sheet['!images']) {
                sheet['!images'].forEach((img, index) => {
                    if (img.data) {
                        extractedImages.push({
                            id: `${sheetName}-img-${index}`,
                            name: img.name || `${sheetName} - Image ${index + 1}`,
                            data: typeof img.data === 'string' ? img.data : arrayBufferToBase64(img.data),
                            mimeType: img.type || 'image/png',
                            cell: img.cell || sheetName,
                            translated: null
                        });
                    }
                });
            }
        });

        setImages(extractedImages);
    };

    // Helper to convert ArrayBuffer to Base64
    const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    // Handle sheet selection change
    const handleSheetChange = (sheetName) => {
        setSelectedSheet(sheetName);
        if (allSheetsData[sheetName]) {
            setPreviewData(allSheetsData[sheetName]);
            setTranslatedData([]);
        }
    };

    // Count translatable cells across all sheets or selected sheet
    const countTranslatableCells = (sheetsToCount = null) => {
        let count = 0;
        const dataToCount = sheetsToCount || (translateAllSheets ? allSheetsData : { [selectedSheet]: previewData });

        Object.values(dataToCount).forEach(sheetData => {
            if (Array.isArray(sheetData)) {
                sheetData.forEach(row => {
                    if (Array.isArray(row)) {
                        row.forEach(cell => {
                            if (cell && String(cell).trim().length > 0 && hasTranslatableText(cell)) {
                                count++;
                            }
                        });
                    }
                });
            }
        });
        return count;
    };

    // Check if cell contains translatable text (Japanese/Chinese characters)
    const hasTranslatableText = (text) => {
        const str = String(text);
        // Check for Japanese (Hiragana, Katakana, Kanji) or Chinese characters
        return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(str);
    };

    // Translate all content
    const translateAll = async () => {
        if (!workbook) return;

        setIsTranslating(true);
        setError('');

        const sheetsToTranslate = translateAllSheets ? sheets : [selectedSheet];

        // Count total translatable cells
        let totalCells = 0;
        sheetsToTranslate.forEach(sheetName => {
            const data = allSheetsData[sheetName] || [];
            data.forEach(row => {
                if (Array.isArray(row)) {
                    row.forEach(cell => {
                        if (cell && String(cell).trim().length > 0 && hasTranslatableText(cell)) {
                            totalCells++;
                        }
                    });
                }
            });
        });

        const totalImages = images.length;
        const totalItems = totalCells + totalImages;

        if (totalItems === 0) {
            setError('No translatable content found (Japanese/Chinese text)');
            setIsTranslating(false);
            return;
        }

        try {
            setProgress({ current: 0, total: totalItems, phase: 'Preparing translation...' });

            let processedCells = 0;
            const translatedSheetsData = {};

            // Translate each sheet
            for (const sheetName of sheetsToTranslate) {
                const sheetData = allSheetsData[sheetName] || [];
                if (sheetData.length === 0) continue;

                setProgress({
                    current: processedCells,
                    total: totalItems,
                    phase: `Translating sheet: ${sheetName}...`
                });

                // Collect all translatable cells
                const cellsToTranslate = [];
                sheetData.forEach((row, rowIndex) => {
                    if (Array.isArray(row)) {
                        row.forEach((cell, colIndex) => {
                            if (cell && String(cell).trim().length > 0 && hasTranslatableText(cell)) {
                                cellsToTranslate.push({ rowIndex, colIndex, text: String(cell) });
                            }
                        });
                    }
                });

                // Create translated copy
                const translatedRows = sheetData.map(row =>
                    Array.isArray(row) ? [...row] : row
                );

                if (cellsToTranslate.length === 0) {
                    translatedSheetsData[sheetName] = translatedRows;
                    continue;
                }

                // Batch translate cells (group by ~20 cells or 3000 chars for better accuracy)
                const batches = [];
                let currentBatch = [];
                let currentBatchChars = 0;

                cellsToTranslate.forEach(cell => {
                    if (currentBatch.length >= 20 || currentBatchChars + cell.text.length > 3000) {
                        if (currentBatch.length > 0) batches.push(currentBatch);
                        currentBatch = [cell];
                        currentBatchChars = cell.text.length;
                    } else {
                        currentBatch.push(cell);
                        currentBatchChars += cell.text.length;
                    }
                });
                if (currentBatch.length > 0) batches.push(currentBatch);

                // Process batches for this sheet
                for (const batch of batches) {
                    // Format batch for translation - use clear markers
                    const batchText = batch.map((cell, i) => `【${i}】${cell.text}`).join('\n');

                    try {
                        const response = await fetch(`${BACKEND_URL}/api/translate/gemini`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: model || 'gemini-2.5-flash',
                                prompt: `${customPrompt}

IMPORTANT INSTRUCTIONS FOR EXCEL CELL TRANSLATION:
1. You are translating cells from an Excel spreadsheet
2. Each cell is marked with 【number】 (e.g., 【0】, 【1】, 【2】)
3. Translate each cell and KEEP the 【number】 markers in your output
4. Keep translations concise - these are spreadsheet cells
5. Preserve any numbers, dates, or technical terms
6. Output format must be: 【0】translated text【1】translated text...

Example:
Input: 【0】給与計算【1】自動化ツール
Output: 【0】Payroll Calculation【1】Automation Tool`,
                                text: batchText
                            })
                        });

                        if (!response.ok) {
                            const err = await response.json().catch(() => ({}));
                            throw new Error(err.error || 'Translation failed');
                        }

                        const result = await response.json();
                        const translatedText = result.translation || '';

                        // Parse translated results using the markers
                        const regex = /【(\d+)】([^【]*)/g;
                        let match;
                        const translations = {};

                        while ((match = regex.exec(translatedText)) !== null) {
                            const index = parseInt(match[1]);
                            const text = match[2].trim();
                            if (text) translations[index] = text;
                        }

                        // Apply translations to cells
                        batch.forEach((cell, i) => {
                            if (translations[i]) {
                                translatedRows[cell.rowIndex][cell.colIndex] = translations[i];
                            }
                            processedCells++;
                            setProgress({
                                current: processedCells,
                                total: totalItems,
                                phase: `Translating ${sheetName}... (${processedCells}/${totalCells} cells)`
                            });
                        });
                    } catch (batchErr) {
                        console.error('Batch translation error:', batchErr);
                        // Continue with next batch even if one fails
                        processedCells += batch.length;
                    }
                }

                translatedSheetsData[sheetName] = translatedRows;
            }

            // Update preview with translated data for selected sheet
            if (translatedSheetsData[selectedSheet]) {
                setTranslatedData(translatedSheetsData[selectedSheet]);
            }

            // Create translated workbook
            const newWb = XLSX.utils.book_new();
            sheetsToTranslate.forEach(sheetName => {
                const data = translatedSheetsData[sheetName] || allSheetsData[sheetName] || [];
                const newWs = XLSX.utils.aoa_to_sheet(data);

                // Try to copy column widths from original
                const originalSheet = workbook.Sheets[sheetName];
                if (originalSheet['!cols']) {
                    newWs['!cols'] = originalSheet['!cols'];
                }
                if (originalSheet['!rows']) {
                    newWs['!rows'] = originalSheet['!rows'];
                }
                if (originalSheet['!merges']) {
                    newWs['!merges'] = originalSheet['!merges'];
                }

                XLSX.utils.book_append_sheet(newWb, newWs, sheetName);
            });
            setTranslatedWorkbook(newWb);

            // Phase 2: Translate images
            if (images.length > 0) {
                setProgress({ current: processedCells, total: totalItems, phase: 'Translating images...' });

                const translatedImages = [...images];

                for (let i = 0; i < images.length; i++) {
                    const img = images[i];
                    setProgress({
                        current: processedCells + i + 1,
                        total: totalItems,
                        phase: `Translating image ${i + 1} of ${images.length}...`
                    });

                    try {
                        const response = await fetch(`${BACKEND_URL}/api/translate/gemini-vision`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: model || 'gemini-2.5-flash',
                                prompt: customPrompt,
                                imageBase64: img.data,
                                mimeType: img.mimeType
                            })
                        });

                        if (response.ok) {
                            const result = await response.json();
                            translatedImages[i] = {
                                ...img,
                                translated: result
                            };
                        }
                    } catch (imgErr) {
                        console.error(`Error translating image ${i}:`, imgErr);
                        translatedImages[i] = {
                            ...img,
                            translated: { error: imgErr.message }
                        };
                    }
                }

                setImageTranslations(translatedImages);
            }

            setProgress({ current: totalItems, total: totalItems, phase: 'Translation complete!' });

        } catch (err) {
            setError(`Translation error: ${err.message}`);
        } finally {
            setIsTranslating(false);
        }
    };

    // Download translated Excel
    const downloadTranslatedExcel = () => {
        if (!translatedWorkbook) return;

        // Generate filename
        const originalName = file?.name?.replace(/\.(xlsx|xls)$/i, '') || 'document';
        const filename = `${originalName}_translated.xlsx`;

        // Download
        XLSX.writeFile(translatedWorkbook, filename);
    };

    // Clear all
    const clearAll = () => {
        setFile(null);
        setWorkbook(null);
        setSheets([]);
        setSelectedSheet('');
        setAllSheetsData({});
        setPreviewData([]);
        setImages([]);
        setTranslatedWorkbook(null);
        setTranslatedData([]);
        setImageTranslations([]);
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
                        <p className="text-sm text-slate-500 dark:text-slate-400">Translate spreadsheet cells and embedded images</p>
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
                            Supports all sheets, text cells, and embedded images
                        </p>
                    </div>
                )}

                {/* File Loaded - Preview & Translation */}
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
                                            {sheets.length} sheet(s) • {totalCellsCount} translatable cells • {images.length} images
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* Translate All Sheets Toggle */}
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

                                    {/* Sheet selector for preview */}
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
                                                Translate {translateAllSheets ? 'All' : 'Sheet'}
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

                        {/* Data Preview / Translated Data */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <h3 className="font-medium text-slate-900 dark:text-white">
                                    {translatedData.length > 0 ? 'Translated Content' : 'Original Content'} - {selectedSheet}
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
                                                <td className="px-2 py-1 text-xs text-slate-400 border-r border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 w-8">
                                                    {rowIndex + 1}
                                                </td>
                                                {Array.isArray(row) && row.map((cell, colIndex) => (
                                                    <td
                                                        key={colIndex}
                                                        className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700 last:border-0 max-w-xs"
                                                        title={String(cell)}
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

                        {/* Image Translations */}
                        {(images.length > 0 || imageTranslations.length > 0) && (
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <button
                                    onClick={() => setShowImageResults(!showImageResults)}
                                    className="w-full px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Image className="w-4 h-4 text-slate-500" />
                                        <h3 className="font-medium text-slate-900 dark:text-white">
                                            Image Translations ({images.length})
                                        </h3>
                                    </div>
                                    {showImageResults ? (
                                        <ChevronUp className="w-4 h-4 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                </button>

                                {showImageResults && (
                                    <div className="p-4 space-y-4">
                                        {imageTranslations.length > 0 ? (
                                            imageTranslations.map((img, index) => (
                                                <div key={img.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-24 h-24 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            {img.data ? (
                                                                <img
                                                                    src={`data:${img.mimeType};base64,${img.data}`}
                                                                    alt={img.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Image className="w-8 h-8 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-slate-900 dark:text-white mb-2">{img.name}</p>
                                                            {img.translated?.error ? (
                                                                <p className="text-red-500 text-sm">Error: {img.translated.error}</p>
                                                            ) : img.translated?.hasText === false ? (
                                                                <p className="text-slate-500 text-sm italic">No text found in this image</p>
                                                            ) : img.translated ? (
                                                                <div className="space-y-2">
                                                                    {img.translated.extractedText && (
                                                                        <div>
                                                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Original text:</p>
                                                                            <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600">
                                                                                {img.translated.extractedText}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {img.translated.translatedText && (
                                                                        <div>
                                                                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Translated:</p>
                                                                            <p className="text-sm text-slate-700 dark:text-slate-300 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded border border-emerald-200 dark:border-emerald-800">
                                                                                {img.translated.translatedText}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="text-slate-400 text-sm">Not yet translated</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                                <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p>{images.length} image(s) detected</p>
                                                <p className="text-sm">Click "Translate All" to extract and translate text from images</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
