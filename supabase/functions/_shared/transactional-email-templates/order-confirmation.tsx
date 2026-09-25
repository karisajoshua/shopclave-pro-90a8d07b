import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Barakaz'
const BRAND = '#ff420e'

interface OrderItem {
  name: string
  variantLabel?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface ShippingAddress {
  fullName: string
  phone: string
  addressLine: string
  city: string
  country: string
}

interface OrderConfirmationProps {
  customerName?: string
  orderShortId?: string
  orderDate?: string
  items?: OrderItem[]
  subtotal?: number
  deliveryFee?: number
  total?: number
  shippingAddress?: ShippingAddress
  paymentMethodLabel?: string
  trackUrl?: string
}

const money = (n: number, currency = 'CAD') => {
  try {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(n || 0)
  } catch {
    return `${currency} ${(n || 0).toFixed(2)}`
  }
}

const OrderConfirmationEmail = ({
  customerName,
  orderShortId = '--------',
  orderDate,
  items = [],
  subtotal = 0,
  deliveryFee = 200,
  total = 0,
  shippingAddress,
  paymentMethodLabel = 'Pay on Delivery',
  trackUrl = 'https://barakaz.com/account',
}: OrderConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your {SITE_NAME} order #{orderShortId} is confirmed
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Img
            src="https://barakaz.com/email-logo.png?v=2"
            width="140"
            height="auto"
            alt={SITE_NAME}
            style={logo}
          />
        </Section>

        <Section style={content}>
          <Heading style={h1}>
            {customerName ? `Thanks for your order, ${customerName}!` : 'Thanks for your order!'}
          </Heading>
          <Text style={text}>
            We've received your order and the seller has been notified. You'll
            get another update as soon as it ships.
          </Text>

          <Section style={metaBox}>
            <Text style={metaLine}>
              <strong>Order:</strong> #{orderShortId}
            </Text>
            {orderDate && (
              <Text style={metaLine}>
                <strong>Placed:</strong> {orderDate}
              </Text>
            )}
            <Text style={metaLine}>
              <strong>Payment:</strong> {paymentMethodLabel}
            </Text>
          </Section>

          {/* Items */}
          <Heading as="h2" style={h2}>
            Order summary
          </Heading>
          <Section style={itemsBox}>
            {items.map((it, idx) => (
              <Section key={idx} style={idx === items.length - 1 ? itemRowLast : itemRow}>
                <Text style={itemName}>
                  {it.name}
                  {it.variantLabel ? (
                    <span style={variantStyle}> — {it.variantLabel}</span>
                  ) : null}
                </Text>
                <Text style={itemMeta}>
                  Qty {it.quantity} × {fmt(it.unitPrice)} ={' '}
                  <strong>{fmt(it.lineTotal)}</strong>
                </Text>
              </Section>
            ))}
          </Section>

          {/* Totals */}
          <Section style={totalsBox}>
            <Text style={totalRow}>
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </Text>
            <Text style={totalRow}>
              <span>Delivery</span>
              <span>{fmt(deliveryFee)}</span>
            </Text>
            <Hr style={hr} />
            <Text style={grandTotalRow}>
              <span>Total</span>
              <span>{fmt(total)}</span>
            </Text>
          </Section>

          {/* Delivery */}
          {shippingAddress && (
            <>
              <Heading as="h2" style={h2}>
                Deliver to
              </Heading>
              <Section style={addressBox}>
                <Text style={addressLine}>{shippingAddress.fullName}</Text>
                <Text style={addressLine}>{shippingAddress.phone}</Text>
                <Text style={addressLine}>{shippingAddress.addressLine}</Text>
                <Text style={addressLine}>
                  {shippingAddress.city}, {shippingAddress.country}
                </Text>
              </Section>
            </>
          )}

          {/* CTA */}
          <Section style={ctaBox}>
            <Button href={trackUrl} style={ctaButton}>
              Track your order
            </Button>
          </Section>

          <Text style={footer}>
            Questions? Reply to this email or message the seller from your
            order page. Thanks for shopping with {SITE_NAME}.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Your ${SITE_NAME} order #${data?.orderShortId ?? ''} is confirmed`,
  displayName: 'Order confirmation',
  previewData: {
    customerName: 'Jane Doe',
    orderShortId: 'A1B2C3D4',
    orderDate: 'April 21, 2026',
    items: [
      { name: 'Wireless Headphones', variantLabel: 'Black', quantity: 1, unitPrice: 4500, lineTotal: 4500 },
      { name: 'Phone Case', variantLabel: null, quantity: 2, unitPrice: 800, lineTotal: 1600 },
    ],
    subtotal: 6100,
    deliveryFee: 200,
    total: 6300,
    shippingAddress: {
      fullName: 'Jane Doe',
      phone: '+1 416 555 0123',
      addressLine: '123 Queen Street West, Apt 4B',
      city: 'Toronto',
      country: 'Canada',
    },
    paymentMethodLabel: 'Pay on Delivery',
    trackUrl: 'https://barakaz.com/account',
  },
} satisfies TemplateEntry

// Styles
const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
}
const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  border: '1px solid #eeeeee',
  borderRadius: '8px',
  overflow: 'hidden',
}
const header: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '20px 24px',
  textAlign: 'center',
  borderBottom: '1px solid #f3f4f6',
}
const logo: React.CSSProperties = {
  display: 'block',
  margin: '0 auto',
  maxWidth: '140px',
  height: 'auto',
}
const content: React.CSSProperties = { padding: '24px' }
const h1: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 8px',
}
const h2: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: '#111827',
  margin: '20px 0 8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}
const text: React.CSSProperties = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: 1.6,
  margin: '0 0 16px',
}
const metaBox: React.CSSProperties = {
  backgroundColor: '#fff7f2',
  border: '1px solid #ffd9c7',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '8px 0 4px',
}
const metaLine: React.CSSProperties = {
  fontSize: '13px',
  color: '#1f2937',
  margin: '2px 0',
}
const itemsBox: React.CSSProperties = {
  border: '1px solid #eeeeee',
  borderRadius: '6px',
  padding: '4px 12px',
}
const itemRow: React.CSSProperties = {
  borderBottom: '1px solid #f3f4f6',
  padding: '10px 0',
}
const itemRowLast: React.CSSProperties = { padding: '10px 0' }
const itemName: React.CSSProperties = {
  fontSize: '14px',
  color: '#111827',
  margin: 0,
  fontWeight: 600,
}
const variantStyle: React.CSSProperties = { color: '#6b7280', fontWeight: 400 }
const itemMeta: React.CSSProperties = {
  fontSize: '13px',
  color: '#4b5563',
  margin: '4px 0 0',
}
const totalsBox: React.CSSProperties = { padding: '12px 4px 0' }
const totalRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  color: '#4b5563',
  margin: '4px 0',
}
const grandTotalRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '16px',
  color: '#111827',
  fontWeight: 700,
  margin: '8px 0 0',
}
const hr: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '8px 0',
}
const addressBox: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px 16px',
}
const addressLine: React.CSSProperties = {
  fontSize: '13px',
  color: '#1f2937',
  margin: '2px 0',
}
const ctaBox: React.CSSProperties = { textAlign: 'center', margin: '28px 0 8px' }
const ctaButton: React.CSSProperties = {
  backgroundColor: BRAND,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 700,
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '24px 0 0',
  textAlign: 'center',
}
