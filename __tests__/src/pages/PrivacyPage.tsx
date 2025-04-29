import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { ThemeProvider } from "styled-components";
import theme from "../styles/theme";
import AppLayout from "../components/Layout/AppLayout";
import Card from "../components/UI/Card";
import { useLocation } from "react-router-dom";

const PrivacyPage: React.FC = () => {
  const location = useLocation();
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    // Handle navigation to sections via hash
    if (location.hash) {
      const sectionId = location.hash.substring(1); // Remove the # character
      const sectionElement = sectionsRef.current[sectionId];
      if (sectionElement) {
        // Scroll to the section with smooth behavior
        setTimeout(() => {
          sectionElement.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location]);

  // Function to register section references
  const registerSectionRef =
    (id: string) => (element: HTMLDivElement | null) => {
      sectionsRef.current[id] = element;
    };

  return (
    <ThemeProvider theme={theme}>
      <AppLayout>
        <PageContainer>
          <PageHeader>
            <h1>Privacy Policy</h1>
            <p>Last updated: April 29, 2025</p>
          </PageHeader>

          <ContentWrapper>
            <PolicyContent>
              <Card elevation="low">
                <Card.Content>
                  <div className="privacy-policy-container">
                    <div className="policy-section">
                      <h2>Privacy Policy</h2>
                      <p>Last updated: April 29, 2025</p>

                      <p>
                        This Privacy Policy describes how YGO101 ("we", "us", or
                        "our") collects, uses, and discloses your information
                        when you use our website and services (collectively, the
                        "Services").
                      </p>

                      <p>
                        By accessing or using our Services, you agree to this
                        Privacy Policy. If you do not agree with our policies
                        and practices, do not use our Services.
                      </p>
                    </div>

                    <div className="policy-section">
                      <h2>Information We Collect</h2>

                      <h3>Information You Provide to Us</h3>
                      <p>
                        We collect information that you provide directly to us,
                        such as when you create an account, update your profile,
                        use the interactive features of our Services,
                        participate in contests, promotions, or surveys, request
                        customer support, or communicate with us.
                      </p>

                      <h3>Information We Collect Automatically</h3>
                      <p>
                        When you access or use our Services, we automatically
                        collect certain information, including:
                      </p>
                      <ul>
                        <li>
                          Log Information: We collect log information about your
                          use of the Services, including the type of browser you
                          use, access times, pages viewed, and your IP address.
                        </li>
                        <li>
                          Device Information: We collect information about the
                          device you use to access our Services, including the
                          hardware model, operating system and version, unique
                          device identifiers, and mobile network information.
                        </li>
                        <li>
                          Usage Information: We collect information about your
                          interactions with our Services, such as the features
                          you use and the actions you take.
                        </li>
                      </ul>

                      <h3>Information We Collect from Other Sources</h3>
                      <p>
                        We may also obtain information from other sources and
                        combine that with information we collect through our
                        Services.
                      </p>
                    </div>

                    <div className="policy-section">
                      <h2>How We Use Information</h2>
                      <p>
                        We use the information we collect for various purposes,
                        including to:
                      </p>
                      <ul>
                        <li>Provide, maintain, and improve our Services;</li>
                        <li>
                          Process transactions and send related information;
                        </li>
                        <li>
                          Send technical notices, updates, security alerts, and
                          support messages;
                        </li>
                        <li>
                          Respond to your comments, questions, and requests;
                        </li>
                        <li>
                          Communicate with you about products, services, offers,
                          promotions, and events, and provide other news or
                          information about us and our partners;
                        </li>
                        <li>
                          Monitor and analyze trends, usage, and activities in
                          connection with our Services;
                        </li>
                        <li>
                          Detect, investigate, and prevent security incidents
                          and other potentially prohibited or illegal
                          activities;
                        </li>
                        <li>
                          Personalize and improve the Services and provide
                          content, features, or advertisements that match user
                          profiles or interests.
                        </li>
                      </ul>
                    </div>

                    <div className="policy-section">
                      <h2>How We Share Information</h2>
                      <p>We may share information about you as follows:</p>
                      <ul>
                        <li>
                          With vendors, service providers, and consultants that
                          perform services for us;
                        </li>
                        <li>
                          In response to a request for information if we believe
                          disclosure is in accordance with, or required by, any
                          applicable law or legal process;
                        </li>
                        <li>
                          If we believe your actions are inconsistent with our
                          user agreements or policies, or to protect the rights,
                          property, and safety of us or others;
                        </li>
                        <li>
                          In connection with, or during negotiations of, any
                          merger, sale of company assets, financing, or
                          acquisition of all or a portion of our business by
                          another company;
                        </li>
                        <li>With your consent or at your direction.</li>
                      </ul>
                    </div>

                    <div className="policy-section">
                      <h2>Data Security</h2>
                      <p>
                        We take reasonable measures to help protect information
                        about you from loss, theft, misuse and unauthorized
                        access, disclosure, alteration, and destruction.
                        However, no security system is impenetrable, and we
                        cannot guarantee the security of our systems 100%.
                      </p>
                    </div>

                    <div className="policy-section">
                      <h2>Your Choices</h2>
                      <h3>Account Information</h3>
                      <p>
                        You may update, correct, or delete your account
                        information at any time by logging into your online
                        account. If you wish to delete your account, please
                        contact us at general@ygo101.com.
                      </p>

                      <h3>Cookies</h3>
                      <p>
                        Most web browsers are set to accept cookies by default.
                        If you prefer, you can usually choose to set your
                        browser to remove or reject cookies. Please note that if
                        you choose to remove or reject cookies, this could
                        affect the availability and functionality of our
                        Services.
                      </p>
                    </div>

                    <div className="policy-section">
                      <h2>Children's Privacy</h2>
                      <p>
                        Our Services are not directed to children under 13 years
                        of age. We do not knowingly collect personally
                        identifiable information from children under 13. If you
                        are a parent or guardian and believe that your child has
                        provided us with personal information, please contact us
                        at general@ygo101.com.
                      </p>
                    </div>

                    <div className="policy-section">
                      <h2>Changes to this Privacy Policy</h2>
                      <p>
                        We may update this Privacy Policy from time to time. We
                        will notify you of any changes by posting the new
                        Privacy Policy on this page and updating the "Last
                        updated" date at the top of this Privacy Policy. You are
                        advised to review this Privacy Policy periodically for
                        any changes.
                      </p>
                    </div>

                    <div className="policy-section">
                      <h2>Contact Us</h2>
                      <p>
                        If you have any questions about this Privacy Policy,
                        please contact us at:
                      </p>
                      <p>
                        <strong>YGO101</strong>
                        <br />
                        Email: general@ygo101.com
                      </p>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </PolicyContent>
          </ContentWrapper>
        </PageContainer>
      </AppLayout>
    </ThemeProvider>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const PageHeader = styled.header`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;

  h1 {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.typography.size["2xl"]};
    margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  }

  p {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: ${({ theme }) => theme.typography.size.md};
    margin: 0;
  }
`;

const ContentWrapper = styled.div`
  display: flex;
  justify-content: center;
`;

const PolicyContent = styled.div`
  width: 100%;
  max-width: 900px;

  h1,
  h2,
  h3 {
    color: ${({ theme }) => theme.colors.text.primary};
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    scroll-margin-top: 80px; /* This creates space at the top when scrolling to an anchor */
  }

  p {
    margin-bottom: 1em;
    line-height: 1.6;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  a {
    color: ${({ theme }) => theme.colors.primary.main};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  ul {
    list-style-type: square;
    margin-left: 1.5em;
    margin-bottom: 1em;
  }

  li {
    margin-bottom: 0.5em;
  }

  .policy-section {
    margin-bottom: 2.5em;
  }

  .policy-title {
    text-align: center;
    margin-bottom: 2em;
  }

  .toc-links {
    line-height: 1.8;
  }
`;

export default PrivacyPage;
