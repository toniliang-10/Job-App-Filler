# Extension Icons

To create proper PNG icons from the SVG, you can:

1. **Online Tool**: Use https://cloudconvert.com/svg-to-png
   - Upload icon.svg
   - Convert to PNG at sizes: 16x16, 48x48, 128x128
   - Save as icon16.png, icon48.png, icon128.png

2. **Command Line** (if you have ImageMagick installed):
   ```bash
   convert -background none icon.svg -resize 16x16 icon16.png
   convert -background none icon.svg -resize 48x48 icon48.png
   convert -background none icon.svg -resize 128x128 icon128.png
   ```

3. **Design Tool**: Use Figma, Sketch, or Photoshop to create custom icons

For now, you can use simple placeholder images or the extension will work with just the SVG (though Chrome prefers PNG).

## Quick Placeholder Creation

If you need quick placeholders, create solid color squares:
- icon16.png: 16x16 purple square
- icon48.png: 48x48 purple square  
- icon128.png: 128x128 purple square

The extension will function without perfect icons.

