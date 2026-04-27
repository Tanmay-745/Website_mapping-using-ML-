target_columns = [
    "full_name",
    "dpd",
    "total_outstanding_amt",
    "email",
    "phone_num",
    "address",
    "lan",
    "office_Address",
    "pincode",
    "language",
    "state",
    "loan_amount",
    "regional_manager",
    "regional_manager_phone_number",
    "phone_number",
    "mobile_number",
    "agreement_date",
    "city",
    "notice",
    "outstanding_amount",
    "store",
    "collection_manager",
    "collection_manager_phone_number"
]

# Dictionary to map standard industry abbreviations to their full English words
abbreviation_dict = {
    'rm': 'regional manager',
    'acm': 'collection manager',
    'lan': 'loan account number',
    'dpd': 'days past due',
    'amt': 'amount',
    'num': 'number',
    'no': 'number',
    'zip': 'pincode', # Sometimes clients say zip code instead of pincode
    'mobile':'phone number',
    'contact':'phone number',
    'location':'address'
}

def clean_and_expand_column_name(col_name):
    """Converts abbreviations to full words (e.g., 'rm_name' -> 'regional manager name')"""
    # Replace underscores and slashes with spaces, then split into words
    words = str(col_name).lower().replace('_', ' ').replace('/', ' ').split()
    # Swap abbreviations if they exist in our dictionary
    expanded_words = [abbreviation_dict.get(word, word) for word in words]
    return ' '.join(expanded_words)

# 3. Create embeddings for your target columns (Note: We embed the CLEANED versions!)
clean_targets = [clean_and_expand_column_name(col) for col in target_columns]
target_embeddings = model.encode(clean_targets)
print("\u2705 Target columns cleaned and mapped to vector embeddings!")