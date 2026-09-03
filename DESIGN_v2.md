# CarePortal — 设计文档 v2(截止日版)

> 今天 9 月 3 日,截止 16:00 EDT。v2 相对 v1 的原则:**凡是不出现在视频里的东西,一律砍掉或降为 P2。**

---

## 0. v1 → v2 改了什么

| 项 | v1 | v2 | 原因 |
|---|---|---|---|
| 工具数 | 13 | 10(P0 8 个 + P1 2 个) | `check_coverage`、`update_insurance`、`acknowledge_result`、`find_in_network_providers` 不在 demo 路径上,砍 |
| 页面 | 6 | 5 | `/insurance` 砍,保险信息塞进概览一行 |
| 作用域 | session / patient / route 三个,定义重叠 | `auth` / `patient` / `route` 三个,边界清晰 | v1 里 session 和 patient 实际是同一个 |
| demo 脚本 | 含"保险刚换"支线 | 去掉 | 那是上一版 persona 的残留,照护者版本不需要 |
| 确认卡超时 | "风险"一行 | 正式协议:等 60 秒,超时返回 `pending_user_confirmation`,卡片不关 | agent harness 有工具调用超时,必须设计而不是祈祷 |
| 页面跟随 | 未定义 | **每个工具调用都把页面导航到对应模块并高亮** | 这是"人和 agent 看同一屏"在视频里的唯一可见形式 |
| 登录 | 表单 + 密码 | 表单预填 + 一键 demo 登录 | 评委零摩擦;agent 不能也不该输密码 |
| polyfill | `@mcp-b/webmcp-polyfill` 兜底 | 砍。无原生 API 就只显示状态标,不注册 | 少一个不确定依赖;polyfill 挂在 `navigator` 还是 `document` 上没验证过 |
| 签字流程 | 未定义 | 待办页内 modal:输入姓名 + 勾选 + 签署按钮 | 视频最后一幕需要它 |
| 代理权限 | 数据模型里有,工具不检查 | P2:工具检查 `proxyPermissions`,无权限返回 `not_permitted` | 便宜的 governance 加分,但不进 P0 |
| 数据层 | 直接读 seed | `DataSource` 接口 + `SeedDataSource`;`FhirDataSource` 只留空壳和注释 | 一小时,README 里配映射表 |

---

## 1. 叙事(不变)

1. 医院永远不会给 agent 发 API key。但你登录了。
2. WebMCP 让医院自己决定 agent 能碰什么:只读随时可用、写操作页面内确认、高风险的根本不暴露。
3. 人只做一件事:授权和签字。不是 agent 做不了,是法律上只有人能做。

**"为什么不做 API"的回答:** 医院要新建 agent 鉴权 + 新写一套 API + 做不了页面内确认;而且患者侧 FHIR API 只开"读",永远不开"以患者名义动"——那一半正是 WebMCP 填的。

---

## 2. 优先级

| 级 | 内容 | 不做的后果 |
|---|---|---|
| **P0** | 登录、概览、用药、结果与消息、待办;5 个只读工具;`request_refill`、`send_message_to_provider`;`what_requires_me`;确认卡(含可编辑正文);`patient` 作用域注册 + 患者切换;状态标;签字 modal | 作品不成立 |
| **P1** | 预约列表 + 详情页;`reschedule_appointment`(`route` 作用域);`DataSource` 接口;README 的 FHIR 映射表 | Leverage 掉一档,叙事少一个支撑 |
| **P2** | 代理权限检查;`toolchange` 计数显示;胰岛素"需医生批"的支线 | 无 |

**规则:P0 全部跑通并录完视频之前,不碰 P1。**

---

## 3. Persona 与 demo 脚本

**Linda,52 岁**,通过 proxy access 管理母亲 **Margaret,78 岁**(高血压 + 2 型糖尿病,三个医生)。

### 视频主线(约 90 秒)

Linda 登录 → 切到 Margaret → 对 agent 说:

