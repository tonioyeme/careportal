# Demo video — narration script

The 2:54 demo video is one unbroken screen recording of the live site, driven by
Gemini through the Model Context Tool Inspector extension that Chrome's own
WebMCP documentation recommends. Nothing inside the interaction is cut. The only
edits are a still frame held under the opening narration, and two short trims
where the model was thinking and nothing moved on screen.

Timestamps are where each line begins in the finished video.

| Time | Narration |
|---|---|
| 0:00 | Health information is scattered. Your appointments are on one screen, your prescriptions on another, your lab results on a third, and none of them tell you what any of it means. Doing it for somebody else is harder still, and a lot of people do: for a parent, or for several people at once. This is CarePortal. It's a patient portal, and a demo. What's different is that the page publishes a set of tools an assistant is allowed to call, through the WebMCP browser API. The assistant is on the right. No API key, no separate login. |
| 0:32 | So let's watch somebody use it. Linda manages care for her mother Margaret, who is seventy eight. |
| 0:47 | She switches over to her mother's record. All nine tools just re-registered, and every one of them now says she is acting by proxy. |
| 0:56 | She types: does my mom have anything coming up with her cardiologist? |
| 1:03 | The assistant checks, and the page follows it over to the appointments list. Doctor Chen, next Tuesday, in network. |
| 1:11 | Next: is any of her medication running low? |
| 1:15 | Amlodipine, five days left. The page moves again and marks the row. |
| 1:22 | She answers: yes, please request the refill. |
| 1:26 | Everything up to this point was read only, so the assistant just went ahead and did it. This one changes something, so it isn't allowed to. |
| 1:36 | That card is drawn by the portal, not by the assistant. Nothing gets submitted until Linda presses the button herself. |
| 1:43 | She approves it, and the refill goes in. |
| 1:50 | Now the billing side. Was anything denied by her insurance? |
| 1:55 | An echocardiogram from August. Twelve hundred dollars, denied for a missing prior authorization. |
| 2:01 | And the last one. Anything else that only I can do? |
| 2:06 | And that's the point. Her insurance is required by law to let software read that claim, but nothing in that law lets an assistant file the appeal. Only she can do that. Same gap as the refill. |
| 2:22 | So this tool doesn't really do anything. Its whole job is to report what the assistant can't do. There's a consent form waiting, and there is no tool anywhere that signs it. |
| 2:35 | She signs it herself. Different colour on that one, on purpose. No hospital is ever going to hand your assistant an API key. But it can add a couple hundred lines to its own page, and decide for itself what an assistant is allowed to do, and what it never will be. |
