import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رابط الدخول السريع — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={brandBar}>{siteName}</div>
        <Heading style={h1}>رابط الدخول السريع</Heading>
        <Text style={text}>اضغطي الزر بالأسفل للدخول إلى {siteName}. الرابط صالح لفترة قصيرة.</Text>
        <div style={{ textAlign: 'center' as const }}>
          <Button style={button} href={confirmationUrl}>الدخول الآن</Button>
        </div>
        <Text style={footer}>إذا لم تطلبي الرابط، يمكنك تجاهل هذه الرسالة.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { color: '#640000', fontSize: '20px', fontWeight: 'bold' as const, borderBottom: '3px solid #640000', paddingBottom: '10px', marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#640000', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333', lineHeight: '1.8', margin: '0 0 20px' }
const button = { backgroundColor: '#640000', color: '#fff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0', borderTop: '1px solid #eee', paddingTop: '14px' }
