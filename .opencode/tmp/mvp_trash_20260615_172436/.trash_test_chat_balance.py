import sys
import asyncio
import json
sys.path.insert(0, r'C:\Users\New\Desktop\sber\mvp\backend')
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Step 1: Register a user
reg = client.post('/api/auth/register', json={
    'email': 'test_balance2@example.com',
    'password': 'secret123',
    'name': 'Test User',
    'org_name': 'Test Org',
})

if reg.status_code == 200:
    body = reg.json()
    token = body['access_token']
    user_id = body['user']['id']
    org_id = body['user']['org_id']
else:
    # Try login
    login = client.post('/api/auth/login', json={'email': 'test_balance2@example.com', 'password': 'secret123'})
    body = login.json()
    token = body['access_token']
    user_id = body['user']['id']
    org_id = body['user']['org_id']

print(f'Token: {token[:30]}...')
print(f'Org: {org_id}')

# Step 2: Test the chat endpoint
chat = client.post('/api/chat/guest', json={
    'message': 'Сколько на счёте?',
    'session_id': 'test-session-1',
    'org_id': org_id,
})
print(f'Chat status: {chat.status_code}')
print(f'Chat body: {chat.text[:2000]}')
