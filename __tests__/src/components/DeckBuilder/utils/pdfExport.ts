import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Deck, DeckAnalytics } from "../types";
import { createRoot } from "react-dom/client";
import { getCardImageUrl } from "../../../utils/cardImages";

interface PdfExportOptions {
  includeAdvancedAnalysis?: boolean;
  includeProbabilityAnalysis?: boolean;
  customFileName?: string;
}

/**
 * Creates and downloads a PDF report of deck analysis
 * This version avoids opening modals by directly rendering the content
 */
export const exportDeckAnalysisToPdf = async (
  deck: Deck,
  analytics: DeckAnalytics,
  options: PdfExportOptions = {},
  // References to the component's render functions
  renderFunctions?: {
    renderAdvancedAnalysisContent?: () => React.ReactNode;
    renderProbabilityContent?: () => React.ReactNode;
  }
) => {
  const {
    includeAdvancedAnalysis = true,
    includeProbabilityAnalysis = true,
    customFileName,
  } = options;

  const fileName = customFileName || `${deck.name}_analysis.pdf`;

  try {
    console.log("Starting PDF export process");

    // Create a temporary container for rendering content
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "0";
    tempContainer.style.visibility = "hidden";
    document.body.appendChild(tempContainer);

    // Get the basic analysis section
    const basicSection = document.getElementById("basic-analysis-section");
    if (!basicSection) {
      console.error("Could not find basic analysis section");
      return;
    }

    // Create temporary elements for advanced and probability sections
    let advancedSection: HTMLElement | null = null;
    let probabilitySection: HTMLElement | null = null;

    // If we have render functions from the component, use them instead of opening modals
    if (renderFunctions) {
      if (
        includeAdvancedAnalysis &&
        renderFunctions.renderAdvancedAnalysisContent
      ) {
        console.log("Rendering advanced analysis directly");
        const advancedContainer = document.createElement("div");
        advancedContainer.id = "temp-advanced-analysis-section";
        tempContainer.appendChild(advancedContainer);

        // Use createRoot instead of ReactDOM.render for React 18+
        const advancedRoot = createRoot(advancedContainer);
        advancedRoot.render(
          renderFunctions.renderAdvancedAnalysisContent() as React.ReactElement
        );

        // Wait a moment for React to finish rendering
        await new Promise((resolve) => setTimeout(resolve, 100));
        advancedSection = advancedContainer;
      }

      if (
        includeProbabilityAnalysis &&
        renderFunctions.renderProbabilityContent
      ) {
        console.log("Rendering probability analysis directly");
        const probabilityContainer = document.createElement("div");
        probabilityContainer.id = "temp-probability-analysis-section";
        tempContainer.appendChild(probabilityContainer);

        // Use createRoot instead of ReactDOM.render for React 18+
        const probabilityRoot = createRoot(probabilityContainer);
        probabilityRoot.render(
          renderFunctions.renderProbabilityContent() as React.ReactElement
        );

        // Wait a moment for React to finish rendering
        await new Promise((resolve) => setTimeout(resolve, 100));
        probabilitySection = probabilityContainer;
      }
    } else {
      // If we don't have the render functions, fall back to a simplified approach
      console.log("Using simplified approach - creating static content");

      // For advanced analysis, create a simplified version
      if (includeAdvancedAnalysis) {
        const advancedContainer = document.createElement("div");
        advancedContainer.id = "temp-advanced-analysis-section";
        advancedContainer.className = "full-analysis";

        // Create a basic structure similar to the real advanced analysis section
        advancedContainer.innerHTML = `
          <section class="analysis-section">
            <h3>Advanced Analysis Content</h3>
            <p>This section would contain detailed information about deck archetypes, attribute distribution, 
            level distribution, performance metrics, and improvement tips.</p>
            <p>For full details, please view the advanced analysis in the application.</p>
          </section>
        `;

        tempContainer.appendChild(advancedContainer);
        advancedSection = advancedContainer;
      }

      // For probability analysis, create a simplified version
      if (includeProbabilityAnalysis) {
        const probabilityContainer = document.createElement("div");
        probabilityContainer.id = "temp-probability-analysis-section";
        probabilityContainer.className = "full-probability-analysis";

        // Create a basic structure similar to the real probability section
        probabilityContainer.innerHTML = `
          <section class="analysis-section">
            <h3>Probability Analysis Content</h3>
            <p>This section would contain the probability formula, optimal card distribution analysis, 
            and opening hand categories analysis.</p>
            <p>For full details, please view the probability analysis in the application.</p>
          </section>
        `;

        tempContainer.appendChild(probabilityContainer);
        probabilitySection = probabilityContainer;
      }
    }

    // Create PDF document
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Page dimensions
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 10;

    // Add title
    pdf.setFontSize(18);
    pdf.setTextColor(33, 33, 33);
    pdf.text(`${deck.name} - Deck Analysis Report`, pageWidth / 2, 20, {
      align: "center",
    });

    // Reset font size
    pdf.setFontSize(12);

    // Process basic section
    console.log("Processing basic section");
    // Break down the basic section into smaller chunks
    const deckComposition =
      basicSection.querySelector(".deck-composition") ||
      basicSection.firstElementChild;
    const deckStyle =
      basicSection.querySelector(".deck-style") ||
      deckComposition?.nextElementSibling;
    const keyCards =
      basicSection.querySelector(".key-cards-section") ||
      deckStyle?.nextElementSibling;

    // Start position
    let yPos = 30;

    // Add each component individually with proper positioning
    if (deckComposition instanceof HTMLElement) {
      console.log("Adding deck composition");
      yPos = await addComponentToPdf(pdf, deckComposition, margin, yPos);
    }

    if (deckStyle instanceof HTMLElement) {
      console.log("Adding deck style");
      yPos = await addComponentToPdf(pdf, deckStyle, margin, yPos);
    }

    if (keyCards instanceof HTMLElement) {
      console.log("Adding key cards");
      yPos = await addComponentToPdf(pdf, keyCards, margin, yPos);
    }

    // Add Advanced Analysis if enabled
    if (includeAdvancedAnalysis && advancedSection) {
      console.log("Processing advanced section");
      // Add a page break before advanced analysis
      pdf.addPage();
      yPos = 20;

      // Add section title
      pdf.setFontSize(16);
      pdf.text("Advanced Analysis", pageWidth / 2, yPos, { align: "center" });
      pdf.setFontSize(12);
      yPos += 15;

      // Find all analysis sections within the advanced section
      const analysisSubsections =
        advancedSection.querySelectorAll(".analysis-section");
      if (analysisSubsections && analysisSubsections.length > 0) {
        console.log(`Found ${analysisSubsections.length} advanced subsections`);
        for (const subsection of analysisSubsections) {
          if (subsection instanceof HTMLElement) {
            yPos = await addComponentToPdf(pdf, subsection, margin, yPos);
          }
        }
      } else {
        // If we don't find subsections, try to add the whole section
        console.log("No subsections found, adding entire advanced section");
        yPos = await addComponentToPdf(pdf, advancedSection, margin, yPos);
      }
    }

    // Add Probability Analysis if enabled
    if (includeProbabilityAnalysis && probabilitySection) {
      console.log("Processing probability section");
      // Add a page break before probability analysis
      pdf.addPage();
      yPos = 20;

      // Add section title
      pdf.setFontSize(16);
      pdf.text("Probability Analysis", pageWidth / 2, yPos, {
        align: "center",
      });
      pdf.setFontSize(12);
      yPos += 15;

      // Find the probability formula section first - this one is simpler and usually works well
      const formulaSection = probabilitySection.querySelector(
        ".analysis-section:first-child"
      );
      if (formulaSection instanceof HTMLElement) {
        console.log("Adding probability formula section");
        yPos = await addComponentToPdf(pdf, formulaSection, margin, yPos);
      }

      // Handle the distribution graphs section - this is the problematic one
      const distributionSection = probabilitySection.querySelector(
        ".analysis-section:nth-child(2)"
      );
      if (distributionSection instanceof HTMLElement) {
        console.log("Adding distribution section");
        // Add a page break before this complex section
        pdf.addPage();
        yPos = 20;

        // Add sub-title
        pdf.setFontSize(14);
        const sectionTitle = distributionSection.querySelector("h3");
        if (sectionTitle) {
          pdf.text(
            sectionTitle.textContent || "Optimal Card Distribution Analysis",
            pageWidth / 2,
            yPos,
            { align: "center" }
          );
        } else {
          pdf.text("Optimal Card Distribution Analysis", pageWidth / 2, yPos, {
            align: "center",
          });
        }
        pdf.setFontSize(12);
        yPos += 15;

        // Extract and add each graph separately
        const distributionGraphs = distributionSection.querySelector(
          ".distribution-graphs"
        );
        if (distributionGraphs instanceof HTMLElement) {
          // Process each graph individually
          const graphs = distributionGraphs.querySelectorAll(
            ".distribution-graph-container"
          );
          for (const graph of graphs) {
            if (graph instanceof HTMLElement) {
              console.log("Adding individual graph");
              yPos = await addComponentToPdf(pdf, graph, margin, yPos, {
                // Special settings for graphs
                scale: 1.2,
                backgroundColor: "#ffffff",
              });
            }
          }
        }

        // Add the explanation text
        const explanationText = distributionSection.querySelector(
          ".distribution-explanation"
        );
        if (explanationText instanceof HTMLElement) {
          console.log("Adding distribution explanation");
          yPos = await addComponentToPdf(pdf, explanationText, margin, yPos);
        }
      }

      // Handle the opening hand categories section - also complex
      const handCategoriesSection = probabilitySection.querySelector(
        ".analysis-section:nth-child(3)"
      );
      if (handCategoriesSection instanceof HTMLElement) {
        console.log("Adding hand categories section");
        // Add a page break before this complex section
        pdf.addPage();
        yPos = 20;

        // Add sub-title
        pdf.setFontSize(14);
        const sectionTitle = handCategoriesSection.querySelector("h3");
        if (sectionTitle) {
          pdf.text(
            sectionTitle.textContent || "Opening Hand Categories",
            pageWidth / 2,
            yPos,
            { align: "center" }
          );
        } else {
          pdf.text("Opening Hand Categories", pageWidth / 2, yPos, {
            align: "center",
          });
        }
        pdf.setFontSize(12);
        yPos += 15;

        // Extract and try to add each category separately
        const categories =
          handCategoriesSection.querySelectorAll(".category-row");
        if (categories && categories.length > 0) {
          for (const category of categories) {
            if (category instanceof HTMLElement) {
              console.log("Adding individual category");
              yPos = await addComponentToPdf(pdf, category, margin, yPos);
            }
          }
        } else {
          // Fallback to adding the whole section
          yPos = await addComponentToPdf(
            pdf,
            handCategoriesSection,
            margin,
            yPos,
            {
              // Lower scale for this complex section
              scale: 1.2,
            }
          );
        }
      }
    }

    // === CARD COMBINATIONS SECTION ===
    // Process each combination size
    for (const [size, combinations] of Object.entries(
      statistics.cardCombinations
    )) {
      // Always start a new page for each card combination size as requested
      pdf.addPage();
      yPos = 20;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPos, contentWidth, 10, "F");
      pdf.setFontSize(14);
      pdf.text(`Card Combinations (${size}-Card)`, pageWidth / 2, yPos + 7, {
        align: "center",
      });
      yPos += 15;

      // Combination size header
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text(`Most Common ${size}-Card Combinations`, margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos += 10;

      // Table header
      pdf.setFillColor(220, 220, 220);
      pdf.rect(margin, yPos, contentWidth, tableHeaderHeight, "F");
      pdf.setFontSize(10);
      pdf.text("Frequency", margin + 5, yPos + 5);
      pdf.text("Percentage", margin + 35, yPos + 5);
      pdf.text("Probability", margin + 70, yPos + 5); // Add probability column
      pdf.text("Cards", margin + 110, yPos + 5);
      yPos += 10;

      // Enhanced combinations display with card images
      const comboCardWidth = 15;
      const comboCardHeight = comboCardWidth * 1.46;
      const comboCardGap = 2;

      // Table rows for combinations
      for (const combo of combinations) {
        // Calculate probability for this combination
        let combinationProbability = 0;
        if (deck && deck.mainDeck) {
          const deckSize = deck.mainDeck.length;
          // Get all unique cards in this combination
          const uniqueCards = new Map();
          combo.cards.forEach((card) => {
            if (!uniqueCards.has(card.id)) {
              const totalCopies = deck.mainDeck.filter(
                (c) => c.id === card.id
              ).length;
              uniqueCards.set(card.id, {
                card,
                totalCopies,
                copiesInCombo: 1,
              });
            } else {
              const cardInfo = uniqueCards.get(card.id);
              cardInfo.copiesInCombo++;
              uniqueCards.set(card.id, cardInfo);
            }
          });

          // Calculate probability of drawing this exact combination
          let probability = 1;
          let totalProb = 0;

          // For combinations, we use a different approach -
          // probability of drawing each card independently
          if (Number(size) <= 3) {
            // For small combinations
            uniqueCards.forEach((cardInfo) => {
              const p =
                calculateDrawProbability(
                  deckSize,
                  cardInfo.totalCopies,
                  handSize
                ) / 100; // Convert from percentage to fraction
              probability *= p;
            });
            totalProb = probability * 100; // Convert back to percentage
          } else {
            // For larger combinations, use approximation
            totalProb = Math.pow(0.5, Number(size) - 1) * 100;
          }

          combinationProbability = totalProb;
        }

        const comboRowStartY = yPos;
        pdf.text(`${combo.count} times`, margin + 5, yPos + 5);
        pdf.text(`${combo.percentage.toFixed(1)}%`, margin + 35, yPos + 5);
        pdf.text(
          `${combinationProbability.toFixed(4)}%`,
          margin + 70,
          yPos + 5
        ); // Add the calculated probability

        // Add card images in a horizontal row
        let cardX = margin + 110;

        for (const card of combo.cards) {
          await addCardImageToPdf(
            card,
            cardX,
            yPos,
            comboCardWidth,
            comboCardHeight
          );

          cardX += comboCardWidth + comboCardGap;

          // If we're getting close to the right margin, stop adding images
          if (cardX + comboCardWidth > pageWidth - margin) {
            break;
          }
        }

        // Also add card names below the images for clarity
        const cardNames = combo.cards.map((card) => card.name).join(", ");
        pdf.setFontSize(8);
        pdf.text(
          cardNames.substring(0, 80),
          margin + 110,
          yPos + comboCardHeight + 4
        );
        pdf.setFontSize(10);

        // Update yPos based on the height of the combination row
        yPos += comboCardHeight + 12;
      }

      yPos += 10;
    }

    // === THEORETICAL PROBABILITIES SECTION (if available) ===
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos, contentWidth, 10, "F");
    pdf.setFontSize(14);
    pdf.text("Card Draw Probabilities", pageWidth / 2, yPos + 7, {
      align: "center",
    });
    yPos += 15;

    // Add explanatory text about theoretical probabilities
    pdf.setFontSize(12);
    pdf.text(
      "The theoretical probability of drawing specific cards in the opening hand is",
      margin,
      yPos
    );
    yPos += 8;
    pdf.text(
      "calculated using hypergeometric probability distribution.",
      margin,
      yPos
    );
    yPos += 15;

    // Add formula explanation (simplified)
    pdf.text(
      "Formula: P(X = k) = [C(K,k) × C(N-K,n-k)] / C(N,n)",
      margin,
      yPos
    );
    yPos += 8;
    pdf.text("Where:", margin, yPos);
    yPos += 8;
    pdf.text("- N is the deck size", margin + 10, yPos);
    yPos += 8;
    pdf.text(
      "- K is the number of copies of the card in the deck",
      margin + 10,
      yPos
    );
    yPos += 8;
    pdf.text("- n is the hand size", margin + 10, yPos);
    yPos += 8;
    pdf.text("- k is the number of copies you want to draw", margin + 10, yPos);
    yPos += 8;
    pdf.text(
      "- C(n,k) is the binomial coefficient (combinations formula)",
      margin + 10,
      yPos
    );
    yPos += 20;

    // Extract theoreticalProbabilities from the component's state
    const theoreticalProbabilities = statistics.theoreticalProbabilities || [];

    if (theoreticalProbabilities && theoreticalProbabilities.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Card Probabilities", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos += 10;

      // Table header
      pdf.setFillColor(220, 220, 220);
      pdf.rect(margin, yPos, contentWidth, tableHeaderHeight, "F");
      pdf.setFontSize(10);
      pdf.text("Card", margin + 5, yPos + 5);
      pdf.text("Name", margin + 25, yPos + 5);
      pdf.text("Copies", margin + 100, yPos + 5);
      pdf.text("Any Copy", pageWidth - margin - 70, yPos + 5);
      pdf.text("Exactly 1", pageWidth - margin - 40, yPos + 5);
      pdf.text("2+ Copies", pageWidth - margin - 15, yPos + 5);
      yPos += 10;

      // Show all cards instead of just the top 10
      const probCardWidth = 15;
      const probCardHeight = probCardWidth * 1.46;
      const probRowHeight = probCardHeight + 5;

      // Use all cards, not just top 10
      const cardsToShow = theoreticalProbabilities;

      for (const prob of cardsToShow) {
        // Add card image
        await addCardImageToPdf(
          prob.card,
          margin + 5,
          yPos,
          probCardWidth,
          probCardHeight
        );

        // Add card info
        pdf.text(prob.card.name.substring(0, 20), margin + 25, yPos + 8);
        pdf.text(String(prob.card.totalCopies || "-"), margin + 100, yPos + 8);
        pdf.text(
          `${prob.probability.toFixed(2)}%`,
          pageWidth - margin - 70,
          yPos + 8
        );
        pdf.text(
          `${prob.exactOneProb?.toFixed(2) || "-"}%`,
          pageWidth - margin - 40,
          yPos + 8
        );
        pdf.text(
          `${prob.atLeastTwoProb?.toFixed(2) || "-"}%`,
          pageWidth - margin - 15,
          yPos + 8
        );

        yPos += probRowHeight;

        // Check if we need a new page
        if (
          yPos + probRowHeight > pageHeight - margin &&
          prob !== cardsToShow[cardsToShow.length - 1]
        ) {
          pdf.addPage();
          yPos = 20;

          // Re-add the table header
          pdf.setFillColor(220, 220, 220);
          pdf.rect(margin, yPos, contentWidth, tableHeaderHeight, "F");
          pdf.setFontSize(10);
          pdf.text("Card", margin + 5, yPos + 5);
          pdf.text("Name", margin + 25, yPos + 5);
          pdf.text("Copies", margin + 100, yPos + 5);
          pdf.text("Any Copy", pageWidth - margin - 70, yPos + 5);
          pdf.text("Exactly 1", pageWidth - margin - 40, yPos + 5);
          pdf.text("2+ Copies", pageWidth - margin - 15, yPos + 5);
          yPos += 10;
        }
      }
    } else {
      // If there's no theoretical probabilities data
      pdf.text(
        "No theoretical probability data available for this deck.",
        margin,
        yPos
      );
    }

    yPos += 15;

    // Add metadata
    pdf.setProperties({
      title: `${deck.name} - Deck Analysis`,
      subject: "Yu-Gi-Oh! Deck Analysis Report",
      author: "Master Duel Wanabe Deckbuilder",
      keywords: "Yu-Gi-Oh, deck analysis, Master Duel",
      creator: "Master Duel Wanabe Deckbuilder",
    });

    // Clean up temporary elements
    const cleanup = () => {
      try {
        if (tempContainer && tempContainer.parentNode) {
          document.body.removeChild(tempContainer);
        }
      } catch (err) {
        console.error("Error during cleanup:", err);
      }
    };

    console.log("PDF export complete, saving file");
    // Save the PDF
    pdf.save(fileName);

    // Run cleanup after a short delay to ensure PDF generation is complete
    setTimeout(cleanup, 500);
  } catch (error) {
    console.error("Error during PDF export:", error);
    alert("There was an error generating the PDF. Please try again.");
  }
};