> "我妈下周有心内科复诊,她的降压药还剩五天,上次的血检结果出来了吗?"

| 步 | agent 调用 | 页面 | 人 |
|---|---|---|---|
| 1 | `get_patient_context` | 概览 | — |
| 2 | `get_upcoming_appointments` → 下周二 Dr. Chen,in-network | **导航到预约页**,预约卡高亮 | — |
| 3 | `get_medications({only_low:true})` → 氨氯地平剩 5 天 | **导航到用药页**,该行高亮 | — |
| 4 | `request_refill({medication_id})` | **确认卡** | 点"Request refill" |
| 5 | `get_recent_results` → CMP 已出,肌酐略高 | **导航到结果页**,展开 | — |
| 6 | `get_unread_messages` → Dr. Rivera 留言 | 消息线程展开 | — |
| 7 | agent 复述留言,问要不要回复 | — | "要,说我们会照做,两周后复查" |
| 8 | `send_message_to_provider({thread_id, body})` | **确认卡,正文可编辑** | 改一个词,点"Send" |
| 9 | `what_requires_me` → 一份待签同意书 | **导航到待办**,同意书高亮 | 打开、签字 |

四个模块、两次确认、一次签字。P1 做完的话,在第 2 步之后加一拍:agent 说"要不要改到周四?",调 `reschedule_appointment`,再一次确认卡——这一拍展示 route 作用域,视频里顺带说一句"这个工具只在预约详情页存在"。

---

## 4. 页面

```
/login          预填 linda / demo,按钮 "Sign in as Linda (demo)"
/               概览:acting-for 横幅、下一个预约、剩余 < 7 天的药、未读数、待签数、保险一行
/appointments   列表;/appointments/:id 详情(P1),详情页含 availableSlots
/medications    列表:名称、剂量、剩余天数、可续/需医生批、开药医生
/results        结果列表 + 每条结果下的消息线程
/todo           待签文件、待确认事项;签字 modal
```

全局:
- 顶栏:患者切换(Linda / Margaret),切换时页面回到概览
- 右下角状态标:`WebMCP: native · 8 tools` / `WebMCP: unavailable` + 一行如何开启
- 确认卡 portal
- `Highlightable` 包装组件:store 里 `highlight = { kind, id }` 时加边框和滚动到视口

**页面跟随规则:** 每个工具的 `execute` 第一件事是 `navigate(对应路由)` + `setHighlight(对应对象)`。只读工具也导航。这是 P0,不是装饰——没有它,视频里 agent 干活时页面是静止的,"一起用"就不成立。

---

## 5. 数据模型与种子

### 类型
```ts
type PatientId = "linda" | "margaret";

interface Patient { id: PatientId; name: string; dob: string;
  relationshipToUser: "self" | "proxy";
  proxyPermissions: ("view" | "schedule" | "refill" | "message")[]; }

interface Provider { id: string; name: string;
  specialty: "cardiology" | "endocrinology" | "primary_care";
  inNetwork: boolean; location: string; }

interface Appointment { id: string; patientId: PatientId; providerId: string;
  datetime: string; type: string; status: "scheduled" | "completed";
  availableSlots: string[]; }

interface Medication { id: string; patientId: PatientId; name: string; dose: string;
  daysRemaining: number; refillable: boolean; prescriberId: string;
  refillStatus: "none" | "requested"; }

interface LabResult { id: string; patientId: PatientId; name: string;
  collectedAt: string; status: "pending" | "final"; flagged: boolean;
  summary: string; }

interface MessageThread { id: string; patientId: PatientId; providerId: string;
  subject: string; relatedResultId?: string;
  messages: { from: "provider" | "patient"; body: string; at: string; read: boolean }[]; }

interface PendingDocument { id: string; patientId: PatientId; title: string;
  requiresSignatureBy: "patient" | "proxy"; dueBy: string; signed: boolean; }
```

