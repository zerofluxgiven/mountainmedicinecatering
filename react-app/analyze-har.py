#!/usr/bin/env python3
import json
import sys

# Read the HAR file
with open('screenshots/mountainmedicine-6e572.web.app.har', 'r') as f:
    har_data = json.load(f)

# Analyze entries
print("=== HAR File Analysis ===\n")

# Count requests by status
status_counts = {}
error_requests = []
firestore_requests = []
functions_requests = []

for entry in har_data['log']['entries']:
    url = entry['request']['url']
    status = entry['response']['status']
    
    # Count statuses
    status_counts[status] = status_counts.get(status, 0) + 1
    
    # Collect error requests
    if status >= 400:
        error_requests.append({
            'url': url,
            'status': status,
            'method': entry['request']['method']
        })
    
    # Collect Firestore requests
    if 'firestore.googleapis.com' in url:
        firestore_requests.append({
            'url': url,
            'status': status,
            'method': entry['request']['method']
        })
    
    # Collect Functions requests
    if 'cloudfunctions.net' in url:
        functions_requests.append({
            'url': url,
            'status': status,
            'method': entry['request']['method']
        })

# Print summary
print(f"Total requests: {len(har_data['log']['entries'])}")
print("\nStatus code distribution:")
for status, count in sorted(status_counts.items()):
    print(f"  {status}: {count} requests")

# Print errors
if error_requests:
    print(f"\n❌ Error requests ({len(error_requests)}):")
    for req in error_requests[:10]:  # Show first 10
        print(f"  {req['status']} {req['method']} {req['url'][:100]}...")

# Print Firestore requests
if firestore_requests:
    print(f"\n🔥 Firestore requests ({len(firestore_requests)}):")
    for req in firestore_requests[:5]:  # Show first 5
        print(f"  {req['status']} {req['method']} {req['url'][:100]}...")

# Print Functions requests  
if functions_requests:
    print(f"\n☁️  Cloud Functions requests ({len(functions_requests)}):")
    for req in functions_requests[:5]:  # Show first 5
        print(f"  {req['status']} {req['method']} {req['url'][:100]}...")

# Look for specific collection references
print("\n📋 Searching for collection references in URLs:")
collections = ['menus', 'menu_items', 'recipes', 'events', 'users']
for entry in har_data['log']['entries']:
    url = entry['request']['url']
    for collection in collections:
        if collection in url:
            print(f"  Found '{collection}' in: {url[:100]}...")
            break