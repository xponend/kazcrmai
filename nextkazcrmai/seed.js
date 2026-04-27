require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Client = require("./models/Client");
const Ticket = require("./models/Ticket");
const TicketHistory = require("./models/TicketHistory");

const users = [
  { name: "Админ Системы", email: "admin@crm.kz", password: "admin123", role: "admin", skills: ["all"] },
  { name: "Менеджер Алия", email: "aliya@crm.kz", password: "pass123", role: "manager", skills: ["billing", "complaint"] },
  { name: "Айжан Серікова", email: "aizhan@crm.kz", password: "pass123", role: "operator", skills: ["technical_issue", "urgent_outage", "account_access"], currentLoad: 0 },
  { name: "Бауыржан Қасымов", email: "baurzhan@crm.kz", password: "pass123", role: "operator", skills: ["billing", "general_inquiry", "feature_request"], currentLoad: 0 },
  { name: "Дана Нұрланова", email: "dana@crm.kz", password: "pass123", role: "operator", skills: ["integration", "technical_issue", "feature_request"], currentLoad: 0 },
  { name: "Ерлан Мұратов", email: "erlan@crm.kz", password: "pass123", role: "operator", skills: ["complaint", "general_inquiry", "billing"], currentLoad: 0 },
  { name: "Гүлнар Ахметова", email: "gulnar@crm.kz", password: "pass123", role: "operator", skills: ["account_access", "technical_issue", "urgent_outage"], currentLoad: 0 },
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
];

