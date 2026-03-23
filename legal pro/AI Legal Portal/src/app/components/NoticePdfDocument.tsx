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
    padding: 60,
    fontFamily: 'Noto Sans',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 15,
    marginBottom: 20,
  },
  advocateName: {
    fontSize: 20,
    fontWeight: 'extrabold',
    textTransform: 'uppercase',
  },
  advocateSub: {
    fontSize: 10,
    marginBottom: 5,
  },
  advocateDetails: {
    fontSize: 8,
    color: '#333333',
  },
  barcodeContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  barcode: {
    height: 40,
    width: 120,
  },
  content: {
    marginTop: 10,
  },
  p: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  h1: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 10,
    textDecoration: 'underline',
  },
  h2: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    marginLeft: 15,
  },
  bullet: {
    width: 15,
  },
  signatureContainer: {
    marginTop: 40,
    alignItems: 'flex-end',
  },
  signature: {
    height: 50,
    width: 'auto',
    marginBottom: 5,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    width: 180,
    paddingTop: 5,
    textAlign: 'center',
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  signatureTitle: {
    fontSize: 8,
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

// Helper to handle mixed text (bold/italic) within a block
const renderFormattedText = (text: string) => {
  if (!text) return null;
  
  // Very simple regex-based segmenter for <b> and <i>
  // A real implementation would use a proper HTML parser
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
      return <Text key={i}>{part.replace(/<[^>]+>/g, '')}</Text>;
    });
  } catch (e) {
    console.error("Error in renderFormattedText:", e);
    return <Text>{text.replace(/<[^>]+>/g, '')}</Text>;
  }
};

const parseHtmlToPdf = (html: string) => {
  if (!html) return null;
  
  // Clean up and split into blocks by common block tags
  const blocks = html
    .split(/<\/p>|<\/h1>|<\/h2>|<\/li>|<br\s*\/?>/i)
    .filter(b => b && b.trim().length > 0);

  return blocks.map((block, index) => {
    const isH1 = block.includes('<h1');
    const isH2 = block.includes('<h2');
    const isLi = block.includes('<li');
    
    // Clean text but keep inner formatting tags for renderFormattedText
    let cleanBlock = block.replace(/<(h1|h2|p|li)[^>]*>/gi, '');
    
    // Decode entities
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

export const NoticePdfDocument = ({ content, theme, advocate, barcodeImage, signatureImage }: NoticePdfDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Advocate Header - matching DocumentPreview.tsx style */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#000000', paddingBottom: 10, marginBottom: 15 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{advocate?.name || '[Advocate Name]'}</Text>
          <Text style={{ fontSize: 10, marginBottom: 10, fontStyle: 'italic' }}>(Advocate)</Text>
          <View style={{ fontSize: 8, color: '#333333' }}>
            {advocate?.address && <Text>{advocate.address}</Text>}
            <Text>{[advocate?.city, advocate?.state, advocate?.pincode].filter(Boolean).join(', ')}</Text>
            <Text>PH: {advocate?.phone} | EMAIL: {advocate?.email}</Text>
          </View>
        </View>
        
        {/* Shield Logo Representation */}
        <View style={{ width: 60, height: 70, backgroundColor: '#000000', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
           <View style={{ width: 30, height: 30, border: '2px solid white', borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>L</Text>
           </View>
        </View>
      </View>

      {/* Barcode Area */}
      {barcodeImage && (
        <View style={styles.barcodeContainer}>
          <Image src={barcodeImage} style={styles.barcode} />
        </View>
      )}

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
          <Text style={styles.signatureName}>{advocate?.name || '[Advocate Name]'}</Text>
          <Text style={styles.signatureTitle}>Advocate & Legal Counsel</Text>
        </View>
      </View>
    </Page>
  </Document>
);
