export const FALLBACK_TEMPLATES: Record<string, string> = {
  LRN: `
    <div style="font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.5; padding: 20px;">
      <h1 style="text-align: center; text-decoration: underline; font-size: 22px; margin-bottom: 20px;">LEGAL RECOVERY NOTICE</h1>
      
      <p style="text-align: right; margin-bottom: 30px;">Date: \${date}</p>
      
      <div style="margin-bottom: 20px;">
        <strong>To,</strong><br/>
        <strong>\${customer_name}</strong><br/>
        \${address}<br/>
        \${city}, \${state} - \${pincode}
      </div>
      
      <p><strong>Subject: LEGAL NOTICE FOR RECOVERY OF OUTSTANDING DUES OF ₹\${amount}</strong></p>
      
      <p>Dear Sir/Madam,</p>
      
      <p>Under instructions from and on behalf of our client, <strong>\${lender_name}</strong>, we hereby serve you with this Legal Notice as under:</p>
      
      <ol>
        <li>That you had availed a loan facility from our client under Agreement No. \${account_number}.</li>
        <li>That as per the records maintained by our client, an amount of <strong>₹\${amount}</strong> (\${amount_in_words}) is currently overdue and outstanding against your account.</li>
        <li>That despite several reminders, you have failed to clear the said outstanding amount, which is a clear breach of the terms and conditions of the loan agreement.</li>
      </ol>
      
      <p>You are hereby called upon to pay the total outstanding amount of <strong>₹\${amount}</strong> within 15 days from the receipt of this notice, failing which our client shall be constrained to initiate appropriate legal proceedings against you in a court of competent jurisdiction at your risk and consequence.</p>
      
      <p>Copy of this notice is kept in our office for further record.</p>
      
      <div style="margin-top: 40px;">
        <p>Sincerely,</p>
        <p><strong>\${advocate_name}</strong><br/>Advocate</p>
      </div>
    </div>
  `,
  LDN: `
    <div style="font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.5; padding: 20px;">
      <h1 style="text-align: center; text-decoration: underline; font-size: 22px; margin-bottom: 20px;">LEGAL DEMAND NOTICE</h1>
      
      <p style="text-align: right; margin-bottom: 30px;">Date: \${date}</p>
      
      <div style="margin-bottom: 20px;">
        <strong>By Registered Post AD / Speed Post</strong>
      </div>
      
      <div style="margin-bottom: 20px;">
        <strong>To,</strong><br/>
        <strong>\${customer_name}</strong><br/>
        \${address}<br/>
        \${city}, \${state} - \${pincode}
      </div>
      
      <p><strong>RE: FINAL DEMAND FOR PAYMENT OF ₹\${amount}</strong></p>
      
      <p>Sir,</p>
      
      <p>I represent <strong>\${lender_name}</strong> and have been instructed to demand immediate payment of the sum of <strong>₹\${amount}</strong> (\${amount_in_words}) which remains unpaid in respect of your Loan Account \${account_number}.</p>
      
      <p>Please note that if the payment is not received within 7 days, my client will proceed with legal action under the applicable laws of India without any further reference to you.</p>
      
      <div style="margin-top: 50px;">
        <p>Yours faithfully,</p>
        <p><strong>\${advocate_name}</strong><br/>Advocate</p>
      </div>
    </div>
  `,
  Overdue: `
    <div style="font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.5; padding: 20px;">
      <h1 style="text-align: center; text-decoration: underline; font-size: 20px; margin-bottom: 20px;">OVERDUE PAYMENT NOTICE</h1>
      
      <p>Dear \${customer_name},</p>
      
      <p>This is a formal notice from <strong>\${lender_name}</strong> regarding your overdue payment for Loan Account \${account_number}.</p>
      
      <p>Our records show an outstanding balance of <strong>₹\${amount}</strong>. We request you to kindly clear this amount immediately to avoid any impact on your credit score and to prevent legal escalation.</p>
      
      <p>If you have already made the payment, please ignore this notice.</p>
      
      <div style="margin-top: 30px;">
        <p>Regards,</p>
        <p>Collection Department<br/>\${lender_name}</p>
      </div>
    </div>
  `
};

export const getFallbackTemplate = (type: string): string => {
  return FALLBACK_TEMPLATES[type] || FALLBACK_TEMPLATES['LRN'];
};
