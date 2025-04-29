import React from "react";
import { Helmet } from "react-helmet";

interface DeckSocialPreviewProps {
  deck: {
    name: string;
    mainDeck: any[];
    extraDeck: any[];
    sideDeck?: any[];
    notes?: string;
    coverCardId?: number;
  };
  shareUrl: string;
  deckId: string;
}

/**
 * Component to handle social media preview meta tags for deck sharing
 */
const DeckSocialPreview: React.FC<DeckSocialPreviewProps> = ({
  deck,
  shareUrl,
  deckId,
}) => {
  // Generate a preview image URL that social media platforms can reliably access
  const getPreviewImageUrl = () => {
    // If we have a cover card ID, use that card's image directly
    if (deck.coverCardId) {
      const CDN_URL =
        import.meta.env.VITE_YGO_CDN_URL || "http://127.0.0.1:8080";
      // Use the full-size card image from the CDN since social media platforms prefer larger images
      return `${CDN_URL}/images/cards/${deck.coverCardId}.jpg`;
    }

    // Fall back to a default card image
    // First, check if there's a monster card in the deck to use
    const firstMonster = deck.mainDeck.find((card) =>
      card.type?.toLowerCase().includes("monster")
    );

    if (firstMonster) {
      const CDN_URL =
        import.meta.env.VITE_YGO_CDN_URL || "http://127.0.0.1:8080";
      return `${CDN_URL}/images/cards/${firstMonster.id}.jpg`;
    }

    // If no monster cards, use a default image
    const baseUrl = window.location.origin;
    return `${baseUrl}/images/ygo101-social-preview.jpg`;
  };

  const previewImageUrl = getPreviewImageUrl();

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
      <meta property="og:image" content={previewImageUrl} />
      <meta property="og:url" content={shareUrl} />
      <meta property="og:site_name" content="YGO101" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${deck.name} - YGO101 Deck`} />
      <meta
        name="twitter:description"
        content={`Check out this Yu-Gi-Oh! deck on YGO101: ${deck.mainDeck.length} Main | ${deck.extraDeck.length} Extra cards`}
      />
      <meta name="twitter:image" content={previewImageUrl} />

      {/* Additional Open Graph tags to improve sharing */}
      <meta property="og:image:width" content="421" />
      <meta property="og:image:height" content="614" />
      <meta property="og:image:alt" content={`Yu-Gi-Oh! deck: ${deck.name}`} />
    </Helmet>
  );
};

export default DeckSocialPreview;
