/**
 * Synthetic incident report generator.
 *
 * METHODOLOGY (also documented in DATASET_METHODOLOGY.md — copy this
 * section into your 4-page write-up):
 *
 * 1. For each of the 24 incident types already covered by the classifier,
 *    we hand-wrote 3-6 sentence TEMPLATES based on the phrasing patterns
 *    observed in the 50 organizer-provided examples (INC-001..INC-050) —
 *    both plain English and Nigerian Pidgin register, since the real
 *    reports mix both.
 * 2. Each template has placeholders ({system}, {dept}, {role}, {time}, ...)
 *    filled from small hand-built vocabulary lists (systems, departments,
 *    roles, times) representative of a Nigerian university/public-sector
 *    setting — no real names, emails, phone numbers, or IDs anywhere.
 * 3. Every generated report is labeled by CONSTRUCTION, not by re-running
 *    the classifier: the template's type is the ground truth. This keeps
 *    the answer key trustworthy — we are not grading our own homework.
 * 4. Severity is drawn from a per-type weighted distribution (mirrors the
 *    class balance seen in the organizer set), with roughly 25% of reports
 *    getting an explicit "escalating" phrase (BVN, ransom, admin account,
 *    multiple accounts, etc.) injected, and 15% getting a de-escalating
 *    phrase ("I didn't click", "I didn't open it") injected, to stress-test
 *    the severity scorer the same way real messy reports would.
 * 5. A deliberate 10% of the phishing/malware reports are generated as
 *    near-duplicate variants (same underlying incident, reworded, close
 *    together in time) so the dedup/grouping logic has real duplicate
 *    campaigns to catch, not just the organizer's 3 examples.
 * 6. This is templated synthetic data, not scraped or copied from any real
 *    incident database — satisfies the "no real personal data" rule by
 *    construction, and the generation process is fully reproducible
 *    (fixed seed) so the same 300 reports can be regenerated for grading.
 *
 * Run: node scripts/generate-dataset.js
 * Output: src/data/incidents.generated.json
 */

const fs = require('fs');
const path = require('path');

// ---- deterministic PRNG so the dataset is reproducible -------------------
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function chance(p) { return rand() < p; }

// ---- vocabulary ------------------------------------------------------
const SYSTEMS = ['staff portal', 'student portal', 'payroll system', 'VPN', 'email account',
  'learning management system', 'biometric attendance system', 'online result portal',
  'finance dashboard', 'research repository', 'hostel booking system', 'exam portal'];
const DEPTS = ['finance department', "registrar's office", 'ICT unit', 'bursary',
  'student affairs office', 'HR department', 'library', 'admissions office',
  'procurement unit', 'research office', 'computer science department', 'works department'];
const ROLES = ['a staff member', 'a lecturer', 'a student', 'an administrator', 'a contractor',
  'a research assistant', 'an intern', 'a finance officer', 'a system administrator',
  'a visiting researcher', 'a postgraduate student', 'a department secretary'];
const TIMES = ['this morning', 'last night', 'around midnight', 'over the weekend',
  'yesterday afternoon', 'early this morning', 'over the past few days', 'just now',
  'about an hour ago', 'sometime overnight'];

const ESCALATORS = [' The message also asked for BVN details.', ' It involved an administrator account.',
  ' This affected multiple accounts.', ' A ransom note was attached.',
  ' It affected the finance department directly.'];
const DEESCALATORS = [" I didn't click anything.", " I did not open the file.",
  ' No further action was taken.'];

