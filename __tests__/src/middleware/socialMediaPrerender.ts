import { Request, Response, NextFunction } from "express";
import * as fs from "fs";
import * as path from "path";

// Regular expressions to detect common social media crawlers
const CRAWLER_USER_AGENT_PATTERN =
  /facebookexternalhit|Facebot|Twitterbot|Pinterest|Slackbot|TelegramBot|WhatsApp|LinkedInBot|baiduspider|googlebot|instagram|discordbot|vkShare|Embedly|redditbot|SocialFlow/i;

// Define a mapping of card IDs to absolute image URLs
const getCDNUrl = () => {
  // Try to use the environment variable, fallback to a production URL
  return process.env.VITE_YGO_CDN_URL || "https://cdn.ygo101.com";
};

interface DeckData {
  name: string;
  mainDeck: any[];
  extraDeck: any[];
  sideDeck?: any[];
  notes?: string;
  coverCardId?: number;
}

/**
 * Parses YDKE URL format and returns deck information
 */
const parseYdkeUrl = (ydkeData: string, deckName: string): DeckData => {
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
};

/**
 * Decode YDKE base64 data and return the count of cards
 */
const decodeYdkeCount = (data: string): number => {
  if (!data) return 0;

  try {
    // For the prerendering, we only need the count of cards, not the actual data
    const binary = Buffer.from(data, "base64");
    return Math.floor(binary.length / 4); // Each card ID is 4 bytes
  } catch (error) {
    console.error("Error decoding YDKE data count:", error);
    return 0;
  }
};

/**
 * Generate HTML with Open Graph meta tags for shared deck
 */
const generatePrerenderedHTML = (
  deckData: DeckData,
  coverCardId: number | null,
  shareUrl: string
): string => {
  const CDN_URL = getCDNUrl();
  const imageUrl = coverCardId
    ? `${CDN_URL}/images/cards/${coverCardId}.jpg`
    : `${CDN_URL}/images/ygo101-social-preview.jpg`;

  const mainCount = deckData.mainDeck.length;
  const extraCount = deckData.extraDeck.length;
  const sideCount = deckData.sideDeck?.length || 0;

  const cardCountText = `${mainCount} Main | ${extraCount} Extra${
    sideCount > 0 ? ` | ${sideCount} Side` : ""
  }`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${deckData.name} - YGO101 Deck</title>
  
  <!-- Basic Meta Tags -->
  <meta name="description" content="View this Yu-Gi-Oh! deck on YGO101: ${deckData.name} (${cardCountText})" />
  
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
  
  <!-- Meta refresh to redirect browsers to the actual page -->
  <meta http-equiv="refresh" content="0;url=${shareUrl}" />
</head>
<body>
  <p>Redirecting to deck page...</p>
</body>
</html>`;
};

/**
 * Express middleware to handle social media crawler requests
 */
export const socialMediaPrerenderMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userAgent = req.headers["user-agent"] || "";
  const isCrawler = CRAWLER_USER_AGENT_PATTERN.test(userAgent);
  const url = req.originalUrl || req.url;

  // Debug log
  console.log(
    `Request: ${url} | User-Agent: ${userAgent} | isCrawler: ${isCrawler}`
  );

  // Only prerender for shared deck URLs
  if (isCrawler && url.includes("/my/decks/public/")) {
    try {
      console.log(
        "Social media crawler detected! Providing prerendered content..."
      );

      // Parse URL to get deck information
      const urlObj = new URL(req.protocol + "://" + req.get("host") + url);
      const deckName =
        url.split("/my/decks/public/")[1]?.split("?")[0] || "Shared Deck";
      const searchParams = urlObj.searchParams;

      // Get deck data from URL parameters
      const ydkeData = searchParams.get("data") || "";
      const deckData = parseYdkeUrl(ydkeData, deckName);

      // Get cover card ID
      const coverCardId = searchParams.get("cover")
        ? parseInt(searchParams.get("cover") || "", 10)
        : null;

      // Generate prerendered HTML with proper meta tags
      const html = generatePrerenderedHTML(
        deckData,
        coverCardId,
        urlObj.toString()
      );

      // Send the prerendered HTML to the crawler
      res.setHeader("Content-Type", "text/html");
      res.send(html);
      return;
    } catch (error) {
      console.error("Error in social media prerender middleware:", error);
      // If there's an error, continue to the next middleware
      next();
      return;
    }
  }

  // For non-crawler requests, continue to the next middleware
  next();
};

/**
 * Create a Vite plugin that adds the social media prerender middleware
 */
export function vitePluginSocialMediaPrerender() {
  return {
    name: "vite-plugin-social-media-prerender",
    configureServer(server: any) {
      return () => {
        server.middlewares.use(socialMediaPrerenderMiddleware);
      };
    },
  };
}
