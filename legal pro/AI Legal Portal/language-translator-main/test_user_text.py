from translator_logic import TranslatorCore

core = TranslatorCore()

text = """Reference: LDN/ ${sno} /03-26
Date: 20/03/2026
Without any prejudice
To,
Customer Name: ${name}
Store Name: ${store}
Phone Number: ${phone}

<#if office_address?has_content>
Commercial Address:
${office_address}
</#if>

<#if address?has_content>Residential Address: ${address} </#if>
Pin Code: ${pincode}

Subject: Legal Demand Notice for violation of terms and conditions of the agreement
Dear ${name} ,

Our client, Strategic Finvest Pvt Ltd., is a Non-Banking Financial Company (NBFC) duly registered under the Companies Act, 2013, and registered with the Reserve Bank of India (hereinafter referred to as "our client"). This company is engaged in providing financial assistance to individuals and businesses across India.
"""

print("Translating...")
res = core.translate_text(text, "hi")
with open("test_user_out.txt", "w", encoding="utf-8") as f:
    f.write(res)
print("Output written to test_user_out.txt")
