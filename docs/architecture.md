The design below turns your **“record → process-mine → graph → Playwright → self-heal”** idea into a modular, week-long build that judges from Dex/Joindex, AfterQuery and AGI House will immediately recognize as production-grade.

---

## High-Level Architecture

The system is split into five loosely-coupled services that communicate over the browser-extension messaging bus and local HTTP/WebSocket ports:

1. **Recorder (content-script)** – injects into every tab, captures DOM events, screenshots & voice, and streams them as XES rows. Chrome content scripts can read/modify the DOM and pass messages upstream.
2. **Background SW (service-worker)** – a Manifest V3 service-worker handles session lifecycle, persists logs to IndexedDB (now compressed & fast from Chrome 129+), batches them, and triggers downstream jobs.
3. **Process-Mining Engine** – PM4Py (running in Pyodide or a local Python micro-service) turns event logs into BPMN/Petri-nets via the Inductive Miner. Pyodide keeps everything client-side for privacy.
4. **Graph Editor UI (React)** – renders the mined BPMN with Camunda Modeler Web or Cytoscape.js for lightweight editing.
5. **Automation & Eval Service** – walks the BPMN, emits Playwright tests using code-gen heuristics, records traces for debugging, and runs a Promptbreeder-style loop to mutate failing selectors/prompts and keep the fittest script.

