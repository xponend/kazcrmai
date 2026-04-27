import "dotenv/config";
import mongoose from "mongoose";
import { User, type Role } from "./models/User";
import { Client } from "./models/Client";
import { Ticket, type TicketPriority, type TicketStatus } from "./models/Ticket";
import { TicketHistory } from "./models/TicketHistory";
import type { Category } from "./lib/ai/classify";

const users: Array<{ name: string; email: string; password: string; role: Role; skills: string[] }> = [
  { name: "Админ Системы", email: "admin@crm.kz", password: "admin123", role: "admin", skills: ["all"] },
  { name: "Менеджер Алия", email: "aliya@crm.kz", password: "pass123", role: "manager", skills: ["billing", "complaint"] },
  { name: "Айжан Серікова", email: "aizhan@crm.kz", password: "pass123", role: "operator", skills: ["technical_issue", "urgent_outage", "account_access"] },
  { name: "Бауыржан Қасымов", email: "baurzhan@crm.kz", password: "pass123", role: "operator", skills: ["billing", "general_inquiry", "feature_request"] },
  { name: "Дана Нұрланова", email: "dana@crm.kz", password: "pass123", role: "operator", skills: ["integration", "technical_issue", "feature_request"] },
  { name: "Ерлан Мұратов", email: "erlan@crm.kz", password: "pass123", role: "operator", skills: ["complaint", "general_inquiry", "billing"] },
  { name: "Гүлнар Ахметова", email: "gulnar@crm.kz", password: "pass123", role: "operator", skills: ["account_access", "technical_issue", "urgent_outage"] },
];

const clients = [
  { name: "ТОО «КазТехСервис»", email: "info@kaztechservice.kz", phone: "+7 727 123 4567", company: "КазТехСервис" },
  { name: "ИП Сулейманов А.К.", email: "suleimanov@mail.kz", phone: "+7 701 234 5678", company: "Сулейманов ИП" },
  { name: "АО «Астана Девелопмент»", email: "dev@astana-dev.kz", phone: "+7 717 345 6789", company: "Астана Девелопмент" },
  { name: "ТОО «ШымкентТрейд»", email: "trade@shymkent.kz", phone: "+7 725 456 7890", company: "ШымкентТрейд" },
  { name: "ОФ «Білім Орталығы»", email: "bilim@edu.kz", phone: "+7 727 567 8901", company: "Білім Орталығы" },
  { name: "ТОО «АлмаЛогистик»", email: "logistics@alma.kz", phone: "+7 727 678 9012", company: "АлмаЛогистик" },
  { name: "ИП Ким В.С.", email: "kimvs@inbox.kz", phone: "+7 702 789 0123", company: "Ким ИП" },
  { name: "ТОО «НурСтрой Групп»", email: "info@nurstroy.kz", phone: "+7 717 890 1234", company: "НурСтрой" },
  { name: "АО «Каспий Энерго»", email: "support@caspi-energy.kz", phone: "+7 712 901 2345", company: "Каспий Энерго" },
  { name: "ТОО «Digital Solutions KZ»", email: "hello@digsol.kz", phone: "+7 727 012 3456", company: "Digital Solutions" },
  { name: "ТОО «АлатауАгро»", email: "info@alatau-agro.kz", phone: "+7 727 222 1133", company: "АлатауАгро" },
  { name: "ИП Жакупов Е.С.", email: "zhakupov@gmail.com", phone: "+7 701 555 4422", company: "Жакупов ИП" },
  { name: "АО «АстанаМедика»", email: "office@astana-med.kz", phone: "+7 717 333 8899", company: "АстанаМедика" },
  { name: "ТОО «Казахмыс Ритейл»", email: "retail@kazakhmys.kz", phone: "+7 705 100 2030", company: "Казахмыс Ритейл" },
  { name: "ОФ «Болашак»", email: "info@bolashak.kz", phone: "+7 717 700 5050", company: "Болашак" },
];

type SentimentHint = "critical" | "high" | "medium" | "low";
type TicketSeed = readonly [Category, string, string, SentimentHint];

