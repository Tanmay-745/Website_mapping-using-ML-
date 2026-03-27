import requests

# Test host login - should see all lenders
print('=== HOST LOGIN (should see all lenders) ===')
r = requests.post('http://localhost:8000/auth/token', data={'username':'host','password':'host123'})
if r.status_code == 200:
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    r2 = requests.get('http://localhost:8000/allocations/', headers=headers)
    allocs = r2.json()
    print(f'Host sees {len(allocs)} allocations:')
    for alloc in allocs:
        print(f'  - {alloc["customer_name"]} ({alloc["lender"]})')
else:
    print('Host login failed:', r.text)

print()
print('=== QUIDCASH LOGIN (should see only Quidcash) ===')
r = requests.post('http://localhost:8000/auth/token', data={'username':'quidcash','password':'password123'})
if r.status_code == 200:
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    r2 = requests.get('http://localhost:8000/allocations/', headers=headers)
    allocs = r2.json()
    print(f'Quidcash sees {len(allocs)} allocations:')
    for alloc in allocs:
        print(f'  - {alloc["customer_name"]} ({alloc["lender"]})')
else:
    print('Quidcash login failed:', r.text)