> **Why judges will care:**
>
> * **Dex/Joindex** focuses on “AI copilots for the browser”—your recorder + BPMN export shows exactly that.
> * **AfterQuery** loves rigorous data/evals—Promptbreeder metrics + conformance scores are a natural fit.
> * **AGI House** prizes tangible infra hacks—the end-to-end graph-to-code pipeline aligns with their recent hackathon themes([Business Insider](https://www.businessinsider.com/the-top-hacker-houses-in-san-francisco-for-2025-2025-4?utm_source=chatgpt.com)).

---

## Suggested Monorepo Layout

```text
root/
├─ apps/
│  ├─ extension/               # MV3 Chrome extension
│  │  ├─ manifest.json
│  │  ├─ content/
│  │  │   └─ recorder.ts
│  │  ├─ sw/
│  │  │   └─ background.ts
│  │  └─ ui/                   # popup/options pages (React + Tailwind)
│  ├─ py-service/              # Local FastAPI wrapper for PM4Py (dev)
│  └─ docs/                    # Hackathon README, demos, pitch deck
├─ packages/
│  ├─ xes-schema/              # Shared TS types for XES rows
│  ├─ bpmnlite/                # BPMN helpers, Camunda wrapper
│  ├─ playwright-gen/          # BPMN ➜ Playwright transformer
│  └─ promptbreeder-js/        # Self-eval loop adapters
├─ tests/                      # Cypress or Playwright unit tests
├─ .github/                    # CI pulling headless Chrome, running tests
└─ turbo.json / pnpm-workspaces.yaml
```

### What each part does

| Path                    | Responsibility                                                                                                  | Key Tech                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `content/recorder.ts` | Hook `click`,`input`,`hashchange`, etc.; produce `{caseId, activity, ts, attrs}`.                       | DOM APIs, Whisper CPP wasm, Chrome runtime sendMessage |
| `sw/background.ts`    | Receives events, stores to IndexedDB, throttles batch flush, posts to mining engine.                            | Service-worker events                                  |
| `xes-schema/`         | Canonical TS interfaces mirroring IEEE XES spec.                                                                | Zod validation                                         |
| `py-service/`         | `discover_model(log)->bpmn_xml`via PM4Py Inductive Miner; optional GPU variant (PM4Py-GPU) for large logs.    | FastAPI + Uvicorn                                      |
| `pyodide-loader.ts`   | Fallback: runs the same PM4Py pipeline in-browser with Pyodide when no server allowed.                          | Pyodide WASM                                           |
| `bpmnlite/`           | Helpers to attach frequency, performance metrics; generate Camunda JSON; serialize XML.                         | Camunda Modeler Web SDK                                |
| `playwright-gen/`     | Map BPMN `task`➜`page.<action>()`,`gateway`➜`if`, stitch into `.spec.ts`; embed `--trace on`flag. | Playwright v1.45 API                                   |
| `promptbreeder-js/`   | Port of Promptbreeder: mutate selector prompts, fitness = script passes & shorter locator.                      | OpenAI API, Playwright                                 |
| `ui/`                 | React popup with tabs:*Record* , *Graph* , *Ghost-Preview* , *Eval Dashboard* .                         | React 18, TanStack Query, shadcn/ui                    |

---

## Data & State Flow

```text
Tab/Page
  │  DOM events, screenshots, voice
  ▼
content-script (Recorder)
  │  chrome.runtime.sendMessage
  ▼
Service-Worker (Background)
  │  IndexedDB batch
  ▼
Process-Mining Engine (Pyodide / FastAPI)
  │  BPMN XML
  ▼
Graph Editor (React + Camunda)
  │  User tweaks graph
  ▼
Playwright Generator
  │  .spec.ts + trace.zip
  ▼
Promptbreeder Loop → Updated script / metrics
```

*All persistent state (raw logs, BPMN, scripts, traces, eval scores) lives in IndexedDB under per-workspace keys; Playwright traces are large, but compression in Chrome 129 shrinks disk usage significantly.*

---

## Inter-Service Communication

| From → To                           | Channel                                           | Payload          |
| ------------------------------------ | ------------------------------------------------- | ---------------- |
| Content → SW                        | `chrome.runtime.sendMessage`                    | Single event row |
| SW → PyWorker                       | `postMessage`(Pyodide)*or*HTTP `POST /mine` | XES CSV          |
| PyWorker → UI                       | `BroadcastChannel('bpmn')`                      | mined BPMN XML   |
| UI → Generator                      | in-memory JS call                                 | edited BPMN      |
| Generator → Promptbreeder           | Node `child_process`or library call             | script path      |
| Promptbreeder → UI / AfterQuery API | WebSocket                                         | fitness metrics  |

---

## Key Implementation Notes

### Recorder

* Prefer `document.addEventListener('click', handler, {capture:true})` to catch bubbles.
* Capture stable locators (Playwright’s “best locator” heuristics mirror WAI-ARIA roles for robustness).
* Store low-rate (1 fps) screenshots encoded as Blobs for size.

### Process Mining

* Use `pm4py.discover_bpmn_inductive()` to return BPMN XML in one call.
* For graph simplification, apply frequency-based edge pruning (`pm4py.filter_variants_by_coverage(percentage)`).
* Token-replay conformance gives a judge-friendly “health %” overlay.

### Graph Editor

* Embed Camunda Modeler’s web component in an `<iframe>`; listen for `diagram.export.xml` events to sync edits.
* For light builds, render with Cytoscape.js and a BPMN-shape extension.

### Playwright Generator

* Walk tasks depth-first; insert `await expect(page).toHaveURL()` at nodes that match new URLs.
* Enable traces: `use: { trace: 'on', screenshot: 'only-on-failure' }`.
* Output `.spec.ts` adjacent to BPMN for round-trip editing.

### Promptbreeder Loop

* Start with a population of CSS/XPath variants; mutate via string edits; fitness = test pass & selector length (shorter ↔ more robust).
* Store each generation’s metrics so AfterQuery dashboards can query trendlines.

---

## CI / Dev Experience

* GitHub Actions job spins up headless Chrome, runs recorder unit tests, mines logs via Pyodide, and asserts generated scripts pass.
* Publish the extension as a signed ZIP + one-click load instructions; optionally ship a browser-agnostic version using WebExtensions polyfill.
* Provide a Dex-style demo GIF (“ghost preview” overlay) and an AGI-House slide deck in `/docs`.

---

## Security & Privacy

* All mining can run fully client-side (Pyodide) so no user data leaves the machine—critical for enterprise judges.
* Use Chrome `declarativeNetRequest` to avoid collecting cross-origin network payloads, only DOM metadata.
* Offer a redaction layer that hashes text inputs for demos.

---

## Stretch Goals

| Idea                                                                  | Benefit                                                  |
| --------------------------------------------------------------------- | -------------------------------------------------------- |
| **Voice-intent labels**– prepend ASR transcript to BPMN nodes  | Demo wow-factor & accessibility                          |
| **Conformance-drift email**– alert when new logs differ > 10 % | Shows practical monitoring                               |
| **PM4Py-GPU**backend on an RTX laptop                           | Lightning-fast mining; fits AGI-House hardware-nerd vibe |

---

### References

1. Chrome MV3 service-worker migration docs ([Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers "Migrate to a service worker  |  Chrome Extensions  |  Chrome for Developers"))
2. Content-script capabilities — Chrome Docs ([Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts?utm_source=chatgpt.com "Content scripts | Chrome Extensions"))
3. IndexedDB compression improvements in Chrome 129 ([Chrome for Developers](https://developer.chrome.com/docs/chromium/indexeddb-storage-improvements "More efficient IndexedDB storage in Chrome  |  Chromium  |  Chrome for Developers"))
4. Playwright test-generator & locator heuristics ([Playwright](https://playwright.dev/docs/codegen "Test generator | Playwright"))
5. Playwright Trace Viewer guide ([Playwright](https://playwright.dev/docs/trace-viewer?utm_source=chatgpt.com "Trace viewer - Playwright"))
6. Promptbreeder self-improving prompt evolution (arXiv 2309.16797) ([arXiv](https://arxiv.org/abs/2309.16797?utm_source=chatgpt.com "Promptbreeder: Self-Referential Self-Improvement Via Prompt Evolution"))
7. PM4Py Inductive Miner example (docs) ([PM4Py Documentation](https://pm4py-source.readthedocs.io/en/stable/pm4py.html?utm_source=chatgpt.com "pm4py package — PM4Py 2.2.30 documentation"))
8. PM4Py paper “Bridging Process- & Data-Science” ([arXiv](https://arxiv.org/abs/1905.06169?utm_source=chatgpt.com "Process Mining for Python (PM4Py): Bridging the Gap Between Process- and Data Science"))
9. Process-mining case study using PM4Py ([arXiv](https://arxiv.org/abs/2409.11294?utm_source=chatgpt.com "Navigating Process Mining: A Case study using pm4py"))
10. Pyodide guide – running Python in the browser ([JNaapti](https://jnaapti.com/articles/article/running-python-in-browser-with-pyodide "Running Python in the Browser with Pyodide: A Comprehensive Guide"))
11. PM4Py-GPU performance extension ([arXiv](https://arxiv.org/abs/2204.04898?utm_source=chatgpt.com "PM4Py-GPU: a High-Performance General-Purpose Library for Process Mining"))
12. Camunda Modeler web component (BPMN) ([Camunda](https://camunda.com/platform/modeler/?utm_source=chatgpt.com "Camunda Modeler: Process Modeling using BPMN"))
13. Cytoscape.js interactive graph library ([js.cytoscape.org](https://js.cytoscape.org/ "Cytoscape.js"))
14. Dex/Joindex – “AI copilot for your browser” ([joindex.com](https://www.joindex.com/ "Dexterity AI"))
15. AfterQuery research agenda & data-centric evals ([afterquery.com](https://www.afterquery.com/ "AfterQuery"))
16. AGI House prominence in 2025 hacker-house report ([Business Insider](https://www.businessinsider.com/the-top-hacker-houses-in-san-francisco-for-2025-2025-4?utm_source=chatgpt.com "Here are the 7 top hacker houses in San Francisco for 2025, as chosen by VCs and founders"))
17. Chrome SW event handling tutorial ([Chrome for Developers](https://developer.chrome.com/docs/extensions/get-started/tutorial/service-worker-events?utm_source=chatgpt.com "Handle events with service workers | Chrome Extensions"))

---

This architecture lets you demo *record → graph → edit → export → self-heal* in under seven days, while leaving clear avenues for scalability and academic novelty. Good luck—see you on the winner’s podium!
