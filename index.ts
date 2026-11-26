import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
    TG_BOT_TOKEN: string;
    TG_CHAT_ID: string;
    WEBHOOK_SECRET: string;
};

type SiteMainPayload = {
    name?: string | null;
    contactInfo?: string | null;
    niche?: string | null;
    selectedFeatureLabels?: string[];
    source?: string | null;
};

type VkKidsLeadPayload = {
    lead_id?: number | null;
    vk_id?: number | null;
    parent_name?: string | null;
    child_name?: string | null;
    course?: string | null;
    child_age_group?: string | null;
    experience_level?: string | null;
    notes?: string | null;
    preferred_time_custom?: string | null;
    phone?: string | null;
    email?: string | null;
};

const app = new Hono<{ Bindings: Bindings }>();

// Разрешаем отправку запросов из браузера с вашего сайта
app.use(
    '/hooks/*',
    cors({
        origin: (origin) => origin || '*',
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'X-Webhook-Secret'],
        maxAge: 86400,
    })
);

app.use('/hooks/*', async (c, next) => {
    const providedSecret = c.req.header('X-Webhook-Secret') || c.req.query('secret');

    if (!providedSecret || providedSecret !== c.env.WEBHOOK_SECRET) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
});

// Экранирование спецсимволов, чтобы Telegram не выдал ошибку при символах <, >, & в тексте клиента
function escapeHtml(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
            disable_web_page_preview: true,
        }),
    });

    const result = await res.json();
    if (!res.ok) {
        console.error('Telegram API error:', JSON.stringify(result));
    }
    return { ok: res.ok, status: res.status, result };
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

    const tg = await sendTelegram(c.env, text);

    if (!tg.ok) {
        return c.json({ ok: false, telegramError: tg.result }, 502);
    }

    return c.json({ ok: true });
});

const COURSE_LABELS: Record<string, string> = {
    ai: 'ИИ и нейросети',
    programming: 'Программирование',
    need_help: 'Нужна помощь с выбором',
};

app.post('/hooks/vk-kids', async (c) => {
    const data = await c.req.json<VkKidsLeadPayload>();

    const courseName = data.course
        ? COURSE_LABELS[data.course] || escapeHtml(data.course)
        : '-';
    const ageGroup = data.child_age_group
        ? escapeHtml(data.child_age_group.replace(/_/g, '–'))
        : '-';
    const vkLink = data.vk_id
        ? `<a href="https://vk.com/id${data.vk_id}">id${data.vk_id}</a>`
        : '-';

    const lines = [
        `🎓 <b>Новая заявка из ВК: Обучение детей</b>${data.lead_id ? ` (#${data.lead_id})` : ''}`,
        '',
        `👨‍👩‍👧 <b>Родитель:</b> ${escapeHtml(data.parent_name)}`,
        `🧒 <b>Ребёнок:</b> ${escapeHtml(data.child_name)} (возраст: ${ageGroup})`,
        `📚 <b>Направление:</b> ${courseName}`,
        `📱 <b>Телефон / мессенджер:</b> ${escapeHtml(data.phone)}`,
        `📧 <b>Email:</b> ${escapeHtml(data.email)}`,
        `⏰ <b>Удобное время:</b> ${escapeHtml(data.preferred_time_custom)}`,
    ];

    if (data.experience_level) {
        lines.push(`📊 <b>Опыт:</b> ${escapeHtml(data.experience_level)}`);
    }

    if (data.notes) {
        lines.push(`📝 <b>Заметки о ребёнке:</b> ${escapeHtml(data.notes)}`);
    }

    lines.push('', `🔵 <b>Профиль ВК:</b> ${vkLink}`);

    const tg = await sendTelegram(c.env, lines.join('\n'));

    if (!tg.ok) {
        return c.json({ ok: false, telegramError: tg.result }, 502);
    }

    return c.json({ ok: true });
});

export default app;