### 种子(Margaret)
- **Providers:** Dr. Chen(cardiology)、Dr. Patel(endocrinology)、Dr. Rivera(primary_care),全部 in-network
- **Appointments:** `appt_chen_0909` 下周二 10:30 Dr. Chen Follow-up,slots:周四 09:00 / 周四 14:00 / 下下周一 11:00;`appt_patel_0924` 三周后 Dr. Patel
- **Medications:** `med_amlodipine`(Amlodipine 5mg,5 天,可续,Dr. Chen)、`med_metformin`(23 天,可续,Patel)、`med_atorvastatin`(40 天,可续,Chen)、`med_insulin`(Insulin glargine,12 天,**不可续**,Patel)、`med_aspirin`(60 天)、`med_vitd`(90 天)
- **Results:** `res_cmp`(CMP,final,flagged,summary:"Creatinine slightly elevated at 1.3; all other values normal")、`res_a1c`(HbA1c,pending)
- **Threads:** `thr_rivera_cmp`(Dr. Rivera,subject "Your recent lab results",relatedResultId `res_cmp`,一条未读:"Margaret's creatinine is slightly elevated. Please make sure she drinks plenty of water and we'll recheck in two weeks. Let me know if she has any swelling or reduced urination.")
- **PendingDocuments:** `doc_stress_consent`(Consent for Cardiac Stress Test,requiresSignatureBy proxy,due 下周)
- **Patient:** Margaret,proxyPermissions 全部

### 种子(Linda)
一个预约(年度体检)、两种药(都不低),无未读、无待签。只为演示切换后工具集和上下文变了。

### 数据层
```ts
interface DataSource {
  getPatient(id: PatientId): Patient;
  getAppointments(id: PatientId): Appointment[];
  getMedications(id: PatientId): Medication[];
  getResults(id: PatientId): LabResult[];
  getThreads(id: PatientId): MessageThread[];
  getPendingDocuments(id: PatientId): PendingDocument[];
  requestRefill(medId: string): void;
  sendMessage(threadId: string, body: string): void;
  reschedule(apptId: string, slot: string): void;
  signDocument(docId: string): void;
}
```
`SeedDataSource` 同步实现,状态放 zustand。`FhirDataSource` 文件只有接口签名 + 每个方法上一行注释写对应 FHIR 资源,不实现。

---

## 6. 工具

### 6.1 约定
- `description` 英文,写给 agent:做什么 / 何时用 / 返回什么 / 何时不用
- 返回 `{ content: [{ type: "text", text: JSON.stringify(payload) }] }`
- 每个 payload 带 `acting_for: { id, name, relationship }`
- 每个 `execute` 开头:导航 + 高亮
- `description` 开头注入当前患者:`"[Acting for Margaret Lee via proxy] ..."`

### 6.2 `auth` 作用域(登录前唯一的工具)

**`get_login_status`**
```
description: "Reports whether a user is signed in. Agents cannot sign in on the user's behalf — if not signed in, tell the user to sign in manually and then call get_patient_context."
inputSchema: {}
返回: { logged_in: false, hint: "..." }
```

### 6.3 `patient` 作用域(登录后注册;切换患者时 abort 后重建)

**`get_patient_context`** — P0
```
description: "[Acting for {name} via {relationship}] Returns who the user is acting for, their proxy permissions, and counts of open items (unread messages, low medications, pending documents, appointments in the next 7 days). Call this FIRST. Contains no clinical data."
inputSchema: {}
```

**`get_upcoming_appointments`** — P0
```
description: "[...] Lists scheduled appointments within the next N days with provider, specialty, datetime, and in-network status. Navigates the page to the appointments list."
inputSchema: { within_days: integer 1–365, default 30 }
```

**`get_medications`** — P0
```
description: "[...] Lists active medications with days of supply remaining, whether a refill can be requested directly (refillable) or needs provider approval, and the prescriber. days_remaining < 7 is flagged 'low'. Navigates to the medications page. Call before request_refill."
inputSchema: { only_low: boolean, default false }
```

