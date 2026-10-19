# ה-fork של שקד

fork אישי של [T3 Code](https://github.com/pingdotgg/t3code). המטרה: לשרוד את קצב השחרורים של upstream עם מעט שינויים, רובם בקבצים חדשים.

## מבנה

- `main` — מראה של `upstream/main`. לא עורכים בו.
- `shaked` — `main` ועוד ערימה קטנה של קומיטים עצמאיים:

| קומיט    | מה                                                                                                                                        | מתי להוריד                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `rtl:`   | עברית וערבית לפי הכתב הדומיננטי בצ'אט ובשורת הכתיבה. port של [PR #16839](https://github.com/pingdotgg/t3code/pull/16839), חלק ה-web בלבד. | כש-upstream ממזג את ה-PR (או פותר את [#13622](https://github.com/pingdotgg/t3code/issues/13622)). |
| `build:` | `fork/build.sh` — בנייה מקומית של DMG ל-arm64.                                                                                            | לא.                                                                                               |
| `fork:`  | `fork/update.sh` והקובץ הזה.                                                                                                              | לא.                                                                                               |

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
