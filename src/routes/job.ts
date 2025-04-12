/**
 * ジョブ関連APIエンドポイント
 * @module JobRoutes
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getJob, listJobs, updateJob } from "../features/job/usecase";
import { JobStatus, MeetingCategory, UpdateJobRequest } from "../features/job/domain";

// Cloudflare Workers環境変数の型定義
interface Env {
  JOB_KV: KVNamespace;
}

// ジョブ関連APIのルーター - 環境変数の型を指定
const app = new Hono<{ Bindings: Env }>();

// ジョブの詳細情報を取得するエンドポイント
app.get("/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const env = c.env;

  const job = await getJob(env, jobId);

  if (!job) {
    return c.json({ error: "ジョブが見つかりません" }, 404);
  }

  return c.json(job);
});

// ジョブのステータス更新用のバリデーションスキーマ
const updateJobSchema = z.object({
  status: z
    .enum([
      JobStatus.PENDING,
      JobStatus.PROCESSING,
      JobStatus.COMPLETED,
      JobStatus.FAILED,
      JobStatus.SKIPPED,
    ])
    .optional(),
  category: z
    .enum([
      MeetingCategory.INTERNAL_MEETING,
      MeetingCategory.SMALL_TALK,
      MeetingCategory.PRIVATE,
      MeetingCategory.OTHER,
    ])
    .optional(),
  reason: z.string().optional(),
  notionPageId: z.string().optional(),
  notionPageUrl: z.string().optional(),
  error: z.string().optional(),
}) satisfies z.ZodType<Partial<UpdateJobRequest>>;

// ジョブ情報を更新するエンドポイント
app.patch(
  "/:jobId",
  zValidator("json", updateJobSchema),
  async (c) => {
    const jobId = c.req.param("jobId");
    const updateData = c.req.valid("json");
    const env = c.env;

    const updatedJob = await updateJob(env, jobId, updateData);

    if (!updatedJob) {
      return c.json({ error: "ジョブが見つかりません" }, 404);
    }

    return c.json(updatedJob);
  }
);

// 全ジョブ一覧を取得するエンドポイント
app.get("/", async (c) => {
  const limitParam = c.req.query("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 100;
  const env = c.env;

  const jobList = await listJobs(env, limit);

  return c.json(jobList);
});

export default app;
