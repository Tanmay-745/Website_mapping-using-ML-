import re
import math
from typing import List, Dict, Tuple, Any

class AddressAnalyzer:
    """
    Offline predictive model to analyze Indian addresses and categorize them.
    Categorizes addresses into exactly three groups: 'Deliverable', 'Needs Review', or 'Junk'.
    """
    def __init__(self):
        # Common signs that an address is fake, empty, or useless
        self.junk_keywords = {'na', 'none', 'null', 'unknown', 'test', '-', '.', 'xx', 'xxx', 'nil', 'n/a'}
        
        # Keywords that typically denote a highly structured address (delivers confidence)
        self.structural_keywords = {
            'flat', 'house', 'no', 'number', 'street', 'st', 'road', 'rd', 'marg', 
            'nagar', 'colony', 'village', 'vill', 'dist', 'district', 'taluka', 'tal',
            'tehsil', 'floor', 'apt', 'apartment', 'bldg', 'building', 'society', 
            'soc', 'phase', 'sector', 'block', 'near', 'beside', 'opp', 'opposite'
        }
        
    def _clean_text(self, address: str) -> str:
        if not isinstance(address, str):
            return ""
        return address.strip().lower()

    def _extract_features(self, text: str) -> Dict[str, Any]:
        """Extracts structural features from the raw address text."""
        words = [w for w in re.split(r'[\s,.-]+', text) if w]
        
        # Detect purely numeric 6-digit PIN code (Indian standard)
        pincode_match = re.search(r'\b[1-9][0-9]{5}\b', text)
        
        # Evaluate length and character types
        total_chars = len(text)
        alpha_chars = sum(c.isalpha() for c in text)
        digit_chars = sum(c.isdigit() for c in text)
        
        # Find matches with structural address components
        structural_matches = len(set(words).intersection(self.structural_keywords))
        
        return {
            "word_count": len(words),
            "total_chars": total_chars,
            "alpha_ratio": alpha_chars / total_chars if total_chars > 0 else 0,
            "has_pincode": bool(pincode_match),
            "pincode": pincode_match.group(0) if pincode_match else None,
            "structural_matches": structural_matches,
            "is_junk_word": len(words) == 1 and words[0] in self.junk_keywords
        }

    def predict_status(self, address: str) -> str:
        """
        Calculates address deliverability.
        Returns: 'Deliverable', 'Needs Review', or 'Junk'
        """
        text = self._clean_text(address)
        
        # Blank / Empty check
        if not text:
            return 'Junk'
            
        features = self._extract_features(text)
        
        # JUNK CRITERIA
        # 1. Matches exact junk phrases ("NA", "None")
        # 2. String is extremely short (e.g. "Pune")
        # 3. Text contains almost no alphabetic characters
        if features['is_junk_word']:
            return 'Junk'
        if features['word_count'] < 3 and not features['has_pincode']:
            return 'Junk'
        if features['alpha_ratio'] < 0.2:
            return 'Junk'  # Likely just a phone number or garbage digits

        # DELIVERABLE CRITERIA
        # 1. Contains a Pincode AND has decent descriptive context
        # 2. Or, missing a pincode but is highly descriptive (contains multiple address structural keywords)
        if features['has_pincode'] and features['word_count'] >= 4:
            return 'Deliverable'
            
        if not features['has_pincode'] and features['word_count'] >= 6 and features['structural_matches'] >= 2:
            return 'Deliverable'
            
        # NEEDS REVIEW CRITERIA
        # Everything that is plausible but missing distinct routing data (like a Pincode) 
        # or is slightly too short to guarantee successful courier delivery without manual check.
        return 'Needs Review'

    def batch_analyze(self, addresses: List[str]) -> Dict[str, Any]:
        """
        Takes a list of addresses and returns the count of each category.
        """
        results = {
            "Deliverable": 0,
            "Needs Review": 0,
            "Junk": 0,
            "total_processed": len(addresses),
            "details": []
        }
        
        for addr in addresses:
            status = self.predict_status(addr)
            results[status] += 1
            results["details"].append({
                "address": addr,
                "status": status
            })
            
        return results

if __name__ == "__main__":
    # Test execution block to demonstrate the prediction model
    test_addresses = [
        "Flat 302, Green Valley Apartments, Andheri West, Mumbai, Maharashtra 400053", # Deliverable
        "123 Main St, Near School, Delhi 110001", # Deliverable
        "Pune", # Junk
        "NA", # Junk
        "9876543210 123", # Junk (low alpha ratio)
        "House 45, Gandhi Road", # Needs Review (Missing zip, maybe enough details? word count 4, struct matches 2: house, road)
        "unknown string without structural markers", # Needs Review
        "Sector 4, Vashi, Navi Mumbai", # Needs Review (Missing pincode, word count 5, struct matches 1: sector)
    ]
    
    analyzer = AddressAnalyzer()
    report = analyzer.batch_analyze(test_addresses)
    
    print(f"Total Processed: {report['total_processed']}")
    print(f"Deliverable: {report['Deliverable']}")
    print(f"Needs Review: {report['Needs Review']}")
    print(f"Junk: {report['Junk']}")
    print("-" * 30)
    
    for item in report['details']:
        print(f"[{item['status'].upper()}] : {item['address']}")