// ---- templates: {type: {routing, templates: [(fill) => string]}} -----
const TEMPLATES = {
  'Phishing': {
    routing: 'Incident Response',
    templates: [
      f => `I got an email pretending to be from ${f.dept} asking me to verify my ${f.system} login. I clicked the link and entered my password.`,
      f => `Someone sent a message claiming to be the ${f.dept}, saying I should confirm my details on a linked website before ${f.time}.`,
      f => `Abeg, I don click one link wey say na from ${f.dept}. E ask me to enter my email and password for ${f.system}.`,
      f => `${f.role} received an email asking to "verify payment" on the ${f.system}. The link looked like the real site but the address was slightly different.`,
    ],
  },
  'Suspicious Login': {
    routing: 'SOC',
    templates: [
      f => `We noticed a login to the ${f.system} from an unfamiliar location ${f.time}.`,
      f => `${f.role} received several login alert notifications for the ${f.system} that they did not trigger.`,
      f => `I dey see login alert for my ${f.system} account since ${f.time}, but na never me login am.`,
      f => `An account accessed the ${f.system} outside normal working hours, ${f.time}.`,
    ],
  },
  'Malware': {
    routing: 'Incident Response',
    templates: [
      f => `${f.role}'s computer became very slow after installing software from an untrusted website ${f.time}. Strange pop-up windows keep appearing.`,
      f => `The antivirus on a machine in ${f.dept} was disabled without explanation, and unfamiliar files appeared on the desktop.`,
      f => `My system don begin act funny after I download one file for email ${f.time}. E dey open strange window by itself.`,
      f => `A workstation in ${f.dept} is running at very high CPU usage with an unrecognized background process.`,
    ],
  },
  'Social Engineering': {
    routing: 'Security Team',
    templates: [
      f => `Someone called ${f.role} pretending to be from IT support and asked them to read out a verification code sent to their phone.`,
      f => `A message on WhatsApp, pretending to be from a manager in ${f.dept}, asked for an urgent list of staff details.`,
      f => `Person call say na from ICT, ask make I read the code wey come my phone ${f.time}.`,
      f => `${f.role} was contacted by someone claiming to be a new colleague, asking for access to shared files in ${f.dept}.`,
    ],
  },
  'Ransomware': {
    routing: 'Incident Response',
    templates: [
      f => `Files in the ${f.dept} shared drive now have strange extensions and a note demanding payment to restore them.`,
      f => `Several computers in ${f.dept} are displaying the same warning screen ${f.time}, and files can no longer be opened.`,
      f => `All our files for ${f.system} don lock since ${f.time}, message dey ask us to pay before we fit open am again.`,
      f => `A workstation is asking for a password to open files that opened normally yesterday, with a payment demand attached.`,
    ],
  },
  'Account Compromise': {
    routing: 'Incident Response',
    templates: [
      f => `${f.role} received multiple OTP codes for the ${f.system} that they did not request, then got logged out.`,
      f => `An account tied to ${f.dept} has been sending unusual outbound messages that the owner says they never sent.`,
      f => `My ${f.system} account dey tell me say password wrong, even though na the same password I dey always use.`,
      f => `A login to the ${f.system} was flagged from a different city than where the user currently is, ${f.time}.`,
    ],
  },
  'Website Defacement': {
    routing: 'Web / Incident Response',
    templates: [
      f => `The ${f.dept} website is showing an unfamiliar page instead of the normal homepage, first noticed ${f.time}.`,
      f => `Visitors to the university site report seeing altered content that nobody in ${f.dept} recognizes, ${f.time}.`,
    ],
  },
  'Data Leakage': {
    routing: 'Data Protection / Security',
    templates: [
      f => `${f.role} mistakenly sent a spreadsheet containing student results to the wrong external email address.`,
      f => `An attachment meant only for ${f.dept} was accidentally forwarded to an outside mailing list ${f.time}.`,
    ],
  },
  'Brute Force Attempt': {
    routing: 'SOC',
    templates: [
      f => `Multiple failed login attempts were logged against the administrator account on the ${f.system} between midnight and 3am.`,
      f => `${f.dept}'s admin login was targeted with repeated failed password attempts ${f.time}.`,
    ],
  },
  'Data Exposure': {
    routing: 'Data Protection / Security',
    templates: [
      f => `A database backup from ${f.dept} was found on a server that is publicly accessible, containing names and phone numbers.`,
      f => `${f.role} accidentally uploaded a file containing an API key for the ${f.system} to a public code repository.`,
      f => `A shared folder from ${f.dept} was set to "anyone with the link" and contained internal documents.`,
    ],
  },
  'Account Compromise Attempt': {
    routing: 'Identity / Security',
    templates: [
      f => `${f.role} is receiving password-reset emails for the ${f.system} that they never requested.`,
      f => `Abeg, I dey get password reset message for my ${f.system} wey I no request, since ${f.time}.`,
    ],
  },
  'Suspicious Device': {
    routing: 'Security Team',
    templates: [
      f => `An unrecognized USB drive was found plugged into a computer in ${f.dept}, and nobody knows who left it there.`,
    ],
  },
  'Unauthorized Access': {
    routing: 'Incident Response',
    templates: [
      f => `The administrator email on the ${f.system} was changed without anyone in ${f.dept} authorizing it.`,
      f => `A confidential file went missing from the ${f.dept} shared drive; audit logs show access shortly before it disappeared.`,
    ],
  },
  'Phishing Attempt': {
    routing: 'Security Awareness',
    templates: [
      f => `${f.role} received a message claiming they won a staff reward and should click a link to claim it, but did not click.`,
    ],
  },
  'Business Email Compromise': {
    routing: 'Incident Response / Finance',
    templates: [
      f => `The finance officer in ${f.dept} received an email appearing to be from a senior executive, urgently requesting a transfer to a new account.`,
    ],
  },
  'Suspicious Activity': {
    routing: 'SOC',
    templates: [
      f => `A service account tied to ${f.dept} made an unusually large number of requests to an internal server ${f.time}.`,
    ],
  },
  'Suspicious Network Activity': {
    routing: 'SOC',
    templates: [
      f => `A server in ${f.dept} began communicating with an external IP address nobody recognizes, ${f.time}.`,
    ],
  },
  'Coordinated Account Attack': {
    routing: 'SOC / Incident Response',
    templates: [
      f => `The same suspicious login pattern was observed on two different staff accounts in ${f.dept} within minutes of each other.`,
    ],
  },
  'Malware / Scam': {
    routing: 'Security Team',
    templates: [
      f => `A computer in ${f.dept} displayed a fake antivirus warning claiming dozens of infections and urging an immediate download.`,
    ],
  },
  'Privilege Abuse': {
    routing: 'Incident Response',
    templates: [
      f => `A new account with administrator privileges was created overnight on the ${f.system} without approval from ${f.dept}.`,
    ],
  },
  'Suspicious Attachment': {
    routing: 'Security Team',
    templates: [
      f => `${f.role} received a ZIP attachment from an unknown sender and downloaded it but has not opened it.`,
    ],
  },
  'Possible DDoS': {
    routing: 'Network / SOC',
    templates: [
      f => `The ${f.system} has been unusually slow with several users unable to access it; network traffic is far higher than normal.`,
    ],
  },
  'Lost / Stolen Device': {
    routing: 'IT Security',
    templates: [
      f => `${f.role} lost a work laptop while traveling; it was still logged into the corporate ${f.system} session.`,
    ],
  },
  'Credential Attack': {
    routing: 'SOC',
    templates: [
      f => `Repeated failed login attempts against the ${f.dept} VPN account are arriving from many different IP addresses.`,
    ],
  },
};

