// Simple Express server for social media prerendering
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
// Import dotenv for loading .env files
import dotenv from "dotenv";

// Load environment variables from .env file in the __tests__ directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../.."); // This points to /Users/ivoribeiro/Code/ivo/ygo/ygo-player/__tests__
const envPath = resolve(projectRoot, ".env");

// Load .env file directly
dotenv.config({ path: envPath });
console.log(`Loading environment variables from: ${envPath}`);

// Regular expressions to detect common social media crawlers
const CRAWLER_USER_AGENT_PATTERN =
  /facebookexternalhit|Facebot|Twitterbot|Pinterest|Slackbot|TelegramBot|WhatsApp|LinkedInBot|baiduspider|googlebot|instagram|discordbot|vkShare|Embedly|redditbot|SocialFlow/i;

const app = express();
const port = process.env.PORT || 3000;

// Base URL for your application (change this to match your production URL)
const BASE_URL = process.env.BASE_URL || "https://ygo101.com";
// Use VITE_YGO_CDN_URL instead of CDN_URL to match the variable in .env
const CDN_URL = process.env.VITE_YGO_CDN_URL || "https://cdn.ygo101.com";

// DEBUG: Dump environment variables
console.log("Environment variables:");
console.log("BASE_URL:", BASE_URL);
console.log("CDN_URL:", CDN_URL);
console.log("VITE_YGO_CDN_URL:", process.env.VITE_YGO_CDN_URL);

// Create a log file
const logStream = fs.createWriteStream(
  resolve(__dirname, "../../../prerender-logs.txt"),
  { flags: "a" }
);

// Logger function to write to console and file
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + "\n");
};

// Decode YDKE base64 data and return the count of cards
const decodeYdkeCount = (data) => {
  if (!data) return 0;

  try {
    // For the prerendering, we only need the count of cards, not the actual data
    const binary = Buffer.from(data, "base64");
    return Math.floor(binary.length / 4); // Each card ID is 4 bytes
  } catch (error) {
    log(`Error decoding YDKE data count: ${error.message}`);
    return 0;
  }
};

// Parse YDKE URL format and return deck information
const parseYdkeUrl = (ydkeData, deckName) => {
  try {
    let ydkeUrl = ydkeData;
    if (!ydkeUrl.startsWith("ydke://")) {
      ydkeUrl = decodeURIComponent(ydkeUrl);
    }

    if (ydkeUrl.startsWith("ydke://")) {
      ydkeUrl = ydkeUrl.substring(7);
    }

    // Split the URL into main, extra, and side deck parts
    const parts = ydkeUrl.split("!");
    const mainData = parts[0] || "";
    const extraData = parts.length > 1 ? parts[1] : "";
    const sideData = parts.length > 2 ? parts[2] : "";

    // For prerendering purposes, we only need the counts
    const mainDeckCount = decodeYdkeCount(mainData);
    const extraDeckCount = decodeYdkeCount(extraData);
    const sideDeckCount = decodeYdkeCount(sideData);

    return {
      name: decodeURIComponent(deckName),
      mainDeck: Array(mainDeckCount).fill({}),
      extraDeck: Array(extraDeckCount).fill({}),
      sideDeck: Array(sideDeckCount).fill({}),
    };
  } catch (error) {
    log(`Error parsing YDKE URL: ${error.message}`);
    // Return a default structure to avoid breaking the flow
    return {
      name: deckName || "Shared Deck",
      mainDeck: Array(40).fill({}),
      extraDeck: Array(15).fill({}),
      sideDeck: Array(15).fill({}),
    };
  }
};

