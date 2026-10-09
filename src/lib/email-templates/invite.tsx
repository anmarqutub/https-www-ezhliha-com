import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>دعوة للانضمام إلى {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={brandBar}>{siteName}</div>
        <Heading style={h1}>تم دعوتك للانضمام 💌</Heading>
        <Text style={text}>
          تلقيتِ دعوة للانضمام إلى <Link href={siteUrl} style={link}><b>{siteName}</b></Link>.
          اضغطي الزر بالأسفل لإنشاء حسابك وقبول الدعوة.
        </Text>
        <div style={{ textAlign: 'center' as const }}>
          <Button style={button} href={confirmationUrl}>قبول الدعوة</Button>
        </div>
        <Text style={footer}>إذا ما كنتي تتوقعين الدعوة، تجاهلي الرسالة.</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { color: '#640000', fontSize: '20px', fontWeight: 'bold' as const, borderBottom: '3px solid #640000', paddingBottom: '10px', marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#640000', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333', lineHeight: '1.8', margin: '0 0 20px' }
const link = { color: '#640000', textDecoration: 'underline' }
const button = { backgroundColor: '#640000', color: '#fff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0', borderTop: '1px solid #eee', paddingTop: '14px' }
