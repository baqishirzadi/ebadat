#!/bin/bash
# Script to generate all required icon sizes from source icon.png
# Uses macOS sips command for image processing

SOURCE_ICON="assets/images/icon.png"
IMAGES_DIR="assets/images"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Generating app icons from source image...${NC}"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo -e "${RED}Error: $SOURCE_ICON not found!${NC}"
    echo "Please ensure icon.png exists in assets/images/ directory"
    exit 1
fi

# Check if sips is available
if ! command -v sips &> /dev/null; then
    echo -e "${RED}Error: sips command not found. This script requires macOS.${NC}"
    exit 1
fi

# Function to resize image
resize_icon() {
    local input=$1
    local output=$2
    local size=$3
    local description=$4
    
    echo -e "${YELLOW}Generating $description ($size x $size)...${NC}"
    sips -z $size $size "$input" --out "$output" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Created $output${NC}"
    else
        echo -e "${RED}✗ Failed to create $output${NC}"
    fi
}

# 1. Main app icon (should already be 1024x1024, verify)
echo -e "\n${GREEN}1. Main App Icon${NC}"
current_size=$(sips -g pixelWidth "$SOURCE_ICON" 2>/dev/null | grep pixelWidth | awk '{print $2}')
if [ "$current_size" != "1024" ]; then
    echo -e "${YELLOW}Resizing icon.png to 1024x1024...${NC}"
    resize_icon "$SOURCE_ICON" "$IMAGES_DIR/icon.png" 1024 "Main App Icon"
else
    echo -e "${GREEN}✓ icon.png is already 1024x1024${NC}"
fi

# 2. Splash screen icon (200x200)
echo -e "\n${GREEN}2. Splash Screen Icon${NC}"
resize_icon "$SOURCE_ICON" "$IMAGES_DIR/splash-icon.png" 200 "Splash Screen Icon"

# 3. Android adaptive icons
echo -e "\n${GREEN}3. Android Adaptive Icons${NC}"

# Foreground (1024x1024, use source icon)
echo -e "${YELLOW}Creating Android foreground icon...${NC}"
cp "$SOURCE_ICON" "$IMAGES_DIR/android-icon-foreground.png"
echo -e "${GREEN}✓ Created android-icon-foreground.png${NC}"

# Background (1024x1024, solid dark green #1a4d3e)
echo -e "${YELLOW}Creating Android background icon (solid green #1a4d3e)...${NC}"
# Create a 1x1 green pixel and resize it
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > /tmp/green_pixel.png 2>/dev/null
# Alternative: Use sips to create from a template
# Since we can't easily create solid color with sips, we'll create it from the icon with a filter
sips --setProperty format png --setProperty formatOptions default "$SOURCE_ICON" --out "$IMAGES_DIR/android-icon-background-temp.png" > /dev/null 2>&1
# Create solid green using ImageMagick-like approach with sips
# We'll need to use a workaround - create a copy and fill it
echo -e "${YELLOW}Note: Creating solid green background...${NC}"
# Use sips to create a solid color image by manipulating the source
# Create a temporary file, then use sips to fill it
sips -z 1024 1024 "$SOURCE_ICON" --out "$IMAGES_DIR/android-icon-background-temp2.png" > /dev/null 2>&1
# For solid color, we'll create a simple script or use the fact that we can't easily do this with sips alone
# Let's create a Node.js script as fallback
cat > /tmp/create_green_bg.js << 'JS_SCRIPT'
const fs = require('fs');
// Create a simple 1024x1024 PNG with solid green color
// This is a minimal PNG file for solid green #1a4d3e
// Since we can't easily create PNGs in pure Node without canvas, we'll use a workaround
console.log('Creating green background requires image library. Please create manually or use image editor.');
JS_SCRIPT

# For now, copy the icon and note that it needs to be solid green
echo -e "${YELLOW}Creating placeholder - you may need to manually create solid green background${NC}"
# Create a simple workaround: use sips to create a very dark version
sips --setProperty format png "$SOURCE_ICON" --out "$IMAGES_DIR/android-icon-background.png" > /dev/null 2>&1
echo -e "${YELLOW}⚠ android-icon-background.png created as placeholder${NC}"
echo -e "${YELLOW}   Please replace with solid green (#1a4d3e) 1024x1024 image${NC}"

# Monochrome (same as foreground)
echo -e "${YELLOW}Creating Android monochrome icon...${NC}"
cp "$SOURCE_ICON" "$IMAGES_DIR/android-icon-monochrome.png"
echo -e "${GREEN}✓ Created android-icon-monochrome.png${NC}"

# 4. Web favicon (32x32)
echo -e "\n${GREEN}4. Web Favicon${NC}"
resize_icon "$SOURCE_ICON" "$IMAGES_DIR/favicon.png" 32 "Web Favicon"

echo -e "\n${GREEN}✓ Icon generation complete!${NC}"
echo -e "\n${YELLOW}Important Notes:${NC}"
echo -e "${YELLOW}1. android-icon-background.png needs to be a solid green (#1a4d3e) 1024x1024 square${NC}"
echo -e "${YELLOW}   You can create this in any image editor (Photoshop, GIMP, Preview, etc.)${NC}"
echo -e "${YELLOW}2. After replacing files, restart Expo with: npx expo start --clear${NC}"
