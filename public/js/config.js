// ============================================================
// Study settings. Edit this file to change stimuli and links.
// ============================================================
window.STUDY_CONFIG = {
  STUDY_NAME: "Soc 606 Chenhao",
  ESTIMATED_MINUTES: 20,

  // Researcher information shown on the consent page and the final page.
  RESEARCHER_NAME: "Chenhao Zhang",
  RESEARCHER_EMAIL: "czhan148@syr.edu",
  DEPARTMENT: "Human Development and Family Science",
  INSTRUCTOR: "Professor Janet Wilmoth, Soc 606, Syracuse University",
  PROTOCOL_TITLE: "Short Drama Viewing and Mental Health Among U.S. Adults",

  // Optional: Prolific completion link. Leave "" if not using Prolific.
  COMPLETION_URL: "",

  // Data endpoints (Vercel serverless functions in /api).
  SAVE_ENDPOINT: "/api/save",
  UPLOAD_ENDPOINT: "/api/upload",

  // ----------------------------------------------------------
  // Viewing experiment videos (about 3 minutes per condition).
  // Each condition is a list of segments played in order.
  //   YouTube segment: { type: "youtube", id: "VIDEO_ID", start: 0, end: 180 }
  //     (id is the part after "v=" or after "/shorts/" in the link;
  //      start/end are in seconds)
  //   Vertical clip (YouTube Shorts, phone videos): add aspect: "9:16"
  //     { type: "youtube", id: "VIDEO_ID", aspect: "9:16" }
  //   Local file:      { type: "file", src: "stimuli/videos/drama.mp4" }
  // If a list is empty, a 20-second placeholder is shown instead.
  // ----------------------------------------------------------
  VIDEOS: {
    drama: [
      { type: "youtube", id: "Ie1j2_svksk", start: 0, end: 198 },
    ],
    shortvideo: [
      { type: "youtube", id: "RSJF-LpjweY", start: 0, end: 198 },
    ],
  },

  // Optional example screenshots shown with the short drama definition.
  EXAMPLE_IMAGES: [
    // "stimuli/examples/example_drama.jpg"
  ],
};
