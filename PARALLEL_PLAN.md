# CarePortal — 并行开发计划 + 界面设计简报

配合 `DESIGN_v2.md` 使用。这份文档回答两件事:**怎么拆给多个 subagent 而不互相踩**,以及**页面怎么做到"牛逼"而不是"又一个 Tailwind 后台"**。

---

## 一、契约先行

并行的前提是接口先冻结。`src/` 里已经写好的这几个文件是契约,**任何 stream 都不改它们**;要改先在主线程改,再通知所有 stream:

| 文件 | 内容 | 谁依赖 |
|---|---|---|
| `data/types.ts` | 全部领域类型 + `Highlight` / `ActivityEntry` | 所有人 |
| `data/seed.ts` | demo 数据,日期以 2026-09-03 为今天 | 页面、工具 |
| `data/DataSource.ts` | 读写接口 + `FhirDataSource` 空壳 | README、工具 |
| `store.ts` | zustand:session、数据、`highlight`、`confirm`、`activity`、`navRequest`、`webmcp`;`ds` 和 `selectors` | 所有人 |
| `webmcp/registry.ts` | `openScope` / `closeScope` / `registerTool`;唯一碰 `document.modelContext` 的地方 | Stream B、Stream A(登录/切换时调) |
| `webmcp/helpers.ts` | `text()`、`follow()`、`actingPrefix()` | Stream B |
| `confirm/confirm.ts` | `showConfirm` / `resolveConfirm` / `statusFromResult`;60 秒协议 | Stream B、Stream C |
| `webmcp/tools/exemplars.ts` | `get_medications` 和 `request_refill` 的完整写法 | Stream B 照抄 |

三个跨 stream 的约定:

1. **页面从 `useStore` 读,写通过 `ds` 或 store action。** 页面不直接 import seed。
2. **导航只通过 `store.requestNavigate(path)`。** `App.tsx` 里一个 effect 监听 `navRequest` 调 `useNavigate`。工具在 React 外面,拿不到 router。
3. **高亮通过 `<Highlightable kind id>` 包一层。** 组件读 `store.highlight`,匹配就加样式并 `scrollIntoView`。所有可被工具引用的对象(预约卡、用药行、结果条、消息线程、待签文件)都要包。

---

## 二、Stream 划分

| Stream | 负责 | 只能碰的目录 | 产出检查点 |
|---|---|---|---|
| **A · 壳与页面** | `App.tsx` 路由 + 导航监听、`TopBar`、`PatientSwitcher`、五个页面、`Highlightable`、`WebMCPBadge`、`AgentRail`(右侧活动栏)、`SignModal` | `pages/`、`components/`、`App.tsx`、`main.tsx` | 不接 agent 也是一个完整能用的门户;切换患者数据跟着变;`activity` 里手动 push 一条能在右栏看到 |
| **B · 工具** | `webmcp/register.ts`(三个作用域的注册/注销时机)、`webmcp/tools/*`(10 个工具,照 exemplars) | `webmcp/` | Chrome flag 下 Inspector 能看到全部工具;调 `get_medications` 页面跳到用药页并高亮;`request_refill` 弹卡 |
| **C · 确认卡与签字** | `confirm/ConfirmCard.tsx`(含可编辑 textarea)、遮罩、超时后卡片保持、`SignModal` 的交互逻辑 | `confirm/`、`components/SignModal.tsx` | 直接在 console 调 `showConfirm({...})` 卡片出现;点确认 Promise resolve;60 秒后点确认走 `onLateApprove` |
| **D · 视觉系统** | Tailwind 配置、字体引入、全局样式、`Highlightable` 的高亮动画、`AgentRail` 条目入场动画、确认卡的视觉 | `tailwind.config`、`index.css`、`components/` 里的样式类(与 A 协调) | 见第三节的设计简报,逐条对照 |
| **E · 提交物** | `LICENSE`、`README.md`(工具表、FHIR 映射表、Chrome flag 说明)、Devpost 四问文案、视频分镜与旁白稿、Vercel 配置 | 仓库根目录、`docs/` | README 里工具表与 `register.ts` 一致 |