**`get_recent_results`** — P0
```
description: "[...] Lists lab results newest first: status (pending/final), whether any value was flagged, a plain-language summary, and the id of any related message thread. Navigates to the results page. Does not include the full report."
inputSchema: { limit: integer 1–20, default 5 }
```

**`get_unread_messages`** — P0
```
description: "[...] Returns unread messages from providers: thread_id, provider, subject, body. Navigates to the results page and expands the thread. Use before send_message_to_provider."
inputSchema: {}
```

**`request_refill`** — P0,需确认
```
description: "[...] Requests a refill for one medication. Opens a confirmation card the user must approve; nothing is submitted until they do. Returns status: 'submitted' | 'declined_by_user' | 'requires_provider_approval' (medication cannot be refilled directly — offer to message the prescriber instead) | 'pending_user_confirmation' (user has not decided within 60s; the card stays open — ask the user to respond, then call get_medications to see the outcome) | 'busy' (another confirmation is open)."
inputSchema: { medication_id: string }
```

**`send_message_to_provider`** — P0,需确认
```
description: "[...] Drafts a reply in an existing message thread. Opens a confirmation card where the user can edit the text before sending. Returns status 'sent' with the final text, or 'declined_by_user' | 'pending_user_confirmation' | 'busy'. Keep drafts under 80 words, first person, plain language, no medical advice."
inputSchema: { thread_id: string, body: string maxLength 800 }
```

**`what_requires_me`** — P0
```
description: "[...] Lists actions only the user can perform: documents awaiting legal signature, full records that must be opened directly, and account settings. Navigates to the to-do page and highlights the first item. Use when the user asks 'anything I need to do' or after other tasks are done. There is no tool to sign documents — the user must do it themselves."
inputSchema: {}
返回: { items: [{ id, title, why_human: "Requires legal signature by patient or authorized proxy", due_by }] }
```

### 6.4 `route` 作用域(P1;仅 `/appointments/:id`)

**`reschedule_appointment`** — 需确认
```
description: "[...] Moves the appointment currently open on screen to one of its available slots. Opens a confirmation card showing old and new times. Only exists while an appointment detail page is open. Returns 'rescheduled' | 'declined_by_user' | 'pending_user_confirmation' | 'busy' | 'invalid_slot'."
inputSchema: { slot: string (ISO datetime, must be one of availableSlots) }
```

### 6.5 不暴露
签同意书、查看完整报告、修改代理权限。由 `what_requires_me` 告知。

---

## 7. 注册与作用域

```ts
// webmcp/registry.ts
const scopes = { auth: null, patient: null, route: null } as Record<string, AbortController | null>;

export function open(scope: keyof typeof scopes) {
  scopes[scope]?.abort();
  scopes[scope] = new AbortController();
  return scopes[scope]!.signal;
}
export function close(scope) { scopes[scope]?.abort(); scopes[scope] = null; }
export function closeAll() { Object.keys(scopes).forEach(close); }

import.meta.hot?.dispose(closeAll);
```

| 事件 | 动作 |
|---|---|
| 应用启动,未登录 | `open("auth")` → 注册 `get_login_status` |
| 登录成功 | `close("auth")`;`open("patient")` → 注册 8 个,description 注入当前患者 |
| 切换患者 | `open("patient")`(内部先 abort 旧的)→ 用新患者重注册 8 个;`close("route")`;导航到概览 |
| 进入 `/appointments/:id` | `open("route")` → 注册 `reschedule_appointment`,闭包捕获 appointment id |
| 离开该路由 | `close("route")` |
| 登出 | `closeAll()`;`open("auth")` |

状态标监听 `toolchange`(如可用)或在每次 open/close 后手动刷新计数。

---

## 8. 确认卡协议

### 状态机
```
idle ──showConfirm──▶ open ──user approves──▶ resolved(approved)
                        │──user declines────▶ resolved(declined)
                        │──60s elapsed──────▶ tool returns pending_user_confirmation
                        │                     card STAYS open; later user decision
                        │                     applies to store directly
                        └──second showConfirm─▶ second tool returns busy
```

