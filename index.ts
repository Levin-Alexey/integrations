import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
    TG_BOT_TOKEN: string;
    TG_CHAT_ID: string;
    WEBHOOK_SECRET: string;
};

type SiteMainPayload = {
    name?: string;
    contactInfo?: string;
    niche?: string;
    selectedFeatureLabels?: string[];
    source?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Разрешаем отправку запросов из браузера с вашего сайта
app.use(
    '/hooks/*',
    cors({
        origin: '*',
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
    })
);

// Защита от спама по секретному ключу в URL (?secret=...)
app.use('/hooks/*', async (c, next) => {
    if (c.req.query('secret') !== c.env.WEBHOOK_SECRET) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
});

// Экранирование спецсимволов, чтобы Telegram не выдал ошибку при символах <, >, & в тексте клиента
function escapeHtml(str?: string): string {
    if (!str) return '-';
    return str
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>');
}

// Отправка сообщения в Telegram
async function sendTelegram(env: Bindings, text: string) {
    const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: env.TG_CHAT_ID,
            text,
            parse_mode: 'HTML',
        }),
    });

    if (!res.ok) {
        console.error('Telegram API error:', await res.text());
    }
}

// =====================================================================
// ОБРАБОТЧИК 1: Основной сайт (ИИ-разработка — ContactForm.tsx)
// =====================================================================
app.post('/hooks/site-main', async (c) => {
    const data = await c.req.json<SiteMainPayload>();

    const featuresText =
        data.selectedFeatureLabels && data.selectedFeatureLabels.length > 0
            ? data.selectedFeatureLabels.map((f) => `• ${escapeHtml(f)}`).join('\n')
            : 'Не выбраны';

    const text = [
        '🚀 <b>Новая заявка: ИИ-разработка</b>',
        '',
        `👤 <b>Имя:</b> ${escapeHtml(data.name)}`,
        `📧 <b>Контакт:</b> ${escapeHtml(data.contactInfo)}`,
        `📝 <b>О проекте:</b> ${escapeHtml(data.niche)}`,
        '',
        `⚙️ <b>Интересующие функции:</b>`,
        featuresText,
        '',
        `🌐 <i>Источник: ${escapeHtml(data.source || 'site-main_t/contact-form')}</i>`,
    ].join('\n');

    c.executionCtx.waitUntil(sendTelegram(c.env, text));

    return c.json({ ok: true });
});

export default app;