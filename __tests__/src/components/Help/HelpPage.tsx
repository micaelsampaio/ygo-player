import React, { useState } from "react";
import styled from "styled-components";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Card, Button } from "../UI";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  BookOpen,
  Info,
  Zap,
  Layout,
  Database,
  Settings,
  HelpCircleIcon,
  Search,
} from "lucide-react";

const HelpPage: React.FC = () => {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(
    "what-is-ygo-player"
  );
  const [activeSection, setActiveSection] = useState<string>("getting-started");

  const toggleTopic = (topicId: string) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    const firstTopicId = getFirstTopicIdInSection(sectionId);
    if (firstTopicId) {
      setExpandedTopic(firstTopicId);
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getFirstTopicIdInSection = (sectionId: string) => {
    switch (sectionId) {
      case "getting-started":
        return "what-is-ygo-player";
      case "deck-builder":
        return "creating-deck";
      case "dueling":
        return "starting-duel";
      case "collection-management":
        return "organizing-decks";
      case "cards-and-rulings":
        return "card-database";
      case "settings":
        return "connection-settings";
      case "faq":
        return "faq-data-loss";
      default:
        return null;
    }
  };

  const getSectionIcon = (sectionId: string) => {
    switch (sectionId) {
      case "getting-started":
        return <Info size={18} />;
      case "deck-builder":
        return <BookOpen size={18} />;
      case "dueling":
        return <Zap size={18} />;
      case "collection-management":
        return <Layout size={18} />;
      case "cards-and-rulings":
        return <Database size={18} />;
      case "settings":
        return <Settings size={18} />;
      case "faq":
        return <HelpCircle size={18} />;
      default:
        return <HelpCircle size={18} />;
    }
  };

  return (
    <AppLayout>
      <PageContainer>
        <HelpHeader>
          <HelpHeaderContent>
            <HelpIcon>
              <HelpCircle size={40} />
            </HelpIcon>
            <div>
              <h1>Help Center</h1>
              <HelpDescription>
                Find answers to all your questions about YGO Player
              </HelpDescription>
            </div>
          </HelpHeaderContent>

          <SearchBox>
            <SearchIcon>
              <Search size={18} />
            </SearchIcon>
            <input type="text" placeholder="Search help topics..." />
          </SearchBox>
        </HelpHeader>

        <HelpContent>
          <HelpSidebar>
            <SidebarCard>
              <SidebarTitle>Help Topics</SidebarTitle>
              <TopicsList>
                {[
                  {
                    id: "getting-started",
                    label: "Getting Started",
                    icon: <Info size={16} />,
                  },
                  {
                    id: "deck-builder",
                    label: "Deck Builder",
                    icon: <BookOpen size={16} />,
                  },
                  { id: "dueling", label: "Dueling", icon: <Zap size={16} /> },
                  {
                    id: "collection-management",
                    label: "Collection Management",
                    icon: <Layout size={16} />,
                  },
                  {
                    id: "cards-and-rulings",
                    label: "Cards & Rulings",
                    icon: <Database size={16} />,
                  },
                  {
                    id: "settings",
                    label: "Settings",
                    icon: <Settings size={16} />,
                  },
                  { id: "faq", label: "FAQ", icon: <HelpCircle size={16} /> },
                ].map((section) => (
                  <TopicLink
                    key={section.id}
                    $active={activeSection === section.id}
                    onClick={() => handleSectionChange(section.id)}
                  >
                    <TopicLinkIcon>{section.icon}</TopicLinkIcon>
                    <span>{section.label}</span>
                  </TopicLink>
                ))}
              </TopicsList>

              <SupportBox>
                <SupportTitle>Need more help?</SupportTitle>
                <p>
                  Visit our community forum or reach out directly for support.
                </p>
                <Button variant="primary" fullWidth>
                  Contact Support
                </Button>
              </SupportBox>
            </SidebarCard>
          </HelpSidebar>

          <HelpMainContent>
            <MainContentCard>
              <HelpSection id="getting-started">
                <HelpSectionHeader>
                  <SectionIcon>{getSectionIcon("getting-started")}</SectionIcon>
                  <h2>Getting Started</h2>
                </HelpSectionHeader>

                <HelpTopic
                  id="what-is-ygo-player"
                  title="What is YGO Player?"
                  expanded={expandedTopic === "what-is-ygo-player"}
                  onToggle={() => toggleTopic("what-is-ygo-player")}
                >
                  <p>
                    YGO Player is a comprehensive Yu-Gi-Oh! companion
                    application that allows you to build decks, duel opponents
                    online, analyze strategies, and manage your Yu-Gi-Oh! card
                    collections. It offers tools for both casual players and
                    competitive duelists.
                  </p>

                  <FeaturesList>
                    <FeatureItem>
                      <FeatureIcon>
                        <BookOpen size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <FeatureTitle>Deck Builder</FeatureTitle>
                        <FeatureDescription>
                          Create, edit and analyze your decks with our powerful
                          tools
                        </FeatureDescription>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Zap size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <FeatureTitle>Dueling</FeatureTitle>
                        <FeatureDescription>
                          Duel against friends or practice your strategies
                        </FeatureDescription>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Database size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <FeatureTitle>Card Database</FeatureTitle>
                        <FeatureDescription>
                          Browse through thousands of Yu-Gi-Oh! cards
                        </FeatureDescription>
                      </FeatureText>
                    </FeatureItem>
                  </FeaturesList>
                </HelpTopic>

                <HelpTopic
                  id="navigation"
                  title="Navigating the App"
                  expanded={expandedTopic === "navigation"}
                  onToggle={() => toggleTopic("navigation")}
                >
                  <p>
                    The application is organized into several main sections:
                  </p>
                  <ul>
                    <li>
                      <strong>Duel Lobby</strong> - Find opponents and start
                      duels
                    </li>
                    <li>
                      <strong>My Decks</strong> - View and manage your saved
                      decks
                    </li>
                    <li>
                      <strong>Deck Builder</strong> - Create and edit Yu-Gi-Oh!
                      decks
                    </li>
                    <li>
                      <strong>Card Database</strong> - Browse and search for
                      Yu-Gi-Oh! cards
                    </li>
                    <li>
                      <strong>Rulings</strong> - Look up card rulings and game
                      mechanics
                    </li>
                  </ul>
                  <p>
                    You can navigate between these sections using the navigation
                    bar at the top of the page.
                  </p>

                  <InfoBox>
                    <InfoBoxIcon>
                      <Info size={20} />
                    </InfoBoxIcon>
                    <InfoBoxContent>
                      Use the navigation menu at the top of the screen to
                      quickly switch between different sections of the app.
                    </InfoBoxContent>
                  </InfoBox>
                </HelpTopic>

                <HelpTopic
                  id="creating-account"
                  title="Your Data in YGO Player"
                  expanded={expandedTopic === "creating-account"}
                  onToggle={() => toggleTopic("creating-account")}
                >
                  <p>
                    YGO Player stores your decks, collections, and settings
                    locally on your device. This means:
                  </p>
                  <ul>
                    <li>
                      No account creation is required to start using the app
                    </li>
                    <li>
                      Your data remains private and stored only on your device
                    </li>
                    <li>
                      You can export your data to transfer between devices (see
                      Settings)
                    </li>
                  </ul>

                  <InfoBox type="warning">
                    <InfoBoxIcon>
                      <Info size={20} />
                    </InfoBoxIcon>
                    <InfoBoxContent>
                      We recommend regularly exporting your data as a backup to
                      prevent loss during browser cache clearing.
                    </InfoBoxContent>
                  </InfoBox>
                </HelpTopic>
              </HelpSection>

              <HelpSection id="deck-builder">
                <HelpSectionHeader>
                  <SectionIcon>{getSectionIcon("deck-builder")}</SectionIcon>
                  <h2>Deck Builder</h2>
                </HelpSectionHeader>

                <HelpTopic
                  id="creating-deck"
                  title="Creating a New Deck"
                  expanded={expandedTopic === "creating-deck"}
                  onToggle={() => toggleTopic("creating-deck")}
                >
                  <p>To create a new deck:</p>
                  <StepsList>
                    <Step>
                      <StepNumber>1</StepNumber>
                      <StepContent>
                        Navigate to the "Deck Builder" section or "My Decks"
                        page
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>2</StepNumber>
                      <StepContent>
                        Click on the "Create New Deck" button
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>3</StepNumber>
                      <StepContent>
                        Enter a name for your deck when prompted
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>4</StepNumber>
                      <StepContent>
                        Use the search panel to find cards and add them to your
                        deck
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>5</StepNumber>
                      <StepContent>
                        Your deck will be saved automatically as you make
                        changes
                      </StepContent>
                    </Step>
                  </StepsList>
                </HelpTopic>

                <HelpTopic
                  id="card-search"
                  title="Searching for Cards"
                  expanded={expandedTopic === "card-search"}
                  onToggle={() => toggleTopic("card-search")}
                >
                  <p>The Deck Builder offers two search modes:</p>
                  <SearchModes>
                    <SearchMode>
                      <SearchModeTitle>Basic Search</SearchModeTitle>
                      <SearchModeDesc>Simple name-based search</SearchModeDesc>
                    </SearchMode>
                    <SearchMode>
                      <SearchModeTitle>Advanced Search</SearchModeTitle>
                      <SearchModeDesc>
                        Filter by card type, attribute, level, and more
                      </SearchModeDesc>
                    </SearchMode>
                  </SearchModes>
                  <p>
                    To use the advanced search, click the "Advanced Search" tab
                    in the search panel and specify your desired filters.
                  </p>
                </HelpTopic>

                <HelpTopic
                  id="deck-analysis"
                  title="Deck Analysis"
                  expanded={expandedTopic === "deck-analysis"}
                  onToggle={() => toggleTopic("deck-analysis")}
                >
                  <p>YGO Player offers powerful deck analysis tools:</p>
                  <ul>
                    <li>Statistical breakdown of your deck composition</li>
                    <li>Draw probability calculations</li>
                    <li>Card recommendations and strategy tips</li>
                  </ul>
                  <p>
                    To access deck analysis, click on the "Analysis" tab while
                    in the Deck Builder.
                  </p>
                </HelpTopic>

                <HelpTopic
                  id="importing-exporting"
                  title="Importing and Exporting Decks"
                  expanded={expandedTopic === "importing-exporting"}
                  onToggle={() => toggleTopic("importing-exporting")}
                >
                  <p>You can share decks and move them between devices:</p>
                  <ExportFormatsList>
                    <ExportFormat>
                      <ExportFormatTitle>YDK</ExportFormatTitle>
                      <ExportFormatDesc>
                        Standard Yu-Gi-Oh! deck format
                      </ExportFormatDesc>
                    </ExportFormat>
                    <ExportFormat>
                      <ExportFormatTitle>JSON</ExportFormatTitle>
                      <ExportFormatDesc>
                        Detailed deck format with card information
                      </ExportFormatDesc>
                    </ExportFormat>
                    <ExportFormat>
                      <ExportFormatTitle>YDKE URL</ExportFormatTitle>
                      <ExportFormatDesc>
                        Shareable link format for deck sharing
                      </ExportFormatDesc>
                    </ExportFormat>
                  </ExportFormatsList>
                  <p>
                    To access these options, use the deck actions menu (three
                    dots) next to any deck in the "My Decks" page.
                  </p>
                </HelpTopic>
              </HelpSection>

              <HelpSection id="dueling">
                <HelpSectionHeader>
                  <SectionIcon>{getSectionIcon("dueling")}</SectionIcon>
                  <h2>Dueling</h2>
                </HelpSectionHeader>

                <HelpTopic
                  id="starting-duel"
                  title="Starting a Duel"
                  expanded={expandedTopic === "starting-duel"}
                  onToggle={() => toggleTopic("starting-duel")}
                >
                  <p>To start a duel:</p>
                  <StepsList>
                    <Step>
                      <StepNumber>1</StepNumber>
                      <StepContent>
                        Navigate to the "Duel Lobby" section
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>2</StepNumber>
                      <StepContent>
                        Choose whether to create or join a room
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>3</StepNumber>
                      <StepContent>Select the deck you want to use</StepContent>
                    </Step>
                    <Step>
                      <StepNumber>4</StepNumber>
                      <StepContent>
                        Wait for an opponent or invite someone to join your room
                      </StepContent>
                    </Step>
                  </StepsList>
                </HelpTopic>

                <HelpTopic
                  id="duel-controls"
                  title="Duel Controls"
                  expanded={expandedTopic === "duel-controls"}
                  onToggle={() => toggleTopic("duel-controls")}
                >
                  <p>During a duel:</p>
                  <ControlsList>
                    <Control>
                      <ControlIcon>
                        <Zap size={20} />
                      </ControlIcon>
                      <ControlText>
                        Click on cards to select them and view detailed
                        information
                      </ControlText>
                    </Control>
                    <Control>
                      <ControlIcon>
                        <Zap size={20} />
                      </ControlIcon>
                      <ControlText>
                        Right-click or long-press on cards to open the action
                        menu
                      </ControlText>
                    </Control>
                    <Control>
                      <ControlIcon>
                        <Zap size={20} />
                      </ControlIcon>
                      <ControlText>
                        Use the phase buttons to progress through your turn
                      </ControlText>
                    </Control>
                    <Control>
                      <ControlIcon>
                        <Zap size={20} />
                      </ControlIcon>
                      <ControlText>
                        Check the chain window to respond to effects and
                        activations
                      </ControlText>
                    </Control>
                  </ControlsList>
                </HelpTopic>

                <HelpTopic
                  id="connection-modes"
                  title="Connection Modes"
                  expanded={expandedTopic === "connection-modes"}
                  onToggle={() => toggleTopic("connection-modes")}
                >
                  <p>YGO Player offers different connection options:</p>
                  <ConnectionModes>
                    <ConnectionMode>
                      <ConnectionModeTitle>Direct</ConnectionModeTitle>
                      <ConnectionModeDesc>
                        Peer-to-peer connection for playing with specific
                        opponents
                      </ConnectionModeDesc>
                    </ConnectionMode>
                    <ConnectionMode>
                      <ConnectionModeTitle>Server</ConnectionModeTitle>
                      <ConnectionModeDesc>
                        Connect through our servers for more stable gameplay
                      </ConnectionModeDesc>
                    </ConnectionMode>
                    <ConnectionMode>
                      <ConnectionModeTitle>Offline</ConnectionModeTitle>
                      <ConnectionModeDesc>
                        Practice mode with no network connection required
                      </ConnectionModeDesc>
                    </ConnectionMode>
                  </ConnectionModes>
                  <p>
                    You can change your connection mode in the Settings page.
                  </p>
                </HelpTopic>
              </HelpSection>

              <HelpSection id="collection-management">
                <HelpSectionHeader>
                  <SectionIcon>
                    {getSectionIcon("collection-management")}
                  </SectionIcon>
                  <h2>Collection Management</h2>
                </HelpSectionHeader>

                <HelpTopic
                  id="organizing-decks"
                  title="Organizing Decks in Groups"
                  expanded={expandedTopic === "organizing-decks"}
                  onToggle={() => toggleTopic("organizing-decks")}
                >
                  <p>Keep your decks organized:</p>
                  <StepsList>
                    <Step>
                      <StepNumber>1</StepNumber>
                      <StepContent>Go to the "My Decks" page</StepContent>
                    </Step>
                    <Step>
                      <StepNumber>2</StepNumber>
                      <StepContent>
                        Click on "Manage Groups" to enter group editing mode
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>3</StepNumber>
                      <StepContent>
                        Create new groups or edit existing ones
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>4</StepNumber>
                      <StepContent>
                        Drag and drop decks between groups or use the move
                        option in the deck menu
                      </StepContent>
                    </Step>
                  </StepsList>
                </HelpTopic>

                <HelpTopic
                  id="card-groups"
                  title="Creating Card Groups"
                  expanded={expandedTopic === "card-groups"}
                  onToggle={() => toggleTopic("card-groups")}
                >
                  <p>Card Groups help you organize your favorite cards:</p>
                  <StepsList>
                    <Step>
                      <StepNumber>1</StepNumber>
                      <StepContent>Navigate to "My Card Groups"</StepContent>
                    </Step>
                    <Step>
                      <StepNumber>2</StepNumber>
                      <StepContent>
                        Create a new group with a custom name
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>3</StepNumber>
                      <StepContent>
                        Search for cards and add them to your groups
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>4</StepNumber>
                      <StepContent>
                        Use these groups to quickly find cards for your decks
                      </StepContent>
                    </Step>
                  </StepsList>
                </HelpTopic>

                <HelpTopic
                  id="combos"
                  title="Saving and Managing Combos"
                  expanded={expandedTopic === "combos"}
                  onToggle={() => toggleTopic("combos")}
                >
                  <p>Record your favorite card combinations:</p>
                  <FeaturesList>
                    <FeatureItem>
                      <FeatureIcon>
                        <Layout size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>Navigate to "My Combos" to view your saved combos</p>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Layout size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>
                          Create new combos from scratch or based on your
                          replays
                        </p>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Layout size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>
                          Add step-by-step instructions for executing each combo
                        </p>
                      </FeatureText>
                    </FeatureItem>
                  </FeaturesList>
                </HelpTopic>

                <HelpTopic
                  id="replays"
                  title="Saving and Reviewing Replays"
                  expanded={expandedTopic === "replays"}
                  onToggle={() => toggleTopic("replays")}
                >
                  <p>Review your past duels:</p>
                  <FeaturesList>
                    <FeatureItem>
                      <FeatureIcon>
                        <Layout size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>Duels are automatically saved as replays</p>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Layout size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>Access them from the "My Replays" section</p>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Layout size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>
                          Watch replays to study your plays and improve your
                          strategy
                        </p>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Layout size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>
                          Create spreadsheets from replays to analyze your
                          dueling patterns
                        </p>
                      </FeatureText>
                    </FeatureItem>
                  </FeaturesList>
                </HelpTopic>
              </HelpSection>

              <HelpSection id="cards-and-rulings">
                <HelpSectionHeader>
                  <SectionIcon>
                    {getSectionIcon("cards-and-rulings")}
                  </SectionIcon>
                  <h2>Cards & Rulings</h2>
                </HelpSectionHeader>

                <HelpTopic
                  id="card-database"
                  title="Using the Card Database"
                  expanded={expandedTopic === "card-database"}
                  onToggle={() => toggleTopic("card-database")}
                >
                  <p>
                    The Card Database lets you browse and search for Yu-Gi-Oh!
                    cards:
                  </p>
                  <FeaturesList>
                    <FeatureItem>
                      <FeatureIcon>
                        <Database size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>Use the search bar to find cards by name</p>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Database size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>Apply filters to narrow down your search</p>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Database size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>Click on a card to view detailed information</p>
                      </FeatureText>
                    </FeatureItem>
                    <FeatureItem>
                      <FeatureIcon>
                        <Database size={20} />
                      </FeatureIcon>
                      <FeatureText>
                        <p>Add cards to your favorites for quick access</p>
                      </FeatureText>
                    </FeatureItem>
                  </FeaturesList>
                </HelpTopic>

                <HelpTopic
                  id="card-rulings"
                  title="Looking Up Card Rulings"
                  expanded={expandedTopic === "card-rulings"}
                  onToggle={() => toggleTopic("card-rulings")}
                >
                  <p>To find rulings for specific cards:</p>
                  <StepsList>
                    <Step>
                      <StepNumber>1</StepNumber>
                      <StepContent>
                        Navigate to the "Rulings" section
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>2</StepNumber>
                      <StepContent>Search for the card by name</StepContent>
                    </Step>
                    <Step>
                      <StepNumber>3</StepNumber>
                      <StepContent>
                        Browse through the official rulings and commonly asked
                        questions
                      </StepContent>
                    </Step>
                    <Step>
                      <StepNumber>4</StepNumber>
                      <StepContent>
                        Use the Card Text Analyzer tool for help understanding
                        card text
                      </StepContent>
                    </Step>
                  </StepsList>
                </HelpTopic>

                <HelpTopic
                  id="psct"
                  title="Understanding Problem-Solving Card Text"
                  expanded={expandedTopic === "psct"}
                  onToggle={() => toggleTopic("psct")}
                >
                  <p>
                    Problem-Solving Card Text (PSCT) helps clarify how cards
                    work:
                  </p>

                  <PSCTTable>
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Colons (:)</td>
                        <td>
                          Separate activation conditions from costs/effects
                        </td>
                      </tr>
                      <tr>
                        <td>Semicolons (;)</td>
                        <td>Separate costs from effects</td>
                      </tr>
                      <tr>
                        <td>Periods (.)</td>
                        <td>Separate different effects on the same card</td>
                      </tr>
                    </tbody>
                  </PSCTTable>

                  <p>
                    Visit the Card Text Analyzer in the Rulings section to break
                    down complex card texts.
                  </p>

                  <InfoBox>
                    <InfoBoxIcon>
                      <Info size={20} />
                    </InfoBoxIcon>
                    <InfoBoxContent>
                      Understanding PSCT is essential for correctly interpreting
                      card effects and resolving chains properly.
                    </InfoBoxContent>
                  </InfoBox>
                </HelpTopic>
              </HelpSection>

              <HelpSection id="settings">
                <HelpSectionHeader>
                  <SectionIcon>{getSectionIcon("settings")}</SectionIcon>
                  <h2>Settings</h2>
                </HelpSectionHeader>

                <HelpTopic
                  id="connection-settings"
                  title="Connection Settings"
                  expanded={expandedTopic === "connection-settings"}
                  onToggle={() => toggleTopic("connection-settings")}
                >
                  <p>Manage your connection preferences:</p>
                  <SettingsSection>
                    <SettingItem>
                      <SettingName>Direct Mode</SettingName>
                      <SettingDescription>
                        Best for playing with friends
                      </SettingDescription>
                    </SettingItem>
                    <SettingItem>
                      <SettingName>Server Mode</SettingName>
                      <SettingDescription>
                        May provide better stability for public games
                      </SettingDescription>
                    </SettingItem>
                    <SettingItem>
                      <SettingName>Offline Mode</SettingName>
                      <SettingDescription>
                        Perfect for practicing without a connection
                      </SettingDescription>
                    </SettingItem>
                  </SettingsSection>
                </HelpTopic>

                <HelpTopic
                  id="data-export"
                  title="Exporting & Importing Your Data"
                  expanded={expandedTopic === "data-export"}
                  onToggle={() => toggleTopic("data-export")}
                >
                  <p>Transfer your data between devices:</p>
                  <ExportSection>
                    <ExportOption>
                      <ExportOptionIcon>
                        <Zap size={20} />
                      </ExportOptionIcon>
                      <div>
                        <ExportOptionTitle>Export to file</ExportOptionTitle>
                        <ExportOptionDescription>
                          Save all your decks and data to a file
                        </ExportOptionDescription>
                      </div>
                    </ExportOption>
                    <ExportOption>
                      <ExportOptionIcon>
                        <Zap size={20} />
                      </ExportOptionIcon>
                      <div>
                        <ExportOptionTitle>
                          Export via QR code
                        </ExportOptionTitle>
                        <ExportOptionDescription>
                          Generate a QR code to scan on another device
                        </ExportOptionDescription>
                      </div>
                    </ExportOption>
                    <ExportOption>
                      <ExportOptionIcon>
                        <Zap size={20} />
                      </ExportOptionIcon>
                      <div>
                        <ExportOptionTitle>Import from file</ExportOptionTitle>
                        <ExportOptionDescription>
                          Load data from a previously exported file
                        </ExportOptionDescription>
                      </div>
                    </ExportOption>
                    <ExportOption>
                      <ExportOptionIcon>
                        <Zap size={20} />
                      </ExportOptionIcon>
                      <div>
                        <ExportOptionTitle>
                          Import from QR code
                        </ExportOptionTitle>
                        <ExportOptionDescription>
                          Scan a QR code to import data
                        </ExportOptionDescription>
                      </div>
                    </ExportOption>
                  </ExportSection>
                </HelpTopic>
              </HelpSection>

              <HelpSection id="faq">
                <HelpSectionHeader>
                  <SectionIcon>{getSectionIcon("faq")}</SectionIcon>
                  <h2>Frequently Asked Questions</h2>
                </HelpSectionHeader>

                <HelpTopic
                  id="faq-data-loss"
                  title="Will I lose my data if I clear my browser cache?"
                  expanded={expandedTopic === "faq-data-loss"}
                  onToggle={() => toggleTopic("faq-data-loss")}
                >
                  <FAQAnswer>
                    <p>
                      Yes, clearing your browser cache or local storage will
                      remove your saved decks and settings. We recommend
                      regularly exporting your data to a file as a backup. You
                      can do this from the Settings page using the data export
                      feature.
                    </p>

                    <InfoBox type="warning">
                      <InfoBoxIcon>
                        <Info size={20} />
                      </InfoBoxIcon>
                      <InfoBoxContent>
                        Always create a backup of your data before clearing your
                        browser cache or using browser privacy tools.
                      </InfoBoxContent>
                    </InfoBox>
                  </FAQAnswer>
                </HelpTopic>

                <HelpTopic
                  id="faq-connection"
                  title="I'm having connection issues during duels"
                  expanded={expandedTopic === "faq-connection"}
                  onToggle={() => toggleTopic("faq-connection")}
                >
                  <FAQAnswer>
                    <p>If you're experiencing connection problems:</p>
                    <SolutionsList>
                      <SolutionItem>
                        <SolutionIcon>
                          <Zap size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Try switching your connection mode in Settings
                        </SolutionText>
                      </SolutionItem>
                      <SolutionItem>
                        <SolutionIcon>
                          <Zap size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Check your internet connection
                        </SolutionText>
                      </SolutionItem>
                      <SolutionItem>
                        <SolutionIcon>
                          <Zap size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Make sure you and your opponent have stable internet
                          access
                        </SolutionText>
                      </SolutionItem>
                      <SolutionItem>
                        <SolutionIcon>
                          <Zap size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Try using Server mode if Direct mode is unstable
                        </SolutionText>
                      </SolutionItem>
                    </SolutionsList>
                  </FAQAnswer>
                </HelpTopic>

                <HelpTopic
                  id="faq-missing-cards"
                  title="Why can't I find certain cards?"
                  expanded={expandedTopic === "faq-missing-cards"}
                  onToggle={() => toggleTopic("faq-missing-cards")}
                >
                  <FAQAnswer>
                    <p>
                      Our card database is regularly updated, but there might be
                      a delay before the newest cards are available. If you
                      can't find a specific card, try the following:
                    </p>
                    <SolutionsList>
                      <SolutionItem>
                        <SolutionIcon>
                          <Search size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Check that you're spelling the card name correctly
                        </SolutionText>
                      </SolutionItem>
                      <SolutionItem>
                        <SolutionIcon>
                          <Search size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Try searching for part of the name instead of the full
                          name
                        </SolutionText>
                      </SolutionItem>
                      <SolutionItem>
                        <SolutionIcon>
                          <Search size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          For very recent cards, check back after the next
                          database update
                        </SolutionText>
                      </SolutionItem>
                    </SolutionsList>
                  </FAQAnswer>
                </HelpTopic>

                <HelpTopic
                  id="faq-performance"
                  title="The application is running slowly"
                  expanded={expandedTopic === "faq-performance"}
                  onToggle={() => toggleTopic("faq-performance")}
                >
                  <FAQAnswer>
                    <p>If you're experiencing performance issues:</p>
                    <SolutionsList>
                      <SolutionItem>
                        <SolutionIcon>
                          <Zap size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Refresh the page to clear temporary memory
                        </SolutionText>
                      </SolutionItem>
                      <SolutionItem>
                        <SolutionIcon>
                          <Zap size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Close other tabs or applications to free up system
                          resources
                        </SolutionText>
                      </SolutionItem>
                      <SolutionItem>
                        <SolutionIcon>
                          <Zap size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Check for and install the latest browser updates
                        </SolutionText>
                      </SolutionItem>
                      <SolutionItem>
                        <SolutionIcon>
                          <Zap size={20} />
                        </SolutionIcon>
                        <SolutionText>
                          Try using a different web browser
                        </SolutionText>
                      </SolutionItem>
                    </SolutionsList>
                  </FAQAnswer>
                </HelpTopic>
              </HelpSection>
            </MainContentCard>
          </HelpMainContent>
        </HelpContent>
      </PageContainer>
    </AppLayout>
  );
};

// Help Topic component
interface HelpTopicProps {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const HelpTopic: React.FC<HelpTopicProps> = ({
  id,
  title,
  expanded,
  onToggle,
  children,
}) => {
  return (
    <TopicContainer id={id}>
      <TopicHeader onClick={onToggle}>
        <TopicTitle>{title}</TopicTitle>
        <TopicToggle>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </TopicToggle>
      </TopicHeader>
      {expanded && <TopicContent>{children}</TopicContent>}
    </TopicContainer>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const HelpHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const HelpHeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};

  h1 {
    margin: 0 0 ${theme.spacing.xs} 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["3xl"]};
  }
`;

const HelpDescription = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.lg};
`;

const HelpIcon = styled.div`
  color: ${theme.colors.primary.main};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SearchBox = styled.div`
  position: relative;
  width: 300px;
  max-width: 100%;

  input {
    width: 100%;
    padding: ${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.md} 40px;
    border: 1px solid ${theme.colors.border.default};
    border-radius: ${theme.borderRadius.md};
    background-color: ${theme.colors.background.paper};
    font-size: ${theme.typography.size.md};
    color: ${theme.colors.text.primary};
    transition: border-color 0.2s, box-shadow 0.2s;

    &:focus {
      outline: none;
      border-color: ${theme.colors.primary.main};
      box-shadow: 0 0 0 2px ${theme.colors.primary.light};
    }

    &::placeholder {
      color: ${theme.colors.text.disabled};
    }
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.colors.text.secondary};
`;

const HelpContent = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: ${theme.spacing.xl};

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const HelpSidebar = styled.div`
  @media (max-width: 920px) {
    display: none;
  }
`;

const SidebarCard = styled(Card)`
  position: sticky;
  top: 20px;
  padding: ${theme.spacing.lg};
`;

const SidebarTitle = styled.h3`
  margin-top: 0;
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.weight.semibold};
`;

const TopicsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const TopicLink = styled.a<{ $active: boolean }>`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.sm};
  color: ${(props) =>
    props.$active ? theme.colors.primary.main : theme.colors.text.primary};
  background-color: ${(props) =>
    props.$active ? theme.colors.primary.light : "transparent"};
  text-decoration: none;
  border-radius: ${theme.borderRadius.sm};
  transition: background-color ${theme.transitions.default},
    color ${theme.transitions.default};
  font-weight: ${(props) =>
    props.$active
      ? theme.typography.weight.semibold
      : theme.typography.weight.regular};
  cursor: pointer;

  &:hover {
    background-color: ${(props) =>
      props.$active
        ? theme.colors.primary.light
        : theme.colors.background.card};
    text-decoration: none;
  }
