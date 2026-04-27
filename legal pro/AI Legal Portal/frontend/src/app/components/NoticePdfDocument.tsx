import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image,
  Font
} from '@react-pdf/renderer';
import { Theme } from '../App';
import { Advocate } from '../api';

// Register a font that supports Indian symbols (Rupee symbol etc.)
Font.register({
  family: 'Noto Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSans/NotoSans-Regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSans/NotoSans-Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSans/NotoSans-Italic.ttf', fontStyle: 'italic' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Noto Sans',
    fontSize: 9,
    lineHeight: 1.4,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    paddingLeft: 40, // Offset to compensate for logo on right being 70px
  },
  advocateName: {
    fontFamily: 'Times-Bold',
    fontSize: 22,
    color: '#000000',
  },
  advocateSuffix: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
  },
  advocateAddress: {
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
    color: '#1a1a1a',
    maxWidth: 280,
    lineHeight: 1.2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    marginTop: 3,
    gap: 8,
  },
  logoContainer: {
    width: 65,
    height: 75,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 5,
  },
  logoInner: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoScales: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  barcodeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 15,
  },
  toSection: {
    width: '50%',
  },
  refDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  barcodeContainer: {
    alignItems: 'center',
  },
  barcode: {
    height: 35,
    width: 140,
  },
  barcodeTextDetails: {
    fontSize: 7,
    marginTop: 2,
    textAlign: 'left',
  },
  content: {
    marginTop: 5,
  },
  p: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  h1: {
    fontSize: 14,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 5,
    textDecoration: 'underline',
  },
  h2: {
    fontSize: 11,
    fontFamily: 'Times-Bold',
    marginBottom: 8,
    marginTop: 8,
  },
  bold: {
    fontFamily: 'Noto Sans',
    fontWeight: 'bold',
  },
  italic: {
    fontFamily: 'Noto Sans',
    fontStyle: 'italic',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
    marginLeft: 15,
  },
  bullet: {
    width: 15,
  },
  signatureContainer: {
    marginTop: 30,
    alignItems: 'flex-end',
  },
  signature: {
    height: 45,
    width: 'auto',
    marginBottom: 5,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    width: 160,
    paddingTop: 4,
    textAlign: 'center',
  },
  signatureName: {
    fontSize: 9,
    fontFamily: 'Times-Bold',
  },
  signatureTitle: {
    fontSize: 7,
    color: '#444444',
  }
});

interface NoticePdfDocumentProps {
  content: string;
  theme: Theme;
  advocate?: Advocate;
  barcodeImage?: string | null;
  signatureImage?: string | null;
}

const renderFormattedText = (text: string) => {
  if (!text) return null;
  try {
    const parts = text.split(/(<b>.*?<\/b>|<strong>.*?<\/strong>|<i>.*?<\/i>|<em>.*?<\/em>)/gi);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.match(/^<(b|strong)>.*<\/(b|strong)>$/i)) {
        return <Text key={i} style={styles.bold}>{part.replace(/<[^>]+>/g, '')}</Text>;
      }
      if (part.match(/^<(i|em)>.*<\/(i|em)>$/i)) {
        return <Text key={i} style={styles.italic}>{part.replace(/<[^>]+>/g, '')}</Text>;
      }
      return <Text key={part + i}>{part.replace(/<[^>]+>/g, '')}</Text>;
    });
  } catch (e) {
    return <Text>{text.replace(/<[^>]+>/g, '')}</Text>;
  }
};

const parseHtmlToPdf = (html: string) => {
  if (!html) return null;
  const blocks = html
    .split(/<\/p>|<\/h1>|<\/h2>|<\/li>|<br\s*\/?>/i)
    .filter(b => b && b.trim().length > 0);

  return blocks.map((block, index) => {
    const isH1 = block.includes('<h1');
    const isH2 = block.includes('<h2');
    const isLi = block.includes('<li');
    let cleanBlock = block.replace(/<(h1|h2|p|li)[^>]*>/gi, '');
    cleanBlock = cleanBlock
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    if (isH1) return <Text key={index} style={styles.h1}>{renderFormattedText(cleanBlock)}</Text>;
    if (isH2) return <Text key={index} style={styles.h2}>{renderFormattedText(cleanBlock)}</Text>;
    if (isLi) return (
      <View key={index} style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={{ flex: 1 }}>{renderFormattedText(cleanBlock)}</Text>
      </View>
    );
    return <Text key={index} style={styles.p}>{renderFormattedText(cleanBlock)}</Text>;
  });
};

