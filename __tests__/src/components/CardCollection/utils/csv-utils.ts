import Papa from "papaparse";

// Define the structure of a card in a collection for CSV exports/imports
export interface CardCSVData {
  id?: string;
  name: string;
  set?: string;
  rarity?: string;
  condition?: string;
  quantity: number;
  price?: number;
  notes?: string;
  dateAdded?: string;
}

// Required fields for valid CSV import
const requiredFields = ["name", "quantity"];

/**
 * Parse a CSV file into an array of objects
 */
export const parseCSVFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          reject(results.errors);
        } else {
          resolve(results.data);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

/**
 * Validate CSV data to ensure it contains the required fields
 */
export const validateCSVData = (
  data: any[]
): {
  isValid: boolean;
  errors: string[];
  data: CardCSVData[];
} => {
  const errors: string[] = [];

  // Check if the CSV has any data
  if (!data || data.length === 0) {
    return {
      isValid: false,
      errors: ["The CSV file does not contain any data"],
      data: [],
    };
  }

  // Check for required columns
  const firstRow = data[0];
  const missingRequiredFields = requiredFields.filter(
    (field) => !Object.keys(firstRow).includes(field)
  );

  if (missingRequiredFields.length > 0) {
    errors.push(
      `Missing required columns: ${missingRequiredFields.join(", ")}`
    );
  }

  // Validate each row
  const validData: CardCSVData[] = [];

  data.forEach((row, index) => {
    // Check for missing required values
    if (!row.name) {
      errors.push(`Row ${index + 1} is missing a card name`);
      return;
    }

    if (
      row.quantity === undefined ||
      row.quantity === null ||
      isNaN(row.quantity)
    ) {
      errors.push(`Row ${index + 1} is missing a valid quantity value`);
      return;
    }

    // Convert quantity to number
    const quantity = Number(row.quantity);
    if (quantity <= 0) {
      errors.push(`Row ${index + 1} has an invalid quantity (must be > 0)`);
      return;
    }

    validData.push({
      id: row.id,
      name: row.name,
      set: row.set,
      rarity: row.rarity,
      condition: row.condition,
      quantity: quantity,
      price: row.price ? Number(row.price) : undefined,
      notes: row.notes,
      dateAdded: row.dateAdded,
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    data: validData,
  };
};

/**
 * Export card collection data to CSV format
 */
export const exportToCSV = (
  cards: CardCSVData[],
  collectionName: string
): void => {
  // Format the data for CSV export
  const csvData = Papa.unparse(cards);

  // Create a blob from the CSV data
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });

  // Create a download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  // Set link properties
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${collectionName.replace(/\s+/g, "_")}_collection.csv`
  );
  link.style.visibility = "hidden";

  // Add to document, click and clean up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