`;

const TopicLinkIcon = styled.span`
  display: flex;
  align-items: center;
  margin-right: ${theme.spacing.sm};
  color: ${theme.colors.primary.main};
`;

const SupportBox = styled.div`
  margin-top: ${theme.spacing.xl};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  background-color: ${theme.colors.background.card};
  border: 1px solid ${theme.colors.border.default};

  p {
    margin-top: 0;
    margin-bottom: ${theme.spacing.md};
    color: ${theme.colors.text.secondary};
  }
`;

const SupportTitle = styled.h4`
  margin-top: 0;
  margin-bottom: ${theme.spacing.xs};
  color: ${theme.colors.text.primary};
`;

const HelpMainContent = styled.div`
  flex: 1;
`;

const MainContentCard = styled.div`
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  background-color: ${theme.colors.background.paper};
  box-shadow: ${theme.shadows.sm};
`;

const HelpSection = styled.section`
  padding: ${theme.spacing.xl};
  border-bottom: 1px solid ${theme.colors.border.light};
  scroll-margin-top: 20px;

  &:last-child {
    border-bottom: none;
  }
`;

const HelpSectionHeader = styled.div`
  margin-bottom: ${theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  h2 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["2xl"]};
  }
`;

const SectionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${theme.colors.primary.light};
  color: ${theme.colors.primary.main};
`;

