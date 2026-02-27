import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { minionQueue, quizQueue } from "../lib/queue";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/");

createBullBoard({
    queues: [
        new BullMQAdapter(quizQueue),
        new BullMQAdapter(minionQueue),
    ],
    serverAdapter,
});

const app = express();
app.use("/", serverAdapter.getRouter());
app.listen(3002, () => console.log("Bull Board running at http://localhost:3002"));