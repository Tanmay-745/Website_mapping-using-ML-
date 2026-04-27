import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TemplateData } from "../App";
import { FileText, Download, Mail, Printer, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface NoticePreviewProps {
  templateData: TemplateData;
  onStartNew: () => void;
}

const noticeTypeNames = {
  LRN: "Legal Recovery Notice",
  LDN: "Legal Demand Notice",
  OTS: "One Time Settlement",
  Overdue: "Overdue Notice",
};

// Helper function to convert number to words (Indian numbering system)
function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

  if (num === 0) return "Zero";
  if (num < 10) return ones[num];
  if (num >= 10 && num < 20) return teens[num - 10];
  if (num >= 20 && num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
  if (num >= 100 && num < 1000) {
    return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " and " + numberToWords(num % 100) : "");
  }
  if (num >= 1000 && num < 100000) {
    return numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "");
  }
  if (num >= 100000 && num < 10000000) {
    return numberToWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 !== 0 ? " " + numberToWords(num % 100000) : "");
  }
  if (num >= 10000000) {
    return numberToWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 !== 0 ? " " + numberToWords(num % 10000000) : "");
  }
  return num.toString();
}

// Generate variable placeholders for selected variables
function createVariablePlaceholder(variable: string): string {
  return `{{${variable}}}`;
}

