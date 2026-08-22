import { logger } from "../logger.js";

type Task = () => Promise<void>;

/**
 * Последовательная фоновая очередь внутри процесса.
 * Назначение: снять обработку вебхука с HTTP-запроса, не поднимая Redis.
 * Точка расширения: заменить реализацию на BullMQ, сохранив интерфейс enqueue().
 */
export class InProcessQueue {
  private readonly pending: Array<{ name: string; task: Task }> = [];
  private running = false;
  private drainWaiters: Array<() => void> = [];

  enqueue(name: string, task: Task): void {
    this.pending.push({ name, task });
    void this.drain();
  }

  /** Для тестов и graceful shutdown: дождаться, пока очередь опустеет. */
  async whenIdle(): Promise<void> {
    if (!this.running && this.pending.length === 0) return;
    await new Promise<void>((resolve) => {
      this.drainWaiters.push(resolve);
    });
  }

  get size(): number {
    return this.pending.length;
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;

    while (this.pending.length > 0) {
      const item = this.pending.shift();
      if (!item) break;
      try {
        await item.task();
      } catch (error) {
        logger.error({ err: error, task: item.name }, "Фоновая задача завершилась ошибкой");
      }
    }

    this.running = false;
    const waiters = this.drainWaiters;
    this.drainWaiters = [];
    for (const resolve of waiters) resolve();
  }
}

export const backgroundQueue = new InProcessQueue();