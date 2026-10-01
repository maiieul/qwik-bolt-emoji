// config.js: project settings.
//   duration: the video's length in seconds.
//   start:    the story time of the video's first frame. The intro lives at negative story times, so every shot
//             after it keeps the times in STORYBOARD.md; sheets and stills take story time, frames map from video time.
//   bpm:      the rhythm that bounces, dances and pulse() follow.
const PROJECT = { duration: 76, start: -10, bpm: 120, offset: 0, audio: 'assets/soundtrack_full.wav' };
