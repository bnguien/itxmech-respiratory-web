# Audio playback performance

The recording player caches up to eight waveform previews in browser memory for ten minutes. Each preview contains at most 4,096 amplitude samples per channel (up to two channels) and the decoded duration. The original WAV remains the playback source; display downsampling does not change the audio.

Reopening a cached recording still requests a new authenticated playback URL. WaveSurfer receives the cached peaks and duration, avoiding another full download and Web Audio decode just to draw the waveform. The media element loads audio for playback using the signed URL. This does not guarantee immediate playback on slow networks.

The first visit still downloads and decodes the WAV. The UI distinguishes download progress from waveform processing. Leaving the player aborts pending requests, and playback errors or manual retries invalidate the preview. Refreshing the browser clears this memory-only cache.

No live Storage timing has been measured. Further first-load improvements should be guided by timing the authenticated playback-URL request, WAV transfer, and decoding separately. Persisted precomputed waveform peaks would allow the same waveform rendering optimization on the first visit.
