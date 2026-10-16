# КБЖУ — голосовой дневник питания (PWA)
Говоришь «на завтрак два яйца и кофе с молоком…» → приложение разбирает продукты, граммы и приёмы пищи → подтверждаешь → запись.
- `db.js` — встроенная база (сборка: `python3 tools/build_db.py` из `tools/data_base.txt`)
- `parser.js` — разбор русской фразы (общий для голоса и клавиатуры), тесты: `node tests/parser.test.js`
- e2e: `tests/e2e.py` (Playwright, 440px, имитация распознавания речи)
Данные хранятся только в localStorage устройства; экспорт/импорт JSON во вкладке «Ещё».
- `nutri.js` — «Нутрициолог» (оценка /10, сильные стороны, проблемы с заменами, план), тесты: `node tests/nutri.test.js`
- `micro.js` — 30 микронутриентов на 100 г (сборка: `python3 tools/usda_match.py && python3 tools/build_micros.py`, нужен USDA SR Legacy CSV в /workspace/usda). Флаг источника `MSRC`: u=USDA, d=производное, c=по составу блюда, e=оценка
- `micros.js` — нормы МР 2.3.1.0253-21 (EFSA/NIH где нет), анализ, советы; тесты: `node tests/micros.test.js`
