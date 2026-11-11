// ============================================================
// Custom jsPsych 7 plugin: plays a list of video segments in order.
// Supports YouTube clips (with start/end seconds) and local video files.
// The Continue button turns on when all segments have ended, or after a
// safety timeout so no one gets stuck. If no segments are given, a
// timed placeholder is shown (useful while stimuli are not ready).
// ============================================================
var jsPsychVideoSegments = (function (jspsych) {
  "use strict";

  const info = {
    name: "video-segments",
    parameters: {
      segments: { type: jspsych.ParameterType.COMPLEX, default: [] },
      placeholder_seconds: { type: jspsych.ParameterType.INT, default: 20 },
      placeholder_label: { type: jspsych.ParameterType.STRING, default: "" },
      prompt: { type: jspsych.ParameterType.HTML_STRING, default: "" },
      fail_link_after_s: { type: jspsych.ParameterType.INT, default: 20 },
    },
  };

  // Load the YouTube IFrame API once.
  let ytReady = null;
  function loadYouTubeAPI() {
    if (ytReady) return ytReady;
    ytReady = new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => reject(new Error("YouTube could not be loaded"));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error("YouTube load timeout")), 15000);
    });
    return ytReady;
  }

  class VideoSegmentsPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const segs = trial.segments || [];
      const placeholder = segs.length === 0;
      const start = performance.now();
      const state = {
        index: 0,
        ended: 0,
        watched: 0, // seconds of normal playback
        started: false,
        failed: false,
        error: "",
      };
      const timers = [];
      let poll = null;
      let ytPlayer = null;

      // Expected total duration (seconds) for the safety timeout.
      const expected = placeholder
        ? trial.placeholder_seconds
        : segs.reduce((sum, s) => sum + (s.end && s.start != null ? s.end - s.start : s.end || 60), 0);

      // Box shape: 16:9 by default; use aspect: "9:16" in config for vertical clips.
      const vertical = !placeholder && segs[0] && segs[0].aspect === "9:16";
      const ar = vertical ? "9 / 16" : "16 / 9";
      const f = vertical ? "9 / 16" : "16 / 9";
      const boxStyle = `aspect-ratio:${ar};width:min(100%, calc(66vh * ${f}));width:min(100%, calc(66dvh * ${f}));`;

      display_element.innerHTML = `
        <div class="video-page">
          ${trial.prompt ? `<div class="video-prompt">${trial.prompt}</div>` : ""}
          <div class="video-box ${placeholder ? "placeholder" : ""} ${vertical ? "vertical" : ""}" style="${boxStyle}">
            <div id="vs-player"></div>
          </div>
          <p class="video-status" id="vs-status">Press <b>Play</b> to start the video.</p>
          <div class="video-buttons">
            <button type="button" class="jspsych-btn" id="vs-play">Play</button>
            <button type="button" class="jspsych-btn" id="vs-next" disabled>Continue</button>
          </div>
          <p class="video-fail hidden" id="vs-fail-wrap">
            <button type="button" class="link-btn" id="vs-fail">The video does not play for me</button>
          </p>
        </div>`;

      const statusEl = display_element.querySelector("#vs-status");
      const playBtn = display_element.querySelector("#vs-play");
      const nextBtn = display_element.querySelector("#vs-next");
      const failWrap = display_element.querySelector("#vs-fail-wrap");
      const holder = display_element.querySelector("#vs-player");

      const enableNext = (msg) => {
        nextBtn.disabled = false;
        if (msg) statusEl.innerHTML = msg;
      };

      const finish = () => {
        timers.forEach(clearTimeout);
        if (poll) clearInterval(poll);
        try {
          if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy();
        } catch (e) {}
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({
          n_segments: placeholder ? 0 : segs.length,
          segments_ended: state.ended,
          video_completed: placeholder ? state.ended === 1 : state.ended === segs.length,
          seconds_watched: Math.round(state.watched),
          video_failed: state.failed,
          video_error: state.error,
          placeholder,
          rt: Math.round(performance.now() - start),
        });
      };

      nextBtn.addEventListener("click", finish);
      display_element.querySelector("#vs-fail").addEventListener("click", () => {
        state.failed = true;
        enableNext("Thank you. Please press <b>Continue</b>.");
      });

      const allDone = () => enableNext("The video has ended. Please press <b>Continue</b>.");

      // Safety: allow Continue after the expected time plus 30 seconds.
      const startSafetyTimer = () => {
        timers.push(setTimeout(() => (nextBtn.disabled = false), (expected + 30) * 1000));
        timers.push(setTimeout(() => failWrap.classList.remove("hidden"), trial.fail_link_after_s * 1000));
      };

      // ---------- Placeholder ----------
      if (placeholder) {
        holder.innerHTML = `<div class="ph-video"><p>Video placeholder</p><p class="ph-label">${trial.placeholder_label}</p><p class="ph-count" id="vs-count"></p></div>`;
        playBtn.addEventListener("click", () => {
          if (state.started) return;
          state.started = true;
          playBtn.disabled = true;
          statusEl.textContent = "Playing...";
          let left = trial.placeholder_seconds;
          const countEl = display_element.querySelector("#vs-count");
          countEl.textContent = left + " s";
          poll = setInterval(() => {
            left -= 1;
            state.watched += 1;
            countEl.textContent = Math.max(left, 0) + " s";
            if (left <= 0) {
              clearInterval(poll);
              poll = null;
              state.ended = 1;
              allDone();
            }
          }, 1000);
          startSafetyTimer();
        });
        return;
      }

      // ---------- Real segments ----------
      const nextSegment = () => {
        state.index += 1;
        state.ended += 1;
        if (state.index >= segs.length) return allDone();
        playSegment(segs[state.index]);
      };

      // Count normal playback time (ignores jumps from seeking).
      let lastT = null;
      const tick = (getTime) => {
        const t = getTime();
        if (typeof t !== "number" || isNaN(t)) return;
        if (lastT !== null) {
          const d = t - lastT;
          if (d > 0 && d < 1.5) state.watched += d;
        }
        lastT = t;
      };

      let videoEl = null;
      const playSegment = (seg) => {
        lastT = null;
        statusEl.textContent = segs.length > 1 ? `Playing clip ${state.index + 1} of ${segs.length}...` : "Playing...";
        if (seg.type === "file") {
          if (ytPlayer) {
            try { ytPlayer.destroy(); } catch (e) {}
            ytPlayer = null;
            holder.innerHTML = "";
          }
          if (!videoEl) {
            holder.innerHTML = `<video id="vs-video" playsinline preload="auto"></video>`;
            videoEl = holder.querySelector("video");
            videoEl.addEventListener("ended", nextSegment);
            videoEl.addEventListener("error", () => {
              state.error = "file_error";
              failWrap.classList.remove("hidden");
            });
          }
          videoEl.src = seg.src;
          videoEl.play().catch(() => {
            statusEl.innerHTML = "Tap <b>Play</b> again to start the video.";
            playBtn.disabled = false;
          });
          return;
        }
        // YouTube segment
        const vars = { videoId: seg.id };
        if (seg.start != null) vars.startSeconds = seg.start;
        if (seg.end != null) vars.endSeconds = seg.end;
        if (ytPlayer) {
          ytPlayer.loadVideoById(vars);
          return;
        }
        holder.innerHTML = `<div id="vs-yt"></div>`;
        loadYouTubeAPI()
          .then((YT) => {
            ytPlayer = new YT.Player("vs-yt", {
              width: "100%",
              height: "100%",
              videoId: seg.id,
              playerVars: {
                start: seg.start || 0,
                end: seg.end || undefined,
                playsinline: 1,
                controls: 1,
                rel: 0,
                modestbranding: 1,
                fs: 0,
                disablekb: 1,
                autoplay: 1,
              },
              events: {
                onReady: (e) => e.target.playVideo(),
                onStateChange: (e) => {
                  if (e.data === YT.PlayerState.PLAYING) {
                    playBtn.disabled = true;
                    statusEl.textContent =
                      segs.length > 1 ? `Playing clip ${state.index + 1} of ${segs.length}...` : "Playing...";
                  }
                  if (e.data === YT.PlayerState.ENDED) nextSegment();
                },
                onError: (e) => {
                  state.error = "youtube_" + e.data;
                  statusEl.textContent = "This clip could not be played. Skipping to the next one.";
                  nextSegment();
                },
              },
            });
          })
          .catch((err) => {
            state.error = "youtube_api_" + err.message;
            failWrap.classList.remove("hidden");
            statusEl.textContent = "The video could not be loaded.";
          });
      };

      poll = setInterval(() => {
        if (videoEl && !videoEl.paused) tick(() => videoEl.currentTime);
        else if (ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === 1) tick(() => ytPlayer.getCurrentTime());
      }, 500);

      playBtn.addEventListener("click", () => {
        if (!state.started) {
          state.started = true;
          startSafetyTimer();
          playSegment(segs[0]);
          statusEl.innerHTML = "Loading... If the video does not start, tap the video itself.";
        } else if (videoEl) {
          videoEl.play();
        } else if (ytPlayer && ytPlayer.playVideo) {
          ytPlayer.playVideo();
        }
      });
    }

    simulate(trial, simulation_mode, simulation_options, load_callback) {
      load_callback && load_callback();
      this.jsPsych.finishTrial({
        n_segments: (trial.segments || []).length,
        segments_ended: (trial.segments || []).length || 1,
        video_completed: true,
        seconds_watched: 180,
        video_failed: false,
        video_error: "",
        placeholder: (trial.segments || []).length === 0,
        rt: 185000,
      });
    }
  }

  VideoSegmentsPlugin.info = info;
  return VideoSegmentsPlugin;
})(jsPsychModule);
