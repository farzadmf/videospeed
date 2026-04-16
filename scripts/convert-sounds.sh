#!/usr/bin/env bash
#
# Convert MP3 sound files to OGA (Vorbis) for the extension.
# - Trims leading/trailing silence
# - Encodes as Vorbis stereo, 24 kHz, 171 kbps (matches beep.oga settings)
# - Moves successfully converted MP3s to a 'original' subdirectory
#
# Usage:
#   ./scripts/convert-sounds.sh [input_dir] [output_dir]
#
# Defaults:
#   input_dir  = src/assets/sounds
#   output_dir = src/assets/sounds

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

INPUT_DIR="${1:-$PROJECT_ROOT/src/assets/sounds}"
OUTPUT_DIR="${2:-$PROJECT_ROOT/src/assets/sounds}"

# Encoding settings (matching beep.oga)
CODEC="vorbis"
SAMPLE_RATE=24000
BITRATE="171k"

# Silence trimming settings
SILENCE_THRESHOLD="-30dB"
MIN_SILENCE="0.02"

SILENCE_FILTER="silenceremove=start_periods=1:start_silence=${MIN_SILENCE}:start_threshold=${SILENCE_THRESHOLD},areverse,silenceremove=start_periods=1:start_silence=${MIN_SILENCE}:start_threshold=${SILENCE_THRESHOLD},areverse"

ORIGINAL_DIR="$INPUT_DIR/original"
mkdir -p "$ORIGINAL_DIR"

count=0
for f in "$INPUT_DIR"/*.mp3; do
  [ -f "$f" ] || continue
  basename="$(basename "${f%.mp3}")"
  output="$OUTPUT_DIR/${basename}.oga"
  echo "Converting: $(basename "$f") -> ${basename}.oga"
  if ffmpeg -y -i "$f" \
    -af "$SILENCE_FILTER" \
    -c:a "$CODEC" -strict -2 \
    -ar "$SAMPLE_RATE" \
    -b:a "$BITRATE" \
    "$output" 2>/dev/null; then
    mv "$f" "$ORIGINAL_DIR/"
    count=$((count + 1))
  else
    echo "  FAILED: $(basename "$f")"
  fi
done

echo "Done. Converted $count file(s). Originals moved to $(basename $ORIGINAL_DIR)/"
