# ה-fork של שקד

fork אישי של [T3 Code](https://github.com/pingdotgg/t3code). המטרה: לשרוד את קצב השחרורים של upstream עם מעט שינויים, רובם בקבצים חדשים.

## מבנה

- `main` — מראה של `upstream/main`. לא עורכים בו.
- `shaked` — `main` ועוד קומיט אחד לכל שורה בטבלה. תיקון לנושא קיים נכנס לקומיט שלו ב-`git commit --fixup`, ו-`git rebase --autosquash`. ההיסטוריה שלפני הכיווץ שמורה בתג `shaked-before-squash`:

| קומיט    | מה                                                                                                                                                                                                                            | מתי להוריד                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `build:` | `fork/build.sh` — בנייה מקומית של DMG ל-arm64.                                                                                                                                                                                | לא.                                                          |
| `fork:`  | `fork/update.sh`, הקובץ הזה, ופתיח בראש `AGENTS.md`.                                                                                                                                                                          | לא.                                                          |
| `fork:`  | שיחה שסוכן פותח (`t3_thread_launch`, `create_threads`) נרשמת עם השיחה שפתחה אותה ב-`lineage.parentThreadId` (`launchedFrom` ב-`thread.create`; `ThreadLaunchService.ts`, `Orchestrator.ts`), `relationshipToParent` נשאר ריק. | כש-upstream ירשום אבא לשיחה שנפתחה ב-launch.                 |
| `fork:`  | עץ בתצוגת התיקיות של הסיידבר: הזחה לפי עומק, קו אפור לאב וסימן (`components/sidebar/threadTree.ts`, `SidebarThreadTreeMark.tsx`). subagents מוצגים ב-Lineage, לא כאן.                                                         | כש-upstream יצייר עץ בסיידבר.                                |
| `fork:`  | דף `html_render` שולח את הטקסט של האדם לשיחה ב-`ui/message`, כמו MCP App, רק מלחיצה (`HtmlRenderFrame.tsx`, `BrowserDocumentFrame.tsx`, `packages/shared/src/htmlRender.ts`).                                                 | כש-upstream ירשה לדף `html_render` לשלוח הודעה לשיחה.        |
| `fork:`  | `/clear` מתחיל סשן חדש באותה שיחה: העתק של [#30323](https://github.com/pingdotgg/t3code/pull/30323) ו-[#30325](https://github.com/pingdotgg/t3code/pull/30325) של upstream, ב-`5a80b42`.                                      | כששני ה-PRs ימוזגו: מורידים את הקומיט לפני `fork/update.sh`. |

## מחכים ל-upstream

מה ש-`/upstream-check` בודק בכל ריצה. אלה העתקים של PR פתוחים של תורמים ב-upstream, לא שינויים שלנו: הקידומת `fork:` מסמנת
אותם כמו כל קומיט של ה-fork, אבל הקוד לא נכתב כאן, ואסור לפתח אותו הלאה כאן. כשה-PR מוזג, מורידים את הקומיט לפני
`fork/update.sh` ומוחקים את השורה.

| PR                                                                                                                 | מחבר            | מה הוא פותר                  | הקומיט שלנו שיורד                     |
| ------------------------------------------------------------------------------------------------------------------ | --------------- | ---------------------------- | ------------------------------------- |
| [#30323](https://github.com/pingdotgg/t3code/pull/30323), [#30325](https://github.com/pingdotgg/t3code/pull/30325) | Julius Marminge | `/clear` בסשן חדש באותה שיחה | `fork: /clear starts a fresh session` |

ארבעת הקומיטים שהיו בשביל החלונית של session-tree (Settings סוגר את הסיידבר, מצב הסיידבר ורוחבו, `t3code://new?project=`) הוסרו; הם שמורים בתג `panel-patches-archive`.

הקבצים של ה-fork עצמו יושבים ב-`fork/` וב-`FORK.md`, נתיבים ש-upstream לא נוגע בהם.

## עדכון מ-upstream

1. `/upstream-check`: מה חדש, מה יורד, מה יתנגש. קריאה בלבד.
2. PR שמוזג: מורידים את הקומיט שלו ואת השורה שלו ב"מחכים ל-upstream".
3. `fork/update.sh`.
4. `git push --force-with-lease origin shaked`. ה-rebase כותב את הערימה מחדש, אז זו תמיד דחיפה בכוח. hook חוסם אותה לסוכן, ושקד מריץ.
5. `fork/build.sh`, ומתקינים את ה-DMG.

`fork/update.sh` מושך את upstream, מזיז את `main`, עושה rebase ל-`shaked` עם `git rerere` (פתרון קונפליקט נזכר ומיושם שוב בפעם הבאה), ומריץ `vp run check:changed upstream/main` על כל מה שה-fork משנה. הקצה הקודם נשמר בתג `shaked-before-update`.

בקונפליקט שאין לו פתרון שמור הוא נעצר: פותרים, `git add`, `git rebase --continue`, ואז `fork/update.sh --checks-only`. לוותר: `git rebase --abort`. ב-`agentContextBudget.json` מוסיפים את התוספת של ה-fork למספרים של upstream.

קומיט שהתרוקן (upstream כבר מכיל אותו) נזרק אוטומטית.

## בנייה

```bash
fork/build.sh
```

גרסה בצורה `<upstream>-preview.YYYYMMDD.HHMM`. גרסאות preview נארזות בלי ערוץ עדכונים (`isDesktopPreviewVersion` ב-`scripts/build-desktop-artifact.ts`), כך שעדכון אוטומטי של upstream לא ידרוס את הבנייה. הפלט: `release/T3-Code-<version>-arm64.dmg`.

הבנייה לא חתומה. האפליקציה נקראת "T3 Code (Beta)" ובעלת אותו appId כמו הגרסה הרשמית, כך שהתקנה מחליפה את `/Applications/T3 Code (Beta).app` ומשתמשת באותם נתונים.

דרוש: `cargo`, `cc`, `make`, `node`. `pnpm` — אם אינו מותקן, הסקריפטים מריצים את הגרסה המוצמדת ב-`package.json` דרך `npx`.

## צורת העבודה

המונחים (יחידת עבודה, גזע, עותק, מיזוג) וההחלטות יושבים ב-lossless: `content/modules/steering/model/GLOSSARY.md`, הסעיף
"צורת העבודה" ב-`content/modules/steering/module.md`, ו-`content/modules/steering/model/docs/adr/0016-merge-on-github.md`.
הקובץ הזה לא מגדיר אותם.

## מה T3 נותן

מה שהעבודה נשענת עליו ב-T3, כמו שנבדק בקוד. בכל שאלה על יכולת: קודם התיעוד העדכני
(`AGENTS.md`), ואז לעדכן כאן.

- **הרשאות:** `~/.t3/bin/t3 auth session issue --scope <scope> --ttl <זמן> --token-only`. שקד מנפיק, בטרמינל שלו, לא
  סוכן. קריאה: `orchestration:read`; ארכיון, ייבוא ופרויקטים: `orchestration:operate`. הכתובת של השרת ב-
  `~/.t3/userdata/server-runtime.json`.
- **ה-API:** WebSocket ב-`/ws` עם כרטיס מ-`/api/auth/websocket-ticket`. ‏`orchestration.subscribeShell` (תמונה של
  הפרויקטים והשיחות), ‏`orchestration.dispatchCommand` (‏`thread.archive` ועוד), ‏`projects.mutate`
  (‏`project.create`, ‏`project.delete`), ‏`agentSessions.import`. השמות ב-`packages/contracts/src/rpc.ts`.
- **הסרת פרויקט מוחקת את השיחות שלו לצמיתות,** גם אלה שבארכיון (`deleteChildThreads` ב-`ProjectService.ts`). התיקייה
  נשארת.
- **ייבוא מ-Claude Code ו-Codex** (`AgentSessionImporter.ts`): לפי פרויקט, מ-`~/.claude/projects`, רק שיחות שה-`cwd`
  שלהן הוא השורש של הפרויקט. שיחה שרצה ב-worktree לא נכנסת. עד 100 שיחות בכל ייבוא, ו-200 הודעות מוצגות בכל שיחה.
  המזהה של שיחה מיובאת: `import:<instance>:<session id>`.
- **"שינויים" בצד ימין:** כל הענף מול הבסיס שלו, מנקודת ההתפצלות. הבסיס נרשם כש-T3 יוצר worktree
  (`branch.<b>.gh-merge-base`), וזה ענף ההורה. הערה על שורה נשלחת לסוכן.
- **PR:** רשימה ב-`/pull-requests`; לסוכן `link_pull_request`, ‏`watch_pull_request`, ‏`write_pull_request_guides`.
  מיזוג של PR סוגר את השיחה (`ThreadSettlementService.ts`).
- **שיחה שמתארכת:** הכלי של T3 שמשמש את `/handoff` הוא `t3_thread_send` עם `freshContext: true` לשיחה של עצמה: ההודעה נכנסת
  לתור, ומתחילה סשן נקי כשהתור נגמר. בלי הכלי: `/clear` ואז הפקודה. השיחה, הילדים וה-Lineage נשארים.
- **שיחה שסוכן פותח** (`t3_thread_launch`, `create_threads`; ב-fork) נרשמת עם השיחה שפתחה אותה, ומופיעה מתחתיה בעץ
  בסיידבר.
- **פתיחת ילד מהממשק:** אין ב-T3 פעולה כזו. `/lineage` שולח את הבקשה דרך הסוכן של ההורה, עם המודל והריתמה שנבחרו.
- **המצב על הדיסק:** `~/.t3/userdata/statev2.sqlite`. לקריאה בלבד מבחוץ.
