import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Deck, DeckAnalytics } from "../types";
import { createRoot } from "react-dom/client";

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

    // Capture the element
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      logging: false,
      backgroundColor: backgroundColor,
      allowTaint: true,
      foreignObjectRendering: false,
      // Improve rendering of complex elements
      onclone: (_, clonedElement) => {
        // Ensure any graph bars have the right height
        const bars = clonedElement.querySelectorAll(".graph-bar");
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
        const gridLines = clonedElement.querySelectorAll(".grid-line");
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
