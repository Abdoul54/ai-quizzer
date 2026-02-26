// scripts/board.ts
import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { quizQueue } from "@/lib/queue";

const serverAdapter = new ExpressAdapter();
createBullBoard({ queues: [new BullMQAdapter(quizQueue)], serverAdapter });

const app = express();
app.use("/", serverAdapter.getRouter());
app.listen(3001, () => console.log("Bull Board running at http://localhost:3001"));