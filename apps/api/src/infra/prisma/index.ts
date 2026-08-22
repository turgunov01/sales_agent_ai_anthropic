import { getPrisma, getTenantResolutionPrisma } from "../../core/prisma.js";
import type { Repositories } from "../../domain/repositories.js";
import { PrismaChannelsRepository } from "./channels.repository.js";
import { PrismaCompaniesRepository } from "./companies.repository.js";
import { PrismaConversationsRepository } from "./conversations.repository.js";
import { PrismaCustomersRepository } from "./customers.repository.js";
import { PrismaKnowledgeRepository } from "./knowledge.repository.js";
import { PrismaLeadsRepository } from "./leads.repository.js";
import { PrismaPlatformRepository } from "./platform.repository.js";
import { PrismaProductsRepository } from "./products.repository.js";
import { PrismaSessionsRepository } from "./sessions.repository.js";
import { PrismaUsersRepository } from "./users.repository.js";

export function createPrismaRepositories(): Repositories {
  const db = getPrisma();
  const raw = getTenantResolutionPrisma();

  return {
    platform: new PrismaPlatformRepository(raw),
    companies: new PrismaCompaniesRepository(db, raw),
    users: new PrismaUsersRepository(db, raw),
    sessions: new PrismaSessionsRepository(db),
    products: new PrismaProductsRepository(db),
    knowledge: new PrismaKnowledgeRepository(db),
    channels: new PrismaChannelsRepository(db, raw),
    customers: new PrismaCustomersRepository(db),
    conversations: new PrismaConversationsRepository(db),
    leads: new PrismaLeadsRepository(db),
  };
}