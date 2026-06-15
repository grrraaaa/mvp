import sys
import asyncio
import json
sys.path.insert(0, r'C:\Users\New\Desktop\sber\mvp\backend')

# Direct test of the AssistantService
from services.ai.assistant import AssistantService
from db.database import AsyncSessionLocal

async def main():
    assistant = AssistantService()
    response = await assistant.process(
        message='Сколько на счёте?',
        session_id='test-direct-1',
        user_id='guest',
        page_route=None,
        form_type=None,
        org_id='demo',
        form_fields=None,
    )
    print('=== message ===')
    print(response.message)
    print()
    print('=== chart_payload (yes/no) ===')
    print('Has chart_payload:', response.chart_payload is not None)
    if response.chart_payload:
        print('chart_payload.type:', response.chart_payload.get('type'))
        print('chart_payload has bar:', 'bar' in response.chart_payload)
        print('chart_payload has line:', 'line' in response.chart_payload)
        print('chart_payload.data keys:', list(response.chart_payload.get('data', {}).keys()))
    print()
    print('=== action_buttons ===')
    for btn in response.action_buttons or []:
        print(f'  - {btn.label}: url={btn.url} message={btn.message}')
    print()
    print('=== charts ===')
    for chart in response.charts or []:
        print(f'  - type={chart.type} title={chart.title}')

asyncio.run(main())
