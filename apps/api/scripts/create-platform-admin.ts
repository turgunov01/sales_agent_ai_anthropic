import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/core/security/password.js";

/**
 * Заведение первого оператора платформы: в интерфейсе такой кнопки нет
 * и быть не должно — иначе её нашёл бы кто угодно.
 *
 *   npm run platform:admin -w @ai-sales/api
 *   npm run platform:admin -w @ai-sales/api -- --email a@b.uz --name "Имя" --password "..."
 */
const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const email = (arg("email") ?? (await rl.question("Email оператора: "))).trim().toLowerCase();
  const fullName = (arg("name") ?? (await rl.question("Имя: "))).trim();
  const password = arg("password") ?? (await rl.question("Пароль (мин. 10 символов): "));
  rl.close();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Некорректный email");
  if (fullName.length < 2) throw new Error("Слишком короткое имя");
  if (password.length < 10) throw new Error("Пароль должен быть не короче 10 символов");
  if (!/[A-Za-zА-Яа-я]/.test(password) || !/\d/.test(password)) {
    throw new Error("Пароль должен содержать букву и цифру");
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.platformAdmin.upsert({
    where: { email },
    create: { email, fullName, passwordHash },
    update: { fullName, passwordHash, isActive: true },
  });

  const total = await prisma.platformAdmin.count();
  console.log(`Оператор сохранён: ${admin.email} (${admin.fullName})`);
  console.log(`Всего операторов платформы: ${total}`);
}

main()
  .catch((error: unknown) => {
    console.error("Не удалось создать оператора:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });