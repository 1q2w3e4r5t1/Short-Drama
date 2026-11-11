// ============================================================
// Study timeline.
// URL options (for testing):
//   ?debug=1            short placeholder video + data download buttons on the last page
//                       (debug is on automatically on localhost)
//   ?full=1             full-length placeholder video even in debug mode
//   ?condition=drama    force the video condition (drama or shortvideo)
// ============================================================
(function () {
  const { CFG, SESSION } = window.SDS;
  const I = window.ITEMS;
  const params = new URLSearchParams(window.location.search);
  const SHORT = SESSION.debug && params.get("full") !== "1";

  const jsPsych = initJsPsych({
    show_progress_bar: true,
    auto_update_progress_bar: false,
    message_progress_bar: "Progress",
  });
  SDS.setJsPsych(jsPsych);

  // ---------- Random assignment for the viewing experiment ----------
  const forced = params.get("condition");
  const condition = ["drama", "shortvideo"].includes(forced)
    ? forced
    : jsPsych.randomization.sampleWithoutReplacement(["drama", "shortvideo"], 1)[0];

  jsPsych.data.addProperties({
    session_id: SESSION.session_id,
    prolific_pid: SESSION.prolific_pid,
    study_id: SESSION.study_id,
    wave: SESSION.wave,
    device_type: SESSION.device_type,
    condition,
    condition_forced: !!forced,
    debug: SESSION.debug,
  });

  // ---------- Helpers ----------
  const PARTS = 5;
  const header = (n, title) => `<div class="section-tag">Part ${n} of ${PARTS} · ${title}</div>`;

  // Latest answers from a survey page, as an object.
  const resp = (pageName) => {
    const v = jsPsych.data.get().filter({ page: pageName }).values();
    return v.length ? v[v.length - 1].response || {} : {};
  };
  const num = (x) => (x === undefined || x === null || x === "" ? null : Number(x));

  function page(name, html, opts = {}) {
    return {
      type: jsPsychSurveyHtmlForm,
      preamble: opts.header || "",
      html,
      button_label: opts.button || "Continue",
      data: { page: name },
      on_load: () => {
        SDS.enhanceForm(jsPsych.getDisplayElement());
        if (opts.on_load) opts.on_load(jsPsych.getDisplayElement());
      },
      on_finish: (d) => {
        if (opts.progress != null) jsPsych.setProgressBar(opts.progress);
        if (opts.on_finish) opts.on_finish(d);
      },
    };
  }

  function info(name, html, button = "Continue", progress = null) {
    return {
      type: jsPsychHtmlButtonResponse,
      stimulus: html,
      choices: [button],
      data: { page: name },
      on_start: () => SDS.toTop(),
      on_finish: () => {
        if (progress != null) jsPsych.setProgressBar(progress);
      },
    };
  }

  const saveStep = (stage) => ({
    type: jsPsychCallFunction,
    func: () => {
      SDS.saveData(stage);
    },
    data: { page: "save_" + stage },
  });

  function endEarly(stage, html) {
    SDS.saveData(stage);
    jsPsych.endExperiment(`<div class="end-msg">${html}</div>`);
  }

  const resourcesHTML = `
    <ul class="resources">
      <li>988 Suicide and Crisis Lifeline: call or text <b>988</b> (24/7), or chat at 988lifeline.org</li>
      <li>Crisis Text Line: text <b>HOME</b> to <b>741741</b></li>
      <li>SAMHSA National Helpline: <b>1-800-662-4357</b> (free, confidential referrals, 24/7)</li>
      <li>Syracuse University students: Barnes Center at The Arch counseling, <b>315-443-8000</b> (24/7)</li>
      <li>If you are in immediate danger, call <b>911</b>.</li>
    </ul>`;

  const timeline = [];

  // ============ Welcome and consent ============
  timeline.push(
    info(
      "welcome",
      `<div class="welcome">
        <h1>Short Dramas, Media Use, and Mood</h1>
        <p>Thank you for your interest in this study.</p>
        <ul>
          <li>It takes about <b>${CFG.ESTIMATED_MINUTES} minutes</b>.</li>
          <li>You will watch a short video, so please <b>turn on your sound</b> or use headphones.</li>
          <li>Please find a quiet place and do not do other tasks while you take part.</li>
          <li>The study works on phones, tablets, and computers.</li>
        </ul>
        ${SESSION.debug ? `<p class="debug-note">Test mode is on${SHORT ? " (short placeholder video)" : ""}. Condition: ${condition}.</p>` : ""}
      </div>`,
      "Start",
      0.02
    )
  );

  timeline.push(
    page("consent", window.CONSENT_HTML, {
      button: "Continue",
      progress: 0.06,
      on_finish: (d) => {
        if (d.response.consent !== "agree") {
          endEarly(
            "consent_declined",
            `<h2>Thank you</h2><p>You chose not to take part. No further questions will be asked. You may now close this page.</p>`
          );
        }
      },
    })
  );

  // ============ Part 1: Screening and background ============
  timeline.push(
    page("screening", I.screening(), {
      header: header(1, "About you"),
      progress: 0.08,
      on_finish: (d) => {
        const age = num(d.response.age);
        if (age === null || age < 18 || d.response.us_resident !== "1") {
          endEarly(
            "ineligible",
            `<h2>Thank you</h2><p>Thank you for your interest. This study is open only to adults age 18 or older who live in the United States, so we will not ask you any more questions. You may now close this page.</p>`
          );
        }
      },
    })
  );
  timeline.push(page("about_you", I.aboutYou(), { header: header(1, "About you"), progress: 0.11 }));
  timeline.push(page("household", I.household(), { header: header(1, "About you"), progress: 0.14 }));
  timeline.push(page("mh_history", I.mhHistory(), { header: header(1, "About you"), progress: 0.17 }));
  timeline.push(saveStep("opening"));

  // Preload optional example images shown with the short drama definition.
  if ((CFG.EXAMPLE_IMAGES || []).length) {
    timeline.push({
      type: jsPsychPreload,
      images: CFG.EXAMPLE_IMAGES,
      message: "<p>Loading...</p>",
      continue_after_error: true,
      data: { page: "preload" },
    });
  }

  // ============ Part 2: Viewing experiment ============
  timeline.push(
    info(
      "video_intro",
      `${header(2, "Video")}<div class="instructions"><h2>Video</h2><p>Next, you will watch a video of about 3 minutes. Please turn on your sound or use headphones, and watch the whole video.</p><p>Before and after the video, we will ask how you feel right now.</p></div>`
    )
  );
  timeline.push(page("mood_pre", I.mood("pre"), { header: header(2, "Video"), progress: 0.22 }));
  timeline.push({
    type: jsPsychVideoSegments,
    segments: (CFG.VIDEOS && CFG.VIDEOS[condition]) || [],
    placeholder_seconds: SHORT ? 3 : 20,
    placeholder_label: SESSION.debug ? `Condition: ${condition}` : "",
    prompt: header(2, "Video") + "<p>Please watch the whole video. The Continue button will turn on when the video ends.</p>",
    fail_link_after_s: SHORT ? 2 : 20,
    data: { page: "video" },
    on_start: () => SDS.toTop(),
    on_finish: () => jsPsych.setProgressBar(0.3),
  });
  timeline.push(page("mood_post", I.mood("post"), { header: header(2, "Video"), progress: 0.33 }));
  timeline.push(page("manip_check", I.manipCheck(), { header: header(2, "Video"), progress: 0.36 }));
  timeline.push(saveStep("video"));

  // ============ Part 3: Short drama and media use ============
  timeline.push(page("sd_days", I.dramaDays(), { header: header(3, "Short dramas and media use"), progress: 0.42 }));

  const isViewer = () => {
    const d = num(resp("sd_days").sd_days30);
    return d !== null && d > 0;
  };
  timeline.push({
    timeline: [
      page("sd_amount", I.dramaAmount(), { header: header(3, "Short dramas and media use"), progress: 0.47 }),
      page("bsmas", I.bsmas(), { header: header(3, "Short dramas and media use"), progress: 0.52 }),
      page("motives", I.motives(), { header: header(3, "Short dramas and media use"), progress: 0.57 }),
    ],
    conditional_function: isViewer,
  });
  timeline.push(page("media", I.media(), { header: header(3, "Short dramas and media use"), progress: 0.62 }));

  // ============ Part 4: Feelings and well-being ============
  timeline.push(page("social", I.social(), { header: header(4, "Feelings and well-being"), progress: 0.67 }));
  timeline.push(page("phq9", I.phq9(), { header: header(4, "Feelings and well-being"), progress: 0.72 }));
  timeline.push(page("gad7", I.gad7(), { header: header(4, "Feelings and well-being"), progress: 0.77 }));
  timeline.push({
    timeline: [page("functioning", I.functioning(), { header: header(4, "Feelings and well-being") })],
    conditional_function: () => {
      const p = resp("phq9");
      const g = resp("gad7");
      const any = (o, prefix, n) =>
        Array.from({ length: n }, (_, i) => num(o[`${prefix}_${i + 1}`])).some((v) => v !== null && v > 0);
      return any(p, "phq", 9) || any(g, "gad", 7);
    },
  });
  timeline.push(page("ucla3", I.ucla3(), { header: header(4, "Feelings and well-being"), progress: 0.82 }));
  timeline.push({
    timeline: [
      {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<div class="instructions crisis"><h2>Support is available</h2>
          <p>You told us that in the last 2 weeks you had thoughts that you would be better off dead or of hurting yourself. Your answers are anonymous, so we cannot contact you. If you are having these thoughts, please reach out for support now. You do not have to go through this alone.</p>
          ${resourcesHTML}
          <p>You can continue the study, or stop now by closing this page.</p></div>`,
        choices: ["Continue"],
        data: { page: "crisis_info" },
        on_start: () => SDS.toTop(),
      },
    ],
    conditional_function: () => num(resp("phq9").phq_9) > 0,
  });

  // ============ Part 5: Daily life and screen time ============
  timeline.push(page("stressors", I.stressors(), { header: header(5, "Daily life and screen time"), progress: 0.87 }));
  timeline.push(page("boredom", I.boredom(), { header: header(5, "Daily life and screen time"), progress: 0.9 }));
  timeline.push(saveStep("survey"));

  timeline.push(
    page("st_choice", () => I.screenChoice(resp("consent").consent_screenshot === "yes"), {
      header: header(5, "Daily life and screen time"),
      progress: 0.92,
    })
  );

  timeline.push({
    timeline: [
      page("st_upload", I.screenUpload(navigator.userAgent), {
        header: header(5, "Daily life and screen time"),
        on_load: (el) => {
          const input = el.querySelector("#st_file");
          const status = el.querySelector("#st_status");
          const pathsEl = el.querySelector("#st_paths");
          const errEl = el.querySelector("#st_errors");
          const submit = el.querySelector("#jspsych-survey-html-form-next");
          input.addEventListener("change", async () => {
            const files = Array.from(input.files || []).slice(0, 3);
            if (!files.length) return;
            const paths = pathsEl.value ? pathsEl.value.split(";") : [];
            const errors = [];
            submit.disabled = true;
            for (let i = 0; i < files.length; i++) {
              status.textContent = `Uploading ${i + 1} of ${files.length}...`;
              try {
                paths.push(await SDS.uploadScreenshot(files[i]));
              } catch (e) {
                errors.push(e.message);
              }
            }
            pathsEl.value = paths.join(";");
            errEl.value = errors.join(";");
            submit.disabled = false;
            status.innerHTML = paths.length
              ? `<span class="ok">Uploaded ${paths.length} screenshot${paths.length > 1 ? "s" : ""}. Thank you! Please press Continue.</span>`
              : `<span class="bad">Sorry, the upload did not work. You can try again, or press Continue to type in the numbers instead.</span>`;
          });
        },
      }),
    ],
    conditional_function: () => resp("st_choice").st_choice === "upload",
  });

  timeline.push({
    timeline: [page("st_type", I.screenType(), { header: header(5, "Daily life and screen time") })],
    conditional_function: () => {
      const choice = resp("st_choice").st_choice;
      if (choice === "type") return true;
      if (choice === "upload") return !resp("st_upload").st_screenshot_paths;
      return false;
    },
  });

  timeline.push(page("comments", I.comments(), { header: header(5, "Daily life and screen time"), button: "Submit", progress: 0.98 }));

  // ============ Final save (with retries) ============
  let finalSaved = false;
  timeline.push({
    type: jsPsychCallFunction,
    async: true,
    func: (done) => {
      jsPsych.getDisplayElement().innerHTML = `<p class="saving">Saving your answers. Please do not close this page...</p>`;
      jsPsych.setProgressBar(1);
      const attempt = async (n) => {
        const ok = await SDS.saveData("final");
        if (ok || n >= 3) {
          finalSaved = ok;
          done({ final_save_ok: ok, attempts: n });
        } else {
          setTimeout(() => attempt(n + 1), 1500);
        }
      };
      attempt(1);
    },
    data: { page: "final_save" },
  });

  // ============ End page ============
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    choices: "NO_KEYS",
    data: { page: "end" },
    on_start: () => SDS.toTop(),
    stimulus: () => {
      const watched =
        condition === "drama"
          ? "a clip from a short drama"
          : "a set of ordinary short videos (such as cooking or travel clips)";
      const saveNote = finalSaved
        ? ""
        : SESSION.debug
        ? `<p class="debug-note">Test mode: no server was reached, so the data were not uploaded. Use the buttons below to download them.</p>`
        : `<p class="warn">We could not confirm that your answers were saved. Please press the button below to download your answers and email the file to ${CFG.RESEARCHER_EMAIL}.</p>
           <p><button type="button" class="jspsych-btn" id="dl-json">Download my answers</button></p>`;
      const completion = CFG.COMPLETION_URL
        ? `<p><a class="jspsych-btn" href="${CFG.COMPLETION_URL}">Return to Prolific to finish</a></p>`
        : "";
      const debugTools = SESSION.debug
        ? `<div class="debug-tools"><p><b>Test tools</b></p>
             <button type="button" class="jspsych-btn" id="dl-json">Download JSON</button>
             <button type="button" class="jspsych-btn" id="dl-csv">Download CSV</button></div>`
        : "";
      return `<div class="end-page">
        <h1>Thank you!</h1>
        <p>You have finished the study.${finalSaved ? " Your answers have been saved." : ""}</p>
        ${saveNote}
        <h3>About this study</h3>
        <p>We want to learn how short dramas relate to mood and mental health. The computer randomly chose which video each person watched. Some people watched a short drama clip, and others watched ordinary short videos. You watched <b>${watched}</b>. By comparing mood ratings before and after the video, we can see whether short dramas change mood in a different way than other short videos.</p>
        <p>Please do not tell other people about the details of this study, because this could change how they answer.</p>
        <h3>If you would like support</h3>
        <p>If any questions made you feel upset, these free services can help:</p>
        ${resourcesHTML}
        <h3>Questions?</h3>
        <p>Contact ${CFG.RESEARCHER_NAME} at ${CFG.RESEARCHER_EMAIL}. Your participant code is <b class="code">${SESSION.session_id.slice(0, 12)}</b>. Please include this code if you want your answers removed.</p>
        ${completion}
        ${debugTools}
        <p>You may now close this page.</p>
      </div>`;
    },
    on_load: () => {
      const el = jsPsych.getDisplayElement();
      const j = el.querySelector("#dl-json");
      const c = el.querySelector("#dl-csv");
      if (j) j.addEventListener("click", () => jsPsych.data.get().localSave("json", `sds_${SESSION.session_id}.json`));
      if (c) c.addEventListener("click", () => jsPsych.data.get().localSave("csv", `sds_${SESSION.session_id}.csv`));
    },
  });

  jsPsych.run(timeline);
})();