const TopicContainer = styled.div`
  margin-bottom: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  transition: box-shadow ${theme.transitions.default};

  &:hover {
    box-shadow: ${theme.shadows.sm};
  }
`;

const TopicHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.card};
  cursor: pointer;
  transition: background-color ${theme.transitions.default};

  &:hover {
    background-color: ${theme.colors.background.hover};
  }
`;

const TopicTitle = styled.h3`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.medium};
`;

const TopicToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.text.secondary};
`;

const TopicContent = styled.div`
  padding: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.border.light};
  background-color: ${theme.colors.background.paper};
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  p {
    margin-top: 0;
    color: ${theme.colors.text.secondary};
    line-height: 1.6;
    font-size: ${theme.typography.size.md};
  }

  ul,
  ol {
    margin-top: 0;
    padding-left: 1.5rem;
    color: ${theme.colors.text.secondary};
    line-height: 1.6;

    li {
      margin-bottom: ${theme.spacing.xs};
    }
  }
`;

const InfoBox = styled.div<{ type?: string }>`
  display: flex;
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
  border-radius: ${theme.borderRadius.md};
  background-color: ${(props) =>
    props.type === "warning"
      ? theme.colors.warning.light
      : theme.colors.primary.light};
  border-left: 4px solid
    ${(props) =>
      props.type === "warning"
        ? theme.colors.warning.main
        : theme.colors.primary.main};
`;

