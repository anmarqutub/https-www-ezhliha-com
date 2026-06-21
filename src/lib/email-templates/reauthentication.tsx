import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رمز التحقق</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={brandBar}>إزهليها</div>
        <Heading style={h1}>تأكيد الهوية</Heading>
        <Text style={text}>استخدمي الرمز التالي لتأكيد هويتك:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>الرمز صالح لفترة قصيرة. إذا لم تطلبي هذا الرمز يمكنك تجاهل الرسالة.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { color: '#660000', fontSize: '20px', fontWeight: 'bold' as const, borderBottom: '3px solid #660000', paddingBottom: '10px', marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#660000', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333', lineHeight: '1.8', margin: '0 0 12px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#660000', letterSpacing: '6px', textAlign: 'center' as const, margin: '20px 0', padding: '14px', background: '#fff8f0', borderRadius: '8px' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0', borderTop: '1px solid #eee', paddingTop: '14px' }
