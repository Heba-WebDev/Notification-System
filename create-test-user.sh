#!/bin/bash

# Quick script to create a test user and return the User ID

echo "Creating test user..."

cd "$(dirname "$0")/user-service"

# Run the test client and extract the user ID
USER_ID=$(npm run test:client 2>&1 | grep -oP '(?<=User created with ID: )[a-f0-9-]+' | head -1)

if [ -z "$USER_ID" ]; then
    echo "❌ Failed to create user. Make sure User Service is running."
    exit 1
fi

echo ""
echo "✅ User created successfully!"
echo ""
echo "📋 User ID: $USER_ID"
echo ""
echo "You can now use this ID in the Push Token Manager page!"
echo ""

