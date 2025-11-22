import { Body, Container, Head, Heading, Html, Img, Section, Text } from '@react-email/components'
import * as React from 'react'

interface OTPEmailProps {
  otpCode: string
  title: string
}

const logoUrl = 'https://res.cloudinary.com/dlkqayd7j/image/upload/v1754211094/nuw3nlxrunrctzevpxhh.webp'

export const OTPEmail = ({ otpCode, title }: OTPEmailProps) => (
  <Html>
    <Head>
      <title>{title}</title>
    </Head>
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="212" height="88" alt="Logo" style={logo} />
        <Text style={tertiary}>Mã xác thực OTP</Text>
        <Heading style={secondary}>Hãy nhập mã xác thực OTP sau vào website</Heading>
        <Section style={codeContainer}>
          <Text style={code}>{otpCode}</Text>
        </Section>
        <Text style={paragraph}>Nếu bạn không chủ động thực hiện hành động này, xin hãy bỏ qua email?</Text>
      </Container>
      <Text style={footer}>From Nqk-Khanhbk with ❤️</Text>
    </Body>
  </Html>
)

OTPEmail.PreviewProps = {
  otpCode: '144833',
  title: 'Mã OTP',
} as OTPEmailProps

export default OTPEmail

const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: 'HelveticaNeue, Helvetica, Arial, sans-serif',
  padding: '40px 0',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  maxWidth: '400px',
  margin: '0 auto',
  padding: '40px 30px',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto 20px',
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  objectFit: 'cover' as const,
};

const tertiary = {
  color: '#0ea5e9',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '1px',
  lineHeight: '16px',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
};

const secondary = {
  color: '#111827',
  fontSize: '20px',
  fontWeight: 600,
  lineHeight: '28px',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const codeContainer = {
  background: '#f1f5f9',
  borderRadius: '8px',
  padding: '14px 0',
  margin: '0 auto 24px',
  width: '280px',
};

const code = {
  color: '#1d4ed8',
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '6px',
  margin: '0',
  textAlign: 'center' as const,
};

const paragraph = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  padding: '0 20px',
  margin: '0 auto',
  textAlign: 'center' as const,
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '1px',
  lineHeight: '20px',
  margin: '32px 0 0',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
};