### 实现
```ts
type ConfirmRequest = { title; detail; editable?: { label; value }; primaryLabel };
type ConfirmResult = { approved: true; editedValue?: string } | { approved: false } | { timeout: true };

export function showConfirm(req: ConfirmRequest): Promise<ConfirmResult> {
  if (store.confirm) return Promise.resolve({ approved: false, busy: true } as any);
  store.setConfirm(req);
  return new Promise((resolve) => {
    const t = setTimeout(() => { resolver = null; resolve({ timeout: true }); }, 60_000);
    resolver = (r) => { clearTimeout(t); resolve(r); };
  });
}
```
超时后 `store.confirm` 不清空;用户稍后点确认时,`resolveConfirm` 发现 `resolver === null`,直接执行 `req.onLateApprove()`(每个工具传入,做和正常路径相同的 store 变更)。

### 工具内模板
```ts
execute: async (input) => {
  navigate("/medications"); store.setHighlight({ kind: "medication", id: input.medication_id });
  const med = ds.getMedications(pid).find(m => m.id === input.medication_id);
  if (!med) return text({ status: "error", reason: "unknown medication_id", acting_for });
  if (!med.refillable) return text({ status: "requires_provider_approval", prescriber_id: med.prescriberId, acting_for });
  const r = await showConfirm({
    title: "Request refill",
    detail: `${med.name} ${med.dose} · ${med.daysRemaining} days left · prescribed by ${providerName(med.prescriberId)}`,
    primaryLabel: "Request refill",
    onLateApprove: () => ds.requestRefill(med.id),
  });
  store.setHighlight(null);
  if ("timeout" in r) return text({ status: "pending_user_confirmation", acting_for });
  if (!r.approved) return text({ status: (r as any).busy ? "busy" : "declined_by_user", acting_for });
  ds.requestRefill(med.id);
  return text({ status: "submitted", medication: med.name, acting_for });
}
```

### UX
- 顶部小字 "Your agent is requesting this action";标题;详情;可编辑 textarea(仅消息);主按钮 / "Decline"
- 遮罩点击不关闭
- 卡片打开时对应元素保持高亮

---

## 9. 签字流程(待办页)

点击待签文件 → modal:文件标题、一段假的同意书摘要、输入框 "Type your full name"、勾选 "I am the patient or an authorized proxy"、按钮 "Sign"。签后 `signed: true`,`what_requires_me` 不再返回它。**没有对应工具,故意的。**

---

## 10. 技术栈与目录

```
Vite + React 18 + TypeScript · zustand · react-router-dom · Tailwind(核心 utility)
类型:@mcp-b/webmcp-types(仅类型,不引入 polyfill)
托管:Vercel
```

```
src/
  main.tsx  App.tsx
  store.ts
  data/{types.ts, seed.ts, DataSource.ts, SeedDataSource.ts, FhirDataSource.ts}
  webmcp/{env.ts, registry.ts, text.ts, register.ts}
  webmcp/tools/{auth.ts, readonly.ts, confirm.ts, requiresMe.ts, route.ts}
  confirm/{ConfirmCard.tsx, confirm.ts}
  pages/{Login, Overview, Appointments, AppointmentDetail, Medications, Results, Todo}.tsx
  components/{TopBar, PatientSwitcher, WebMCPBadge, Highlightable, SignModal}.tsx
```

`env.ts`:
```ts
export const hasWebMCP = typeof document !== "undefined" && "modelContext" in document;
```
无原生 API:状态标显示 `unavailable` + 开启方法,`register.ts` 全部短路,页面照常工作。

---

## 11. 提交物