const tickets: TicketSeed[] = [
  ["urgent_outage", "Срочно! Потеря данных после обновления", "После вчерашнего обновления системы пропала вся база клиентов за последние 3 месяца. Более 500 записей. Это критическая ситуация — у нас отчётный период.", "critical"],
  ["urgent_outage", "Полный сбой системы с утра", "С 9:00 ни один сотрудник не может зайти в систему. Сервер вообще не отвечает. У нас останавливается работа колл-центра, теряем клиентов!", "critical"],
  ["urgent_outage", "База данных недоступна", "Получаем ошибку 'database connection failed' уже 40 минут. Звоню на горячую линию — никто не берёт. Прошу срочно отреагировать.", "critical"],
  ["urgent_outage", "Не работает API интеграции с банком", "Платежи через Halyk не проходят с 11:00. Все попытки возвращают 500. Терпим убытки, нужна срочная помощь!", "critical"],

  ["technical_issue", "Ошибка при формировании отчёта", "При попытке сформировать отчёт за первый квартал система зависает на 80% и выдаёт ошибку 500. Пробовал в разных браузерах.", "high"],
  ["technical_issue", "Система работает очень медленно", "Последнюю неделю CRM работает невыносимо медленно. Каждая страница грузится по 15-20 секунд. У нас 30 сотрудников.", "high"],
  ["technical_issue", "Ошибка 403 при загрузке документов", "При попытке загрузить договор в формате PDF в карточку клиента получаю ошибку 403 Forbidden. Размер файла 2.4 МБ.", "medium"],
  ["technical_issue", "Не работает экспорт в Excel", "При экспорте таблицы заявок в xlsx файл скачивается, но не открывается — ошибка повреждения. CSV экспорт работает нормально.", "medium"],
  ["technical_issue", "Поиск работает некорректно", "Поиск по клиентам не находит точные совпадения. Например, ввожу 'Сулейманов' — ничего не находит, хотя такой клиент есть.", "medium"],
  ["technical_issue", "Календарь сбрасывает встречи", "Создаю встречу в календаре, через час она пропадает. Уже три встречи потерял за неделю. Это баг или настройка?", "high"],
  ["technical_issue", "Виснет редактор сделок", "Когда добавляю больше 5 продуктов в сделку, редактор зависает на 30 секунд, потом выдаёт ошибку.", "medium"],

  ["account_access", "Не могу войти в систему", "Уже третий день не могу войти в личный кабинет. Пароль точно правильный, но система выдаёт ошибку авторизации.", "high"],
  ["account_access", "Двухфакторная аутентификация не работает", "После включения 2FA SMS-коды не приходят на номер +7 701 234 5678. Сотовый оператор Beeline. Уже три дня.", "high"],
  ["account_access", "Заблокирован аккаунт", "Вчера ввёл пароль 4 раза неправильно — система заблокировала аккаунт. Сброс пароля по email не работает.", "high"],
  ["account_access", "Не приходит письмо для сброса пароля", "Уже 5 раз нажимал «Забыли пароль?», письмо не приходит. Проверял спам, корзину — пусто. Email указан верно.", "medium"],
  ["account_access", "Сотрудник уволен — нужно отозвать доступ", "Уволили менеджера, но он всё ещё может заходить в CRM. Не могу найти где отозвать его учётку. Угроза безопасности данных.", "high"],

  ["billing", "Выставите счёт за март", "Просим выставить счёт-фактуру за услуги марта 2026 года. Реквизиты организации прежние. Бухгалтерия просит до конца недели.", "low"],
  ["billing", "Возврат переплаты", "В прошлом месяце произошла двойная оплата по счёту №INV-2026-0089. Сумма переплаты 145 000 тенге. Просим произвести возврат.", "medium"],
  ["billing", "Вопрос о тарифных планах", "Сейчас на тарифе «Стандарт», но количество сотрудников выросло с 15 до 40 человек. Подскажите, какой тариф нам подойдёт?", "low"],
  ["billing", "Не приходит акт сверки", "Запрашивали акт сверки за квартал 5 дней назад, до сих пор не получили. Бухгалтерия закрывает период.", "medium"],
  ["billing", "Изменение реквизитов", "Сменился расчётный счёт. Просим обновить реквизиты в наших договорах: новый IBAN — KZ759470398... Высылаю карточку организации.", "low"],
  ["billing", "Скидка для НКО", "Мы благотворительный фонд. Есть ли у вас специальные условия или скидки для некоммерческих организаций?", "low"],
  ["billing", "Двойное списание с карты", "С корпоративной карты Visa списали 89 000 тенге дважды — 14 и 15 апреля. В обоих случаях указан одинаковый счёт.", "high"],

  ["feature_request", "Запрос на добавление отчёта", "Было бы удобно формировать отчёт по продажам в разрезе регионов Казахстана. Сейчас приходится выгружать в Excel и группировать вручную.", "low"],
  ["feature_request", "Предложение по улучшению интерфейса", "Было бы удобно добавить тёмную тему и возможность настраивать столбцы в таблице заявок. Также хотелось бы видеть дашборд на главном экране.", "low"],
  ["feature_request", "Массовая рассылка email", "Хотим рассылать рекламные предложения по сегментам клиентов прямо из CRM, без выгрузки в стороннюю рассылку. Возможно?", "low"],
  ["feature_request", "Воронка продаж в виде канбана", "Сейчас сделки списком — хотим видеть их канбан-доской с этапами. Это сильно ускорило бы работу менеджеров.", "low"],
  ["feature_request", "API для мобильного приложения", "Разрабатываем своё мобильное приложение для торговых представителей. Нужен публичный REST API с документацией.", "medium"],

  ["complaint", "Жалоба на качество обслуживания", "Обращаюсь повторно! Прошлая заявка №4521 была создана 2 недели назад и до сих пор не решена. Менеджер обещал перезвонить — не перезвонил.", "high"],
  ["complaint", "Грубое общение оператора поддержки", "Оператор Сергей Б. в чате отвечал односложно и в итоге написал «решите сами». Это неприемлемый сервис за такие деньги.", "high"],
  ["complaint", "Несоблюдение SLA", "По договору первый ответ — 2 часа. По факту последние 3 заявки ответ был через 6, 8 и 11 часов. Где компенсация по SLA?", "high"],
  ["complaint", "Обновление сломало настройки", "Без предупреждения откатили мои кастомные поля и отчёты. Восстанавливать вручную — это сотни часов работы. Кто компенсирует?", "high"],

  ["integration", "Интеграция с 1С Бухгалтерией", "Интересует возможность интеграции вашей CRM с 1С:Бухгалтерия 8.3, конфигурация для Казахстана. Какие варианты подключения доступны?", "medium"],
  ["integration", "Подключение Telegram-бота", "Хотим подключить приём заявок через Telegram-бот. Клиенты пишут нам в Телеграм, было бы удобно автоматически создавать заявки.", "medium"],
  ["integration", "Webhook на смену статуса сделки", "Нам нужно получать webhook на нашу систему когда сделка переходит в статус «Выиграна». Это есть или надо разрабатывать?", "medium"],
  ["integration", "Интеграция с Kaspi Pay", "Хотим принимать оплату по ссылке Kaspi прямо из карточки сделки. У вас есть такая интеграция или планируется?", "medium"],
  ["integration", "Импорт контактов из Outlook", "Есть готовый коннектор для синхронизации контактов и встреч с Microsoft 365 / Outlook? Или это надо самим разрабатывать?", "low"],

  ["general_inquiry", "Обучение новых сотрудников", "Приняли 5 новых менеджеров. Нужно организовать обучение по работе с CRM. Можно онлайн-сессию на следующей неделе?", "low"],
  ["general_inquiry", "Где скачать мобильное приложение", "Коллеги говорят, у вас есть мобильное приложение, но в App Store найти не могу. Подскажите ссылку или название.", "low"],
  ["general_inquiry", "Сертификация безопасности", "Готовим тендер для госсектора, требуется ваш сертификат соответствия СТ РК ИСО/МЭК 27001. Можете прислать копию?", "low"],
  ["general_inquiry", "Часовой пояс отчётов", "В каком часовом поясе формируются отчёты — по серверу или по настройкам пользователя? У нас офисы в Алматы и Астане.", "low"],
  ["general_inquiry", "Не приходят уведомления", "Перестали приходить email-уведомления о новых заявках. Раньше работало, после обновления в прошлую пятницу перестало.", "medium"],
];

