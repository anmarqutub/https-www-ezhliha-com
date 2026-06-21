import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تأكيد تغيير البريد الإلكتروني — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={brandBar}>{siteName}</div>
        <Heading style={h1}>تأكيد تغيير البريد الإلكتروني</Heading>
        <Text style={text}>
          طلبتِ تغيير البريد الإلكتروني لحسابك في {siteName} من{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link> إلى{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <div style={{ textAlign: 'center' as const }}>
          <Button style={button} href={confirmationUrl}>تأكيد التغيير</Button>
        </div>
        <Text style={footer}>إذا لم تطلبي هذا التغيير، يرجى تأمين حسابك فوراً.</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { color: '#660000', fontSize: '20px', fontWeight: 'bold' as const, borderBottom: '3px solid #660000', paddingBottom: '10px', marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#660000', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333', lineHeight: '1.8', margin: '0 0 20px' }
const link = { color: '#660000', textDecoration: 'underline' }
const button = { backgroundColor: '#660000', color: '#fff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0', borderTop: '1px solid #eee', paddingTop: '14px' }
