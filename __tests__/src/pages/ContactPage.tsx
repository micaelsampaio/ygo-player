import React, { useState } from "react";
import styled from "styled-components";
import { ThemeProvider } from "styled-components";
import theme from "../styles/theme";
import AppLayout from "../components/Layout/AppLayout";
import Card from "../components/UI/Card";
import Button from "../components/UI/Button";
import TextField from "../components/UI/TextField";

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    }, 1000);
  };

  return (
    <ThemeProvider theme={theme}>
      <AppLayout>
        <PageContainer>
          <PageHeader>
            <h1>Contact Us</h1>
            <p>Have questions or feedback? Get in touch with our team.</p>
          </PageHeader>

          <ContentGrid>
            <ContactFormSection>
              <Card elevation="low">
                <Card.Content>
                  {submitted ? (
                    <SuccessMessage>
                      <h3>Thank you for your message!</h3>
                      <p>
                        We've received your inquiry and will get back to you
                        soon.
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => setSubmitted(false)}
                        style={{ marginTop: "1rem" }}
                      >
                        Send Another Message
                      </Button>
                    </SuccessMessage>
                  ) : (
                    <form onSubmit={handleSubmit}>
                      <FormGroup>
                        <Label htmlFor="name">Name</Label>
                        <TextField
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          required
                          fullWidth
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label htmlFor="email">Email</Label>
                        <TextField
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your.email@example.com"
                          required
                          fullWidth
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label htmlFor="subject">Subject</Label>
                        <TextField
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="What is this regarding?"
                          required
                          fullWidth
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label htmlFor="message">Message</Label>
                        <TextArea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Your message here..."
                          required
                          rows={6}
                        />
                      </FormGroup>
                      <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  )}
                </Card.Content>
              </Card>
            </ContactFormSection>

            <ContactInfoSection>
              <Card elevation="low">
                <Card.Content>
                  <ContactInfoTitle>Contact Information</ContactInfoTitle>

                  <ContactInfoItem>
                    <ContactInfoIcon>📧</ContactInfoIcon>
                    <ContactInfoText>
                      <strong>Email</strong>
                      <span>ygo101.com@gmail.com</span>
                    </ContactInfoText>
                  </ContactInfoItem>

                  <ContactInfoItem>
                    <ContactInfoIcon>🐦</ContactInfoIcon>
                    <ContactInfoText>
                      <strong>Twitter</strong>
                      <SocialLink
                        href="https://twitter.com/ygo101com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        @ygo101com
                      </SocialLink>
                    </ContactInfoText>
                  </ContactInfoItem>

                  <ContactInfoDivider />

                  <FAQSection>
                    <h3>Frequently Asked Questions</h3>
                    <FAQItem>
                      <FAQQuestion>How do I build my first deck?</FAQQuestion>
                      <FAQAnswer>
                        Visit our Deck Builder page to create your first
                        Yu-Gi-Oh! deck. You can also check our guide section for
                        beginners.
                      </FAQAnswer>
                    </FAQItem>
                    <FAQItem>
                      <FAQQuestion>How do I report a bug?</FAQQuestion>
                      <FAQAnswer>
                        Please use the contact form and include "Bug Report" in
                        the subject line. Details about the issue, steps to
                        reproduce, and screenshots are helpful.
                      </FAQAnswer>
                    </FAQItem>
                  </FAQSection>
                </Card.Content>
              </Card>
            </ContactInfoSection>
          </ContentGrid>
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

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const ContactFormSection = styled.section``;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.size.md};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.input};
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary.light + "40"};
  }
`;

const SuccessMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg} 0;

  h3 {
    color: ${({ theme }) => theme.colors.success.main};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }

  p {
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
  }
`;

const ContactInfoSection = styled.section``;

const ContactInfoTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.size.xl};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
`;

const ContactInfoItem = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ContactInfoIcon = styled.div`
  font-size: 1.5rem;
  margin-right: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.primary.main};
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ContactInfoText = styled.div`
  display: flex;
  flex-direction: column;

  strong {
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const SocialLink = styled.a`
  color: ${({ theme }) => theme.colors.primary.main};
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary.dark};
    text-decoration: underline;
  }
`;

const ContactInfoDivider = styled.hr`
  margin: ${({ theme }) => theme.spacing.lg} 0;
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const FAQSection = styled.div`
  h3 {
    font-size: ${({ theme }) => theme.typography.size.lg};
    color: ${({ theme }) => theme.colors.text.primary};
    margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  }
`;

const FAQItem = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const FAQQuestion = styled.h4`
  font-size: ${({ theme }) => theme.typography.size.md};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
`;

const FAQAnswer = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  margin: 0;
  line-height: 1.5;
`;

export default ContactPage;
