import requests

long_text = """
<h1 style="text-align: center;">LEGAL RECOVERY NOTICE</h1>
<p style="text-align: center;"><em>(Under Securitization and Reconstruction of Financial Assets and Enforcement of Security Interest Act, 2002)</em></p>
<hr/>
<p><strong>Date:</strong> 23 October 2026</p>
<p><strong>From:</strong><br/>
Advocate Smith<br/>
Advocate & Legal Counsel<br/>
For and on behalf of State Bank<br/>
123 Main Street</p>
<p><strong>To:</strong><br/>
John Doe<br/>
456 Elm St</p>
<hr/>
<p><strong>Subject:</strong> Legal Recovery Notice for Outstanding Dues - Account No. 123456789</p>
<p>Dear Sir/Madam,</p>
<p>I, Advocate Smith, Advocate, am writing this notice on behalf of my client, State Bank, regarding your loan account.</p>
<h3>1. ACCOUNT PARTICULARS:</h3>
<p><strong>Loan Account Number:</strong> 123456789<br/>
<strong>Loan Agreement Date:</strong> 01 Jan 2023</p>
<h3>2. STATEMENT OF OUTSTANDING DUES (as on 23 October 2026):</h3>
<p><strong>Principal Amount:</strong> 50000<br/>
<strong>Interest Accrued:</strong> 5000<br/>
<strong>Penalty & Other Charges:</strong> 1000<br/>
<strong>TOTAL OUTSTANDING:</strong> 56000</p>
<h3>3. DEFAULT AND BREACH:</h3>
<p>Despite repeated requests, reminders, and notices, you have failed and neglected to repay the aforesaid outstanding amount. Your failure to make timely payments constitutes a material breach of the loan agreement.</p>
<h3>4. NOTICE TO PAY:</h3>
<p>You are hereby called upon and required to pay the entire outstanding amount of <strong>56000</strong> within FIFTEEN (15) DAYS from the date of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you.</p>
<h3>5. LEGAL CONSEQUENCES:</h3>
<p>Please note that if you fail to comply with this notice within the stipulated period, my client reserves the right to:</p>
<ul>
<li>Initiate recovery proceedings under the SARFAESI Act, 2002</li>
<li>Take possession of the secured assets/property</li>
<li>File civil and/or criminal proceedings as deemed appropriate</li>
<li>Report the default to Credit Information Companies (CIBIL, Experian, etc.)</li>
<li>Recover all legal costs, expenses, and further interest at applicable rates</li>
</ul>
<p>You are advised to treat this matter with utmost urgency and seriousness.</p>
<p>Yours faithfully,</p>
<p><strong>Advocate Smith</strong><br/>
Advocate<br/>
For State Bank</p>
<hr/>
<p><em><strong>IMPORTANT:</strong> This is a legal notice. Ignoring this notice may result in severe legal action.</em></p>
"""

response = requests.post("http://localhost:8000/translate", json={"text": long_text, "dest": "hi"})
if response.status_code == 200:
    res = response.json().get("translatedText", "")
    print(f"Original length: {len(long_text)}")
    print(f"Translated length: {len(res)}")
    print("Translated text preview:")
    print(res[:500] + "...\n\n..." + res[-500:])
else:
    print(f"Error {response.status_code}: {response.text}")
