const getDecksData = () => {
  const allKeys = Object.keys(localStorage);
  const decksData: Record<string, any> = {};

  allKeys
    .filter((key) => key.startsWith("deck_"))
    .forEach((key) => {
      try {
        decksData[key] = JSON.parse(localStorage.getItem(key) || "");
      } catch (err) {
        console.error(`Error parsing deck ${key}:`, err);
      }
    });

  return decksData;
};

const getReplaysData = () => {
  const allKeys = Object.keys(localStorage);
  const replaysData: Record<string, any> = {};

  allKeys
    .filter((key) => key.startsWith("replay_"))
    .forEach((key) => {
      try {
        replaysData[key] = JSON.parse(localStorage.getItem(key) || "");
      } catch (err) {
        console.error(`Error parsing replay ${key}:`, err);
      }
    });

  return replaysData;
};

export const exportAllData = () => {
  const data = {
    decks: getDecksData(),
    replays: getReplaysData(),
    exportDate: new Date().toISOString(),
    version: "1.0.0",
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ygo-data-export-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importAllData = async (file: File) => {
  try {
    const content = await file.text();
    const data = JSON.parse(content);

    // Validate data structure
    if (!data.decks || !data.replays || !data.version) {
      throw new Error("Invalid data format");
    }

    // Import decks
    Object.entries(data.decks).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });

    // Import replays
    Object.entries(data.replays).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });

    return {
      decksCount: Object.keys(data.decks).length,
      replaysCount: Object.keys(data.replays).length,
    };
  } catch (err) {
    console.error("Error importing data:", err);
    throw new Error("Failed to import data. Make sure the file is valid.");
  }
};
