import sys
sys.path.insert(0, r'C:\Users\New\Desktop\sber\mvp\backend')
from fastapi.testclient import TestClient
from main import app
client = TestClient(app)

# Try register a new user
reg = client.post('/api/auth/register', json={
    'email': 'test_balance@example.com',
    'password': 'secret123',
    'name': 'Test User',
    'org_name': 'Test Org',
})
print(f'Register status: {reg.status_code}')
if reg.status_code == 200:
    body = reg.json()
    token = body['access_token']
    user_id = body['user']['id']
    org_id = body['user']['org_id']
    print(f'Token: {token[:30]}...')
    
    # Try balance summary
    resp = client.get(
        '/api/banking/balance/summary',
        headers={'Authorization': f'Bearer {token}'},
    )
    print(f'Balance status: {resp.status_code}')
    print(f'Body: {resp.text[:1500]}')
else:
    print(f'Register body: {reg.text[:500]}')
    
    # Try login
    login = client.post('/api/auth/login', json={'email': 'test_balance@example.com', 'password': 'secret123'})
    print(f'Login status: {login.status_code}')
    if login.status_code == 200:
        body = login.json()
        token = body['access_token']
        resp = client.get(
            '/api/banking/balance/summary',
            headers={'Authorization': f'Bearer {token}'},
        )
        print(f'Balance status: {resp.status_code}')
        print(f'Body: {resp.text[:1500]}')
    else:
        print(f'Login body: {login.text[:500]}')
