# Развёртывание в Cloudflare Workers

Установите зависимости и авторизуйтесь в Cloudflare:

```sh
npm install
npx wrangler login
```

Добавьте секреты Worker (команды запросят их значения):

```sh
npx wrangler secret put TG_BOT_TOKEN
npx wrangler secret put TG_CHAT_ID
npx wrangler secret put WEBHOOK_SECRET
```

Разверните Worker:

```sh
npm run deploy
```

Для локального запуска создайте файл `.dev.vars` со значениями этих трёх
переменных и выполните `npm run dev`. Не добавляйте `.dev.vars` в Git.