const REASONING: Record<Category, string> = {
  urgent_outage: "Обнаружены ключевые слова срочности и потери работоспособности — наивысший приоритет.",
  technical_issue: "Описание содержит конкретную техническую ошибку, влияющую на работу пользователя.",
  account_access: "Заявка касается доступа к учётной записи, требует проверки безопасности.",
  billing: "Финансовый запрос, направлен в группу биллинга.",
  feature_request: "Предложение по развитию продукта, не требует немедленной реакции.",
  complaint: "Негативная тональность и упоминания SLA — требует внимания менеджера.",
  integration: "Запрос на интеграцию с внешней системой, требует технической экспертизы.",
  general_inquiry: "Общий вопрос, может быть обработан стандартной процедурой.",
};

const PRIORITY_SCORE: Record<SentimentHint, number> = { critical: 88, high: 67, medium: 42, low: 18 };
const STATUS_BY_AGE: TicketStatus[] = ["new", "in_progress", "in_progress", "resolved", "resolved", "closed"];

function priorityFromScore(score: number): TicketPriority {
  if (score >= 76) return "critical";
  if (score >= 51) return "high";
  if (score >= 26) return "medium";
  return "low";
}

export async function runSeed(): Promise<{ users: number; clients: number; tickets: number }> {
  await Promise.all([User.deleteMany({}), Client.deleteMany({}), Ticket.deleteMany({}), TicketHistory.deleteMany({})]);

  const createdUsers = await User.create(users);
  const createdClients = await Client.create(clients);
  const admin = createdUsers[0]!;
  const operators = createdUsers.filter((u) => u.role === "operator");

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let createdCount = 0;

  for (let i = 0; i < tickets.length; i++) {
    const [category, title, description, sentiment] = tickets[i]!;
    const client = createdClients[i % createdClients.length]!;
    const ageDays = (i % 7) + Math.random();
    const createdAt = new Date(now - ageDays * day - Math.random() * day);
    const status = STATUS_BY_AGE[Math.min(STATUS_BY_AGE.length - 1, Math.floor(ageDays))]!;

    const matches = operators.filter((op) => op.skills.includes(category));
    const pool = matches.length > 0 ? matches : operators;
    const operator = pool[Math.floor(Math.random() * pool.length)]!;
    const score = PRIORITY_SCORE[sentiment] + Math.floor(Math.random() * 8 - 4);
    const priority = priorityFromScore(score);

    const firstResponseAt = status !== "new" ? new Date(createdAt.getTime() + (15 + Math.random() * 90) * 60 * 1000) : undefined;
    const resolvedAt = status === "resolved" || status === "closed"
      ? new Date(createdAt.getTime() + (60 + Math.random() * 480) * 60 * 1000)
      : undefined;

    const ticket = await Ticket.create({
      title,
      description,
      clientId: client._id,
      createdBy: admin._id,
      assigneeId: operator._id,
      status,
      priority,
      category,
      aiCategory: category,
      aiConfidence: 0.85 + Math.random() * 0.13,
      aiScore: score,
      aiReason: `Категория: ${REASONING[category]} | Приоритет: ${priority}/${score} | Назначен: ${operator.name}.`,
      aiProcessedAt: new Date(createdAt.getTime() + 1500),
      createdAt,
      firstResponseAt,
      resolvedAt,
    });

    await TicketHistory.insertMany(
      [
        { ticketId: ticket._id, action: "created", newValue: "new", performedBy: admin._id, comment: `Заявка создана: ${title}`, createdAt },
        {
          ticketId: ticket._id,
          action: "ai_processed",
          newValue: JSON.stringify({ category, priority, score, assignee: operator.name }),
          comment: `ИИ-анализ завершён за ${1200 + Math.floor(Math.random() * 800)}мс. Категория: ${category} (${Math.round((0.85 + Math.random() * 0.13) * 100)}%). Приоритет: ${priority} (${score}/100). Назначен: ${operator.name}.`,
          createdAt: new Date(createdAt.getTime() + 1500),
        },
        ...(firstResponseAt
          ? [{ ticketId: ticket._id, action: "status_changed" as const, oldValue: "new", newValue: "in_progress", performedBy: operator._id, createdAt: firstResponseAt }]
          : []),
        ...(resolvedAt
          ? [{ ticketId: ticket._id, action: "status_changed" as const, oldValue: "in_progress", newValue: "resolved", performedBy: operator._id, createdAt: resolvedAt }]
          : []),
      ]
    );

    createdCount++;
  }

  for (const op of operators) {
    const load = await Ticket.countDocuments({ assigneeId: op._id, status: { $in: ["new", "in_progress"] } });
    await User.findByIdAndUpdate(op._id, { currentLoad: load });
  }
  for (const c of createdClients) {
    const count = await Ticket.countDocuments({ clientId: c._id });
    const satisfaction = 3 + Math.random() * 2;
    await Client.findByIdAndUpdate(c._id, { totalTickets: count, avgSatisfaction: Math.round(satisfaction * 10) / 10 });
  }

  return { users: createdUsers.length, clients: createdClients.length, tickets: createdCount };
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required for the standalone seed script.");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
  const stats = await runSeed();
  console.log(`Created ${stats.users} users, ${stats.clients} clients, ${stats.tickets} tickets`);
  console.log("\n--- Login credentials ---");
  console.log("Admin:    admin@crm.kz / admin123");
  console.log("Manager:  aliya@crm.kz / pass123");
  console.log("Operator: aizhan@crm.kz / pass123");
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
