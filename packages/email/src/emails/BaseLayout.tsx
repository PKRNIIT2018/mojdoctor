import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";
import type { ReactNode } from "react";

interface BaseLayoutProps {
  preview: string;
  children: ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Online Consultation</Text>
          </Section>
          {children}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>Online Consultation Platform</Text>
            <Link href="https://onlineconsultation.app" style={link}>
              onlineconsultation.app
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "20px",
  textAlign: "center" as const,
  backgroundColor: "#0f172a",
};

const logo = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "bold" as const,
  margin: 0,
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  padding: "0 20px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: 0,
};

const link = {
  color: "#2563eb",
  fontSize: "12px",
};
