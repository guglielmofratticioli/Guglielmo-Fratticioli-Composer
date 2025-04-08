#!/bin/bash

# --- Configuration ---
# Set quality for the JPG output (0-100, higher is better quality/larger size)
JPG_QUALITY=85

# --- Safety Check ---
# Check if ImageMagick's convert command is available
if ! command -v convert &> /dev/null; then
    echo "ERROR: ImageMagick's 'convert' command not found." >&2
    echo "Please install ImageMagick (e.g., 'sudo apt install imagemagick' or 'brew install imagemagick')." >&2
    exit 1
fi

# --- Find and Process Files ---
echo "Starting PNG to JPG conversion (Quality: ${JPG_QUALITY})..."

# Use find to locate all .png files (case-insensitive) in the current directory (.) and subdirectories
# -print0 and read -d '' handle filenames with spaces, newlines, or special characters safely
find . -type f -iname "*.png" -print0 | while IFS= read -r -d '' png_file; do

    # Get the base filename without the .png extension
    base_name="${png_file%.*}" # Removes shortest suffix matching .*
    jpg_file="${base_name}.jpg"

    echo "-----------------------------------------"
    echo "Processing: '$png_file'"

    # Check if the target JPG already exists
    if [ -e "$jpg_file" ]; then
        echo "Skipping: Target JPG file '$jpg_file' already exists."
        continue # Move to the next file
    fi

    # Perform the conversion using ImageMagick's convert
    # -quality sets the JPG compression quality
    # -background white -flatten can help handle PNG transparency if needed,
    # otherwise transparent areas might become black. Remove if not desired.
    convert "$png_file" -quality "$JPG_QUALITY" -background white -flatten "$jpg_file"

    # Check the exit status of the convert command ($? contains the exit code of the last command)
    # 0 means success
    if [ $? -eq 0 ]; then
        echo "Successfully converted to '$jpg_file'"
        # Delete the original PNG file ONLY if conversion succeeded
        rm "$png_file"
        echo "Deleted original: '$png_file'"
    else
        echo "ERROR: Failed to convert '$png_file'. Original file NOT deleted." >&2
        # Optional: You could attempt to remove a partially created/failed jpg here if desired
        # rm -f "$jpg_file"
    fi

done

echo "-----------------------------------------"
echo "Conversion process finished."