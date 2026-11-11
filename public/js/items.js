// ============================================================
// Question wording and response options for every survey page.
// Variable names (the first value in each pair) become column names
// in the data file.
// ============================================================
(function () {
  const { radio, checkboxes, number, scale, slider, textarea } = window.SDS;
  const C = window.STUDY_CONFIG;

  const PNA = ["pna", "Prefer not to answer"];

  // ---------- Shared response options ----------
  const FREQ_2WK = [
    ["0", "Not at all"],
    ["1", "Several days"],
    ["2", "More than half the days"],
    ["3", "Nearly every day"],
  ];
  const AGREE5 = [
    ["1", "Strongly disagree"],
    ["2", "Disagree"],
    ["3", "Neither agree nor disagree"],
    ["4", "Agree"],
    ["5", "Strongly agree"],
  ];
  const BSMAS5 = [
    ["1", "Very rarely"],
    ["2", "Rarely"],
    ["3", "Sometimes"],
    ["4", "Often"],
    ["5", "Very often"],
  ];
  const UCLA3 = [
    ["1", "Hardly ever"],
    ["2", "Some of the time"],
    ["3", "Often"],
  ];
  const YES_NO_PNA = [
    ["1", "Yes"],
    ["0", "No"],
    PNA,
  ];

  const ITEMS = {};

  // ============ Part 1: Screening and background ============
  ITEMS.screening = () =>
    number("age", "What is your age in years?", {
      min: 0,
      max: 120,
      unit: "years",
      required: true,
      placeholder: "e.g., 34",
    }) +
    radio(
      "us_resident",
      "Do you currently live in the United States?",
      [
        ["1", "Yes"],
        ["0", "No"],
      ],
      { required: true }
    );

  ITEMS.aboutYou = () =>
    radio("gender", "What is your gender?", [
      ["woman", "Woman"],
      ["man", "Man"],
      ["nonbinary", "Non-binary"],
      ["other", "I use a different term:", { specify: true }],
      PNA,
    ]) +
    checkboxes(
      "race",
      "What is your race or ethnicity?",
      [
        ["aian", "American Indian or Alaska Native"],
        ["asian", "Asian"],
        ["black", "Black or African American"],
        ["hispanic", "Hispanic or Latino"],
        ["mena", "Middle Eastern or North African"],
        ["nhpi", "Native Hawaiian or Pacific Islander"],
        ["white", "White"],
        ["other", "Another race or ethnicity:", { specify: true }],
        PNA,
      ],
      { exclusive: ["pna"] }
    ) +
    radio("sexual_orientation", "Which of the following best describes how you think of yourself?", [
      ["straight", "Straight or heterosexual"],
      ["gay_lesbian", "Gay or lesbian"],
      ["bisexual", "Bisexual"],
      ["other", "I use a different term:", { specify: true }],
      ["unsure", "I am not sure"],
      PNA,
    ]);

  ITEMS.household = () =>
    radio("education", "What is the highest level of school you have completed?", [
      ["1", "Less than high school"],
      ["2", "High school diploma or GED"],
      ["3", "Some college, no degree"],
      ["4", "Associate degree (for example, AA or AS)"],
      ["5", "Bachelor's degree (for example, BA or BS)"],
      ["6", "Master's degree"],
      ["7", "Professional or doctoral degree (for example, MD, JD, or PhD)"],
      PNA,
    ]) +
    radio(
      "income",
      "In the past 12 months, what was your total household income before taxes? Include income from all people in your household.",
      [
        ["1", "Less than $25,000"],
        ["2", "$25,000 to $49,999"],
        ["3", "$50,000 to $74,999"],
        ["4", "$75,000 to $99,999"],
        ["5", "$100,000 to $149,999"],
        ["6", "$150,000 or more"],
        ["dk", "I don't know"],
        PNA,
      ]
    ) +
    checkboxes(
      "live_with",
      "Who do you currently live with?",
      [
        ["alone", "I live alone"],
        ["partner", "Spouse or partner"],
        ["children", "My children"],
        ["parents", "Parents or other relatives"],
        ["roommates", "Roommates or friends"],
        ["other", "Someone else:", { specify: true }],
        PNA,
      ],
      { exclusive: ["alone", "pna"] }
    );

  ITEMS.mhHistory = () =>
    radio(
      "mh_dx_ever",
      "Has a doctor, therapist, or other health professional ever told you that you have depression, an anxiety disorder, or another mental health condition?",
      [
        ["1", "Yes"],
        ["0", "No"],
        ["ns", "I am not sure"],
        PNA,
      ]
    ) +
    radio(
      "mh_tx_current",
      "Are you currently getting treatment for your mental health, such as counseling, therapy, or medication?",
      [["1", "Yes"], ["0", "No"], PNA]
    );

  // ============ Part 3: Viewing experiment mood ratings ============
  ITEMS.mood = (prefix) =>
    `<p class="stem">Please move each slider to show how you feel <b>right now</b>. There are no right or wrong answers.</p>` +
    slider(`${prefix}_stressed`, "How <b>stressed</b> do you feel right now?", "Not at all", "Extremely") +
    slider(`${prefix}_sad`, "How <b>sad or down</b> do you feel right now?", "Not at all", "Extremely") +
    slider(`${prefix}_lonely`, "How <b>lonely</b> do you feel right now?", "Not at all", "Extremely") +
    slider(`${prefix}_relaxed`, "How <b>relaxed</b> do you feel right now?", "Not at all", "Extremely");

  ITEMS.manipCheck = () =>
    radio("mc_content", "Which best describes the video you just watched?", [
      ["story", "A story with characters and a plot"],
      ["clips", "Short clips without a continuing story (for example, cooking, travel, or how-to)"],
      ["none", "I could not watch the video"],
    ]) +
    radio("mc_seen_before", "Had you seen this video before today?", [
      ["1", "Yes"],
      ["0", "No"],
      ["ns", "I am not sure"],
    ]) +
    radio("mc_enjoy", "How much did you enjoy the video?", [
      ["1", "Not at all"],
      ["2", "A little"],
      ["3", "Somewhat"],
      ["4", "Quite a bit"],
      ["5", "Very much"],
    ], { layout: "scale" });

  // ============ Part 4: Short drama use ============
  ITEMS.dramaDefinition = () => {
    const imgs = (C.EXAMPLE_IMAGES || [])
      .map((src) => `<img class="example-img" src="${src}" alt="Example of a short drama screen">`)
      .join("");
    return `<div class="definition">
      <p><b>Short dramas</b> (also called micro-dramas or vertical dramas) are scripted series with very short episodes, usually 1 to 3 minutes long. They are filmed for phone screens held upright. People watch them in apps such as ReelShort, DramaBox, or ShortMax, or on TikTok, YouTube, and Facebook.</p>
      <p>Short dramas are <b>not</b> the same as regular short videos, such as cooking, comedy, or dance clips.</p>
      ${imgs ? `<div class="example-row">${imgs}</div>` : ""}
    </div>`;
  };

  ITEMS.dramaDays = () =>
    ITEMS.dramaDefinition() +
    number("sd_days30", "In the <b>past 30 days</b>, on how many days did you watch short dramas?", {
      min: 0,
      max: 30,
      unit: "days (0 to 30)",
      placeholder: "0 to 30",
    });

  ITEMS.dramaAmount = () =>
    number(
      "sd_min_day",
      "On a day when you watch short dramas, about how many <b>minutes</b> do you usually spend watching them?",
      { min: 0, max: 1440, unit: "minutes", placeholder: "e.g., 45" }
    ) +
    checkboxes("sd_platform", "Where do you watch short dramas?", [
      ["reelshort", "ReelShort"],
      ["dramabox", "DramaBox"],
      ["shortmax", "ShortMax"],
      ["tiktok", "TikTok"],
      ["youtube", "YouTube"],
      ["facebook", "Facebook"],
      ["other", "Another app or website:", { specify: true }],
    ]);

  // Adapted from the Bergen Social Media Addiction Scale (Andreassen et al., 2016).
  ITEMS.bsmas = () =>
    scale(
      "In the <b>past 12 months</b>, how often have you...",
      [
        ["bsmas_1", "Spent a lot of time thinking about short dramas or planning to watch them?"],
        ["bsmas_2", "Felt an urge to watch short dramas more and more?"],
        ["bsmas_3", "Watched short dramas in order to forget about personal problems?"],
        ["bsmas_4", "Tried to cut down on watching short dramas without success?"],
        ["bsmas_5", "Become restless or troubled when you could not watch short dramas?"],
        ["bsmas_6", "Watched short dramas so much that it hurt your job, studies, or other duties?"],
      ],
      BSMAS5
    );

  ITEMS.motives = () =>
    scale(
      "How much do you agree with each statement? <b>I watch short dramas...</b>",
      [
        ["esc_1", "to forget about my problems."],
        ["esc_2", "to escape from everyday life for a while."],
        ["esc_3", "to stop thinking about things that worry me."],
        ["ec_1", "to feel better when I am sad or stressed."],
        ["ec_2", "to get feelings that are missing in my own life, such as romance or excitement."],
        ["ec_3", "to feel less lonely."],
      ],
      AGREE5
    );

  // ============ Part 5: Social life, media use ============
  ITEMS.social = () =>
    scale(
      "How much do you agree with each statement?",
      [
        ["conn_1", "I feel close to other people."],
        ["conn_2", "I have people I can talk to when I have a problem."],
        ["conn_3", "I feel disconnected from the people around me."],
        ["bel_1", "I feel that I belong to a group or community."],
        ["bel_2", "I feel accepted by the people around me."],
        ["bel_3", "I often feel like an outsider."],
      ],
      AGREE5
    );

  ITEMS.media = () =>
    `<p class="stem">Think about a <b>typical day in the past 7 days</b>.</p>` +
    number(
      "sfv_min_day",
      "About how many minutes per day did you spend watching <b>short videos</b> on TikTok, Instagram Reels, YouTube Shorts, or similar apps? Do <b>not</b> count short dramas.",
      { min: 0, max: 1440, unit: "minutes per day", placeholder: "e.g., 60" }
    ) +
    number(
      "sm_min_day",
      "About how many minutes per day did you spend on <b>social media for other things</b>, such as reading posts or sending messages? Do not count time spent watching videos.",
      { min: 0, max: 1440, unit: "minutes per day", placeholder: "e.g., 30" }
    ) +
    number(
      "screen_hr_day",
      "About how many <b>hours</b> per day did you spend on screens for fun or relaxing (phone, computer, TV, or tablet)? Do not count work or school.",
      { min: 0, max: 24, step: 0.5, unit: "hours per day", placeholder: "e.g., 3.5" }
    ) +
    radio("binge", "In the past 30 days, how often did you watch many episodes of a show or drama in one sitting?", [
      ["0", "Never"],
      ["1", "Less than once a week"],
      ["2", "About once a week"],
      ["3", "Several times a week"],
      ["4", "Every day or almost every day"],
    ]) +
    radio("attn_1", "To show that you are reading carefully, please select <b>Rarely</b> for this question.", [
      ["1", "Never"],
      ["2", "Rarely"],
      ["3", "Sometimes"],
      ["4", "Often"],
    ]);

  // ============ Part 6: Mental health ============
  ITEMS.phq9 = () =>
    scale(
      "Over the <b>last 2 weeks</b>, how often have you been bothered by any of the following problems?",
      [
        ["phq_1", "Little interest or pleasure in doing things"],
        ["phq_2", "Feeling down, depressed, or hopeless"],
        ["phq_3", "Trouble falling or staying asleep, or sleeping too much"],
        ["phq_4", "Feeling tired or having little energy"],
        ["phq_5", "Poor appetite or overeating"],
        ["phq_6", "Feeling bad about yourself, or that you are a failure or have let yourself or your family down"],
        ["phq_7", "Trouble concentrating on things, such as reading the newspaper or watching television"],
        [
          "phq_8",
          "Moving or speaking so slowly that other people could have noticed? Or the opposite: being so fidgety or restless that you have been moving around a lot more than usual",
        ],
        ["phq_9", "Thoughts that you would be better off dead or of hurting yourself in some way"],
      ],
      FREQ_2WK
    );

    ITEMS.gad7 = () =>
    scale(
      "Over the <b>last 2 weeks</b>, how often have you been bothered by the following problems?",
      [
        ["gad_1", "Feeling nervous, anxious, or on edge"],
        ["gad_2", "Not being able to stop or control worrying"],
        ["gad_3", "Worrying too much about different things"],
        ["gad_4", "Trouble relaxing"],
        ["gad_5", "Being so restless that it is hard to sit still"],
        ["gad_6", "Becoming easily annoyed or irritable"],
        ["gad_7", "Feeling afraid as if something awful might happen"],
      ],
      FREQ_2WK
    );

  ITEMS.ucla3 = () =>
    scale(
      "The next questions are about how you feel about different parts of your life. <b>How often do you...</b>",
      [
        ["ucla_1", "feel that you lack companionship?"],
        ["ucla_2", "feel left out?"],
        ["ucla_3", "feel isolated from others?"],
      ],
      UCLA3
    );

  ITEMS.functioning = () =>
    radio(
      "func_impair",
      "You said you had some of these problems in the last 2 weeks. How <b>difficult</b> have these problems made it for you to do your work, take care of things at home, or get along with other people?",
      [
        ["0", "Not difficult at all"],
        ["1", "Somewhat difficult"],
        ["2", "Very difficult"],
        ["3", "Extremely difficult"],
      ]
    );

  // ============ Part 7: Stress and boredom ============
  ITEMS.stressors = () =>
    scale(
      "In the <b>past 12 months</b>, did any of the following happen to you?",
      [
        ["ls_job", "I lost a job, or my income dropped a lot."],
        ["ls_money", "I had serious money problems, such as trouble paying bills."],
        ["ls_illness", "I had a serious illness or injury."],
        ["ls_loss", "Someone close to me became seriously ill or died."],
        ["ls_breakup", "I went through a breakup, separation, or divorce."],
        ["ls_move", "I moved to a new home or a new city."],
        ["ls_conflict", "I had serious problems with a family member, partner, or friend."],
        ["ls_pressure", "I had very heavy pressure at work or school."],
      ],
      YES_NO_PNA
    );

    ITEMS.boredom = () =>
    scale(
      "How much do you agree with each statement about your <b>daily life in the past month</b>?",
      [
        ["bore_1", "I often feel bored."],
        ["bore_2", "I often have nothing interesting to do in my free time."],
        ["empty_1", "My life often feels empty."],
        ["empty_2", "I often feel empty inside."],
        ["attn_2", "To show that you are paying attention, please select <b>Disagree</b>."],
      ],
      AGREE5
    );

  // ============ Part 8: Screen time record (optional) ============
  ITEMS.screenChoice = (allowUpload) =>
    `<p>Your phone keeps a record of how much time you spend in each app. This record is often more accurate than memory. Sharing it is <b>optional</b>.</p>` +
    radio("st_choice", "How would you like to answer?", [
      ...(allowUpload ? [["upload", "Upload a screenshot of my screen-time page"]] : []),
      ["type", "Type in the numbers myself"],
      ["skip", "Skip this part"],
    ]);

  ITEMS.screenUpload = (device) => {
    const ios = `<li><b>iPhone:</b> open <b>Settings</b>, tap <b>Screen Time</b>, then <b>See All App &amp; Website Activity</b>. Tap <b>Week</b> at the top and scroll down to the list of apps.</li>`;
    const android = `<li><b>Android:</b> open <b>Settings</b>, tap <b>Digital Wellbeing &amp; parental controls</b>, then tap the chart to see the list of apps.</li>`;
    const steps = /iPhone|iPad|iPod/i.test(device) ? ios : /Android/i.test(device) ? android : ios + android;
    return `<div class="upload-box">
      <p><b>How to find your screen time:</b></p>
      <ul>${steps}</ul>
      <p>Take a screenshot that shows the <b>daily average</b> and the <b>list of apps</b>. Please make sure it does not show your name, messages, or notifications. You can upload up to 3 screenshots.</p>
      <label class="file-label">
        <input type="file" id="st_file" accept="image/*" multiple>
        <span class="jspsych-btn">Choose screenshot(s)</span>
      </label>
      <p class="upload-status" id="st_status" aria-live="polite">No file chosen yet.</p>
      <input type="hidden" name="st_screenshot_paths" id="st_paths" value="">
      <input type="hidden" name="st_upload_errors" id="st_errors" value="">
      <p class="note">If the upload does not work, press <b>Continue</b>. You will be able to type in the numbers instead.</p>
    </div>`;
  };

  ITEMS.screenType = () =>
    `<p>If you can, please open your phone's screen-time page and copy the numbers. If not, your best guess is fine.</p>` +
    radio("st_device", "What kind of phone do you use most?", [
      ["iphone", "iPhone"],
      ["android", "Android phone"],
      ["other", "Another kind of phone"],
      ["none", "I do not have a smartphone"],
    ]) +
    number("st_total_min", "In the <b>past 7 days</b>, what was your <b>daily average</b> screen time on your phone? Please enter it in minutes (for example, 3 hours 20 minutes = 200).", {
      min: 0,
      max: 1440,
      unit: "minutes per day",
      placeholder: "e.g., 200",
    }) +
    number(
      "st_drama_min",
      "In the <b>past 7 days</b>, about how many minutes per day did you spend in <b>short drama apps</b> (such as ReelShort, DramaBox, or ShortMax)? Enter 0 if none.",
      { min: 0, max: 1440, unit: "minutes per day", placeholder: "e.g., 30" }
    ) +
    radio("st_source", "Where did these numbers come from?", [
      ["record", "I looked at my phone's screen-time record"],
      ["guess", "They are my best guess"],
    ]);

  // ============ Final comments ============
  ITEMS.comments = () =>
    textarea(
      "comments",
      "Is there anything else you would like to tell us about short dramas, this study, or your experience today? (optional)"
    );

  window.ITEMS = ITEMS;
})();
