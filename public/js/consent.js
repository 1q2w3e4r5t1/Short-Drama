// ============================================================
// Consent page. Section order follows the Syracuse University
// consent template. Edit the text here if the wording changes.
// ============================================================
(function () {
  const C = window.STUDY_CONFIG;
  const { radio } = window.SDS;

  const consentHTML = `
  <div class="consent">
    <div class="consent-head">
      <p class="org">Syracuse University</p>
      <p><b>Department:</b> ${C.DEPARTMENT}</p>
      <p><b>Protocol Title:</b> ${C.PROTOCOL_TITLE}</p>
      <p><b>Researcher:</b> ${C.RESEARCHER_NAME}, graduate student</p>
      <p><b>Faculty advisor:</b> ${C.INSTRUCTOR}</p>
    </div>

    <h2>Consent to Take Part in a Research Study</h2>
    <p>My name is ${C.RESEARCHER_NAME}, and I am a graduate student at Syracuse University. I am inviting you to take part in a research study. This study is a class project for Soc 606.</p>
    <p>The purpose of this form is to provide you with information about participation in a research study and offer you the opportunity to decide whether you wish to participate. You can take as much time as you wish to decide and can ask any questions you may have now, during or after the research is complete. Your participation is voluntary.</p>

    <h3>What will I be asked to do?</h3>
    <p>The study takes place online and takes about ${C.ESTIMATED_MINUTES} minutes. You will be asked to:</p>
    <ol>
      <li>Answer some background questions, such as your age and education.</li>
      <li>Watch a video clip of about 3 minutes and rate your mood before and after. The computer will choose the clip at random.</li>
      <li>Answer questions about your media use, your feelings, stressful events, and your mental health.</li>
      <li>If you wish, share your phone's screen-time record by uploading a screenshot or by typing in the numbers. This part is optional.</li>
    </ol>

    <h3>What are the risks?</h3>
    <p>Some questions ask about sad or worried feelings, loneliness, and stressful events. These questions may make you feel uncomfortable. The video clip may include dramatic scenes, such as arguments or romance. You may skip any question, and you may stop at any time. There is also a small risk that someone could link your answers to you. We take the steps described below to lower this risk.</p>
    <p>If you feel upset or need support, these free services are available 24 hours a day:</p>
    <ul>
      <li>988 Suicide and Crisis Lifeline: call or text <b>988</b>, or chat at 988lifeline.org</li>
      <li>Crisis Text Line: text <b>HOME</b> to <b>741741</b></li>
      <li>SAMHSA National Helpline (free, confidential referrals): <b>1-800-662-4357</b></li>
      <li>Syracuse University students: Barnes Center at The Arch counseling, <b>315-443-8000</b> (24/7)</li>
    </ul>

    <h3>Confidentiality</h3>
    <p>Your answers will be stored with a random code, not with your name. Data are sent over an encrypted connection and kept in a password-protected cloud storage account that only the researcher can access. </p>

    <h3>Screenshots</h3>
    <p>Near the end of the study, you may choose to upload a screenshot of your phone's screen-time page. The screenshot shows how much time you spent in each app. It is optional, and you may type in the numbers instead or skip this part. Screenshots will be stored in the same protected way as your other answers.</p>
    ${radio(
      "consent_screenshot",
      "Do you agree that we may ask you to upload a screen-time screenshot later? (You can still decide later.)",
      [
        ["yes", "Yes, you may ask me to upload a screenshot."],
        ["no", "No, please do not ask me to upload a screenshot."],
      ]
    )}

    <h3>Your rights</h3>
    <p>Your participation is voluntary. You may skip or refuse to answer any question for any reason. You are free to withdraw from this research study at any time without penalty. Answers are saved at several points during the study. If you want your answers removed, email the researcher with the participant code shown on the last page, or with the date and time you took part.</p>

    <h3>Contact information</h3>
    <p>If you have any questions, concerns, or complaints about the research, contact ${C.RESEARCHER_NAME} at ${C.RESEARCHER_EMAIL}, or the faculty advisor, ${C.INSTRUCTOR}. </p>

    <h3>Statement of consent</h3>
    <p>All of my questions have been answered, I am 18 years of age or older, and by clicking "I agree" below, I agree to participate in this research study. You may print or save a copy of this page for your records.</p>
    <p><button type="button" class="link-btn" onclick="window.print()">Print or save a copy of this page</button></p>

    ${radio(
      "consent",
      "Do you agree to take part in this study?",
      [
        ["agree", "I agree to take part."],
        ["decline", "I do not agree to take part."],
      ],
      { required: true }
    )}
  </div>`;

  window.CONSENT_HTML = consentHTML;
})();