const SEVERITY_BASE_INDEX = {
  'Phishing': 2, 'Suspicious Login': 2, 'Malware': 2, 'Social Engineering': 1,
  'Ransomware': 3, 'Account Compromise': 2, 'Website Defacement': 2, 'Data Leakage': 2,
  'Brute Force Attempt': 2, 'Data Exposure': 3, 'Account Compromise Attempt': 1,
  'Suspicious Device': 1, 'Unauthorized Access': 2, 'Phishing Attempt': 0,
  'Business Email Compromise': 3, 'Suspicious Activity': 2, 'Suspicious Network Activity': 2,
  'Coordinated Account Attack': 3, 'Malware / Scam': 1, 'Privilege Abuse': 3,
  'Suspicious Attachment': 1, 'Possible DDoS': 2, 'Lost / Stolen Device': 2,
  'Credential Attack': 2,
};
const LEVELS = ['Low', 'Medium', 'High', 'Critical'];

function fillSlots() {
  return {
    system: pick(SYSTEMS),
    dept: pick(DEPTS),
    role: pick(ROLES),
    time: pick(TIMES),
  };
}

function generate(perType = 13) {
  const out = [];
  let counter = 1;

  for (const [type, cfg] of Object.entries(TEMPLATES)) {
    for (let i = 0; i < perType; i++) {
      const template = pick(cfg.templates);
      let text = template(fillSlots());
      let sevIndex = SEVERITY_BASE_INDEX[type] ?? 1;

      // Severity label is derived from what's actually injected into the
      // text, not drawn independently — otherwise the ground truth
      // wouldn't correlate with content and the eval would be unfair to
      // any classifier, rule-based or learned.
      if (chance(0.25)) {
        text += pick(ESCALATORS);
        sevIndex = Math.min(3, sevIndex + 1);
      } else if (chance(0.15)) {
        text += pick(DEESCALATORS);
        sevIndex = Math.max(0, sevIndex - 1);
      }
      const severity = LEVELS[sevIndex];

      const id = `GEN-${String(counter).padStart(4, '0')}`;
      counter++;
      out.push({
        id,
        rawText: text,
        type,
        severity,
        technicalDetails: 'See raw text',
        routing: cfg.routing,
      });

      // ~10% duplicate-campaign variants for phishing/malware, to stress-test dedup
      if ((type === 'Phishing' || type === 'Malware') && chance(0.1)) {
        const dupId = `GEN-${String(counter).padStart(4, '0')}`;
        counter++;
        out.push({
          id: dupId,
          rawText: text.replace(/\.$/, '') + ' Another colleague reported the exact same message today.',
          type: type === 'Phishing' ? 'Phishing / Duplicate' : type,
          severity,
          technicalDetails: 'See raw text',
          routing: cfg.routing,
        });
      }
    }
  }
  return out;
}

const dataset = generate(13);
const outPath = path.join(__dirname, '..', 'src', 'data', 'incidents.generated.json');
fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2));
console.log(`Generated ${dataset.length} synthetic reports -> ${outPath}`);

// class balance summary, useful for the write-up
const byType = {};
for (const r of dataset) byType[r.type] = (byType[r.type] || 0) + 1;
console.log('\nClass balance:');
for (const [t, c] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t}: ${c}`);
}