const InfoBoxIcon = styled.div`
  margin-right: ${theme.spacing.md};
  color: ${theme.colors.primary.main};
  display: flex;
  align-items: flex-start;
`;

const InfoBoxContent = styled.div`
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
`;

const FeaturesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: ${theme.spacing.sm} 0;
`;

const FeatureIcon = styled.div`
  margin-right: ${theme.spacing.md};
  color: ${theme.colors.primary.main};
  display: flex;
  align-items: center;
`;

const FeatureText = styled.div`
  p {
    margin: 0;
  }
`;

const FeatureTitle = styled.h4`
  margin: 0 0 ${theme.spacing.xs} 0;
  color: ${theme.colors.text.primary};
`;

const FeatureDescription = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
`;

const StepsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
`;

const StepNumber = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: ${theme.colors.primary.main};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: ${theme.spacing.md};
  font-weight: ${theme.typography.weight.semibold};
`;

const StepContent = styled.div`
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
`;

const SearchModes = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.lg};
  margin: ${theme.spacing.md} 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const SearchMode = styled.div`
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.default};
  background-color: ${theme.colors.background.card};
`;

const SearchModeTitle = styled.h4`
  margin: 0 0 ${theme.spacing.xs} 0;
  color: ${theme.colors.text.primary};
`;

const SearchModeDesc = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
`;

const ExportFormatsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const ExportFormat = styled.div`
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.default};
  background-color: ${theme.colors.background.card};