**A 和 D 的边界:** A 先用无样式或最简 Tailwind 把结构和数据绑定做出来;D 在 A 的组件上加视觉。D 不改 A 的 props 和数据流,A 不定最终颜色和字体。如果只有一个 agent 做前端,A+D 合并,但先做 A 的检查点再做 D。

**合并顺序:** 契约 → A(结构)+ C(确认卡)+ B(工具)三路并行 → 集成跑一遍 demo 脚本 → D 加视觉 → E 收尾。**视觉放在功能跑通之后**,否则最后没时间录视频。

---

## 三、界面设计简报

### 这个页面是给谁看的

一个 52 岁上班族,每周抽二十分钟替母亲处理医疗事务,视力开始下降,对医疗术语没安全感。她需要的不是"现代感",是**一眼看懂、不出错、有人在帮她**。评委看视频时会不自觉地代入这个人。

所以"牛逼"在这里的定义不是炫,是:**门户本身安静、可信、克制;agent 一介入,页面像活过来一样跟着它走。** 把所有的表现力都花在 agent 活动这一层,其他地方一律收着。

### 避开的东西

以下是 AI 生成页面的通病,这个项目一个都不许出现:
- 米色底 + 赤陶色强调 + 高对比衬线大标题
- 近黑底 + 荧光绿
- 一模一样的圆角卡片铺满、每张一样的灰投影、渐变装饰
- 全大写小字眉标、`A · B · C` 中点连接的元信息、按钮文字后面的 `→`
- 每个区块进场都淡入上浮、每张卡片 hover 都抬起

### 色板

| 名 | 值 | 用途 |
|---|---|---|
| Mist | `#F3F6F5` | 页面底 |
| Paper | `#FFFFFF` | 内容面 |
| Ink | `#182F2B` | 正文、标题 |
| Ink-soft | `#5A6B68` | 次要文字 |
| Line | `#D7E0DE` | 分隔、边框 |
| Teal | `#1D6A66` | 主操作、链接、当前导航 |
| Ochre | `#B0761C` | "需要你":剩余天数低、待签、未读 |
| Agent | `#5A4BD6` | **只用于 agent 活动**:高亮描边、右栏条目、确认卡顶边、状态标 |

Agent 色是整套系统里唯一的"外来色"——它不属于医疗门户的色彩世界,所以一出现就知道是 agent 在动。这是一个刻意的选择,不要在别处用它。

### 字体

**Atkinson Hyperlegible**(Google Fonts,免费)。它是为低视力用户设计的,字形歧义最小,这个选择本身就是照护者叙事的一部分,README 里可以提一句。全站一个家族,用字号和字重做层级:

- 页面标题 28px / 600
- 区块标题 18px / 600
- 正文 16px / 400,行高 1.55
- 次要 14px / 400,Ink-soft
- 数字(剩余天数、日期)用 `font-variant-numeric: tabular-nums`

不要用等宽字体做数据标签,不要用衬线做装饰。

### 布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  CarePortal                            Managing care for: [Margaret ▾] │
├──────────┬─────────────────────────────────────────┬─────────────────┤
│          │                                         │                 │
│ Overview │  Medications                            │  Agent activity │
│ Appts    │                                         │                 │
│ Meds  ●  │  ┌──────────────────────────────────┐   │  · Checked      │
│ Results ●│  │ Amlodipine 5 mg      5 days left │◀──│    Margaret's   │
│ To do  ● │  │ Once daily in the morning        │   │    medications  │
│          │  │ Dr. Alice Chen      [Request]    │   │  · Asked you to │
│          │  └──────────────────────────────────┘   │    confirm...   │
│          │  Metformin 500 mg          23 days left │                 │
│          │  ...                                    │                 │
│          │                                         │                 │
│          │                                         │ WebMCP native·8 │
└──────────┴─────────────────────────────────────────┴─────────────────┘
   200px                   flex, max 720px                  300px