// Generate HTML with Open Graph meta tags for shared deck
const generatePrerenderedHTML = (deckData, coverCardId, shareUrl) => {
  // Ensure we have absolute URLs for images
  const imageUrl = coverCardId
    ? `${CDN_URL}/images/cards/${coverCardId}.jpg`
    : `${BASE_URL}/images/ygo101-social-preview.jpg`;

  log(`Generated image URL: ${imageUrl}`);

  const mainCount = deckData.mainDeck.length;
  const extraCount = deckData.extraDeck.length;
  const sideCount = deckData.sideDeck?.length || 0;

  const cardCountText = `${mainCount} Main | ${extraCount} Extra${
    sideCount > 0 ? ` | ${sideCount} Side` : ""
  }`;

  // Build the full HTML
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${deckData.name} - YGO101 Deck</title>
  
  <!-- Basic Meta Tags -->
  <meta name="description" content="View this Yu-Gi-Oh! deck on YGO101: ${
    deckData.name
  } (${cardCountText})" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${deckData.name} - YGO101 Deck" />
  <meta property="og:description" content="Check out this Yu-Gi-Oh! deck on YGO101: ${cardCountText}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:site_name" content="YGO101" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${deckData.name} - YGO101 Deck" />
  <meta name="twitter:description" content="Check out this Yu-Gi-Oh! deck on YGO101: ${cardCountText}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Additional Open Graph tags to improve sharing -->
  <meta property="og:image:width" content="421" />
  <meta property="og:image:height" content="614" />
  <meta property="og:image:alt" content="Yu-Gi-Oh! deck: ${deckData.name}" />
  
  <!-- Client-side JavaScript to help with debugging -->
  <script>
    console.log("Prerendered page loaded successfully!");
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('debugInfo').textContent = 
        "Page loaded at: " + new Date().toString();
    });
  </script>
  
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 0; 
      padding: 20px; 
      background: #f5f5f5; 
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white; 
      padding: 20px; 
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-top: 0; }
    h2 { color: #555; }
    .card-image { 
      max-width: 300px; 
      border-radius: 8px;
      box-shadow: 0 3px 15px rgba(0,0,0,0.2);
      margin: 20px 0;
    }
    .info { margin-bottom: 10px; }
    .debug { 
      margin-top: 30px;
      padding: 10px;
      background: #f0f0f0;
      border-left: 4px solid #ccc;
      font-family: monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>YGO101 Deck Preview</h1>
    <h2>${deckData.name}</h2>
    
    <div class="info">This is a prerendered page for social media crawlers.</div>
    <div class="info">Card count: ${cardCountText}</div>
    <div class="info">Cover card ID: ${coverCardId || "None"}</div>
    
    <img class="card-image" src="${imageUrl}" alt="${deckData.name}" />
    
    <div>Redirecting to the actual deck page in 5 seconds...</div>
    
    <div class="debug">
      <div>Generated at: ${new Date().toString()}</div>
      <div>URL: ${shareUrl}</div>
      <div id="debugInfo"></div>
    </div>
  </div>
  
  <script>
    // Add a delayed redirect instead of using meta refresh
    // This gives users time to see the debug information
    setTimeout(function() {
      window.location.href = "${shareUrl}";
    }, 5000);
  </script>
</body>
</html>`;

  return html;
};

// For testing only - simple HTML to verify server is working
const generateTestHTML = () => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>YGO101 Prerender Test Page</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .card { 
      max-width: 500px; 
      margin: 0 auto; 
      padding: 20px; 
      border: 1px solid #ddd; 
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
  </style>
</head>
<body>
  <div class="card">
    <h1>YGO101 Prerender Server</h1>
    <p>The prerendering server is running correctly!</p>
    <p>Generated at: ${new Date().toString()}</p>
    <p>To test the deck preview functionality, visit a URL like:</p>
    <pre>http://localhost:3000/my/decks/public/DeckName?data=ydke://...&cover=12345&force_crawler=true</pre>
  </div>
</body>
</html>`;
};

// Special route just for testing
app.get("/prerender-test", (req, res) => {
  log("Serving test page");
  res.send(generateTestHTML());
});

// Express middleware to handle social media crawler requests
const socialMediaPrerenderMiddleware = (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";
  const url = req.originalUrl || req.url;
  const isCrawler = CRAWLER_USER_AGENT_PATTERN.test(userAgent);
  const forceCrawler = req.query.force_crawler === "true";

  // DEBUG: Enhanced request logging
  log(`----- REQUEST -----`);
  log(`URL: ${url}`);
  log(`User-Agent: ${userAgent}`);
  log(`Is crawler: ${isCrawler}`);
  log(`Force crawler: ${forceCrawler}`);
  log(`Query params: ${JSON.stringify(req.query)}`);
  log(`------------------`);

  // Check if this is a shared deck URL that we should handle
  // More flexible path matching
  const isSharedDeckUrl =
    url.includes("/my/decks/public/") ||
    url.includes("/decks/public/") ||
    url.includes("?data=ydke");

  if ((isCrawler || forceCrawler) && isSharedDeckUrl) {
    try {
      log(`🔍 Social media crawler detected! Providing prerendered content...`);

      // Parse URL to get deck information
      const fullUrl = `${req.protocol}://${req.get("host")}${url}`;
      const urlObj = new URL(fullUrl);

      // Extract deck name from URL path
      let deckName = "Shared Deck";
      if (url.includes("/my/decks/public/")) {
        deckName = url.split("/my/decks/public/")[1]?.split("?")[0] || deckName;
      } else if (url.includes("/decks/public/")) {
        deckName = url.split("/decks/public/")[1]?.split("?")[0] || deckName;
      }

      // Decode the deck name
      try {
        deckName = decodeURIComponent(deckName);
      } catch (e) {
        log(`Error decoding deck name: ${e.message}`);
      }

      const searchParams = urlObj.searchParams;

      // Get deck data from URL parameters
      const ydkeData = searchParams.get("data") || "";
      log(
        `YDKE data: ${ydkeData ? `${ydkeData.substring(0, 20)}...` : "None"}`
      );

      const deckData = parseYdkeUrl(ydkeData, deckName);

      // Get cover card ID
      const coverCardParam = searchParams.get("cover");
      const coverCardId = coverCardParam ? parseInt(coverCardParam, 10) : null;

      log(
        `Deck data: ${JSON.stringify({
          name: deckData.name,
          mainCount: deckData.mainDeck.length,
          extraCount: deckData.extraDeck.length,
          sideCount: deckData.sideDeck?.length || 0,
          coverCardId,
        })}`
      );

      // Generate prerendered HTML with proper meta tags
      const html = generatePrerenderedHTML(
        deckData,
        coverCardId,
        urlObj.toString()
      );

      // Send the prerendered HTML to the crawler
      res.setHeader("Content-Type", "text/html");
      res.setHeader("X-Prerendered", "true");
      res.send(html);
      log(`✅ Prerendered HTML sent successfully!`);
      return;
    } catch (error) {
      log(`❌ Error in social media prerender middleware: ${error.message}`);
      log(error.stack);
      // If there's an error, continue to regular handling
      next();
      return;
    }
  } else if (forceCrawler) {
    log(
      `⚠️ force_crawler=true was specified but URL does not match shared deck pattern: ${url}`
    );
  }

  // For non-crawler requests or non-deck URLs, proxy to the Vite server
  log(`👉 Forwarding request to Vite server: ${url}`);
  next();
};

// Add the prerender middleware
app.use(socialMediaPrerenderMiddleware);

// Handle static files for testing (like images)
app.use("/static", express.static(resolve(__dirname, "../../public")));

// Proxy all other requests to your Vite development server
const devServerProxy = createProxyMiddleware({
  target: "http://localhost:5173", // Your Vite dev server
  changeOrigin: true,
  ws: true,
  logLevel: "debug",
  onProxyReq: (proxyReq, req, res) => {
    log(`Proxying request: ${req.method} ${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    log(`Proxy response: ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    log(`Proxy error: ${err.message}`);
    res.writeHead(500, {
      "Content-Type": "text/html",
    });
    res.end(`
      <h1>Proxy Error</h1>
      <p>Failed to connect to the Vite development server.</p>
      <p>Make sure your Vite server is running at http://localhost:5173</p>
      <pre>${err.message}</pre>
    `);
  },
});

app.use("/", devServerProxy);

// Add an error handler
app.use((err, req, res, next) => {
  log(`Server error: ${err.message}`);
  log(err.stack);
  res.status(500).send(`
    <h1>Server Error</h1>
    <p>${err.message}</p>
    <pre>${err.stack}</pre>
  `);
});

// Start the server
app.listen(port, () => {
  log("");
  log("🚀 ======================================== 🚀");
  log(`🌐 Prerender server running at http://localhost:3000`);
  log(`🔄 Proxying requests to Vite dev server at http://localhost:5173`);
  log(
    `📝 Writing logs to: ${resolve(__dirname, "../../../prerender-logs.txt")}`
  );
  log(`🧪 To test crawler behavior, append ?force_crawler=true to any URL`);
  log(`🔍 For a simple test page, visit: http://localhost:3000/prerender-test`);
  log(
    `📄 Example deck URL: http://localhost:3000/my/decks/public/MyDeck?data=ydke://...&cover=12345&force_crawler=true`
  );
  log("🚀 ======================================== 🚀");
  log("");
});