// Generate AI-powered legal notice based on selected variables
function generateNoticeContent(templateData: TemplateData): string {
  const { noticeType, lender, advocate, selectedVariables, amountVariables } = templateData;

  const date = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Helper to check if a variable is selected
  const hasVar = (varName: string) => selectedVariables.some(v => 
    v.toLowerCase().includes(varName.toLowerCase())
  );

  // Helper to get variable placeholder
  const getVar = (possibleNames: string[]) => {
    for (const name of possibleNames) {
      const found = selectedVariables.find(v => 
        v.toLowerCase().includes(name.toLowerCase())
      );
      if (found) return createVariablePlaceholder(found);
    }
    return "[NOT SELECTED]";
  };

  // Helper to get amount with words conversion
  const getAmountWithWords = (possibleNames: string[]) => {
    for (const name of possibleNames) {
      const found = selectedVariables.find(v => 
        v.toLowerCase().includes(name.toLowerCase())
      );
      if (found) {
        const placeholder = createVariablePlaceholder(found);
        if (amountVariables.includes(found)) {
          return `${placeholder} (Rupees ${createVariablePlaceholder(found + '_words')} only)`;
        }
        return placeholder;
      }
    }
    return "[NOT SELECTED]";
  };

  let noticeContent = "";

  switch (noticeType) {
    case "LRN":
      noticeContent = `
                    LEGAL RECOVERY NOTICE
                    (Under Securitization and Reconstruction of Financial Assets 
                    and Enforcement of Security Interest Act, 2002)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${date}

From:
    ${advocate}
    Advocate & Legal Counsel
    For and on behalf of ${lender}

To:
    ${getVar(['borrower_name', 'customer_name', 'name', 'debtor_name'])}
    ${getVar(['borrower_address', 'address', 'customer_address', 'debtor_address'])}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: Legal Recovery Notice for Outstanding Dues - 
         Account No. ${getVar(['account_number', 'account_no', 'loan_account', 'account'])}

Dear Sir/Madam,

I, ${advocate}, Advocate, am writing this notice on behalf of my client, ${lender}, 
regarding your loan account.

1. ACCOUNT PARTICULARS:

   Loan Account Number    : ${getVar(['account_number', 'account_no', 'loan_account', 'account'])}
   ${hasVar('loan_date') || hasVar('agreement_date') ? `Loan Agreement Date   : ${getVar(['loan_date', 'agreement_date', 'disbursement_date'])}` : ''}
   ${hasVar('loan_amount') || hasVar('sanctioned_amount') ? `Original Loan Amount  : ${getAmountWithWords(['loan_amount', 'sanctioned_amount', 'principal_sanctioned'])}` : ''}

2. STATEMENT OF OUTSTANDING DUES (as on ${date}):

   ${hasVar('principal') || hasVar('principal_amount') ? `Principal Amount         : ${getAmountWithWords(['principal_amount', 'principal', 'principal_outstanding', 'principal_due'])}` : ''}
   ${hasVar('interest') || hasVar('interest_amount') ? `Interest Accrued         : ${getAmountWithWords(['interest_amount', 'interest', 'interest_due', 'accrued_interest'])}` : ''}
   ${hasVar('penalty') || hasVar('penalty_amount') || hasVar('charges') ? `Penalty & Other Charges  : ${getAmountWithWords(['penalty_amount', 'penalty', 'late_charges', 'other_charges', 'charges'])}` : ''}
   ${hasVar('legal') || hasVar('legal_charges') ? `Legal Charges            : ${getAmountWithWords(['legal_charges', 'legal_fees', 'advocate_fees'])}` : ''}
   ─────────────────────────────────────────────────────────────────────────
   TOTAL OUTSTANDING        : ${getAmountWithWords(['total_amount', 'total_due', 'total_outstanding', 'amount_due', 'outstanding_amount'])}
   ─────────────────────────────────────────────────────────────────────────

3. DEFAULT AND BREACH:

   Despite repeated requests, reminders, and notices, you have failed and neglected to 
   repay the aforesaid outstanding amount. Your failure to make timely payments constitutes 
   a material breach of the loan agreement ${hasVar('loan_date') || hasVar('agreement_date') ? `dated ${getVar(['loan_date', 'agreement_date', 'disbursement_date'])}` : ''}.

4. NOTICE TO PAY:

   You are hereby called upon and required to pay the entire outstanding amount of 
   ${getAmountWithWords(['total_amount', 'total_due', 'total_outstanding', 'amount_due'])} 
   within FIFTEEN (15) DAYS from the date of receipt of this notice, failing which my 
   client shall be constrained to initiate appropriate legal proceedings against you.

5. LEGAL CONSEQUENCES:

   Please note that if you fail to comply with this notice within the stipulated period, 
   my client reserves the right to:

   a) Initiate recovery proceedings under the SARFAESI Act, 2002
   b) Take possession of the secured assets/property
   c) File civil and/or criminal proceedings as deemed appropriate
   d) Report the default to Credit Information Companies (CIBIL, Experian, etc.)
   e) Recover all legal costs, expenses, and further interest at applicable rates

6. RESERVATION OF RIGHTS:

   This notice is issued without prejudice to all rights, claims, contentions, and 
   remedies available to my client under the law or contract, all of which are expressly 
   reserved and none of which are waived.

You are advised to treat this matter with utmost urgency and seriousness.

Yours faithfully,

${advocate}
Advocate
For ${lender}

Place: ${getVar(['city', 'place', 'location']) !== '[NOT SELECTED]' ? getVar(['city', 'place', 'location']) : '_____________'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: This is a legal notice. Ignoring this notice may result in severe legal action.
`;
      break;

    case "LDN":
      noticeContent = `
                        LEGAL DEMAND NOTICE
                    (Under Section 138 of Negotiable Instruments Act, 1881)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${date}

From:
    ${advocate}
    Advocate & Legal Counsel
    For and on behalf of ${lender}

To:
    ${getVar(['borrower_name', 'customer_name', 'name', 'debtor_name'])}
    ${getVar(['borrower_address', 'address', 'customer_address', 'debtor_address'])}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: LEGAL DEMAND NOTICE - IMMEDIATE PAYMENT REQUIRED
         Re: Account No. ${getVar(['account_number', 'account_no', 'loan_account', 'account'])}

Dear Sir/Madam,

Under the instructions and on behalf of my client, ${lender}, I hereby serve upon you 
this LEGAL DEMAND NOTICE regarding your default in payment obligations.

TAKE NOTICE THAT:

1. You entered into a loan/credit agreement ${hasVar('loan_date') || hasVar('agreement_date') ? `on ${getVar(['loan_date', 'agreement_date', 'disbursement_date'])}` : ''} 
   with ${lender} bearing Account Number ${getVar(['account_number', 'account_no', 'loan_account', 'account'])}.

2. As per the terms and conditions of the said agreement, you were obligated to repay 
   the loan amount along with interest and other charges in accordance with the agreed 
   repayment schedule.

3. You have defaulted in making the payments ${hasVar('due_date') || hasVar('default_date') ? `due on ${getVar(['due_date', 'default_date', 'payment_due_date'])}` : ''} 
   and continue to remain in default.

AMOUNT DUE AND IMMEDIATELY PAYABLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Outstanding Amount: ${getAmountWithWords(['total_amount', 'total_due', 'total_outstanding', 'amount_due'])}

(Comprising of ${hasVar('principal') ? getAmountWithWords(['principal_amount', 'principal']) + ' as principal' : ''} ${hasVar('interest') ? '+ ' + getAmountWithWords(['interest_amount', 'interest']) + ' as interest' : ''} ${hasVar('penalty') ? '+ ' + getAmountWithWords(['penalty_amount', 'penalty', 'charges']) + ' as penalties' : ''})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEMAND:

I hereby, on behalf of my client, call upon you to pay the aforementioned amount of 
${getAmountWithWords(['total_amount', 'total_due', 'total_outstanding', 'amount_due'])} 
within SEVEN (7) DAYS from the receipt of this notice.

LEGAL ACTION:

TAKE FURTHER NOTICE that if you fail to make the payment within the stipulated period, 
my client shall be compelled to initiate the following actions without any further 
reference or notice to you:

1. File civil suit for recovery of money with interest and costs
2. Initiate criminal proceedings under Section 138 of the Negotiable Instruments Act, 1881
3. File complaint under Section 420/406 of Indian Penal Code for cheating and breach of trust
4. Invoke provisions of SARFAESI Act, 2002 for enforcement of security interest
5. Report your default to all Credit Information Bureaus (CIBIL, Experian, Equifax, CRIF)
6. Initiate attachment and sale of your movable and immovable properties
7. Recover all legal expenses, court fees, and advocate's fees from you

CONSEQUENCES:

You are hereby informed that initiation of legal proceedings will:
- Result in a permanent negative impact on your credit score
- Make you liable for additional legal costs and expenses
- Lead to attachment of your bank accounts and assets
- Result in criminal prosecution which may lead to imprisonment
- Cause public embarrassment and loss of reputation

FINAL WARNING:

This is the FINAL AND LAST OPPORTUNITY being given to you to settle the matter amicably. 
Any delay or failure shall be construed as willful default and shall invite immediate 
and strict legal action without any further notice.

This notice is issued without prejudice to all rights, claims, and remedies available 
to my client, all of which are expressly reserved.

Yours faithfully,

${advocate}
Advocate
For ${lender}

Place: ${getVar(['city', 'place', 'location']) !== '[NOT SELECTED]' ? getVar(['city', 'place', 'location']) : '_____________'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTE: Acknowledgment of receipt of this notice should be sent immediately.
      This is a legally binding notice and should not be ignored.
`;
      break;

    case "OTS":
      noticeContent = `
                  ONE TIME SETTLEMENT PROPOSAL
                        (OTS Offer Letter)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${date}
Reference No.: OTS/${getVar(['account_number', 'account_no', 'loan_account', 'account'])}/2026

From:
    ${lender}
    Through: ${advocate}

To:
    ${getVar(['borrower_name', 'customer_name', 'name', 'debtor_name'])}
    ${getVar(['borrower_address', 'address', 'customer_address', 'debtor_address'])}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: One Time Settlement (OTS) Proposal - Account No. ${getVar(['account_number', 'account_no', 'loan_account', 'account'])}

Dear ${getVar(['borrower_name', 'customer_name', 'name', 'debtor_name'])},

This communication is in reference to your loan account with ${lender}.

1. CURRENT ACCOUNT STATUS:

   Account Number           : ${getVar(['account_number', 'account_no', 'loan_account', 'account'])}
   ${hasVar('loan_date') || hasVar('agreement_date') ? `Loan Origination Date   : ${getVar(['loan_date', 'agreement_date', 'disbursement_date'])}` : ''}
   Classification           : NPA (Non-Performing Asset)

2. OUTSTANDING POSITION (as on ${date}):

   ${hasVar('principal') || hasVar('principal_amount') ? `Principal Outstanding       : ${getAmountWithWords(['principal_amount', 'principal', 'principal_outstanding'])}` : ''}
   ${hasVar('interest') || hasVar('interest_amount') ? `Interest Accrued           : ${getAmountWithWords(['interest_amount', 'interest', 'interest_due'])}` : ''}
   ${hasVar('penalty') || hasVar('penalty_amount') ? `Penalty & Other Charges    : ${getAmountWithWords(['penalty_amount', 'penalty', 'charges', 'other_charges'])}` : ''}
   ─────────────────────────────────────────────────────────────────────────
   Total Outstanding Amount   : ${getAmountWithWords(['total_amount', 'total_due', 'total_outstanding'])}
   ─────────────────────────────────────────────────────────────────────────

3. ONE TIME SETTLEMENT OFFER:

   In the spirit of amicable resolution and to avoid protracted legal proceedings, 
   ${lender} is pleased to extend to you a ONE TIME SETTLEMENT opportunity.

   SETTLEMENT AMOUNT: ${getAmountWithWords(['settlement_amount', 'ots_amount', 'offer_amount', 'settlement'])}

   This represents a ${hasVar('waiver') || hasVar('discount') ? `waiver of ${getAmountWithWords(['waiver_amount', 'discount_amount', 'waived_amount', 'discount'])}` : 'substantial concession'} 
   from the total outstanding dues.

4. TERMS AND CONDITIONS OF SETTLEMENT:

   a) Validity Period    : This offer is valid for THIRTY (30) DAYS from the date of 
                          this letter, i.e., until ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

   b) Payment Mode       : The settlement amount must be paid in FULL and in one 
                          installment only. Part payments shall not be accepted.

   c) Account Closure    : Upon receipt and realization of the settlement amount, 
                          the loan account shall be permanently closed and marked as 
                          "Settled" in our records.

   d) No Claim Certificate: ${lender} shall issue a No Dues Certificate and release 
                          all securities/collaterals (if any) within 30 days of 
                          settlement realization.

   e) Binding Nature     : This offer, once accepted and payment made, shall be final 
                          and binding on both parties. No further claims shall be 
                          entertained from either side.

   f) Reporting to CIBIL : The account shall be reported to credit bureaus as "Settled" 
                          and not "Paid in Full".

   g) Non-Negotiable     : This is a ONE TIME offer and the settlement amount is 
                          NON-NEGOTIABLE. No requests for further reduction shall 
                          be entertained.

5. PAYMENT INSTRUCTIONS:

   Payment shall be made through any of the following modes:

   a) NEFT/RTGS/IMPS Transfer:
      Account Name    : ${lender}
      Account Number  : ${getVar(['payment_account', 'bank_account', 'settlement_account']) !== '[NOT SELECTED]' ? getVar(['payment_account', 'bank_account', 'settlement_account']) : 'XXXXXXXXXXXX'}
      IFSC Code       : ${getVar(['ifsc_code', 'ifsc', 'bank_ifsc']) !== '[NOT SELECTED]' ? getVar(['ifsc_code', 'ifsc', 'bank_ifsc']) : 'XXXXXXXXXXX'}
      Bank Name       : ${getVar(['bank_name', 'settlement_bank']) !== '[NOT SELECTED]' ? getVar(['bank_name', 'settlement_bank']) : 'As per your records'}

   b) Demand Draft:
      Drawn in favour of "${lender}"
      Payable at ${getVar(['city', 'place']) !== '[NOT SELECTED]' ? getVar(['city', 'place']) : '[City Name]'}

   c) Pay at Branch:
      Visit our nearest branch with this letter

   After making payment, please share the payment proof/UTR number to:
   Email: ${getVar(['contact_email', 'email', 'settlement_email']) !== '[NOT SELECTED]' ? getVar(['contact_email', 'email', 'settlement_email']) : 'recovery@lender.com'}
   Phone: ${getVar(['contact_number', 'phone', 'mobile', 'contact']) !== '[NOT SELECTED]' ? getVar(['contact_number', 'phone', 'mobile', 'contact']) : '+91-XXXXXXXXXX'}

6. CONSEQUENCES OF NON-ACCEPTANCE:

   If you fail to accept this settlement offer within the validity period:
   
   a) This offer shall stand automatically withdrawn and cancelled
   b) ${lender} reserves the right to initiate/continue legal recovery proceedings
   c) The full outstanding amount shall remain payable with continuing interest
   d) You shall be liable for all legal costs and expenses
   e) No future settlement offer may be extended

7. RECOMMENDATION:

   We strongly recommend that you avail this ONE TIME SETTLEMENT opportunity to:
   
   ✓ Close your loan account permanently
   ✓ Avoid legal proceedings and associated costs
   ✓ Get relief from recovery pressure
   ✓ Resolve the matter amicably
   ✓ Move forward with a clean slate

This is a genuine attempt at amicable resolution. We trust you will consider this 
offer seriously and take appropriate action within the stipulated timeframe.

For any clarifications or queries, please contact:
Name: ${advocate}
Phone: ${getVar(['contact_number', 'phone', 'mobile']) !== '[NOT SELECTED]' ? getVar(['contact_number', 'phone', 'mobile']) : '+91-XXXXXXXXXX'}
Email: ${getVar(['contact_email', 'email']) !== '[NOT SELECTED]' ? getVar(['contact_email', 'email']) : 'recovery@lender.com'}

We look forward to settling this matter amicably.

Yours sincerely,

For ${lender}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACCEPTANCE CONFIRMATION:

I, ${getVar(['borrower_name', 'customer_name', 'name'])}, hereby accept the above 
One Time Settlement offer and agree to pay ${getAmountWithWords(['settlement_amount', 'ots_amount'])} 
before ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}.


Signature: _____________________
Name: ${getVar(['borrower_name', 'customer_name', 'name'])}
Date: _____________________
`;
      break;

    case "Overdue":
      noticeContent = `
                        OVERDUE PAYMENT NOTICE
                            (Payment Reminder)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${date}

From:
    ${lender}
    Collections & Recovery Department

To:
    ${getVar(['borrower_name', 'customer_name', 'name', 'debtor_name'])}
    ${getVar(['borrower_address', 'address', 'customer_address'])}
    ${hasVar('email') ? `Email: ${getVar(['email', 'customer_email', 'borrower_email'])}` : ''}
    ${hasVar('phone') || hasVar('mobile') ? `Phone: ${getVar(['phone', 'mobile', 'contact_number', 'customer_phone'])}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: URGENT - Overdue Payment Notice
         Account No. ${getVar(['account_number', 'account_no', 'loan_account', 'account'])}

Dear ${getVar(['borrower_name', 'customer_name', 'name', 'debtor_name'])},

This is to bring to your kind attention that your loan account with ${lender} has 
become OVERDUE and immediate action is required from your end.

1. ACCOUNT DETAILS:

   Loan Account Number      : ${getVar(['account_number', 'account_no', 'loan_account', 'account'])}
   ${hasVar('loan_type') || hasVar('product_type') ? `Loan Type               : ${getVar(['loan_type', 'product_type', 'product'])}` : ''}
   ${hasVar('due_date') || hasVar('payment_due_date') ? `Original Due Date       : ${getVar(['due_date', 'payment_due_date', 'emi_due_date'])}` : ''}
   ${hasVar('days_overdue') || hasVar('dpd') ? `Days Past Due (DPD)     : ${getVar(['days_overdue', 'dpd', 'overdue_days'])} days` : ''}
   Current Status          : OVERDUE

2. PAYMENT BREAKDOWN:

   ${hasVar('emi') || hasVar('emi_amount') || hasVar('installment') ? `EMI/Installment Amount     : ${getAmountWithWords(['emi_amount', 'emi', 'installment_amount', 'installment'])}` : ''}
   ${hasVar('penalty') || hasVar('late_fee') || hasVar('penal_interest') ? `Late Payment Penalty       : ${getAmountWithWords(['penalty_amount', 'late_fee', 'penal_interest', 'penalty'])}` : ''}
   ${hasVar('bouncing') || hasVar('bounce_charges') ? `Cheque Bounce Charges      : ${getAmountWithWords(['bounce_charges', 'bouncing_charges', 'dishonor_charges'])}` : ''}
   ${hasVar('other') || hasVar('other_charges') ? `Other Charges              : ${getAmountWithWords(['other_charges', 'miscellaneous_charges'])}` : ''}
   ─────────────────────────────────────────────────────────────────────────
   TOTAL AMOUNT DUE           : ${getAmountWithWords(['total_amount', 'total_due', 'amount_due', 'total_overdue'])}
   ─────────────────────────────────────────────────────────────────────────

3. CONSEQUENCES OF CONTINUED NON-PAYMENT:

   We wish to inform you about the serious consequences of non-payment:

   ⚠ IMMEDIATE IMPACT:
   • Daily penalty charges will continue to accumulate
   • Your account will be classified as Non-Performing Asset (NPA)
   • ${hasVar('dpd') || hasVar('days_overdue') ? `Current DPD: ${getVar(['dpd', 'days_overdue'])} days - This will worsen your credit profile` : 'Negative impact on credit score'}

   ⚠ CREDIT BUREAU REPORTING:
   • Your default has been/will be reported to CIBIL, Experian, Equifax, and CRIF
   • This will severely damage your credit score (currently at risk)
   • Future loan applications may be rejected by all financial institutions
   • Credit card applications will be declined
   • This negative record will remain for 7 years

   ⚠ LEGAL CONSEQUENCES:
   • Legal notice will be issued by our advocate
   • Civil and criminal proceedings may be initiated
   • Recovery proceedings under SARFAESI Act, 2002
   • Court cases for recovery of dues
   • Attachment of bank accounts and salary
   • Seizure of mortgaged/hypothecated assets
   • All legal costs will be added to your outstanding

   ⚠ FINANCIAL IMPACT:
   • Continuing interest and penalty charges
   • Legal fees and court costs
   • Recovery agency charges
   • Travel and administrative expenses
   • These charges can double your outstanding amount

4. IMMEDIATE ACTION REQUIRED:

   You are requested to make the payment of ${getAmountWithWords(['total_amount', 'total_due', 'amount_due'])} 
   IMMEDIATELY to regularize your account and avoid further consequences.

5. PAYMENT OPTIONS:

   a) Online Payment:
      • Net Banking: ${getVar(['payment_portal', 'payment_url', 'portal']) !== '[NOT SELECTED]' ? getVar(['payment_portal', 'payment_url', 'portal']) : 'www.lender.com/payment'}
      • Mobile App: Download "${lender}" app
      • Payment Gateway: Use Account Number for payment

   b) Bank Transfer:
      Account Name    : ${lender}
      Account Number  : ${getVar(['payment_account', 'bank_account']) !== '[NOT SELECTED]' ? getVar(['payment_account', 'bank_account']) : 'XXXXXXXXXXXX'}
      IFSC Code       : ${getVar(['ifsc_code', 'ifsc']) !== '[NOT SELECTED]' ? getVar(['ifsc_code', 'ifsc']) : 'XXXXXXXXXXX'}

   c) Cheque/DD Payment:
      In favour of "${lender}"
      Write Account Number on reverse

   d) Branch Payment:
      Visit nearest ${lender} branch
      Carry this notice and account details

   e) UPI Payment:
      UPI ID: ${getVar(['upi_id', 'upi']) !== '[NOT SELECTED]' ? getVar(['upi_id', 'upi']) : 'lender@bank'}