// Helper functions remain the same
/**
 * Adds a component to the PDF document
 */
async function addComponentToPdf(
  pdf: jsPDF,
  element: HTMLElement,
  xPos: number,
  yPos: number,
  options: {
    scale?: number;
    backgroundColor?: string;
  } = {}
): Promise<number> {
  const { scale = 1.5, backgroundColor = "#ffffff" } = options;

  try {
    // Make sure the element is visible for capture
    const originalDisplay = element.style.display;
    const originalVisibility = element.style.visibility;
    const originalPosition = element.style.position;
    const originalHeight = element.style.height;
    const originalWidth = element.style.width;

    // Ensure visibility during capture
    element.style.visibility = "visible";
    element.style.display = "block";

    // Create a deep clone of the element to modify its styles without affecting the original
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Process the cloned element to replace problematic CSS color functions
    processElementStyles(clonedElement);

    // Temporarily append cloned element to the document
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "0";
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Capture the element
    const canvas = await html2canvas(clonedElement, {
      scale: scale,
      useCORS: true,
      logging: false,
      backgroundColor: backgroundColor,
      allowTaint: true,
      foreignObjectRendering: false,
      // Improve rendering of complex elements
      onclone: (_, clonedDoc) => {
        // Ensure any graph bars have the right height
        const bars = clonedDoc.querySelectorAll(".graph-bar");
        bars.forEach((bar) => {
          if (bar instanceof HTMLElement) {
            // Force the height style to be applied
            const height = bar.style.height;
            if (height) {
              bar.style.height = height;
            }
          }
        });

        // Make sure the grid-lines are visible
        const gridLines = clonedDoc.querySelectorAll(".grid-line");
        gridLines.forEach((line) => {
          if (line instanceof HTMLElement) {
            line.style.backgroundColor = "#e0e0e0";
          }
        });
      },
    });

    // Restore original styles
    element.style.display = originalDisplay;
    element.style.visibility = originalVisibility;
    element.style.position = originalPosition;
    element.style.height = originalHeight;
    element.style.width = originalWidth;

    // Clean up the temporary container
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }

    // Calculate dimensions
    const pageWidth = pdf.internal.pageSize.width;
    const contentWidth = pageWidth - 2 * xPos;
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if we need a new page
    if (yPos + imgHeight > pdf.internal.pageSize.height - 10) {
      pdf.addPage();
      yPos = 10;
    }

    // Add the image
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      xPos,
      yPos,
      imgWidth,
      imgHeight
    );

    // Return next position
    return yPos + imgHeight + 10;
  } catch (error) {
    console.error("Error capturing element:", error, element);
    return yPos + 10; // Skip this element and continue
  }
}