```

- 左导航固定,五项,带 Ochre 圆点表示"这里有需要你的事"
- 主列左对齐,最大宽 720px,行长控制在 70 字以内
- 右栏 **Agent activity** 常驻。空状态一句话:"When your agent uses this page, its steps show here." 这个空状态在视频开头会出现一秒,它在告诉评委"看右边"
- 顶栏右侧是患者切换,措辞是 "Managing care for",不是 "Patient"

### 列表项,不是卡片

用药、预约、结果、文件都是**行**,不是卡片:上下用 Line 色 1px 分隔,左右不封边,没有投影。行内左边是主信息,右边是状态(天数、日期)。只有确认卡和签字 modal 是真正的"面"。

### Agent 活动层(把力气花在这)

**页面跟随。** 工具调用 → `requestNavigate` → 页面切换 → 目标行 `scrollIntoView({ block: "center" })` → 行的左侧出现 3px Agent 色竖线,行背景短暂染成 Agent 色 6% 透明度,1.5 秒内退回。不是闪烁,是"agent 的手指划过这里"。

**右栏条目。** 每条从右侧 12px 滑入,120ms,只在新增时。条目结构:一行文字(Ink),下面 12px 的工具名(Ink-soft)。`kind: "confirm"` 的条目左侧有 Agent 色竖线;`kind: "handoff"`(what_requires_me)的用 Ochre。

**确认卡。** 居中,宽 440px,Paper 底,顶部 4px Agent 色边。顶部一行 14px Ink-soft:"Your agent is asking you to confirm". 标题 20px,详情 16px。可编辑正文是一个无边框的 textarea,底部一条 Line。两个按钮:主按钮 Teal 实心,"Decline" 是文字按钮。遮罩是 Ink 40%。进场:从 96% 缩放到 100%,160ms。**没有倒计时显示**——超时是 agent 侧的事,不给人压力。

**状态标。** 右栏底部固定一行:`WebMCP native · 8 tools` 或 `WebMCP unavailable`,Agent 色小圆点。unavailable 时展开一行说明怎么开 flag。它是给评委看的,不是给 Linda 看的,所以放在角落。

**签字 modal。** 和确认卡同一种"面",但顶边是 Ochre 不是 Agent 色——视觉上告诉你:这次是你自己在做,不是 agent 请求。内容:标题、同意书摘要(seed 里的 `excerpt`)、"Type your full name" 输入框、一个勾选 "I am the patient or an authorized proxy"、按钮 "Sign"。

### 文案

- 按钮说它做的事:"Request refill" / "Send" / "Move appointment" / "Sign",不用 "Submit" / "OK"
- 状态用完整短句:"5 days left",不是 "5d"
- 空状态给方向:"No messages waiting for you."
- 顶栏切换的措辞 "Managing care for" 出现在概览横幅里也保持一致

### 质量底线

键盘可达、焦点可见、`prefers-reduced-motion` 下关掉滑入和缩放、对比度 4.5:1 以上、桌面优先但 1024px 以下不崩。

---

## 四、可以直接给 subagent 的任务描述

**Stream A**
> 读 `DESIGN_v2.md` 第 4 节和 `PARALLEL_PLAN.md` 第一、二节。基于 `src/store.ts` 和 `src/data/types.ts` 实现 `App.tsx`(react-router,监听 `store.navRequest` 调 `navigate`)、`TopBar` + `PatientSwitcher`、五个页面、`Highlightable`、`AgentRail`、`WebMCPBadge`。先不做视觉,用最少的 Tailwind 把结构和数据绑定做对。登录页有 "Sign in as Linda (demo)" 按钮,调 `store.login()` 后跳概览。切换患者调 `store.switchPatient` 并回概览。检查点:不接 agent 门户可用。

**Stream B**
> 读 `DESIGN_v2.md` 第 6、7 节和 `src/webmcp/tools/exemplars.ts`。实现 `webmcp/register.ts`:导出 `registerAuthScope()`、`registerPatientScope()`、`registerRouteScope(appointmentId)`、以及在 `store` 的 `loggedIn` / `currentPatient` 变化时(用 `useStore.subscribe`)自动切换作用域。实现全部 10 个工具,每个的 description 用 `actingPrefix()` 开头,每个 `execute` 第一件事调 `follow()`。confirm 层工具照 `requestRefillTool` 的写法。检查点:Chrome 开 `chrome://flags/#enable-webmcp-testing`,用 Model Context Tool Inspector 扩展看到工具,调用后页面跟随。