6. HARDSHIP ASSISTANCE:

   If you are facing genuine financial difficulties, we are here to help:
   
   • Restructuring options available
   • Extended payment plans
   • EMI holiday facility
   • One-time settlement discussions

   Contact our Customer Care IMMEDIATELY to discuss options:
   Phone: ${getVar(['contact_number', 'phone', 'helpline', 'customer_care']) !== '[NOT SELECTED]' ? getVar(['contact_number', 'phone', 'helpline']) : '1800-XXX-XXXX'}
   Email: ${getVar(['contact_email', 'email', 'support_email']) !== '[NOT SELECTED]' ? getVar(['contact_email', 'email']) : 'care@lender.com'}
   Working Hours: Monday to Saturday, 9:00 AM to 6:00 PM

7. IMPORTANT NOTES:

   • This is an URGENT matter requiring your immediate attention
   • Please ensure payment is made within 3 days to avoid escalation
   • Keep payment proof/transaction ID for your records
   • Share payment confirmation to ${getVar(['contact_email', 'email']) !== '[NOT SELECTED]' ? getVar(['contact_email', 'email']) : 'payments@lender.com'}
   • Ignoring this notice will result in legal action

8. VERIFICATION:

   Before making payment, you may verify this notice by contacting:
   Customer Care: ${getVar(['contact_number', 'phone', 'helpline']) !== '[NOT SELECTED]' ? getVar(['contact_number', 'phone', 'helpline']) : '1800-XXX-XXXX'}
   Reference this Notice Number: OD/${getVar(['account_number', 'account'])}/2026