// Helper function to process element styles and replace unsupported color functions
function processElementStyles(element: HTMLElement) {
  // Process this element
  if (element.style) {
    convertOklchColors(element);
  }

  // Process all child elements recursively
  const children = element.querySelectorAll("*");
  children.forEach((child) => {
    if (child instanceof HTMLElement) {
      convertOklchColors(child);
    }
  });
}

// Function to replace oklch colors with hex colors
function convertOklchColors(element: HTMLElement) {
  const styleProps = [
    "color",
    "backgroundColor",
    "borderColor",
    "borderLeftColor",
    "borderRightColor",
    "borderTopColor",
    "borderBottomColor",
  ];

  styleProps.forEach((prop) => {
    const value = element.style[prop as any];
    if (value && value.includes("oklch")) {
      // Replace oklch with a safe fallback color
      element.style[prop as any] = getFallbackColor(prop);
    }
  });

  // Also check box-shadow, text-shadow etc.
  const boxShadow = element.style.boxShadow;
  if (boxShadow && boxShadow.includes("oklch")) {
    element.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
  }
}

// Function to provide appropriate fallback colors
function getFallbackColor(prop: string): string {
  // Choose appropriate fallback colors based on property
  switch (prop) {
    case "color":
      return "#333333"; // Dark gray for text
    case "backgroundColor":
      return "#ffffff"; // White for backgrounds
    case "borderColor":
    case "borderLeftColor":
    case "borderRightColor":
    case "borderTopColor":
    case "borderBottomColor":
      return "#e0e0e0"; // Light gray for borders
    default:
      return "#000000"; // Black as general fallback
  }
}