**Stream C**
> 读 `src/confirm/confirm.ts`。实现 `ConfirmCard.tsx`:从 `useStore` 读 `confirm`,渲染;可编辑时把 textarea 的值随 `resolveConfirm({ approved: true, editedValue })` 传回;Decline 调 `resolveConfirm({ approved: false })`。遮罩点击不关闭。实现 `SignModal.tsx` 的交互:输入姓名 + 勾选后才能点 Sign,调 `store.signDocument`。检查点:console 里 `showConfirm({...})` 弹卡;等 61 秒再点确认,`onLateApprove` 被调。

**Stream D**
> 读 `PARALLEL_PLAN.md` 第三节,逐条实现。先配 Tailwind 色板和字体,再做 `Highlightable` 动画、`AgentRail` 入场、确认卡与签字 modal 的视觉。不改任何 props 和数据流。做完对着"避开的东西"那一段自查。

**Stream E**
> 写 `LICENSE`(MIT)、`README.md`(项目一段介绍;本地运行;工具表:名称 / 级别 / 作用域 / 返回状态;FHIR 映射表见 `DESIGN_v2.md` 第 11 节;Chrome flag 与 ChatGPT 桌面端说明;字体选择说明一句)。写 Devpost 四问英文文案,每问 3–5 句。写视频旁白稿,按 `DESIGN_v2.md` 第 11 节分镜。

---

## 五、集成检查单

跑一遍 demo 脚本,逐项打勾:

- [ ] 登录页一键进入,右栏显示空状态
- [ ] 切到 Margaret,状态标工具数不变但 Inspector 里 description 变成 "[Acting for Margaret Lee via proxy access]"
- [ ] `get_patient_context` 返回 open_items 计数正确(1 unread, 1 low, 1 pending doc, 1 upcoming)
- [ ] `get_upcoming_appointments` → 页面跳预约页,`appt_chen_0908` 高亮
- [ ] `get_medications({only_low:true})` → 跳用药页,amlodipine 高亮,右栏一条
- [ ] `request_refill` → 确认卡;点确认后行状态变 "Refill requested";返回 `submitted`
- [ ] `request_refill({medication_id:"med_insulin"})` → 返回 `requires_provider_approval`,不弹卡
- [ ] `get_recent_results` → 跳结果页,CMP 展开
- [ ] `get_unread_messages` → 线程展开,返回 `thr_rivera_cmp`
- [ ] `send_message_to_provider` → 卡片正文可编辑,改一个词,Send;线程里出现新消息,未读清零
- [ ] `what_requires_me` → 跳待办页,同意书高亮,右栏条目是 Ochre
- [ ] 点同意书 → 签字 modal → 签后 `what_requires_me` 返回空
- [ ] 两个 confirm 工具并发,第二个返回 `busy`
- [ ] 等 61 秒不点,工具返回 `pending_user_confirmation`,卡片还在,再点确认生效
- [ ] (P1)进入预约详情,状态标 +1;`reschedule_appointment` 弹卡;离开页面 -1
- [ ] 无 flag 的 Chrome 打开,状态标 unavailable,页面照常
