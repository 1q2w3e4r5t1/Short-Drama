// ============================================================
// Shared helpers: session info, data saving, and form builders.
// ============================================================
(function () {
  const CFG = window.STUDY_CONFIG;
  const params = new URLSearchParams(window.location.search);

  // ---------- Session and device information ----------
  function randomId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "");
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  const isLocal = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
  const debug = params.get("debug") === "1" || isLocal;

  const sessionRaw = params.get("SESSION_ID") || randomId();
  const session_id = sessionRaw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || randomId();

  const isTouch =
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const SESSION = {
    session_id,
    prolific_pid: params.get("PROLIFIC_PID") || "",
    study_id: params.get("STUDY_ID") || "",
    wave: params.get("wave") || "1",
    debug,
    device_type: isMobileUA ? "mobile" : isTouch ? "touch_desktop_or_tablet" : "desktop",
    touch: isTouch,
    screen_w: window.screen.width,
    screen_h: window.screen.height,
    user_agent: navigator.userAgent,
    start_time: new Date().toISOString(),
  };

  // ---------- Saving data ----------
  let jsPsychRef = null;
  function setJsPsych(j) {
    jsPsychRef = j;
  }

  async function saveData(stage) {
    if (!jsPsychRef) return false;
    const data = jsPsychRef.data.get().values();
    const body = JSON.stringify({ session_id: SESSION.session_id, stage, meta: SESSION, data });
    // Keep a local backup in case the request fails.
    try {
      localStorage.setItem("sds_backup_" + SESSION.session_id, body);
    } catch (e) {
      /* storage may be full or blocked */
    }
    try {
      const resp = await fetch(CFG.SAVE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: body.length < 60000,
      });
      const ok = resp.ok;
      if (!ok && SESSION.debug) console.warn("[debug] save failed with status", resp.status);
      return ok;
    } catch (err) {
      if (SESSION.debug) console.warn("[debug] save request failed (expected without a server):", err);
      return false;
    }
  }

  // Compress an image file to JPEG (max 1600 px on the long side).
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the file."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("This file does not look like an image."));
        img.onload = () => {
          const maxSide = 1600;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadScreenshot(file) {
    const image = await compressImage(file);
    const resp = await fetch(CFG.UPLOAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: SESSION.session_id, image }),
    });
    if (!resp.ok) throw new Error("Upload failed (status " + resp.status + ").");
    const json = await resp.json();
    return json.pathname;
  }

  // ---------- Form builders (HTML strings for survey-html-form) ----------
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Optional "please specify" text box shown next to an option.
  function specifyBox(name) {
    return `<input type="text" class="specify" name="${name}" maxlength="100" placeholder="Please specify (optional)" aria-label="Please specify">`;
  }

  // options: array of [value, label] or [value, label, { specify: true }]
  function radio(name, question, options, opts = {}) {
    const layout = opts.layout || "vertical";
    const req = opts.required ? "required" : "";
    const items = options
      .map(
        ([v, l, o], i) =>
          `<label class="opt"><input type="radio" name="${name}" value="${esc(v)}" ${i === 0 ? req : ""}><span>${l}</span></label>` +
          (o && o.specify ? specifyBox(`${name}_${v}_text`) : "")
      )
      .join("");
    const note = opts.note ? `<p class="note">${opts.note}</p>` : "";
    return `<fieldset class="q" data-q="${name}" data-type="radio">
      <legend>${question}</legend>${note}
      <div class="opts ${layout}">${items}</div></fieldset>`;
  }

  // Each checkbox has its own name so all choices are saved.
  function checkboxes(prefix, question, options, opts = {}) {
    const items = options
      .map(
        ([v, l, o]) =>
          `<label class="opt"><input type="checkbox" name="${prefix}_${v}" value="1" data-group="${prefix}" ${
            opts.exclusive && opts.exclusive.includes(v) ? 'data-exclusive="1"' : ""
          }><span>${l}</span></label>` + (o && o.specify ? specifyBox(`${prefix}_${v}_text`) : "")
      )
      .join("");
    const note = opts.note ? `<p class="note">${opts.note}</p>` : "<p class=\"note\">Select all that apply.</p>";
    return `<fieldset class="q" data-q="${prefix}" data-type="checkbox">
      <legend>${question}</legend>${note}
      <div class="opts vertical">${items}</div></fieldset>`;
  }

  // Open-ended text box (always optional).
  function textarea(name, question, opts = {}) {
    return `<fieldset class="q optional" data-q="${name}" data-type="text">
      <legend>${question}</legend>
      <textarea name="${name}" rows="${opts.rows || 4}" maxlength="${opts.maxlength || 2000}"></textarea></fieldset>`;
  }

  function number(name, question, opts = {}) {
    const { min = 0, max = 9999, step = 1, unit = "", required = false, placeholder = "" } = opts;
    return `<fieldset class="q" data-q="${name}" data-type="number">
      <legend>${question}</legend>
      <div class="num-row"><input type="number" inputmode="decimal" name="${name}" min="${min}" max="${max}" step="${step}"
        placeholder="${esc(placeholder)}" ${required ? "required" : ""}>
        <span class="unit">${unit}</span></div></fieldset>`;
  }

  // A block of items that share the same stem and response options.
  // items: array of [name, text]; options: array of [value, label]
  function scale(stem, items, options, opts = {}) {
    const layout = opts.layout || "scale";
    const head = stem ? `<p class="stem">${stem}</p>` : "";
    const body = items
      .map(([name, text], idx) => {
        const opt = options
          .map(
            ([v, l]) =>
              `<label class="opt"><input type="radio" name="${name}" value="${esc(v)}"><span>${l}</span></label>`
          )
          .join("");
        return `<fieldset class="q scale-item" data-q="${name}" data-type="radio">
          <legend><span class="num">${idx + 1}.</span> ${text}</legend>
          <div class="opts ${layout}">${opt}</div></fieldset>`;
      })
      .join("");
    return head + body;
  }

  // 0-100 slider. Saved value is "" until the participant moves it.
  function slider(name, question, leftLabel, rightLabel) {
    return `<fieldset class="q" data-q="${name}" data-type="slider">
      <legend>${question}</legend>
      <div class="slider-wrap">
        <input type="range" class="vas untouched" min="0" max="100" step="1" value="50" data-target="${name}">
        <input type="hidden" name="${name}" value="">
        <div class="slider-labels"><span>${leftLabel}</span><span>${rightLabel}</span></div>
      </div></fieldset>`;
  }

  // Scroll to the top of the page (window and jsPsych container).
  function toTop() {
    window.scrollTo(0, 0);
    const d = document.querySelector(".jspsych-display-element");
    if (d) d.scrollTop = 0;
  }

  // ---------- Page behavior: soft validation and widgets ----------
  // Like Qualtrics "request response": if items are unanswered, ask once,
  // then let the participant continue if they choose to.
  let activeSubmitHandler = null;
  let activeDisplay = null;
  function enhanceForm(display_element) {
    // The display element is reused across pages, so remove the previous page's handler.
    if (activeSubmitHandler && activeDisplay) {
      activeDisplay.removeEventListener("submit", activeSubmitHandler, true);
      activeSubmitHandler = null;
    }
    const form = display_element.querySelector("form");
    if (!form) return;
    toTop();

    // Sliders: copy value to the hidden input once touched.
    form.querySelectorAll("input.vas").forEach((r) => {
      const hidden = form.querySelector(`input[type=hidden][name="${r.dataset.target}"]`);
      const mark = () => {
        r.classList.remove("untouched");
        hidden.value = r.value;
      };
      r.addEventListener("input", mark);
      r.addEventListener("change", mark);
      r.addEventListener("pointerdown", mark);
    });

    // "Prefer not to answer" style exclusive checkboxes.
    form.querySelectorAll("input[type=checkbox][data-group]").forEach((cb) => {
      cb.addEventListener("change", () => {
        if (!cb.checked) return;
        const group = form.querySelectorAll(`input[type=checkbox][data-group="${cb.dataset.group}"]`);
        group.forEach((other) => {
          if (other === cb) return;
          if (cb.dataset.exclusive || other.dataset.exclusive) other.checked = false;
        });
      });
    });

    // Typing in a "please specify" box selects its option.
    form.querySelectorAll("input.specify").forEach((box) => {
      box.addEventListener("input", () => {
        const opt = box.previousElementSibling && box.previousElementSibling.querySelector("input");
        if (opt && box.value.trim() !== "" && !opt.checked) {
          opt.checked = true;
          opt.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });

    let warned = false;
    activeDisplay = display_element;
    activeSubmitHandler = (ev) => {
        const missing = [];
        form.querySelectorAll("fieldset.q:not(.optional)").forEach((fs) => {
          const type = fs.dataset.type;
          let answered = true;
          if (type === "radio") answered = !!fs.querySelector("input[type=radio]:checked");
          if (type === "checkbox") answered = !!fs.querySelector("input[type=checkbox]:checked");
          if (type === "number") answered = fs.querySelector("input[type=number]").value !== "";
          if (type === "slider") answered = fs.querySelector("input[type=hidden]").value !== "";
          fs.classList.toggle("missing", !answered);
          if (!answered) missing.push(fs);
        });
        if (missing.length && !warned) {
          ev.preventDefault();
          ev.stopPropagation();
          warned = true;
          let note = form.querySelector(".soft-warning");
          if (!note) {
            note = document.createElement("div");
            note.className = "soft-warning";
            form.insertBefore(note, form.querySelector("#jspsych-survey-html-form-next"));
          }
          note.innerHTML =
            `You did not answer ${missing.length} question${missing.length > 1 ? "s" : ""} (highlighted). ` +
            `Your answers help our research, but you may skip any question. ` +
            `Please answer them or press <b>Continue</b> again to move on.`;
          missing[0].scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };
    display_element.addEventListener("submit", activeSubmitHandler, true);
  }

  window.SDS = {
    CFG,
    SESSION,
    setJsPsych,
    saveData,
    uploadScreenshot,
    esc,
    radio,
    checkboxes,
    textarea,
    number,
    scale,
    slider,
    enhanceForm,
    toTop,
  };
})();
