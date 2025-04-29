import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import { YGODeckToImage } from "ygo-core-images-utils";

interface DeckSocialPreviewProps {
  deck: {
    name: string;
    mainDeck: any[];
    extraDeck: any[];
    sideDeck?: any[];
    notes?: string;
  };
  shareUrl: string;
  deckId: string;
}

/**
 * Component to handle social media preview meta tags for deck sharing
 * Dynamically generates and sets Open Graph meta tags
 */
const DeckSocialPreview: React.FC<DeckSocialPreviewProps> = ({
  deck,
  shareUrl,
  deckId,
}) => {
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(
    null
  );

  useEffect(() => {
    const generatePreview = async () => {
      if (!deck) return;

      try {
        // Create a canvas element in memory
        const tempCanvas = document.createElement("canvas");

        // Use the YGODeckToImage directly to render to the canvas
        const deckBuilder = new YGODeckToImage({
          name: deck.name,
          mainDeck: deck.mainDeck,
          extraDeck: deck.extraDeck,
          sideDeck: deck.sideDeck,
          cdnUrl: import.meta.env.VITE_YGO_CDN_URL,
          showBranding: true,
        });

        // Instead of downloading, get the image as a data URL
        const imageDataUrl = await deckBuilder.toImage({
          canvas: tempCanvas,
          download: false,
          maxWidth: 1200,
          maxHeight: 630,
        });

        setPreviewImageUrl(imageDataUrl);
      } catch (error) {
        console.error("Failed to generate deck preview image:", error);
      }
    };

    generatePreview();
  }, [deck]);

  const baseUrl = window.location.origin;
  const defaultImage = `${baseUrl}/images/default-deck-preview.jpg`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{`${deck.name} - YGO101 Deck`}</title>
      <meta
        name="description"
        content={`View this Yu-Gi-Oh! deck on YGO101: ${deck.name} (${
          deck.mainDeck.length
        } Main | ${deck.extraDeck.length} Extra${
          deck.sideDeck && deck.sideDeck.length
            ? ` | ${deck.sideDeck.length} Side`
            : ""
        })`}
      />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${deck.name} - YGO101 Deck`} />
      <meta
        property="og:description"
        content={`Check out this Yu-Gi-Oh! deck on YGO101: ${deck.mainDeck.length} Main | ${deck.extraDeck.length} Extra cards`}
      />
      <meta property="og:image" content={previewImageUrl || defaultImage} />
      <meta property="og:url" content={shareUrl} />
      <meta property="og:site_name" content="YGO101" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${deck.name} - YGO101 Deck`} />
      <meta
        name="twitter:description"
        content={`Check out this Yu-Gi-Oh! deck on YGO101: ${deck.mainDeck.length} Main | ${deck.extraDeck.length} Extra cards`}
      />
      <meta name="twitter:image" content={previewImageUrl || defaultImage} />

      {/* Additional Open Graph tags to improve sharing */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
    </Helmet>
  );
};

export default DeckSocialPreview;
