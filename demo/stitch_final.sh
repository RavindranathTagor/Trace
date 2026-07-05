#!/usr/bin/env bash
# Assemble the final demo: intro.mp4 + [your screen recording] + close.mp4.
# Usage:  bash stitch_final.sh path/to/your_screen_recording.mp4  [output.mp4]
#
# Your screen recording should be the MIDDLE portion only (Discord → Slack →
# GitHub → app → What-if), narrated with output/voiceover_bed_screen.mp3
# (or the individual voiceover/*.mp3 files) already mixed in.
set -e
cd "$(dirname "$0")"

SCREEN="${1:?Pass your screen recording mp4 as arg 1}"
OUT="${2:-output/trace_demo_final.mp4}"
O=output

[ -f "$O/intro.mp4" ] || { echo "Missing $O/intro.mp4 — run: bash build_clips.sh"; exit 1; }
[ -f "$O/close.mp4" ] || { echo "Missing $O/close.mp4 — run: bash build_clips.sh"; exit 1; }
[ -f "$SCREEN" ] || { echo "Screen recording not found: $SCREEN"; exit 1; }

# Re-encode all three to identical params so concat is seamless (handles any
# resolution/fps/codec your recorder produced). Scales/pads screen to 1920x1080.
norm () {
  ffmpeg -y -loglevel error -i "$1" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25" \
    -c:v libx264 -pix_fmt yuv420p -c:a aac -ar 44100 -b:a 192k -af "aresample=44100" "$2"
}
echo "Normalizing segments…"
norm "$O/intro.mp4"  "$O/_a.mp4"
norm "$SCREEN"       "$O/_b.mp4"
norm "$O/close.mp4"  "$O/_c.mp4"

printf "file '_a.mp4'\nfile '_b.mp4'\nfile '_c.mp4'\n" > "$O/_concat.txt"
echo "Concatenating…"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$O/_concat.txt" -c copy "$OUT"
rm -f "$O/_a.mp4" "$O/_b.mp4" "$O/_c.mp4" "$O/_concat.txt"

d=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUT")
printf "Done -> %s  (%.1fs, %d:%02d)\n" "$OUT" "$d" "$(printf '%.0f' "$(echo "$d/60" | awk '{print int($1)}')")" "$(awk -v x="$d" 'BEGIN{print int(x)%60}')"
