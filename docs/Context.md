# Nigehban Campus — Project Context

> FYP, FAST-NUCES. Team: Reshail Faiq (23P-0510), Arisha Zubair (23P-0536), Zara Khan (23P-0653). Supervisor: Mr. Shahzeb Khan.
>
> Nigehban means "guardian" in Urdu. This file is the single source of truth for what the project is, why it exists and when it counts as finished. Read it before making product or design decisions.

---

## 1. What We Are Building

Nigehban Campus is a video-analytics system that watches campus camera footage and raises alerts when something suspicious happens to personal belongings. It does two things:

1. **Abandoned-bag detection.** If a bag is left alone and its owner has moved away for longer than a set time, the system flags it.
2. **Theft detection.** If someone other than the bag's owner picks it up and walks away, the system flags a possible theft.

Staff see these alerts, with a snapshot and short event record, in a web dashboard (with a mobile view).

**Pipeline**

`Video input → YOLO detection → ByteTrack tracking → geometry → owner–bag association → separation timer → alert`

- **Detection.** A YOLO26n model that we train ourselves on our own dataset. It detects only three classes: **person, handbag, backpack**. Suitcase, cell phone, laptop and book were dropped on purpose to keep the problem focused.
- **Tracking.** ByteTrack keeps a stable ID on each person and bag across frames.
- **Association.** Each bag is linked to its likely owner using spatial geometry (proximity and movement).
- **Abandoned alert.** A separation timer starts when the owner leaves the bag. If it passes the threshold, the system raises an abandoned-bag alert.
- **Theft check.** A CLIP-based "owner fingerprint" is compared against whoever picks the bag up. A mismatch raises a possible-theft alert.
- **Outputs.** Annotated video, `events.csv`, FPS stats, alert snapshots and a PostgreSQL database (see [Decisions.md](Decisions.md) D-10). Behaviour is controlled through `config.json`.

---

## 2. Why This App Exists

- Campuses are busy, open places where students put bags down in libraries, cafeterias, corridors and lecture halls. Opportunistic theft and unattended bags are common.
- Security staff can't watch every camera continuously. Existing CCTV is mostly used **after** an incident, to review footage, rather than to catch it as it happens.
- An unattended bag is also a safety concern in its own right: staff need a quick way to tell a forgotten bag from a threat.
- Nigehban Campus turns passive cameras into an active early-warning layer. A person is told about the event while it is happening, with evidence attached.
- **Academic purpose.** The project is also our final year project. Its novelty is a **custom, self-recorded theft dataset** and a YOLO model trained on it, rather than relying on generic public datasets that do not match campus scenes.

---

## 3. Who It Is For

| Audience                                        | Role                                   | What they need                                                       |
| ----------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| **Campus security staff / operators** (primary) | Watch the dashboard, respond to alerts | Clear, timely alerts with a snapshot, so they can decide fast        |
| **Campus administration**                       | Oversight of incidents                 | Event history, counts, a record they can review                      |
| **Students** (indirect)                         | Beneficiaries                          | Their belongings are safer; no app or action required from them      |
| **Supervisor and jury**                         | Evaluate the FYP                       | A working pipeline, a sound dataset and model, and a convincing demo |

Students do not log in or interact with the system. They only benefit from it.

---

## 4. Expected User Experience

**For a security operator**

1. Log in to the dashboard (web, with a mobile-friendly view).
2. See live status and a feed of recent events.
3. When an alert fires, it appears with:
   - the alert type (**Abandoned bag** or **Possible theft**),
   - a snapshot image,
   - a timestamp and camera or location,
   - how long the bag has been unattended (for abandoned-bag alerts).
4. Open the event for detail, then decide whether to dispatch someone or dismiss it.
5. Look back through the history of past events.

**Principles**

- Alerts are few, clear and actionable. A flood of false alarms is worse than no system.
- One glance should tell the operator what happened, where and when.
- No training required: if someone needs a manual to read an alert, the design failed.
- Wording says "possible theft", not "theft". The system flags, a human decides.

---

## 5. Product Expectations

**Functional**