`;

const ExportFormatTitle = styled.h4`
  margin: 0 0 ${theme.spacing.xs} 0;
  color: ${theme.colors.text.primary};
`;

const ExportFormatDesc = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

const ControlsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const Control = styled.div`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.sm} 0;
`;

const ControlIcon = styled.div`
  margin-right: ${theme.spacing.md};
  color: ${theme.colors.primary.main};
  display: flex;
  align-items: center;
`;

const ControlText = styled.div`
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
`;

const ConnectionModes = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const ConnectionMode = styled.div`
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.default};
  background-color: ${theme.colors.background.card};
`;

const ConnectionModeTitle = styled.h4`
  margin: 0 0 ${theme.spacing.xs} 0;
  color: ${theme.colors.text.primary};
`;

const ConnectionModeDesc = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

const PSCTTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: ${theme.spacing.md} 0;

  th,
  td {
    padding: ${theme.spacing.sm};
    text-align: left;
    border: 1px solid ${theme.colors.border.default};
  }

  th {
    background-color: ${theme.colors.background.card};
    font-weight: ${theme.typography.weight.semibold};
    color: ${theme.colors.text.primary};
  }

  td {
    color: ${theme.colors.text.secondary};
  }
`;

const SettingsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const SettingItem = styled.div`
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.default};
  background-color: ${theme.colors.background.card};
`;

const SettingName = styled.h4`
  margin: 0 0 ${theme.spacing.xs} 0;
  color: ${theme.colors.text.primary};
`;

const SettingDescription = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
`;

const ExportSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const ExportOption = styled.div`
  display: flex;
  align-items: flex-start;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.default};
  background-color: ${theme.colors.background.card};
`;

const ExportOptionIcon = styled.div`
  margin-right: ${theme.spacing.md};
  color: ${theme.colors.primary.main};
  display: flex;
  align-items: center;
`;

const ExportOptionTitle = styled.h4`
  margin: 0 0 ${theme.spacing.xs} 0;
  color: ${theme.colors.text.primary};
`;

const ExportOptionDescription = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

const FAQAnswer = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.md};
  line-height: 1.6;
`;

const SolutionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const SolutionItem = styled.div`
  display: flex;
  align-items: flex-start;
`;

const SolutionIcon = styled.div`
  margin-right: ${theme.spacing.md};
  color: ${theme.colors.primary.main};
  display: flex;
  align-items: center;
`;

const SolutionText = styled.div`
  color: ${theme.colors.text.secondary};
`;

export default HelpPage;
