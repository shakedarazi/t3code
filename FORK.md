# ה-fork של שקד

fork אישי של [T3 Code](https://github.com/pingdotgg/t3code). המטרה: לשרוד את קצב השחרורים של upstream עם מעט שינויים, רובם בקבצים חדשים.

## מבנה

- `main` — מראה של `upstream/main`. לא עורכים בו.
- `shaked` — `main` ועוד ערימה קטנה של קומיטים עצמאיים:

| קומיט    | מה                                                                                                    | מתי להוריד                            |
| -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `build:` | `fork/build.sh` — בנייה מקומית של DMG ל-arm64.                                                        | לא.                                   |
| `fork:`  | `fork/update.sh`, הקובץ הזה, ושורה בראש `AGENTS.md`.                                                  | לא.                                   |
| `fork:`  | `t3 thread settle <thread>` ב-`apps/server/src/cli/thread.ts` — Settled מבחוץ, ל-session-tree.        | כש-upstream יוסיף פקודה כזו.          |
| `fork:`  | `shownAt` על השיחה: כל הצגה של שיחה (`threadShown.ts`) היא `thread.visit` עם `shown`, ל-session-tree. | כש-upstream יפלוט את השיחה המוצגת.    |
| `fork:`  | `t3code://new?project=<id>`: שיחה חדשה וריקה בפרויקט (`_chat.new.tsx`), לחלונית של session-tree.      | כש-upstream יפתח שיחה בפרויקט מקישור. |

הקבצים של ה-fork עצמו יושבים ב-`fork/` וב-`FORK.md`, נתיבים ש-upstream לא נוגע בהם.

## עדכון מ-upstream

```bash
fork/update.sh
```

מושך את upstream, מזיז את `main`, עושה rebase ל-`shaked` עם `git rerere` (פתרון קונפליקט נזכר ומיושם שוב בפעם הבאה), ומריץ typecheck ובדיקות unit של `apps/web`. נעצר בקונפליקט שאין לו פתרון שמור. הקצה הקודם נשמר בתג `shaked-before-update`.

בקונפליקט: פותרים, `git add`, `git rebase --continue`, ואז `fork/update.sh --checks-only`. לוותר: `git rebase --abort`.

קומיט שהתרוקן (upstream כבר מכיל אותו) נזרק אוטומטית.

## בנייה

```bash
fork/build.sh
```

גרסה בצורה `<upstream>-preview.YYYYMMDD.HHMM`. גרסאות preview נארזות בלי ערוץ עדכונים (`isDesktopPreviewVersion` ב-`scripts/build-desktop-artifact.ts`), כך שעדכון אוטומטי של upstream לא ידרוס את הבנייה. הפלט: `release/T3-Code-<version>-arm64.dmg`.

הבנייה לא חתומה. האפליקציה נקראת "T3 Code (Beta)" ובעלת אותו appId כמו הגרסה הרשמית, כך שהתקנה מחליפה את `/Applications/T3 Code (Beta).app` ומשתמשת באותם נתונים.

דרוש: `cargo`, `cc`, `make`, `node`. `pnpm` — אם אינו מותקן, הסקריפטים מריצים את הגרסה המוצמדת ב-`package.json` דרך `npx`.

## מה T3 נותן

מה ש-session-tree (`~/Developer/session-tree`) נשען עליו, כמו שנבדק בקוד. בכל שאלה על יכולת: קודם התיעוד העדכני
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
- **שיחה שסוכן פותח** (`create_threads` ב-MCP של T3) נרשמת עם השיחה שפתחה אותה, ו-session-tree שם אותה כילד שלה.
- **המצב על הדיסק:** `~/.t3/userdata/statev2.sqlite`. לקריאה בלבד מבחוץ.
- **Settled מבחוץ** (ב-fork): `~/.t3/bin/t3 thread settle <thread>`, אותה פקודה של השרת שה-Settled בסיידבר ו-
  `t3_thread_organize` מפעילים. מדפיס `Settled.`; כישלון: שורה ב-stderr ויציאה 1.
- **השיחה ש-T3 מציג** (ב-fork): ‏`shownAt` על ה-shell של השיחה, בשעון השרת, בכל הצגה שלה (התראה, סיידבר, קישור),
  גם של שיחה שכבר נקראה. ה-`shownAt` החדש מכולם הוא השיחה המוצגת. הצגה לא מזיזה את סימן הקריאה (`lastVisitedAt`): שיחה
  שלא נקראה נשארת לא נקראה. בלי visit tracking אין גם `shownAt`.