export const NoticePdfDocument = ({ content, theme, advocate, barcodeImage, signatureImage }: NoticePdfDocumentProps) => {
  const headerImageUrl = 
    theme.noticeHeaderHtml?.match(/https?:\/\/[^\s<]+/i)?.[0] || 
    advocate?.headerHtml?.match(/https?:\/\/[^\s<]+/i)?.[0];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header Section */}
        {headerImageUrl ? (
          /* Custom Image Header matching Image 6 usage */
          <View style={{ marginBottom: 20, alignItems: 'center' }}>
            <Image src={headerImageUrl} style={{ width: '100%', height: 'auto', maxHeight: 120 }} />
          </View>
        ) : (
          /* Professional Text Header matching Sahil Mahiwal Style */
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.advocateName}>
                {advocate?.name || 'Sahil Mahiwal'}
              </Text>
              <Text style={styles.advocateAddress}>
                {advocate?.address || 'Hall No.8, Seat No.3, N.C Jain Lane, District & Session Court, Gurugram, Haryana - 122001'}
              </Text>
              <View style={styles.contactRow}>
                <Text>✉ {advocate?.email || 'sahilmahiwal@gmail.com'}</Text>
                <Text>|</Text>
                <Text>✆ +91 {advocate?.phone || '9541574370'}</Text>
              </View>
            </View>

            {/* Shield Logo on the Right */}
            <View style={styles.logoContainer}>
                <View style={styles.logoInner}>
                    <Text style={styles.logoScales}>⚖</Text>
                </View>
            </View>
          </View>
        )}

        {/* Barcode and To Section Integration */}
        <View style={styles.barcodeSection}>
          <View style={styles.toSection}>
            <Text style={{ fontFamily: 'Times-Bold', marginBottom: 2 }}>To,</Text>
            <Text style={{ fontFamily: 'Times-Bold', fontSize: 10 }}>[NAME]</Text>
            <View style={{ fontSize: 8, marginTop: 2, lineHeight: 1.2 }}>
              <Text>Mobile No: [PHONE]</Text>
              <Text style={{ fontFamily: 'Times-Bold', marginTop: 1 }}>Address:</Text>
              <Text>[ADDRESS]</Text>
            </View>
          </View>

          {barcodeImage && (
            <View style={styles.barcodeContainer}>
              <Image src={barcodeImage} style={styles.barcode} />
              <View style={styles.barcodeTextDetails}>
                <Text style={{ fontWeight: 'bold' }}>From: {advocate?.name || 'Sahil Mahiwal'}</Text>
                <Text>Mobile No: {advocate?.phone || '9541574370'}</Text>
                <Text style={{ fontWeight: 'bold' }}>Address:</Text>
                <Text style={{ fontSize: 6, maxWidth: 140 }}>
                  {advocate?.address || 'Hall No.8, Seat No.3, District & Session Court, Gurugram - 122001'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Ref and Date Row */}
        <View style={styles.refDateRow}>
          <Text style={{ fontWeight: 'bold' }}>Ref No. PASA/ [SNO]/03-26</Text>
          <Text style={{ fontWeight: 'bold' }}>Date: 21-03-2026</Text>
        </View>

        {/* Main Notice Content */}
        <View style={styles.content}>
          {parseHtmlToPdf(content)}
        </View>

        {/* Sign-off Section */}
        <View style={styles.signatureContainer} wrap={false}>
          {signatureImage && (
            <Image src={signatureImage} style={styles.signature} />
          )}
          <View style={styles.signatureLine}>
            <Text style={styles.signatureName}>{advocate?.name || 'Sahil Mahiwal'}</Text>
            <Text style={styles.signatureTitle}>Advocate & Legal Counsel</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
