Build an open-source browser plug-in that _records everything you do on-screen, converts those events into an editable graph, and auto-evolves robust Playwright scripts with Promptbreeder-style self-evals_

Today every SaaS team reproduces brittle Selenium scripts; giving them a zero-setup “record → graph → Playwright” pipeline collapses days into minutes and opens the door to community-shared automations.

Here are the reasons this is a technically feasible project:

- Event capture can easily be done via Playwright Tracing
- Graph reconstruction can be done via Hierarchial RL or Self-supervised multimodal transformers
- Script synthesis is handled by turning the graph to python
- Self-improving eval is done by adapting Promptbreeder loop: mutate action-prompts, replay script, score success/fail, keep best [arxiv](https://arxiv.org/abs/2309.16797)

---

Here are three potential ways of doing this:

## 1. “Sequence-to-Graph” via a Self-Supervised Multimodal Transformer

### 1. Instrument & encode every modality

- Inject a lightweight content-script that logs high-level DOM actions (click, input, navigation) alongside low-rate viewport screenshots and an audio stream passed through Whisper-style ASR.
- Discretise each signal into tokens: - CSS locators, - semantic vision patches, - ASR wordpieces, - special “URL-changed”, “tab-switched”, etc.

### 2. Pre-train a joint model that learns user-task semantics

- Fine-tune an open-weights V-L backbone (e.g., **FUTURIST** transformer) with a multimodal masked-token objective so it predicts the next action patch across modalities — encouraging temporal alignment between the voice command _“download invoice”_ and the ensuing clicks/scrolls. [arXiv](https://arxiv.org/html/2501.08303v1?utm_source=chatgpt.com)
- Prior work on multimodal action detection shows such transformers capture cross-modal causality without manual labels. [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0031320323004119?utm_source=chatgpt.com)

### 3. Decode a workflow graph instead of plain text

- Attach a pointer-network head that emits (nodeID, edgeType, nodeAttr) triples; the model therefore “draws” a graph as it goes (similar to code-graph DSL work like **CONCORD**). [arXiv](https://arxiv.org/abs/2401.17967)
- Serialise the graph in JSON or GraphML so each node holds a Playwright snippet and rich metadata (locator strategy, wait-conditions, screenshot-hash).

### 4. Visualise & iterate

- Pipe the graph into any React Flow / Mermaid viewer; clicks on a node reveal the underlying Playwright snippet, which can be edited and re-synced back to JSON.

### 5. Export executable code

- A thin generator walks the graph depth-first, emitting a full Playwright test (leveraging Playwright’s own locator heuristics for robustness). [Playwright](https://playwright.dev/docs/codegen?utm_source=chatgpt.com)
- Developers can debug failures in Playwright Trace Viewer while still seeing the original graph context. [Playwright](https://playwright.dev/docs/trace-viewer?utm_source=chatgpt.com)

---

## 2. Classical Process-Mining Pipeline

### 1. Log everything as an **event-log**

- Treat each browser action as an event with _case-id_ (“session 123”), _activity_ (“Click #Submit”), _timestamp_, and _attributes_ (URL, screenshot-hash, spoken-intent).
- Dump to XES/CSV; this is the lingua-franca for process-mining tools. [ProcessMaker](https://www.processmaker.com/blog/process-mining-algorithms-simply-explained/?utm_source=chatgpt.com)

### 2. Discover the process model

- Run discovery algorithms (Alpha Miner, Inductive Miner, Heuristics Miner) in **PM4Py** to produce a Petri-net or BPMN diagram capturing the frequent paths. [PM4Py Documentation](https://pm4py-source.readthedocs.io/en/stable/pm4py.algo.discovery.alpha.html?utm_source=chatgpt.com)[Medium](https://medium.com/wonderful-world-of-data-science/process-mining-with-python-tutorial-a-healthcare-application-part-2-4cf57053421f?utm_source=chatgpt.com)
- UiPath and ServiceNow both highlight process-mining as the preferred way to spot automation candidates. [UiPath](https://www.uipath.com/rpa/what-is-process-mining?utm_source=chatgpt.com)[ServiceNow](https://www.servicenow.com/community/process-mining-blog/how-to-use-process-mining-to-identify-automation-opportunities/ba-p/3061642?utm_source=chatgpt.com)

### 3. Prune & annotate

- Filter edges below a support threshold or merge variant traces into parameterised nodes (e.g., “Fill-Form(field=_, value=_)”).
- Attach mined performance stats (avg. duration, rework rate) so product teams instantly see bottlenecks.

### 4. Round-trip to automation

- Convert each BPMN task to a Playwright “page.*” call with the stored locator; gateways become _if/else_ statements reading runtime parameters.
- Because BPMN is already a graph, visual editors (Camunda Modeler, PM4Py viz) double as your workflow canvas.

### 5. Continuously improve

- Feed new interaction logs through conformance checking; deviations flag broken selectors or new UI variants before your automation fails in CI.

---

## 3. Hierarchical RL & Macro-Action Discovery

### 1. Frame user interactions as MDP trajectories

- Each browser _state_ is a low-dim screenshot + DOM embedding; _actions_ are clicks/inputs; _reward_ is derived from task completion heuristics (or simply set to 1 at “success” URL).
- Store voice transcriptions as intent labels to speed up credit assignment.

### 2. Discover reusable _macros_

- Apply automated macro-action discovery from recent **Hierarchical Meta-RL** literature — 3-level agents learn task-agnostic sub-policies that compress long action chains into a single “macro”. [arXiv](https://arxiv.org/abs/2412.11930?utm_source=chatgpt.com)
- Cluster similar trajectories to generalise macros across websites (e.g., _“login-via-Google”_, _“checkout-with-Stripe”_).

### 3. Ground macros with a Vision-Language controller

- Large V-L models already ground textual goals into UI regions for manipulation; leveraging them aligns learned macros with on-screen semantics. [arXiv](https://arxiv.org/abs/2410.15863?utm_source=chatgpt.com)
- The agent can therefore re-bind a macro to a visually-different but semantically-equivalent login dialog.

### 4. Build the graph

- Nodes = discovered macros; edges = high-level options chosen by the RL policy.
- Export to a graph DSL identical to Approach 1. Because macros expose parameters (selectors, credentials, quantities), non-technical users can re-wire flows without retraining the policy.

### 5. Execution layer

- At runtime, each macro expands to a Playwright mini-script, optionally fine-tuned on-the-fly using few-shot RLHF if a selector fails.

Here is the potential demo storyboard:

---

# Demo Storyboard (judges love narrative)

1. **Record:** open Airbnb, book a room; extension builds a live node-link graph.
2. **Preview:** toggle “ghost mode” → semi-transparent cursor replays actions.
3. **Edit:** drag nodes to reorder flow; one click exports Playwright script.
4. **Self-heal:** break a selector, run Promptbreeder loop; tool mutates XPaths until green.
5. **Share:** copy cloud link; teammate imports and adds new branch in graph UI.

---

# Go-To Plan

We're going to go with the second plan. The reason for using this in the hackathon is the following:

- The plan is feasible for 7 days — PM4Py’s Alpha/Inductive Miner turns event logs into BPMN/Petri-nets out-of-the-box [GitHub - ChrisTs8920/process-mining-py: A process mining project that analyzes an event log and discovers its process model.](https://github.com/ChrisTs8920/process-mining-py) [Site Unreachable](https://www.sciencedirect.com/science/article/pii/S2665963823000933)
- Transformative demo — process graphs instantly reveal user flow, exportable to Playwright, plus measurable conformance checks
- Relevant to judges — Perfect: Dex = “AI copilot for your browser”, AfterQuery loves rigorous data/evals, AGI House prizes tangible infra hacks
- Tooling & visuals — Mature BPMN editors (Camunda, UiPath) for free visualization/editing

The initial plan was this:

### 1. Log everything as an **event-log**

- Treat each browser action as an event with _case-id_ (“session 123”), _activity_ (“Click #Submit”), _timestamp_, and _attributes_ (URL, screenshot-hash, spoken-intent).
- Dump to XES/CSV; this is the lingua-franca for process-mining tools. [ProcessMaker](https://www.processmaker.com/blog/process-mining-algorithms-simply-explained/?utm_source=chatgpt.com)

### 2. Discover the process model

- Run discovery algorithms (Alpha Miner, Inductive Miner, Heuristics Miner) in **PM4Py** to produce a Petri-net or BPMN diagram capturing the frequent paths. [PM4Py Documentation](https://pm4py-source.readthedocs.io/en/stable/pm4py.algo.discovery.alpha.html?utm_source=chatgpt.com)[Medium](https://medium.com/wonderful-world-of-data-science/process-mining-with-python-tutorial-a-healthcare-application-part-2-4cf57053421f?utm_source=chatgpt.com)
- UiPath and ServiceNow both highlight process-mining as the preferred way to spot automation candidates. [UiPath](https://www.uipath.com/rpa/what-is-process-mining?utm_source=chatgpt.com)[ServiceNow](https://www.servicenow.com/community/process-mining-blog/how-to-use-process-mining-to-identify-automation-opportunities/ba-p/3061642?utm_source=chatgpt.com)

### 3. Prune & annotate

- Filter edges below a support threshold or merge variant traces into parameterised nodes (e.g., “Fill-Form(field=_, value=_)”).
- Attach mined performance stats (avg. duration, rework rate) so product teams instantly see bottlenecks.

### 4. Round-trip to automation

- Convert each BPMN task to a Playwright “page.*” call with the stored locator; gateways become _if/else_ statements reading runtime parameters.
- Because BPMN is already a graph, visual editors (Camunda Modeler, PM4Py viz) double as your workflow canvas.

### 5. Continuously improve

- Feed new interaction logs through conformance checking; deviations flag broken selectors or new UI variants before your automation fails in CI.

The way we're going to refactor the plan is to reshape the plugin architecture around process mining. We do the following for that in this high-level plan:

- _Content script_ captures each browser action (click, key, nav …) with timestamp, session-ID, URL, locator, screenshot-hash, and any Whisper ASR transcript. → Append as **XES/CSV event log** in the standard “case-id / activity / timestamp / attributes” schema.
- Feed the log to **PM4Py Inductive Miner** to auto-generate a Petri-net or BPMN model that shows all frequent paths.
- Render the returned BPMN XML in Camunda Modeler embedded in your React popup, or convert to Cytoscape/Mermaid for lightweight in-browser editing.
- Walk the BPMN: each _task_ becomes `page.click()` / `page.fill()`; _gateways_ become JavaScript `if/else`. Provide a **“ghost-preview”** overlay and let users tweak selectors, then generate a `.spec.ts` plus **Playwright Trace Viewer** link for debugging.
- Store failing traces; mutate selectors or prompts; re-run and score fitness, iterating automatically as in **Promptbreeder**.
- Re-run PM4Py’s token-replay every time new logs arrive; divergence flags UI drift before scripts break.

Here is the proposed one-week timeline (although subject to change):

| Day         | Milestone                                                                                                                                                                                                                                                                                                     | Key libs                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0** | Repo scaffolding; choose XES schema; stub Chrome MV3 extension                                                                                                                                                                                                                                                | Typescript, WebExt                                                                                                                                           |
| **1** | Event logger → XES writer; local IndexedDB cache                                                                                                                                                                                                                                                             | `xesjs`, Whisper CPP                                                                                                                                       |
| **2** | Pipe log into PM4Py via `pyodide` or background Python micro-service; return BPMN XML                                                                                                                                                                                                                       | PM4Py ([GitHub](https://github.com/ChrisTs8920/process-mining-py?utm_source=chatgpt.com "Process mining - Python and pm4py - GitHub"))                             |
| **3** | Embed Camunda Modeler or React Flow to display/edit graph                                                                                                                                                                                                                                                     | Camunda Modeler Web ([Camunda 8 Docs](https://docs.camunda.io/docs/components/modeler/bpmn/?utm_source=chatgpt.com "BPMN in Modeler \| Camunda 8 Docs - Console")) |
| **4** | BPMN → Playwright codegen; integrate Trace Viewer link                                                                                                                                                                                                                                                       | Playwright ([Playwright](https://playwright.dev/docs/trace-viewer?utm_source=chatgpt.com "Trace viewer - Playwright"))                                             |
| **5** | Promptbreeder loop for selector robustness; store eval metrics for AfterQuery-style dashboards ([Roundtable Data Science Salon](https://roundtable.datascience.salon/supercharge-your-ai-agents-the-power-of-evaluations?utm_source=chatgpt.com "Supercharge Your AI Agents: The Power of Evaluations - DSS Blog")) | OpenAI API                                                                                                                                                   |
| **6** | Polish demo: Dex-style “one-click automate” UX; add AGI-House pitch deck slides                                                                                                                                                                                                                             |                                                                                                                                                              |

Here are potential ways to stretch it:

- **Edge-pruning heuristics** to simplify graphs for non-technical users; pull frequency metrics from PM4Py.
- **Voice-intent overlay** so nodes carry the spoken command that preceded them—excellent demo polish.
- **Data-drift alert** email when conformance score drops below threshold—reuse PM4Py diagnostics APIs.
