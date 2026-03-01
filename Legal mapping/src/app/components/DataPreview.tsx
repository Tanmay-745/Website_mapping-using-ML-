import { FileSpreadsheet } from 'lucide-react';
import { ParsedCSV } from '../utils/csvParser';
import { HeaderMapping } from '../utils/headerMatcher';

interface DataPreviewProps {
    parsedData: ParsedCSV;
    mappings: HeaderMapping[];
    exportResult: { data: Record<string, string>[], headers: string[] } | null;
}

export function DataPreview({ parsedData, mappings, exportResult }: DataPreviewProps) {
    const mappedData = exportResult?.data || null;
    let headers = exportResult?.headers || [];

    // Filter out headers that are entirely empty in the mappedData to match export behavior
    if (mappedData) {
        headers = headers.filter(header => {
            return mappedData.some(row => {
                const val = row[header];
                return val !== undefined && val !== null && String(val).trim() !== '';
            });
        });
    }

    const displayData = mappedData ? mappedData.slice(0, 5) : [];

    return (
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
                    <p className="text-sm text-gray-500">First 5 rows with mapped columns</p>
                </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                            {headers.map((header, index) => (
                                <th
                                    key={index}
                                    className="text-left px-4 py-3 font-semibold text-gray-700 border-b-2 border-blue-200"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.map((row: any, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                                {headers.map((header, colIndex) => (
                                    <td key={colIndex} className="px-4 py-3 text-gray-700">
                                        {row[header] || ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-50 rounded-full animate-pulse"></span>
                    Showing {displayData.length} of {mappedData?.length || 0} rows
                </p>
                <p className="text-xs font-medium text-blue-600">
                    {headers.length} columns displayed
                </p>
            </div>
        </div>
    );
}
