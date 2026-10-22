# ה-fork של שקד

fork אישי של [T3 Code](https://github.com/pingdotgg/t3code). המטרה: לשרוד את קצב השחרורים של upstream עם מעט שינויים, רובם בקבצים חדשים.

## מבנה

- `main` — מראה של `upstream/main`. לא עורכים בו.
- `shaked` — `main` ועוד ערימה קטנה של קומיטים עצמאיים:

| קומיט       | מה                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | מתי להוריד                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `rtl:`      | עברית וערבית לפי הכתב הדומיננטי בצ'אט ובשורת הכתיבה. port של [PR #16839](https://github.com/pingdotgg/t3code/pull/16839), חלק ה-web בלבד.                                                                                                                                                                                                                                                                                                                                                 | כש-upstream ממזג את ה-PR (או פותר את [#13622](https://github.com/pingdotgg/t3code/issues/13622)). |
| `build:`    | `fork/build.sh` — בנייה מקומית של DMG ל-arm64.                                                                                                                                                                                                                                                                                                                                                                                                                                            | לא.                                                                                               |
| `fork:`     | `fork/update.sh` והקובץ הזה.                                                                                                                                                                                                                                                                                                                                                                                                                                                              | לא.                                                                                               |
| `signpost:` | השלט של session-tree בתחתית הסיידבר: RPC קריא-בלבד `stree.view` שמחזיר את `stree view --json` מפוענח לפי schema ב-contracts (`apps/server/src/signpost/`), שורה בעברית (`SidebarSignpost.tsx`, `signpost.logic.ts`), מפה של העץ שנפתחת מהשורה, קוראת בלבד (`SignpostMap.tsx`, `signpostMap.logic.ts`), והפעלה של `stree bridge` לבד בכל פרויקט פתוח שיש בו עץ, אחד לכל ריפו (`BridgeLauncher.ts`, `bridgeRestart.logic.ts`). העט: `STREE_COMMAND` אם השרת רואה אותו, אחרת `stree` ב-PATH. | לא.                                                                                               |

### `signpost:`

קבצים חדשים: `packages/contracts/src/signpost.ts`; ב-`apps/server/src/signpost/`: `StreeView.ts`, `BridgeLauncher.ts`, `streeCommand.ts`, `bridgeRestart.logic.ts` ובדיקות; ב-`apps/web/src/`: `state/signpost.ts`, ב-`components/sidebar/`: `SidebarSignpost.tsx`, `SignpostMap.tsx`, `useSignpost.ts`, `signpost.logic.ts` ו-`signpostMap.logic.ts` ובדיקות. שורה או שתיים ב-upstream: `rpc.ts`, `index.ts` (contracts), `ws.ts`, `ws.test.ts`, `server.ts`, `RpcAuthorization.ts`, `RpcInstrumentation.ts`, `SidebarChrome.tsx`.

השרת: `StreeView` (שירות לכל חיי השרת, ב-`server.ts`) מריץ `stree view --json` ושומר את התשובה לכל תיקייה כ-2 שניות, כך שהרבה לקוחות לא מריצים הרבה תהליכים. בלי יומן או מחוץ לריפו של git: אין עץ, והשורה לא מופיעה. בלי `stree` ב-PATH שהשרת רואה: מצב משלו בחוזה (`{ stree: "missing" }`, לא "אין עץ"), השורה אומרת "השלט לא זמין: stree לא מותקן" בלי קישור, המפה לא מופיעה, ואף גשר לא מופעל. כל כשל אחר: "השלט לא זמין".

הגשר: כשיש עץ, `BridgeLauncher` מוודא ש-`stree bridge --json` רץ כתהליך-בן, אחד לכל תיקייה משותפת של git. זה נבדק בכל שאילתה של השלט, וגם בהפעלת השרת וכל 30 שניות לכל הפרויקטים הפתוחים ב-T3, גם כשאף אחד לא מסתכל עליהם. נופל: עולה שוב אחרי המתנה שמכפילה את עצמה מ-1s עד דקה (מתאפסת אחרי 30s של ריצה), ובזמן הזה השלט אומר "השלט לא זמין". יוצא עם `no-token`: לא מנסים שוב עד שקובץ ה-token משתנה (בודקים רק קיום, זמן וגודל, אף פעם לא את התוכן), והשלט אומר "הגשר לא רץ: חסר token". עץ בלי קשירה (הגשר עוד לא רץ שם): הסיבה ו"הגשר עוד לא רץ כאן", בלי קישור. התהליכים נסגרים עם השרת.

הפקודה מוגדרת במקום אחד, `streeCommand.ts`: `STREE_COMMAND` (מפוצל ברווחים, למשל `bun /path/to/session-tree/src/cli/stree.ts`), ובלעדיו `stree` ב-PATH. האפליקציה הארוזה לא מקבלת משתני סביבה משלנו, רק את ה-PATH שהיא לוקחת מה-login shell (`zsh -ilc`, ב-`DesktopShellEnvironment.ts`), ו-`~/.bun/bin` לא בו. לכן מתקינים פעם אחת מהתיקייה של session-tree: `bun src/cli/stree.ts install`, שיוצר קישור `~/.local/bin/stree` (תיקייה שב-PATH הזה) לעותק הזה (ראו README של session-tree). השורה הראשונה של `stree.ts` היא `#!/usr/bin/env bun`, אז גם `bun` צריך להיות באותו PATH (`/opt/homebrew/bin` בו).

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
