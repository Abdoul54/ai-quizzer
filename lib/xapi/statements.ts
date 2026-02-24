import { Statement } from "@xapi/xapi";
import { sendXApiStatement } from "./client";

const XAPI_BASE = process.env.NEXT_PUBLIC_APP_URL || "https://yourapp.com";

const verbs = {
    launched: { id: "http://adlnet.gov/expapi/verbs/launched", display: { "en-US": "launched" } },
    answered: { id: "http://adlnet.gov/expapi/verbs/answered", display: { "en-US": "answered" } },
    passed: { id: "http://adlnet.gov/expapi/verbs/passed", display: { "en-US": "passed" } },
    failed: { id: "http://adlnet.gov/expapi/verbs/failed", display: { "en-US": "failed" } },
    interacted: { id: "http://adlnet.gov/expapi/verbs/interacted", display: { "en-US": "interacted" } },
};

interface Actor { name: string; email: string; }

export const statementLaunchedQuiz = (actor: Actor, quiz: { id: string; title: string }) =>
    sendXApiStatement({
        actor: { name: actor.name, mbox: `mailto:${actor.email}` },
        verb: verbs.launched,
        object: {
            objectType: "Activity",
            id: `${XAPI_BASE}/quiz/${quiz.id}`,
            definition: {
                type: "http://adlnet.gov/expapi/activities/assessment",
                name: { "en-US": quiz.title },
            },
        },
    } as Statement);

export const statementAnsweredQuestion = (
    actor: Actor,
    quiz: { id: string; title: string },
    question: { id: string; text: string },
    response: string,
    correct: boolean,
) =>
    sendXApiStatement({
        actor: { name: actor.name, mbox: `mailto:${actor.email}` },
        verb: verbs.answered,
        object: {
            objectType: "Activity",
            id: `${XAPI_BASE}/quiz/${quiz.id}/question/${question.id}`,
            definition: {
                type: "http://adlnet.gov/expapi/activities/cmi.interaction",
                name: { "en-US": question.text },
            },
        },
        result: { response, success: correct },
        context: {
            contextActivities: {
                parent: [{ id: `${XAPI_BASE}/quiz/${quiz.id}`, objectType: "Activity" as const }],
            },
        },
    } as Statement);

export const statementCompletedQuiz = (
    actor: Actor,
    quiz: { id: string; title: string },
    score: number,
    total: number,
    durationSeconds: number,
) => {
    const scaled = score / total;
    return sendXApiStatement({
        actor: { name: actor.name, mbox: `mailto:${actor.email}` },
        verb: scaled >= 0.7 ? verbs.passed : verbs.failed,
        object: {
            objectType: "Activity",
            id: `${XAPI_BASE}/quiz/${quiz.id}`,
            definition: {
                type: "http://adlnet.gov/expapi/activities/assessment",
                name: { "en-US": quiz.title },
            },
        },
        result: {
            score: { scaled, raw: score, min: 0, max: total },
            success: scaled >= 0.7,
            completion: true,
            duration: `PT${Math.floor(durationSeconds)}S`,
        },
    } as Statement);
};

export const statementSelectedOption = (
    actor: Actor,
    quiz: { id: string; title: string },
    question: { id: string; text: string },
    response: string,
) =>
    sendXApiStatement({
        actor: { name: actor.name, mbox: `mailto:${actor.email}` },
        verb: verbs.interacted,
        object: {
            objectType: "Activity",
            id: `${XAPI_BASE}/quiz/${quiz.id}/question/${question.id}`,
            definition: {
                type: "http://adlnet.gov/expapi/activities/cmi.interaction",
                name: { "en-US": question.text },
            },
        },
        result: { response },
        context: {
            contextActivities: {
                parent: [{ id: `${XAPI_BASE}/quiz/${quiz.id}`, objectType: "Activity" as const }],
            },
        },
    } as Statement);