import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>إعادة تعيين كلمة المرور — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={brandBar}>{siteName}</div>
        <Heading style={h1}>إعادة تعيين كلمة المرور</Heading>
        <Text style={text}>
          استلمنا طلباً لإعادة تعيين كلمة المرور لحسابك في <b>{siteName}</b>.
          اضغطي الزر بالأسفل لاختيار كلمة مرور جديدة.
        </Text>
        <div style={{ textAlign: 'center' as const }}>
          <Button style={button} href={confirmationUrl}>إعادة تعيين كلمة المرور</Button>
        </div>
        <Text style={hint}>الرابط صالح لمدة محدودة لأسباب أمنية.</Text>
        <Text style={footer}>
          إذا لم تطلبي إعادة التعيين، يمكنك تجاهل هذه الرسالة بأمان — لن يتم تغيير كلمة المرور.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { color: '#640000', fontSize: '20px', fontWeight: 'bold' as const, borderBottom: '3px solid #640000', paddingBottom: '10px', marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#640000', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333', lineHeight: '1.8', margin: '0 0 20px' }
const button = { backgroundColor: '#640000', color: '#fff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '13px', color: '#777', margin: '20px 0 0', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0', borderTop: '1px solid #eee', paddingTop: '14px' }
