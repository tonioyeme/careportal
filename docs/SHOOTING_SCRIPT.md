# CarePortal — 逐帧录制脚本

开录前 30 秒：门户页 `Cmd+Shift+R` 硬刷新 · 关掉 DevTools · 扩展侧边栏点 Reset · 数 20 秒等 Gemini 限流恢复。
布局：门户在左，扩展侧边栏在右，两个都在画面里。

---

## 幕 1 — 登录页（0:00）

**画面**：CarePortal 登录页，不要有其他窗口。

**说**：
> This is Linda. Every week she spends an evening in her mother's patient portal.
> Margaret is seventy-eight. Three specialists. Six medications.
> The portal has everything Linda needs, in six screens that know nothing about each other.

**点**：`Sign in as Linda (demo)`

---

## 幕 2 — 切换患者（0:20）

**画面**：概览页，顶栏显示 Managing care for Linda Lee (you)。

**点**：顶栏下拉框，选 `Margaret Lee (proxy access)`

**说**：
> Linda manages her mother's care through proxy access.
> The moment she switches, all nine tools re-register. Every description now starts with "Acting for Margaret Lee via proxy access."
> The portal decides what the agent is looking at.

**点**：鼠标划过右下角 `WebMCP native · 9 tools`，再划过空的 Agent activity 栏

**说**：
> Nine tools, live on this page. No API key. No second login.
> Watch the right-hand column. Everything the agent does shows up there.

---

## 幕 3 — 第一轮，只读（0:40）

**点**：扩展侧边栏 User Prompt 输入框 → `Cmd+A`

**输入**（直接打字覆盖，不要先删）：
```
My mom has a cardiology follow-up next week and her blood pressure medication is almost out. Can you check?
```

**点**：`Send`

**说**（页面跳转时）：
> One sentence.
> It checks the appointments. And the page follows it. Doctor Chen, next Tuesday, in network.
> Then the medications. Amlodipine. Five days left. It found the one that matters.

**停两秒**，然后说：
> She is not reading a summary. She is watching the agent work in her own portal.

---

## 幕 4 — 第二轮，确认卡（1:15）★ 全片重点

**点**：输入框 → `Cmd+A`

**输入**：
```
Yes, please request the refill.
```

**点**：`Send`

**说**（卡片弹出前）：
> Now it wants to do something. So it has to ask.

**卡片弹出后停满一秒**，然后说：
> Nothing is submitted until Linda approves it.
> And that card is rendered by the portal, not by the agent.

**点**：确认卡上的 `Request refill`

**说**：
> Requested.

---

## 幕 4.5 — 保险（可选，约 20 秒）

只在总时长还有余裕时录。如果录完幕 4 已经超过 2 分 10 秒，跳过这一幕。

**点**：输入框 → `Cmd+A`

**输入**：
```
Was anything denied by her insurance?
```

**点**：`Send`

**画面**：跳到 Insurance 页，那笔被拒付的心脏超声高亮

**说**：
> Twelve hundred dollars, denied for a missing prior authorization. She had no idea.
> The plan has to let an app read this. Nothing in that rule lets an agent appeal it.
> So it tells her the reason and the deadline, and stops.

---

## 幕 5 — 第三轮，交还给人（1:45）

**点**：输入框 → `Cmd+A`

**输入**：
```
Anything else I need to do myself?
```

**点**：`Send`

**说**：
> This last tool doesn't do anything. It reports what the agent cannot do.

**画面**：页面跳到 To do，右栏出现土黄色竖线的条目

**说**：
> There is a consent form due next week. And there is no tool to sign it.
> The description says exactly that, to the agent, in plain language.

**点**：`Review and sign`

**输入**：姓名框打 `Linda Lee`

**点**：勾选 `I am the patient or an authorized proxy` → 点 `Sign`

**停一拍**，让顶边的土黄色留在画面上，然后说：
> Different color, on purpose. This one is hers.

---

## 幕 6 — 收尾（2:20）

**画面**：停在 To do 页，右栏六条活动全部可见，底部状态标在画面里。

**说**：
> Patient-access FHIR gives you reads. It will never give you "act as the patient."
> That half exists only inside the portal, and that half is what Linda's evening is actually made of.
>
> No hospital is going to hand your agent an API key.
> But it can add two hundred lines to its own page, and decide exactly what an agent may do.
> And what it may never do.

---

## 出状况

| 情况 | 怎么办 |
|---|---|
| 429 限流 | 暂停 20 秒接着录，后期剪掉。**不要重头来。** |
| Gemini 某轮不调工具 | 用侧边栏下方 Tool 面板手动 Execute 那个工具。页面行为一样，不烧额度。 |
| 确认卡超过 60 秒没点 | 工具返回 `pending_user_confirmation`，卡片不关，照点即可，效果一样。 |
| 时间不够 | 砍掉幕 3 的第二段旁白，别砍幕 4 和幕 5。 |
