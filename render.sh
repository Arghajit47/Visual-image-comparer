#!/usr/bin/env bash
# Install canvas dependencies for Render
set -e

echo "Installing canvas dependencies..."

# Install system dependencies
if [ -f /etc/debian_version ]; then
  apt-get update
  apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev
fi

echo "Installing npm packages..."
npm install

echo "Building Next.js app..."
npm run build
