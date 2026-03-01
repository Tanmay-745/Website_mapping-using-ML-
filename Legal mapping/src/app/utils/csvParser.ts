import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedCSV {
  headers: string[];
  data: Record<string, string>[];
  fileName: string;
}

export function parseCSVFile(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {

    // Check if the file is an Excel file
    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          // Parse the Excel binary data
          const workbook = XLSX.read(data, { type: 'binary', raw: true });

          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON. 
          // defval ensures empty cells are represented as empty strings rather than completely missing keys
          // raw: false ensures cells formatted as numbers/dates come out as strings as displayed (prevents scientific notation truncation if the cell had enough space or was parsed internally as text)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false
          }) as Record<string, string>[];

          if (jsonData.length === 0) {
            resolve({ headers: [], data: [], fileName: file.name });
            return;
          }

          // Extract headers from the first object
          const headers = Object.keys(jsonData[0]);

          resolve({
            headers,
            data: jsonData,
            fileName: file.name,
          });
        } catch (error) {
          reject(new Error("Failed to parse Excel file."));
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);

      return;
    }

    // Default to PapaParse for standard CSV files
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const data = results.data as Record<string, string>[];

        resolve({
          headers,
          data,
          fileName: file.name,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
