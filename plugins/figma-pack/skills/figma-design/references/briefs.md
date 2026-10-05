# Briefs for Figma design work

Post the brief to the user before the frame plan. Unknowns become explicit assumptions. Web pages use the `react-page-ux` brief (frontend-pack) unchanged; the formats below cover mobile apps and multi-page sites.

## Mobile screen brief (iOS / Android)

```
Экран: <name>, платформа: iOS / Android / обе; вход: <tab, push, deep link, modal>
Пользователь: <role>, цель: <job to be done>
Главное действие: <verb + object> - где: кнопка внизу над safe area / в top bar / FAB (Android)
Иерархия: 1) <first thing the eye hits> 2) <...> 3) <...>
Навигация: top bar (заголовок, назад, 1-2 действия) | bottom navigation: <tabs> | модальный экран / bottom sheet
Состояния: загрузка (skeleton) / пусто (первый раз) / пусто (ничего не найдено) / ошибка (повторить) /
           нет сети (офлайн-баннер, кеш) / нет доступа / частичные данные / pull-to-refresh / пагинация
Ввод: клавиатура (тип: email, number, phone), что поднимается над клавиатурой, автофокус
Платформа: safe areas (status bar, home indicator / gesture bar), 44pt (iOS) / 48dp (Android) цели,
           системные паттерны (iOS: large title, swipe back, action sheet; Android: top app bar, FAB, snackbar)
Размеры кадров: iOS 390 (393), Android 360 (412); тёмная тема: да/нет (через режим переменных)
Доступность: Dynamic Type / font scale 200% - что переносится; подписи для иконок; порядок чтения
Тексты: заголовок, кнопки (глагол), пустые состояния, ошибки - на языке продукта
Допущения: <...>
```

Mobile rules for the frame plan:

- The primary action sits in the thumb zone (bottom) or in the top bar for "save/done"; never two primaries.
- Lists are cards or rows with a 44/48 hit area; tables become stacked rows; filters move to a bottom sheet.
- Bottom navigation: 3-5 destinations, labels always visible; the current tab is marked.
- Keyboard frame for every form screen (the focused field and the submit button stay visible).
- Offline and slow-network states are designed, not assumed.

## Site map (several pages)

```
Сайт/продукт: <name>, цель сайта: <business goal>, основная аудитория: <...>
Страницы:
  1. <Page> (<route>) - цель: <...>, главное действие: <...>
  2. ...
Общие блоки: Header <catalog block>, Footer <catalog block>, навигация: <items>
Брейкпоинты: 1440 / 768 / 375 (что меняется глобально: меню -> бургер, сетка 12 -> 4)
Тема: светлая / тёмная / обе
Порядок работы: <which page first and why>
```

Then one page brief per page (react-page-ux format for web), short - 8-15 lines each.

## Marketing page brief addition

For landing/marketing pages add to the web brief:

```
Оффер: <one sentence value proposition>
Доказательства: <logos, numbers, testimonials - from the client, not invented>
Секции по порядку: <hero -> problem -> features -> pricing -> faq -> cta> с блоком каталога для каждой
CTA: <one primary call to action repeated at hero and end>
```

Every section maps to a catalog block (category `hero`, `features`, `pricing`, `testimonials`, `faq`, `cta`, `footer`). No invented customer logos, reviews or numbers - placeholders named `Content: <what is needed>` instead.
