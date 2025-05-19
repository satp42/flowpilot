Below is a **granular, single-concern task list** that an engineering-LLM (or human) can execute one after another. Each task is:

* **atomic** (tiny start → clear end),
* **testable** (explicit success condition),
* ordered so you can demo a vertical slice early and then harden it.

---

## TL;DR – Build order in one sentence

Set up the monorepo → record a single click into an XES row → store it in IndexedDB → mine a BPMN with PM4Py-in-Pyodide → render the diagram in Camunda Web → export a one-step Playwright script → run it with trace enabled → evolve the selector once with Promptbreeder—then iterate outward.

(Chrome MV3 SW docs([Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?utm_source=chatgpt.com "Migrate to a service worker | Chrome Extensions")), IndexedDB efficiency note([Chrome for Developers](https://developer.chrome.com/docs/chromium/indexeddb-storage-improvements?utm_source=chatgpt.com "More efficient IndexedDB storage in Chrome | Chromium")), XES spec([xes-standard.org](https://www.xes-standard.org/?utm_source=chatgpt.com "XES: start")), Pyodide guide([JNaapti](https://jnaapti.com/articles/article/running-python-in-browser-with-pyodide?utm_source=chatgpt.com "Running Python in the Browser with Pyodide: A Comprehensive Guide")), PM4Py Inductive Miner ex.([Medium](https://medium.com/%40parthshr370/how-to-get-started-with-pm4py-abebfa97d899?utm_source=chatgpt.com "How to Get started with PM4PY - Medium")), Camunda Modeler Web component([Camunda](https://camunda.com/platform/modeler/?utm_source=chatgpt.com "Camunda Modeler: Process Modeling using BPMN")), Playwright trace viewer([Cuketest](https://www.cuketest.com/playwright/docs/trace-viewer/?utm_source=chatgpt.com "Trace Viewer | Playwright - CukeTest")), Playwright locators([Playwright](https://playwright.dev/docs/locators?utm_source=chatgpt.com "Locators - Playwright")), Promptbreeder paper([arXiv](https://arxiv.org/abs/2309.16797?utm_source=chatgpt.com "Promptbreeder: Self-Referential Self-Improvement Via Prompt Evolution")), Whisper-cpp WASM demo([whisper.ggerganov.com](https://whisper.ggerganov.com/?utm_source=chatgpt.com "whisper.cpp : WASM example")).)

---

## Phase 0 – Repo & CI Scaffolding

| #   | Task                                                                        | Start             | End / Test                                                          |
| --- | --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------- |
| 0.1 | **Create monorepo**(`pnpm init -y`, add `turbo.json`, workspaces) | Empty folder      | `pnpm recursive install`finishes;`git push origin main`succeeds |
| 0.2 | **Add GitHub Actions CI**that runs `pnpm lint && pnpm test`         | `/.github`empty | Green check on GH build                                             |

---

## Phase 1 – Chrome Extension Skeleton

| # | Task | Start | End / Test |

|1.1|**Write `manifest.json` (MV3)** with `"service_worker": "sw/background.ts"` | `manifest.json` absent | `chrome://extensions → Load unpacked` shows no red errors (MV3 guide)([Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?utm_source=chatgpt.com "Migrate to a service worker | Chrome Extensions")) |

|1.2|**Scaffold service-worker file** that logs `"SW ready"` on `install` | empty `sw/` | Message appears in DevTools background page |

|1.3|**Insert content script** (`content/recorder.ts`) that logs `"content ready"` | none | Console message inside any tab |

---

## Phase 2 – Event Capture (MVP = single click)

| # | Task | Start | End / Test |

|2.1|**Hook `click` listener** in content script; build event object `{caseId, activity, ts}` | listener stub | Clicking page prints object in console (StackOverflow pattern)([Stack Overflow](https://stackoverflow.com/questions/17819344/triggering-a-click-event-from-content-script-chrome-extension?utm_source=chatgpt.com "Triggering a click event from content script - chrome extension")) |

|2.2|**Send event to SW** via `chrome.runtime.sendMessage` | local object only | Background logs event JSON |

|2.3|**Persist to IndexedDB** (`events` store) | memory only | `indexedDB.databases()` shows 1 record (compression upgrades Chrome 129)([Chrome for Developers](https://developer.chrome.com/docs/chromium/indexeddb-storage-improvements?utm_source=chatgpt.com "More efficient IndexedDB storage in Chrome | Chromium")) |

|2.4|**Unit-test recorder** with Jest + JSDOM: simulate click, assert `sendMessage` called | no test | Jest passes |

---

## Phase 3 – XES Export

| # | Task | Start | End / Test |

|3.1|**Create `xes-schema` package** (TS types mirroring IEEE XES) | none | `npm pack` succeeds; type exported (XES spec)([xes-standard.org](https://www.xes-standard.org/?utm_source=chatgpt.com "XES: start")) |

|3.2|**Batch flush 1 event → CSV** (`flushEvents()` in SW) | events only | File `log.xes.csv` downloaded with 1 line |

|3.3| **E2E test** : click once, expect CSV lines = 1 | manual | Cypress test green |

---

## Phase 4 – Process Mining in Browser

| # | Task | Start | End / Test |

|4.1|**Add Pyodide loader** in `ui/` that loads runtime + micropip | none | Console shows `pyodide loaded` (Pyodide guide)([JNaapti](https://jnaapti.com/articles/article/running-python-in-browser-with-pyodide?utm_source=chatgpt.com "Running Python in the Browser with Pyodide: A Comprehensive Guide")) |

|4.2|**`pip install pm4py` in Pyodide** and run `print(pm4py.__version__)` | nothing | Version string printed |

|4.3|**Write `mine_bpmn(xes_csv)`** calling `pm4py.discover_bpmn_inductive` | stub | Returns non-empty BPMN XML string (PM4Py example)([Medium](https://medium.com/%40parthshr370/how-to-get-started-with-pm4py-abebfa97d899?utm_source=chatgpt.com "How to Get started with PM4PY - Medium")) |

|4.4|**Broadcast mined XML** to SW (`BroadcastChannel('bpmn')`) | none | Background receives XML |

---

## Phase 5 – Graph UI

| # | Task | Start | End / Test |

|5.1|**Embed Camunda Modeler Web** in React popup (`<iframe src="modeler.html">`) | blank div | BPMN diagram renders (Camunda site)([Camunda](https://camunda.com/platform/modeler/?utm_source=chatgpt.com "Camunda Modeler: Process Modeling using BPMN")) |

|5.2|**Load XML into Modeler** via postMessage | static XML | Nodes/edges visible |

|5.3|**Add “Save diagram” button** that emits edited XML | no button | Clicking saves file to `/tmp/diagram.bpmn` |

---

## Phase 6 – Playwright Codegen

| # | Task | Start | End / Test |

|6.1| **Create `bpmn→playwright` mapper** : first task → `page.click()` | empty fn | Generated `.spec.ts` compiles |

|6.2|**Enable trace** (`trace:'on'`) in Playwright config | default | Running test outputs `trace.zip` (Trace Viewer doc)([Cuketest](https://www.cuketest.com/playwright/docs/trace-viewer/?utm_source=chatgpt.com "Trace Viewer | Playwright - CukeTest")) |

|6.3|**Add “Run test” button** that spawns `npx playwright test temp.spec.ts` via Node child-proc (dev mode) | none | Test passes clicking same element |

|6.4|**Open trace link** (`npx playwright show-trace trace.zip`) | archive only | Viewer opens in browser |

---

## Phase 7 – Locator Robustness Loop

| # | Task | Start | End / Test |

|7.1|**Implement `mutateSelector()`** that shortens XPath using Playwright `locator.getByRole()` heuristic | none | Function returns ≤ original length (Docs)([Playwright](https://playwright.dev/docs/locators?utm_source=chatgpt.com "Locators - Playwright")) |

|7.2|**Seed Promptbreeder population** with original selector string | empty pop | Array length > 0 |

|7.3| **Run single generation** : mutate → regenerate script → test → score pass/fail | none | At least one child passes (Promptbreeder paper)([arXiv](https://arxiv.org/abs/2309.16797?utm_source=chatgpt.com "Promptbreeder: Self-Referential Self-Improvement Via Prompt Evolution")) |

|7.4|**Log fitness metrics** to IndexedDB `evals` store | no logs | Reading store returns last fitness score |

---

## Phase 8 – Audio & Screenshots (Nice-to-have)

| # | Task | Start | End / Test |

|8.1| **Integrate whisper.cpp WASM demo** : record 2-sec mic sample, transcribe | none | Transcript appears (whisper.cpp demo)([whisper.ggerganov.com](https://whisper.ggerganov.com/?utm_source=chatgpt.com "whisper.cpp : WASM example")) |

|8.2|**Attach transcript to event `attrs.voice`** | absent | XES row shows string |

---

## Phase 9 – Packaging & Demo

| # | Task | Start | End / Test |

|9.1|**Bundle extension with `pnpm build` (esbuild)** | dev only | `dist/` zip < 1 MB |

|9.2|**Record → Mine → Play script** happy-path screencast (gif) | none | 10-sec gif saved |

|9.3|**Add README quick-start** | draft | New intern can replay demo in < 5 min |

---

## How to Use This List

1. Feed the **next unfinished task** (row) to your engineering-LLM with repo context.
2. When the LLM’s PR lands, run the **End/Test** check locally.
3. Merge if green, otherwise loop back with feedback.
4. Advance to the following row.

Because every row touches only *one* surface, regressions are easy to spot and rollback. Happy building — you’re now 40 atomic steps from a demo-ready, judge-wowing MVP!