/**
 * Creates and downloads a PDF of Draw Simulator results
 * This version doesn't rely on DOM capturing which causes issues with oklch colors
 * @param deck The deck being analyzed
 * @param simulationResults The results from the simulation
 * @param statistics Statistics calculated from the simulation results
 */
export const exportDrawSimulationToPdf = async (
  deck: Deck,
  simulationResults: any[],
  statistics: any
) => {
  try {
    console.log(
      "Starting Draw Simulator PDF export with direct PDF generation"
    );

    // Create PDF document
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Page dimensions
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 20;

    // Add title and basic info
    pdf.setFontSize(18);
    pdf.setTextColor(33, 33, 33);
    pdf.text(`${deck.name} - Draw Simulation Results`, pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 15;

    // Add simulation info
    pdf.setFontSize(12);
    pdf.text(`Total Simulations: ${statistics.totalSimulations}`, margin, yPos);
    yPos += 8;
    pdf.text(
      `Hand Size: ${simulationResults[0]?.hand?.length || 5}`,
      margin,
      yPos
    );
    yPos += 15;

    // Helper function to load and process card images
    const loadCardImage = async (card: any): Promise<HTMLImageElement> => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.error(`Failed to load image for card: ${card.name}`);
          resolve(img); // Resolve anyway to prevent hanging promises
        };
        img.src = getCardImageUrl(card.id, "small");
      });
    };

    // Helper function to add a card image to the PDF
    const addCardImageToPdf = async (
      card: any,
      x: number,
      y: number,
      width: number,
      height: number
    ): Promise<void> => {
      try {
        const img = await loadCardImage(card);
        if (img.complete && img.naturalWidth > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL("image/jpeg");
            pdf.addImage(imgData, "JPEG", x, y, width, height);
          }
        }
      } catch (err) {
        console.error(`Error adding card image to PDF: ${card.name}`, err);
      }
    };

    // === MOST COMMON HAND SECTION ===
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos, contentWidth, 10, "F");
    pdf.setFontSize(14);
    pdf.setTextColor(33, 33, 33);
    pdf.text(
      `Most Common Opening Hand (${
        statistics.mostCommonHand.frequency
      } times - ${statistics.mostCommonHand.percentage.toFixed(2)}%)`,
      pageWidth / 2,
      yPos + 7,
      { align: "center" }
    );
    yPos += 15;

    // Calculate spacing for cards in the hand
    const cardWidth = 30; // in mm
    const cardHeight = cardWidth * 1.46; // maintain aspect ratio
    const cardGap = 5;
    const totalCardsWidth =
      statistics.mostCommonHand.cards.length * cardWidth +
      (statistics.mostCommonHand.cards.length - 1) * cardGap;
    let startX = (pageWidth - totalCardsWidth) / 2;

    // Draw the card images
    for (const card of statistics.mostCommonHand.cards) {
      await addCardImageToPdf(card, startX, yPos, cardWidth, cardHeight);
      startX += cardWidth + cardGap;
    }

    yPos += cardHeight + 15;

    // Check if we need a new page for statistics
    if (yPos > pageHeight - 100) {
      // Leave some space for at least the section header
      pdf.addPage();
      yPos = 20;
    }

    // === MOST COMMON HANDS TABLE ===
    pdf.setFontSize(12);
    pdf.setFont(undefined, "bold");
    pdf.text("Most Common Opening Hands", margin, yPos);
    pdf.setFont(undefined, "normal");
    yPos += 8;

    // Table header
    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, yPos, contentWidth, tableHeaderHeight, "F");
    pdf.setFontSize(10);
    pdf.text("Frequency", margin + 5, yPos + 5);
    pdf.text("Percentage", margin + 45, yPos + 5);
    pdf.text("Probability", margin + 85, yPos + 5); // Add probability column
    pdf.text("Hand", margin + 125, yPos + 5);
    yPos += tableHeaderHeight;

    // Table rows
    for (const hand of statistics.handFrequency) {
      const handRowStartY = yPos;

      // Calculate probability for this exact hand
      let probability = 1;
      if (deck) {
        const deckSize = deck.mainDeck.length;
        const cardCopies = hand.cards.reduce((counts, card) => {
          if (!counts[card.id]) counts[card.id] = 0;
          counts[card.id]++;
          return counts;
        }, {});

        let remainingCards = deckSize;
        let remainingHandSize = handSize;

        // For each unique card in the hand
        Object.entries(cardCopies).forEach(([cardId, count]) => {
          const totalCardCopies = deck.mainDeck.filter(
            (c) => c.id === parseInt(cardId)
          ).length;

          // Calculate probability of drawing exactly 'count' copies of this card
          for (let i = 0; i < count; i++) {
            probability *= (totalCardCopies - i) / (remainingCards - i);
            remainingHandSize--;
          }
          remainingCards -= count;
        });

        // Calculate probability for remaining slots to be filled with other cards
        if (remainingHandSize > 0) {
          for (let i = 0; i < remainingHandSize; i++) {
            probability *= (remainingCards - i) / (deckSize - handSize + i + 1);
          }
        }

        // Convert to percentage
        probability *= 100;
      }

      pdf.text(`${hand.count} times`, margin + 5, yPos + 5);
      pdf.text(`${hand.percentage.toFixed(1)}%`, margin + 45, yPos + 5);
      pdf.text(`${probability.toFixed(6)}%`, margin + 85, yPos + 5); // Add the calculated probability

      // Add hand preview with small card images
      let cardX = margin + 125;
      const cardY = yPos;

      for (const card of hand.cards) {
        await addCardImageToPdf(
          card,
          cardX,
          cardY,
          cardMiniWidth,
          cardMiniHeight
        );

        cardX += cardMiniWidth + cardGap;

        // If we're getting close to the right margin, stop adding images
        if (cardX + cardMiniWidth > pageWidth - margin) {
          break;
        }
      }

      yPos += cardMiniHeight + 5;
    }

    yPos += 15;

    // === DRAW STATISTICS SECTION ===
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos, contentWidth, 10, "F");
    pdf.setFontSize(14);
    pdf.text("Draw Statistics", pageWidth / 2, yPos + 7, { align: "center" });
    yPos += 15;

    // Most seen card with image
    const mostSeenCardImgWidth = 20;
    const mostSeenCardImgHeight = mostSeenCardImgWidth * 1.46;

    pdf.setFontSize(12);
    pdf.setFont(undefined, "bold");
    pdf.text("Most Seen Card:", margin, yPos);
    pdf.setFont(undefined, "normal");

    // Add card image
    await addCardImageToPdf(
      statistics.mostSeenCard.card,
      margin,
      yPos + 2,
      mostSeenCardImgWidth,
      mostSeenCardImgHeight
    );

    // Add card info
    pdf.text(
      `${statistics.mostSeenCard.card.name} (${
        statistics.mostSeenCard.appearances
      } times - ${statistics.mostSeenCard.percentage.toFixed(1)}%)`,
      margin + mostSeenCardImgWidth + 5,
      yPos + 10
    );

    yPos += mostSeenCardImgHeight + 10;

    // Least seen card with image
    pdf.setFont(undefined, "bold");
    pdf.text("Least Seen Card:", margin, yPos);
    pdf.setFont(undefined, "normal");

    // Add card image
    await addCardImageToPdf(
      statistics.leastSeenCard.card,
      margin,
      yPos + 2,
      mostSeenCardImgWidth,
      mostSeenCardImgHeight
    );

    // Add card info
    pdf.text(
      `${statistics.leastSeenCard.card.name} (${
        statistics.leastSeenCard.appearances
      } times - ${statistics.leastSeenCard.percentage.toFixed(1)}%)`,
      margin + mostSeenCardImgWidth + 5,
      yPos + 10
    );

    yPos += mostSeenCardImgHeight + 10;

    // Check available space for table
    const rowHeight = 20; // Increased to accommodate card images
    const tableHeaderHeight = 8;
    const tableNeededHeight =
      tableHeaderHeight + statistics.mostSeenCards.length * rowHeight + 30;

    if (yPos + tableNeededHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = 20;
    }

    // Top cards table
    pdf.setFont(undefined, "bold");
    pdf.text("Top 5 Most Seen Cards", margin, yPos);
    pdf.setFont(undefined, "normal");
    yPos += 8;

    // Table header
    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, yPos, contentWidth, tableHeaderHeight, "F");
    pdf.text("Card", margin + 5, yPos + 5);
    pdf.text("Name", margin + 25, yPos + 5);
    pdf.text("Appearances", pageWidth - margin - 60, yPos + 5);
    pdf.text("Percentage", pageWidth - margin - 25, yPos + 5);
    yPos += 10;

    // Table rows with images
    const cardThumbWidth = 15;
    const cardThumbHeight = cardThumbWidth * 1.46;

    for (const item of statistics.mostSeenCards) {
      // Add card image
      await addCardImageToPdf(
        item.card,
        margin + 5,
        yPos,
        cardThumbWidth,
        cardThumbHeight
      );

      // Add card info
      pdf.text(item.card.name.substring(0, 25), margin + 25, yPos + 8);
      pdf.text(item.appearances.toString(), pageWidth - margin - 60, yPos + 8);
      pdf.text(
        `${item.percentage.toFixed(1)}%`,
        pageWidth - margin - 25,
        yPos + 8
      );

      yPos += rowHeight;
    }

    yPos += 15;

    // === ROLE STATISTICS SECTION ===
    // Check if we need a new page
    if (yPos + 50 > pageHeight - margin) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos, contentWidth, 10, "F");
    pdf.setFontSize(14);
    pdf.text("Role Statistics", pageWidth / 2, yPos + 7, { align: "center" });
    yPos += 15;

    pdf.setFontSize(12);

    // Get all role entries
    const roleEntries = Object.entries(statistics.roleStatistics);

    // Split roles into columns for better layout
    const rolesPerColumn = Math.ceil(roleEntries.length / 2);
    const columnWidth = (contentWidth - 10) / 2;

    for (let i = 0; i < roleEntries.length; i++) {
      const [role, stats] = roleEntries[i];
      const column = Math.floor(i / rolesPerColumn);
      const xStart = margin + column * (columnWidth + 10);

      // Calculate Y position within column
      const rowInColumn = i % rolesPerColumn;
      const rowYPos = yPos + rowInColumn * 20;

      // Check if we need a new page
      if (rowYPos + 20 > pageHeight - margin) {
        pdf.addPage();
        yPos = 20;
        // Reset counter to put remaining roles on the new page
        i = column * rolesPerColumn - 1; // Will be incremented to start at the right position
        continue;
      }

      // Role header
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text(role, xStart, rowYPos);
      pdf.setFont(undefined, "normal");

      // Role stats
      pdf.setFontSize(10);
      pdf.text(
        `At least one: ${stats.percentage.toFixed(1)}%`,
        xStart,
        rowYPos + 6
      );
      pdf.text(
        `Average per hand: ${stats.averagePerHand.toFixed(2)}`,
        xStart,
        rowYPos + 12
      );
    }

    // Update yPos to be after all role statistics
    yPos += Math.min(rolesPerColumn, roleEntries.length) * 20 + 10;

    // === CARD COMBINATIONS SECTION ===
    // Process each combination size
    for (const [size, combinations] of Object.entries(
      statistics.cardCombinations
    )) {
      // Always start a new page for each card combination size as requested
      pdf.addPage();
      yPos = 20;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPos, contentWidth, 10, "F");
      pdf.setFontSize(14);
      pdf.text(`Card Combinations (${size}-Card)`, pageWidth / 2, yPos + 7, {
        align: "center",
      });
      yPos += 15;

      // Combination size header
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text(`Most Common ${size}-Card Combinations`, margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos += 10;

      // Table header
      pdf.setFillColor(220, 220, 220);
      pdf.rect(margin, yPos, contentWidth, tableHeaderHeight, "F");
      pdf.setFontSize(10);
      pdf.text("Frequency", margin + 5, yPos + 5);
      pdf.text("Percentage", margin + 35, yPos + 5);
      pdf.text("Probability", margin + 70, yPos + 5); // Add probability column
      pdf.text("Cards", margin + 110, yPos + 5);
      yPos += 10;

      // Enhanced combinations display with card images
      const comboCardWidth = 15;
      const comboCardHeight = comboCardWidth * 1.46;
      const comboCardGap = 2;

      // Table rows for combinations
      for (const combo of combinations) {
        // Calculate probability for this combination
        let combinationProbability = 0;
        if (deck && deck.mainDeck) {
          const deckSize = deck.mainDeck.length;
          // Get all unique cards in this combination
          const uniqueCards = new Map();
          combo.cards.forEach((card) => {
            if (!uniqueCards.has(card.id)) {
              const totalCopies = deck.mainDeck.filter(
                (c) => c.id === card.id
              ).length;
              uniqueCards.set(card.id, {
                card,
                totalCopies,
                copiesInCombo: 1,
              });
            } else {
              const cardInfo = uniqueCards.get(card.id);
              cardInfo.copiesInCombo++;
              uniqueCards.set(card.id, cardInfo);
            }
          });

          // Calculate probability of drawing this exact combination
          let probability = 1;
          let totalProb = 0;

          // For combinations, we use a different approach -
          // probability of drawing each card independently
          if (Number(size) <= 3) {
            // For small combinations
            uniqueCards.forEach((cardInfo) => {
              const p =
                calculateDrawProbability(
                  deckSize,
                  cardInfo.totalCopies,
                  handSize
                ) / 100; // Convert from percentage to fraction
              probability *= p;
            });
            totalProb = probability * 100; // Convert back to percentage
          } else {
            // For larger combinations, use approximation
            totalProb = Math.pow(0.5, Number(size) - 1) * 100;
          }

          combinationProbability = totalProb;
        }

        const comboRowStartY = yPos;
        pdf.text(`${combo.count} times`, margin + 5, yPos + 5);
        pdf.text(`${combo.percentage.toFixed(1)}%`, margin + 35, yPos + 5);
        pdf.text(
          `${combinationProbability.toFixed(4)}%`,
          margin + 70,
          yPos + 5
        ); // Add the calculated probability

        // Add card images in a horizontal row
        let cardX = margin + 110;

        for (const card of combo.cards) {
          await addCardImageToPdf(
            card,
            cardX,
            yPos,
            comboCardWidth,
            comboCardHeight
          );

          cardX += comboCardWidth + comboCardGap;

          // If we're getting close to the right margin, stop adding images
          if (cardX + comboCardWidth > pageWidth - margin) {
            break;
          }
        }

        // Also add card names below the images for clarity
        const cardNames = combo.cards.map((card) => card.name).join(", ");
        pdf.setFontSize(8);
        pdf.text(
          cardNames.substring(0, 80),
          margin + 110,
          yPos + comboCardHeight + 4
        );
        pdf.setFontSize(10);

        // Update yPos based on the height of the combination row
        yPos += comboCardHeight + 12;
      }

      yPos += 10;
    }

    // === THEORETICAL PROBABILITIES SECTION ===
    // Always add a page for theoretical probabilities
    pdf.addPage();
    yPos = 20;

    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos, contentWidth, 10, "F");
    pdf.setFontSize(14);
    pdf.text("Card Draw Probabilities", pageWidth / 2, yPos + 7, {
      align: "center",
    });
    yPos += 15;

    // Add explanatory text about theoretical probabilities
    pdf.setFontSize(12);
    pdf.text(
      "The theoretical probability of drawing specific cards in the opening hand is",
      margin,
      yPos
    );
    yPos += 8;
    pdf.text(
      "calculated using hypergeometric probability distribution.",
      margin,
      yPos
    );
    yPos += 15;

    // Add formula explanation (simplified)
    pdf.text(
      "Formula: P(X = k) = [C(K,k) × C(N-K,n-k)] / C(N,n)",
      margin,
      yPos
    );
    yPos += 8;
    pdf.text("Where:", margin, yPos);
    yPos += 8;
    pdf.text("- N is the deck size", margin + 10, yPos);
    yPos += 8;
    pdf.text(
      "- K is the number of copies of the card in the deck",
      margin + 10,
      yPos
    );
    yPos += 8;
    pdf.text("- n is the hand size", margin + 10, yPos);
    yPos += 8;
    pdf.text("- k is the number of copies you want to draw", margin + 10, yPos);
    yPos += 8;
    pdf.text(
      "- C(n,k) is the binomial coefficient (combinations formula)",
      margin + 10,
      yPos
    );
    yPos += 20;

    // Extract theoreticalProbabilities from the component's state
    const theoreticalProbabilities = statistics.theoreticalProbabilities || [];

    if (theoreticalProbabilities && theoreticalProbabilities.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Card Probabilities", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos += 10;

      // Table header
      pdf.setFillColor(220, 220, 220);
      pdf.rect(margin, yPos, contentWidth, tableHeaderHeight, "F");
      pdf.setFontSize(10);
      pdf.text("Card", margin + 5, yPos + 5);
      pdf.text("Name", margin + 25, yPos + 5);
      pdf.text("Copies", margin + 100, yPos + 5);
      pdf.text("Any Copy", pageWidth - margin - 70, yPos + 5);
      pdf.text("Exactly 1", pageWidth - margin - 40, yPos + 5);
      pdf.text("2+ Copies", pageWidth - margin - 15, yPos + 5);
      yPos += 10;

      // Show all cards instead of just the top 10
      const probCardWidth = 15;
      const probCardHeight = probCardWidth * 1.46;
      const probRowHeight = probCardHeight + 5;

      // Use all cards, not just top 10
      const cardsToShow = theoreticalProbabilities;

      for (const prob of cardsToShow) {
        // Add card image
        await addCardImageToPdf(
          prob.card,
          margin + 5,
          yPos,
          probCardWidth,
          probCardHeight
        );

        // Add card info
        pdf.text(prob.card.name.substring(0, 20), margin + 25, yPos + 8);
        pdf.text(String(prob.card.totalCopies || "-"), margin + 100, yPos + 8);
        pdf.text(
          `${prob.probability.toFixed(2)}%`,
          pageWidth - margin - 70,
          yPos + 8
        );
        pdf.text(
          `${prob.exactOneProb?.toFixed(2) || "-"}%`,
          pageWidth - margin - 40,
          yPos + 8
        );
        pdf.text(
          `${prob.atLeastTwoProb?.toFixed(2) || "-"}%`,
          pageWidth - margin - 15,
          yPos + 8
        );

        yPos += probRowHeight;

        // Check if we need a new page
        if (
          yPos + probRowHeight > pageHeight - margin &&
          prob !== cardsToShow[cardsToShow.length - 1]
        ) {
          pdf.addPage();
          yPos = 20;

          // Re-add the table header
          pdf.setFillColor(220, 220, 220);
          pdf.rect(margin, yPos, contentWidth, tableHeaderHeight, "F");
          pdf.setFontSize(10);
          pdf.text("Card", margin + 5, yPos + 5);
          pdf.text("Name", margin + 25, yPos + 5);
          pdf.text("Copies", margin + 100, yPos + 5);
          pdf.text("Any Copy", pageWidth - margin - 70, yPos + 5);
          pdf.text("Exactly 1", pageWidth - margin - 40, yPos + 5);
          pdf.text("2+ Copies", pageWidth - margin - 15, yPos + 5);
          yPos += 10;
        }
      }
    } else {
      // If there's no theoretical probabilities data
      pdf.text(
        "No theoretical probability data available for this deck.",
        margin,
        yPos
      );
    }

    yPos += 15;

    // Add group probabilities if available
    if (statistics.theoreticalGroupProbability) {
      // Check if we need a new page
      if (yPos + 50 > pageHeight - margin) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Group Probabilities", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos += 10;

      const groups = statistics.theoreticalGroupProbability.groups || [];

      if (groups.length > 0) {
        // Table header
        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPos, contentWidth, tableHeaderHeight, "F");
        pdf.setFontSize(10);
        pdf.text("Group", margin + 5, yPos + 5);
        pdf.text("Relation", margin + 25, yPos + 5);
        pdf.text("Copies", margin + 60, yPos + 5);
        pdf.text("Probability", margin + 90, yPos + 5);
        pdf.text("Cards", margin + 130, yPos + 5);
        yPos += 10;

        for (const group of groups) {
          pdf.text(`Group ${group.groupId + 1}`, margin + 5, yPos + 8);
          pdf.text(group.relation, margin + 25, yPos + 8);
          pdf.text(String(group.copies), margin + 60, yPos + 8);
          pdf.text(`${group.probability.toFixed(2)}%`, margin + 90, yPos + 8);

          // Show card names
          const cardNames = group.cards.map((card) => card.name).join(", ");
          pdf.text(cardNames.substring(0, 50), margin + 130, yPos + 8);

          yPos += 15;
        }

        // Overall probability
        yPos += 5;
        pdf.setFont(undefined, "bold");
        pdf.text("Overall Probability:", margin, yPos);
        pdf.setFont(undefined, "normal");
        pdf.text(
          `${statistics.theoreticalGroupProbability.overallProbability.toFixed(
            2
          )}%`,
          margin + 50,
          yPos
        );
      }
    }

    // Add a new page for all simulation hands
    pdf.addPage();
    yPos = 20;

    pdf.setFontSize(16);
    pdf.text("All Simulated Hands", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Show each simulated hand with its cards
    const cardWidth2 = 25; // slightly smaller for all hands section
    const cardHeight2 = cardWidth2 * 1.46;
    const cardGap2 = 5;
    const cardsPerRow = Math.floor(
      (contentWidth + cardGap2) / (cardWidth2 + cardGap2)
    );

    // Calculate maximum cards per page (this will control pagination)
    const sectionTitleHeight = 8; // Height of the "Simulation #X" header
    const handMargin = 15; // Bottom margin after each hand

    for (let i = 0; i < simulationResults.length; i++) {
      const handCards = simulationResults[i].hand;

      // Calculate how many rows this hand will need
      const numRows = Math.ceil(handCards.length / cardsPerRow);

      // Check if this hand will fit on current page
      if (
        yPos +
          sectionTitleHeight +
          numRows * (cardHeight2 + cardGap2) +
          handMargin >
        pageHeight - margin
      ) {
        // Not enough space for this hand, add a new page
        pdf.addPage();
        yPos = 20;
      }

      // Hand title
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, yPos, contentWidth, sectionTitleHeight, "F");
      pdf.setFontSize(12);
      pdf.text(`Simulation #${i + 1}`, pageWidth / 2, yPos + 6, {
        align: "center",
      });
      yPos += 12;

      // Draw cards in rows
      for (let j = 0; j < handCards.length; j++) {
        const card = handCards[j];
        const rowIndex = Math.floor(j / cardsPerRow);
        const colIndex = j % cardsPerRow;
        const x = margin + colIndex * (cardWidth2 + cardGap2);
        const y = yPos + rowIndex * (cardHeight2 + cardGap2);

        await addCardImageToPdf(card, x, y, cardWidth2, cardHeight2);
      }

      // Update yPos for the next hand
      const rows = Math.ceil(handCards.length / cardsPerRow);
      yPos += rows * (cardHeight2 + cardGap2) + handMargin;
    }

    // Add metadata
    pdf.setProperties({
      title: `${deck.name} - Draw Simulation Results`,
      subject: "Yu-Gi-Oh! Draw Simulation Results",
      author: "Master Duel Wanabe Deckbuilder",
      keywords: "Yu-Gi-Oh, draw simulation, Master Duel",
      creator: "Master Duel Wanabe Deckbuilder",
    });

    // Save the PDF
    pdf.save(
      `${deck.name.replace(/[/\\?%*:|"<>]/g, "-")}_simulation_results.pdf`
    );
    console.log("PDF export complete");
  } catch (error) {
    console.error("Error during PDF export:", error);
    alert("There was an error generating the PDF. Please try again.");
  }
};