- **Live URL**:Vercel;表单里写 "Demo login button on the login page; no credentials needed"
- **文字说明**(英文,四问各 3–5 句):
  1. *Why WebMCP*:portals will never issue agent API keys; patient-access FHIR is read-only by law; WebMCP reuses the signed-in session and lets the portal decide what agents may do
  2. *Better UX*:one sentence → agent traverses four modules; the page follows the agent; two confirmations and one signature instead of ~40 clicks
  3. *Newly possible*:cross-module reasoning ("what's affected this week") that portals never do; in-page consent where the action lives; a deliberate not-exposed tier
  4. *How*:10 tools in three scopes (auth/patient/route) managed by AbortControllers; descriptions injected with the current patient; confirmation-card Promise protocol with 60s timeout; page navigation + highlight on every call
- **视频** < 3 min,公开 YouTube,旁白
- **仓库**:`LICENSE`(MIT)在根目录;README 含:介绍、运行、工具表(名称 / 级别 / 作用域 / 返回状态)、FHIR 映射表、Chrome flag 说明

### FHIR 映射表(README)
| 工具 | FHIR 资源 | 患者授权 API |
|---|---|---|
| get_upcoming_appointments | Appointment | 读 |
| get_medications | MedicationRequest | 读 |
| get_recent_results | Observation / DiagnosticReport | 读 |
| get_unread_messages | Communication | 读(部分机构) |
| request_refill | — | **不开放写** |
| send_message_to_provider | — | **不开放写** |
| reschedule_appointment | Appointment/$book | 极少开放 |
| 签字 | — | 无 |

### 视频分镜(2:40)
| 时间 | 内容 |
|---|---|
| 0:00–0:20 | Linda 每周替母亲处理医疗事务;门户是五个互不相通的模块 |
| 0:20–1:50 | 第 3 节主线。左边门户、右边 agent。每次页面导航停半秒,每次确认卡停一秒 |
| 1:50–2:20 | 代码:`registry.ts` 三个作用域;`request_refill` 的确认卡;`what_requires_me` 的 "there is no tool to sign" |
| 2:20–2:40 | "医院不会给 agent 发 API key。但它可以给自己的页面加两百行代码,然后决定 agent 能做什么、不能做什么。" |

---

## 12. 今日时间表(从开工算,单位小时)

| 时段 | 交付 | 检查点 |
|---|---|---|
| 0–1 | 仓库 + LICENSE + Vercel 空壳上线;store + seed + DataSource;路由骨架 | HTTPS URL 能打开 |
| 1–2.5 | 五个页面(不含预约详情);顶栏;患者切换;状态标 | 纯门户可用 |
| 2.5–3.5 | `registry.ts`;5 个只读工具 + `what_requires_me`;页面跟随 | Inspector 里能看到 6 个工具,调用后页面跳转高亮 |
| 3.5–4.5 | 确认卡组件 + 协议;`request_refill`、`send_message_to_provider`;签字 modal | 完整跑一遍 demo 脚本 |
| 4.5–5 | 患者切换重注册;HMR dispose;边角 | 切换后工具描述变了 |
| 5–5.5 | **录视频**(先录,P1 之后再说) | YouTube 链接 |
| 5.5–6.5 | README + FHIR 表 + 提交说明;截图;提交 | Devpost 显示已提交 |
| 剩余 | P1:预约详情 + `reschedule_appointment`;重录视频加那一拍 | 可选 |

**开工前先算:现在到 16:00 EDT 还剩几小时。少于 6.5 小时,直接砍掉 5–5.5 之外的所有 P1,视频不重录。**

---

## 13. 风险与降级

| 风险 | 降级 |
|---|---|
| ChatGPT 桌面端 site tools 不可用 | Chrome flag + Google Model Context Tool Inspector(Gemini)录;说明里注明 |
| 确认卡在 harness 里超时 | 已是协议的一部分:`pending_user_confirmation` + 卡片不关 |
| 患者切换重注册出 bug | 降级为不切换,Linda 直接以代理身份登录 Margaret;description 仍注入患者名 |
| 视频录不完 3 分钟版本 | 只录主线 90 秒 + 15 秒收尾,不切代码 |
| Vercel 构建失败 | Netlify drag-and-drop `dist/` |
