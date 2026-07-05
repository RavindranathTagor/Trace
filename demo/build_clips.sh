#!/usr/bin/env bash
# Builds the finished bookend clips + voiceover bed for the Trace demo.
# Requires ffmpeg (verified present). Run from demo/ :  bash build_clips.sh
set -e
cd "$(dirname "$0")"
C=cards
V=voiceover
O=output
mkdir -p "$O"

echo "== intro.mp4 (title card + VO1) =="
ffmpeg -y -loglevel error -loop 1 -t 13.2 -i "$C/card_00_title.png" -i "$V/01_cold_open.mp3" \
  -filter_complex "[0:v]scale=1920:1080,fade=t=in:st=0:d=0.5,fade=t=out:st=12.6:d=0.5,setsar=1[v]" \
  -map "[v]" -map 1:a -c:v libx264 -pix_fmt yuv420p -r 25 -c:a aac -b:a 192k -shortest "$O/intro.mp4"

echo "== problem_bumper.mp4 (2.5s, silent) =="
ffmpeg -y -loglevel error -loop 1 -t 2.5 -i "$C/card_01_problem.png" \
  -filter_complex "[0:v]scale=1920:1080,fade=t=in:st=0:d=0.4,fade=t=out:st=2.0:d=0.4,setsar=1[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p -r 25 -an "$O/problem_bumper.mp4"

echo "== crosssource_bumper.mp4 (2.5s, silent) =="
ffmpeg -y -loglevel error -loop 1 -t 2.5 -i "$C/card_04_crosssource.png" \
  -filter_complex "[0:v]scale=1920:1080,fade=t=in:st=0:d=0.4,fade=t=out:st=2.0:d=0.4,setsar=1[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p -r 25 -an "$O/crosssource_bumper.mp4"

echo "== close.mp4 (stack card -> outro card + VO7) =="
ffmpeg -y -loglevel error -loop 1 -t 6 -i "$C/card_06_stack.png" -loop 1 -t 5.5 -i "$C/card_07_outro.png" -i "$V/07_close.mp3" \
  -filter_complex "[0:v]scale=1920:1080,fade=t=in:st=0:d=0.4,setsar=1[v0];[1:v]scale=1920:1080,fade=t=out:st=4.6:d=0.6,setsar=1[v1];[v0][v1]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -map 2:a -c:v libx264 -pix_fmt yuv420p -r 25 -c:a aac -b:a 192k -shortest "$O/close.mp4"

echo "== voiceover_bed_screen.mp3 (VO2..VO6 with timed gaps for a one-take screen capture) =="
# Silence spacers (seconds) BEFORE each segment, so narration lands on the right action.
mk_sil () { ffmpeg -y -loglevel error -f lavfi -i anullsrc=r=44100:cl=stereo -t "$1" -q:a 9 "$2"; }
mk_sil 1.0 "$O/s1.mp3"   # let the Discord message post first
mk_sil 2.0 "$O/s2.mp3"   # switch Discord -> Slack
mk_sil 3.0 "$O/s3.mp3"   # switch Slack -> GitHub, open PR
mk_sil 3.0 "$O/s4.mp3"   # switch GitHub -> Trace app
mk_sil 2.0 "$O/s5.mp3"   # switch app -> What-if
printf "file '%s'\n" \
  "s1.mp3" "../voiceover/02_discord_drift.mp3" \
  "s2.mp3" "../voiceover/03_slack_duplicate.mp3" \
  "s3.mp3" "../voiceover/04_github_pr.mp3" \
  "s4.mp3" "../voiceover/05_lifecycle.mp3" \
  "s5.mp3" "../voiceover/06_whatif.mp3" > "$O/bed_list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$O/bed_list.txt" -c:a libmp3lame -q:a 3 "$O/voiceover_bed_screen.mp3"
rm -f "$O"/s1.mp3 "$O"/s2.mp3 "$O"/s3.mp3 "$O"/s4.mp3 "$O"/s5.mp3 "$O"/bed_list.txt

echo ""
echo "== durations =="
for f in "$O"/intro.mp4 "$O"/crosssource_bumper.mp4 "$O"/close.mp4 "$O"/voiceover_bed_screen.mp3; do
  d=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f")
  printf "  %-34s %6.1fs\n" "$(basename "$f")" "$d"
done
echo "Done -> $O/"
