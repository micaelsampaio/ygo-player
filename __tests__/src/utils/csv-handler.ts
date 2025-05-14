/**
 * CSV Handler Utilities
 * Functions for importing and exporting card collections as CSV files
 */

// Interface for card data from/to CSV
export interface CSVCardData {
  name: string; // Card name (required)
  quantity?: number; // Quantity of the card (required)
  set?: string; // Set name
  setCode?: string; // Set code
  rarity?: string; // Card rarity
  condition?: string; // Card condition
  price?: number; // Card price
  notes?: string; // Notes about the card
  dateAdded?: string; // Date the card was added
  language?: string; // Card language
  cardNumber?: string; // Card number
  edition?: string; // Card edition (1st edition, unlimited, etc.)
  isFoil?: boolean; // Whether the card is foil
  [key: string]: any; // Allow any other properties
}

/**
 * Read a CSV file and return its contents as a string
 * @param file The CSV file to read
 * @returns A promise that resolves to the file contents as a string
 */
export const readCSVFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsText(file);
  });
};

/**
 * Generate a CSV string from card data
 * @param cards Array of card data objects
 * @returns CSV string
 */
export const generateCSV = (cards: CSVCardData[]): string => {
  if (cards.length === 0) {
    return "";
  }

  // Get all unique headers from all cards
  const headers = new Set<string>();
  cards.forEach((card) => {
    Object.keys(card).forEach((key) => headers.add(key));
  });

  // Convert headers to array and ensure name and quantity are first
  const headerRow = ["name", "quantity"];
  Array.from(headers).forEach((header) => {
    if (header !== "name" && header !== "quantity") {
      headerRow.push(header);
    }
  });

  // Build CSV content
  const rows = [headerRow];

  cards.forEach((card) => {
    const row: string[] = [];

    headerRow.forEach((header) => {
      let value = card[header] ?? "";

      // Handle special values
      if (
        typeof value === "string" &&
        (value.includes(",") || value.includes('"') || value.includes("\n"))
      ) {
        // Escape quotes by doubling them and wrap in quotes
        value = `"${value.replace(/"/g, '""')}"`;
      }

      row.push(String(value));
    });

    rows.push(row);
  });

  return rows.map((row) => row.join(",")).join("\n");
};

/**
 * Download a CSV string as a file
 * @param csvContent The CSV content to download
 * @param filename The name of the file to download
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Set link properties
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  // Append to the document, trigger the download, and clean up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parse CSV content into an array of card data objects
 * @param csvContent The CSV content to parse
 * @param headerMapping Optional mapping of CSV headers to card data properties
 * @returns Array of card data objects
 */
export const parseCSV = (
  csvContent: string,
  headerMapping: Record<string, string> = {}
): CSVCardData[] => {
  // Split by lines and filter out empty lines
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return [];
  }

  const cards: CSVCardData[] = [];

  // Get CSV headers (first row)
  const headers = parseCSVLine(lines[0]);

  // Process each data row
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // Skip rows with incorrect number of values
    if (values.length !== headers.length) {
      console.warn(`Skipping row ${i + 1} due to incorrect number of values`);
      continue;
    }

    const card: CSVCardData = { name: "", quantity: 1 };

    // Map values to card properties using headerMapping
    headers.forEach((header, index) => {
      const mappedProperty = headerMapping[header] || header;

      if (mappedProperty) {
        let value: any = values[index];

        // Convert value based on property type
        if (mappedProperty === "quantity" || mappedProperty === "price") {
          const numValue = Number(value);
          value = isNaN(numValue) ? undefined : numValue;
        } else if (mappedProperty === "isFoil") {
          value =
            value.toLowerCase() === "true" ||
            value === "1" ||
            value.toLowerCase() === "yes";
        }

        card[mappedProperty] = value;
      }
    });

    // Only add cards with a name and quantity
    if (card.name && card.quantity !== undefined) {
      cards.push(card);
    }
  }

  return cards;
};

/**
 * Parse a CSV line into an array of values, handling quoted values correctly
 * @param line The CSV line to parse
 * @returns Array of values
 */
const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : "";

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Double quotes within quoted string => single quote
        currentValue += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of value
      values.push(currentValue);
      currentValue = "";
    } else {
      // Normal character
      currentValue += char;
    }
  }

  // Add the last value
  values.push(currentValue);

  return values;
};

/**
 * Try to automatically detect the mapping between CSV headers and card properties
 * @param headers Array of CSV headers
 * @returns Mapping of CSV headers to card properties
 */
export const detectHeaderMapping = (
  headers: string[]
): Record<string, string> => {
  const mapping: Record<string, string> = {};

  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();

    // Try to match headers to properties
    if (lowerHeader.includes("name") || lowerHeader === "card") {
      mapping[header] = "name";
    } else if (
      lowerHeader.includes("qty") ||
      lowerHeader.includes("quantity") ||
      lowerHeader === "#"
    ) {
      mapping[header] = "quantity";
    } else if (lowerHeader === "set" || lowerHeader.includes("set name")) {
      mapping[header] = "set";
    } else if (lowerHeader.includes("set code") || lowerHeader === "code") {
      mapping[header] = "setCode";
    } else if (lowerHeader.includes("rarity")) {
      mapping[header] = "rarity";
    } else if (lowerHeader.includes("condition") || lowerHeader === "cond") {
      mapping[header] = "condition";
    } else if (
      lowerHeader.includes("price") ||
      lowerHeader.includes("value") ||
      lowerHeader === "$"
    ) {
      mapping[header] = "price";
    } else if (lowerHeader.includes("note")) {
      mapping[header] = "notes";
    } else if (lowerHeader.includes("date")) {
      mapping[header] = "dateAdded";
    } else if (lowerHeader.includes("lang")) {
      mapping[header] = "language";
    } else if (
      lowerHeader.includes("number") ||
      lowerHeader === "id" ||
      lowerHeader === "card id"
    ) {
      mapping[header] = "cardNumber";
    } else if (lowerHeader.includes("edition") || lowerHeader === "ed") {
      mapping[header] = "edition";
    } else if (lowerHeader.includes("foil") || lowerHeader === "holo") {
      mapping[header] = "isFoil";
    }
  });

  return mapping;
};