const tickets = [
  { title: "Не могу войти в систему", description: "Добрый день! Уже третий день не могу войти в личный кабинет. Пароль точно правильный, но система выдаёт ошибку авторизации. Пробовал сбросить пароль — письмо не приходит. Работа стоит, прошу решить вопрос срочно.", clientIdx: 0 },
  { title: "Срочно! Потеря данных после обновления", description: "После вчерашнего обновления системы пропала вся база клиентов за последние 3 месяца. Более 500 записей. Это критическая ситуация — у нас отчётный период, бухгалтерия требует данные до пятницы. Необходимо немедленное восстановление!", clientIdx: 1 },
  { title: "Выставите счёт за март", description: "Здравствуйте, просим выставить счёт-фактуру за услуги марта 2026 года. Реквизиты организации прежние. Бухгалтерия просит до конца недели. Спасибо.", clientIdx: 2 },
  { title: "Интеграция с 1С Бухгалтерией", description: "Добрый день! Нас интересует возможность интеграции вашей CRM с 1С:Бухгалтерия 8.3. Используем конфигурацию для Казахстана. Какие варианты подключения доступны? Есть ли готовый модуль обмена данными или нужна разработка?", clientIdx: 3 },
  { title: "Жалоба на качество обслуживания", description: "Обращаюсь повторно! Прошлая заявка №4521 была создана 2 недели назад и до сих пор не решена. Менеджер Арман обещал перезвонить ещё в понедельник, но так и не перезвонил. Это неприемлемый уровень сервиса. Прошу руководство взять ситуацию под контроль.", clientIdx: 4 },
  { title: "Запрос на добавление отчёта", description: "Было бы удобно иметь в системе возможность формировать отчёт по продажам в разрезе регионов Казахстана. Сейчас приходится выгружать всё в Excel и группировать вручную. Если есть техническая возможность — просим добавить.", clientIdx: 5 },
  { title: "Ошибка при формировании отчёта", description: "При попытке сформировать отчёт за первый квартал система зависает на 80% и выдаёт ошибку 500. Пробовал в разных браузерах — Chrome, Firefox. Результат одинаковый. Отчёт нужен для совещания завтра утром.", clientIdx: 6 },
  { title: "Вопрос о тарифных планах", description: "Добрый день! Мы сейчас на тарифе «Стандарт», но количество сотрудников выросло с 15 до 40 человек. Подскажите, какой тариф нам подойдёт? Есть ли скидки при оплате на год? Интересует также, есть ли отдельный тариф для НКО.", clientIdx: 7 },
  { title: "Система работает очень медленно", description: "Последнюю неделю CRM работает невыносимо медленно. Каждая страница грузится по 15-20 секунд. У нас 30 сотрудников одновременно работают в системе. Интернет у нас 100 Мбит — проблема точно не на нашей стороне. Продуктивность упала в три раза.", clientIdx: 8 },
  { title: "Подключение Telegram-бота", description: "Хотим подключить приём заявок через Telegram-бот. Клиенты пишут нам в Телеграм, и было бы удобно, чтобы сообщения автоматически создавались как заявки в CRM. Есть ли такая возможность или API для интеграции?", clientIdx: 9 },
  { title: "Возврат переплаты", description: "В прошлом месяце произошла двойная оплата по счёту №INV-2026-0089. Сумма переплаты 145 000 тенге. Просим произвести возврат на расчётный счёт организации. Реквизиты прилагаю.", clientIdx: 0 },
  { title: "Не приходят уведомления", description: "Перестали приходить email-уведомления о новых заявках. Раньше всё работало, после обновления в прошлую пятницу перестало. Push-уведомления тоже не приходят. Настройки не менял.", clientIdx: 3 },
  { title: "Обучение новых сотрудников", description: "Приняли на работу 5 новых менеджеров. Нужно организовать обучение по работе с CRM. Можно ли провести онлайн-сессию на следующей неделе? Удобное время — вторник или среда после 14:00.", clientIdx: 5 },
  { title: "Ошибка 403 при загрузке документов", description: "При попытке загрузить договор в формате PDF в карточку клиента получаю ошибку 403 Forbidden. Размер файла 2.4 МБ. Другие файлы (картинки) загружаются нормально. Возможно, проблема с разрешениями.", clientIdx: 8 },
  { title: "Предложение по улучшению интерфейса", description: "Пользуемся CRM уже год. Было бы удобно добавить тёмную тему и возможность настраивать столбцы в таблице заявок. Также хотелось бы видеть дашборд с графиками прямо на главном экране, а не переходить в отдельный раздел.", clientIdx: 9 },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({}),
    Ticket.deleteMany({}),
    TicketHistory.deleteMany({}),
  ]);
  console.log("Cleared existing data");

  // Create users
  const createdUsers = await User.create(users);
  console.log(`Created ${createdUsers.length} users`);

  // Create clients
  const createdClients = await Client.create(clients);
  console.log(`Created ${createdClients.length} clients`);

  // Create tickets (without AI — those get processed live during demo)
  const admin = createdUsers[0];
  const operators = createdUsers.filter((u) => u.role === "operator");

  for (const t of tickets) {
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const statuses = ["new", "in_progress", "resolved", "closed"];
    const priorities = ["low", "medium", "high", "critical"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];

    const ticket = await Ticket.create({
      title: t.title,
      description: t.description,
      clientId: createdClients[t.clientIdx]._id,
      createdBy: admin._id,
      assigneeId: operator._id,
      status,
      priority,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // random within last week
      ...(status === "resolved" ? { resolvedAt: new Date(), firstResponseAt: new Date(Date.now() - Math.random() * 60 * 60 * 1000) } : {}),
      ...(status === "in_progress" ? { firstResponseAt: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000) } : {}),
    });

    await TicketHistory.create({
      ticketId: ticket._id,
      action: "created",
      newValue: "new",
      performedBy: admin._id,
    });

    if (status !== "new") {
      operator.currentLoad += 1;
    }
  }

  // Update operator loads
  for (const op of operators) {
    const load = await Ticket.countDocuments({ assigneeId: op._id, status: { $in: ["new", "in_progress"] } });
    await User.findByIdAndUpdate(op._id, { currentLoad: load });
  }

  // Update client ticket counts
  for (const c of createdClients) {
    const count = await Ticket.countDocuments({ clientId: c._id });
    await Client.findByIdAndUpdate(c._id, { totalTickets: count, avgSatisfaction: 3 + Math.random() * 2 });
  }

  console.log(`Created ${tickets.length} tickets with history`);
  console.log("\n--- Login credentials ---");
  console.log("Admin:    admin@crm.kz / admin123");
  console.log("Manager:  aliya@crm.kz / pass123");
  console.log("Operator: aizhan@crm.kz / pass123");
  console.log("Operator: baurzhan@crm.kz / pass123");

  await mongoose.disconnect();
  console.log("\nDone! Run: npm run dev");
}

seed().catch(console.error);
