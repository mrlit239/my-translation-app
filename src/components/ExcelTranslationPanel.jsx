import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Languages, Download, Loader2, Image, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
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
    const [previewData, setPreviewData] = useState([]);
    const [images, setImages] = useState([]);
    const [isTranslating, setIsTranslating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
    const [translatedData, setTranslatedData] = useState([]);
    const [imageTranslations, setImageTranslations] = useState([]);
    const [error, setError] = useState('');
    const [showImageResults, setShowImageResults] = useState(true);

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
            const wb = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });

            setWorkbook(wb);
            setSheets(wb.SheetNames);
            setSelectedSheet(wb.SheetNames[0]);

            // Parse first sheet for preview
            parseSheet(wb, wb.SheetNames[0]);

            // Extract images if any
            extractImages(wb, wb.SheetNames[0]);

        } catch (err) {
            setError(`Error reading Excel file: ${err.message}`);
        }
    };

    // Parse sheet data
    const parseSheet = (wb, sheetName) => {
        const sheet = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        setPreviewData(data);
        setTranslatedData([]);
    };

    // Extract embedded images from Excel
    const extractImages = (wb, sheetName) => {
        const extractedImages = [];

        // Check for images in the workbook
        // xlsx library stores images in wb.Sheets[sheetName]['!images'] or wb.Sheets[sheetName]['!drawings']
        const sheet = wb.Sheets[sheetName];

        // Method 1: Check for embedded images via !images property
        if (sheet['!images']) {
            sheet['!images'].forEach((img, index) => {
                if (img.data) {
                    extractedImages.push({
                        id: `img-${index}`,
                        name: img.name || `Image ${index + 1}`,
                        data: img.data,
                        mimeType: img.type || 'image/png',
                        cell: img.cell || 'Unknown',
                        translated: null
                    });
                }
            });
        }

        // Method 2: Check in workbook's media folder (for newer xlsx format)
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
        if (workbook) {
            parseSheet(workbook, sheetName);
            extractImages(workbook, sheetName);
        }
    };

    // Count translatable cells
    const countTranslatableCells = () => {
        let count = 0;
        previewData.forEach(row => {
            row.forEach(cell => {
                if (cell && typeof cell === 'string' && cell.trim().length > 0) {
                    count++;
                }
            });
        });
        return count;
    };

    // Translate all content
    const translateAll = async () => {
        if (!workbook || previewData.length === 0) return;

        setIsTranslating(true);
        setError('');

        const totalCells = countTranslatableCells();
        const totalImages = images.length;
        const totalItems = totalCells + totalImages;

        try {
            // Phase 1: Translate text cells
            setProgress({ current: 0, total: totalItems, phase: 'Translating text cells...' });

            const translated = [];
            let processedCells = 0;

            // Collect all non-empty cells for batch translation
            const cellsToTranslate = [];
            previewData.forEach((row, rowIndex) => {
                row.forEach((cell, colIndex) => {
                    if (cell && typeof cell === 'string' && cell.trim().length > 0) {
                        cellsToTranslate.push({ rowIndex, colIndex, text: cell });
                    }
                });
            });

            // Batch translate cells (group by ~50 cells or 5000 chars)
            const batches = [];
            let currentBatch = [];
            let currentBatchChars = 0;

            cellsToTranslate.forEach(cell => {
                if (currentBatch.length >= 30 || currentBatchChars + cell.text.length > 4000) {
                    if (currentBatch.length > 0) batches.push(currentBatch);
                    currentBatch = [cell];
                    currentBatchChars = cell.text.length;
                } else {
                    currentBatch.push(cell);
                    currentBatchChars += cell.text.length;
                }
            });
            if (currentBatch.length > 0) batches.push(currentBatch);

            // Create empty translated data structure
            const translatedRows = previewData.map(row => [...row]);

            // Process batches
            for (const batch of batches) {
                // Format batch for translation
                const batchText = batch.map((cell, i) => `[${i}] ${cell.text}`).join('\n---\n');

                const response = await fetch(`${BACKEND_URL}/api/translate/gemini`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: model || 'gemini-2.5-flash',
                        prompt: `${customPrompt}\n\nIMPORTANT: You are translating cells from an Excel spreadsheet. Each cell is marked with [number]. Translate each cell and keep the [number] markers in your output so I can match them. Keep translations concise and maintain the original meaning.`,
                        text: batchText
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Translation failed');
                }

                const result = await response.json();
                const translatedText = result.translation || '';

                // Parse translated results
                const translatedParts = translatedText.split(/\[(\d+)\]/);
                const translations = {};

                for (let i = 1; i < translatedParts.length; i += 2) {
                    const index = parseInt(translatedParts[i]);
                    const text = translatedParts[i + 1]?.trim().replace(/^[\s\-:]+/, '').replace(/---$/, '').trim() || '';
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
                        phase: `Translating text cells... (${processedCells}/${totalCells})`
                    });
                });
            }

            setTranslatedData(translatedRows);

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
        if (translatedData.length === 0) return;

        // Create new workbook with translated data
        const newWb = XLSX.utils.book_new();
        const newWs = XLSX.utils.aoa_to_sheet(translatedData);
        XLSX.utils.book_append_sheet(newWb, newWs, selectedSheet);

        // Generate filename
        const originalName = file?.name?.replace(/\.(xlsx|xls)$/i, '') || 'document';
        const filename = `${originalName}_translated.xlsx`;

        // Download
        XLSX.writeFile(newWb, filename);
    };

    // Clear all
    const clearAll = () => {
        setFile(null);
        setWorkbook(null);
        setSheets([]);
        setSelectedSheet('');
        setPreviewData([]);
        setImages([]);
        setTranslatedData([]);
        setImageTranslations([]);
        setError('');
        setProgress({ current: 0, total: 0, phase: '' });
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
                            Supports text cells and embedded images
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
                                            {countTranslatableCells()} text cells • {images.length} images
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
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
                                        disabled={isTranslating}
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
                                                Translate All
                                            </>
                                        )}
                                    </button>

                                    {translatedData.length > 0 && (
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
                                        <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 transition-all duration-300"
                                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Data Preview / Translated Data */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="font-medium text-slate-900 dark:text-white">
                                    {translatedData.length > 0 ? 'Translated Content' : 'Original Content'}
                                </h3>
                            </div>
                            <div className="overflow-auto max-h-96">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {(translatedData.length > 0 ? translatedData : previewData).slice(0, 50).map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                {row.map((cell, colIndex) => (
                                                    <td
                                                        key={colIndex}
                                                        className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700 last:border-0 whitespace-nowrap max-w-xs truncate"
                                                        title={String(cell)}
                                                    >
                                                        {String(cell)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 50 && (
                                    <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 text-center bg-slate-50 dark:bg-slate-800/50">
                                        Showing first 50 rows of {previewData.length}
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