- Accept recorded video as input (live camera streams come later).
- Detect person, handbag and backpack reliably in campus conditions.
- Track objects consistently across frames, including brief occlusions.
- Associate bags with owners and handle people walking past or standing near a bag.
- Raise abandoned-bag alerts after a configurable timer.
- Raise possible-theft alerts using the owner-fingerprint check.
- Save a snapshot and a logged event for every alert.
- Provide a dashboard with login and event history.

**Quality**

- **Accuracy.** High enough detection and tracking that alerts can be trusted. We report precision and recall rather than just a headline number.
- **Speed.** Fast enough to be practical. FPS is measured and reported (the nano YOLO variant was chosen partly for this).
- **Configurable.** Thresholds, timers and classes live in `config.json`, not hard-coded.
- **Reproducible.** Someone else can run the pipeline on a video and get the same outputs.
- **Honest.** Known limits (lighting, crowding, camera angle) are documented rather than hidden.

**Data**

- Custom dataset of about **500 clips** (target for FYP-2; **~150 clips for FYP-1**) of staged theft and abandoned-bag scenarios, recorded in the office on an iPhone 13 Pro Max at 1080p, 30 fps.
- Clips cover varied scenarios, people, bags and positions so the model does not overfit to one setup.
- Dataset creation and the model-training decisions (YOLO vs ResNet/AlexNet, augmentation, data quantity and quality) are justified in the progress report.

---

## 6. What This App Is Not

- **Not a face-recognition or identity system.** It does not name or identify people. The owner fingerprint is only used to tell "same person or different person" within one event.
- **Not a general object detector.** It handles three classes only. Suitcases, phones, laptops and books are out of scope.
- **Not an automatic punishment tool.** It never accuses anyone. It raises a flag for a human to review.
- **Not a replacement for security staff.** It supports them.
- **Not a violence, fight or weapon detector**, and not a crowd-analytics tool.
- **Not a consumer or student-facing app.** Students do not use it.
- **Not a long-term video archive.** It stores alert snapshots and event records, not every frame.

---

## 7. What "Done" Looks Like

### FYP-1 (current phase)

> Scope was revised (see [Decisions.md](Decisions.md), D-01 to D-06): model training is deferred, the dataset target for FYP-1 is ~150 clips, and CV/ML services behind the event contract are partly mocked.

- [ ] Custom dataset of **~150 clips** recorded and organised, with a recording protocol and scenario coverage table (full ~500 continues in FYP-2).
- [ ] Baseline pipeline runs on recorded clips using **pretrained** YOLO26n (COCO: person, handbag, backpack) → ByteTrack, with annotated video and FPS. Geometry and association in simple form if time allows.
- [ ] `config.json` drives behaviour; outputs include annotated video, `events.csv` and FPS.
- [ ] Event contract defined; CV side sits behind one interface with a mock source and a real source.
- [ ] Backend and database built for real (events, alerts, snapshots, users, login).
- [ ] Dashboard (web, mobile view) built for real, fed by the event contract. Mocked alerts are labelled "Demo data".
- [ ] Model selection and dataset-sourcing decisions explained and defended to the supervisor.
- [ ] Progress report and poster completed.
- [ ] Final FYP-1 presentation delivered to the jury (date to be confirmed).

### FYP-2 (designed now, built later)

- [ ] YOLO26n fine-tuned on the custom dataset; baseline vs fine-tuned compared.
- [ ] Mock CV modules replaced by real ones (separation timer, CLIP owner fingerprint, theft check).
- [ ] Remaining dataset clips recorded (target ~500).
- [ ] Separation timer produces abandoned-bag alerts.
- [ ] CLIP owner-fingerprint check produces possible-theft alerts.
- [ ] Alerts come with a snapshot, stored in the PostgreSQL database.
- [ ] Dashboard with login shows live alerts and event history.
- [ ] Measured results (precision, recall, false-alarm rate, FPS) reported on held-out test clips.

### The project is "done" when

A security operator can open the dashboard, and when someone leaves a bag or takes one that isn't theirs in a recorded campus scene, a clear, correct alert with a snapshot appears. It does so with few enough false alarms that it is useful, and we can show the numbers that prove it.