We value your relationship with ${lender} and hope to resolve this matter amicably 
at the earliest. Your immediate cooperation is highly appreciated.

Please do not hesitate to contact us if you need any clarification or assistance.

Yours sincerely,

For ${lender}
Collections & Recovery Department

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DISCLAIMER: This is a system-generated notice. Please contact us immediately if you 
have already made the payment or if you believe this notice has been sent in error.

For urgent assistance: ${getVar(['contact_number', 'phone', 'helpline']) !== '[NOT SELECTED]' ? getVar(['contact_number', 'phone', 'helpline']) : '1800-XXX-XXXX'}
`;
      break;
  }

  return noticeContent.trim();
}

export function NoticePreview({ templateData, onStartNew }: NoticePreviewProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const noticeContent = generateNoticeContent(templateData);

  const handleDownload = () => {
    setShowSuccess(true);
    toast.success("Template saved successfully!");
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeContent);
    toast.success("Notice content copied to clipboard!");
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Legal Notice</title>');
      printWindow.document.write('<style>body{font-family: "Courier New", monospace; padding: 40px; line-height: 1.6;} pre{white-space: pre-wrap;}</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write('<pre>' + noticeContent + '</pre>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Notice Preview</h2>
        <p className="text-slate-600">
          Review the AI-generated legal notice with your selected variables
        </p>
      </div>

      {/* Template Info */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-1">Notice Type</p>
            <p className="font-semibold text-slate-900">
              {noticeTypeNames[templateData.noticeType!]}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Template Name</p>
            <p className="font-semibold text-slate-900">{templateData.templateName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Delivery Mode</p>
            <Badge variant={templateData.deliveryMode === "digital" ? "default" : "secondary"}>
              {templateData.deliveryMode === "digital" ? <Mail className="w-3 h-3 mr-1" /> : <Printer className="w-3 h-3 mr-1" />}
              {templateData.deliveryMode === "digital" ? "Digital" : "Physical"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Variables</p>
            <p className="font-semibold text-slate-900">
              {templateData.selectedVariables.length} selected
            </p>
          </div>
        </div>
      </Card>

      {/* Notice Content */}
      <Card className="p-8 mb-6 bg-white shadow-lg">
        <div className="border-2 border-slate-300 rounded-lg p-8 bg-white" style={{
          boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)'
        }}>
          <pre className="whitespace-pre-wrap font-mono text-[13px] text-slate-900 leading-relaxed" style={{
            fontFamily: '"Courier New", Courier, monospace'
          }}>
            {noticeContent}
          </pre>
        </div>
      </Card>

      {/* Variables Info */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Template Variables Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Selected Variables ({templateData.selectedVariables.length}):</p>
            <div className="flex flex-wrap gap-2">
              {templateData.selectedVariables.map((variable) => (
                <Badge
                  key={variable}
                  variant="outline"
                  className={templateData.amountVariables.includes(variable) ? "border-green-500 bg-green-50 text-green-700" : ""}
                >
                  {variable}
                </Badge>
              ))}
            </div>
          </div>

          {templateData.amountVariables.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Amount to Words Conversion ({templateData.amountVariables.length}):</p>
              <div className="flex flex-wrap gap-2">
                {templateData.amountVariables.map((variable) => (
                  <Badge key={variable} className="bg-green-600">
                    {variable} → {variable}_words
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            💡 <strong>How it works:</strong> When you upload a CSV file with actual data, each variable (shown as {'{{'}variable_name{'}}'}) 
            will be automatically replaced with the corresponding value from your CSV. Amount variables will also include 
            their word representation for legal compliance.
          </p>
        </div>
      </Card>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-green-800 font-medium">Template saved successfully!</p>
            <p className="text-sm text-green-700">You can now use this template to generate multiple notices from your CSV data.</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleDownload}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Save Template
        </Button>
        <Button
          onClick={handleCopy}
          variant="outline"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Content
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Preview
        </Button>
        <Button
          onClick={onStartNew}
          variant="outline"
        >
          <FileText className="w-4 h-4 mr-2" />
          Create New Template
        </Button>
      </div>
    </div>
  );
}