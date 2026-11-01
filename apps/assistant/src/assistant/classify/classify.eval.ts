import { afterAll, describe, it } from "vitest";
import { classifyMail } from "./classify-mail.ts";
import {
  classifyFixtures,
  mailOf,
  type EvalSuite,
} from "./eval/classify-fixtures.ts";
import { meterClassifierModel } from "./eval/meter-classifier-model.ts";
import { reportScores, scoreCase, type CaseScore } from "./eval/score-case.ts";

const meter = meterClassifierModel();
const reports: string[] = [];

function describeSuite(title: string, suite: EvalSuite) {
  const categories = suite.categoryNames.map((name) => ({
    id: `category:${name}`,
    name,
  }));
  const nameOf = (id: string | null) =>
    categories.find((category) => category.id === id)?.name ?? null;
  const scores: CaseScore[] = [];

  describe.concurrent(title, () => {
    afterAll(() => {
      reports.push(reportScores(title, scores));
    });

    it.for(suite.cases)("$name", async (evalCase, { expect }) => {
      const result = await classifyMail(
        mailOf(evalCase),
        {
          categories,
          senderRules: [],
          knownCorrespondent: evalCase.knownCorrespondent ?? false,
          locale: suite.locale,
          timeZone: suite.timeZone,
        },
        meter.model,
      );
      if (!result) throw new Error("No classification");
      const score = scoreCase(evalCase, result, nameOf, suite.locale);
      scores.push(score);

      expect.soft(score.bucket, score.got).toBe(true);
      expect.soft(score.category ?? true, score.got).toBe(true);
      expect.soft(score.event ?? true, score.got).toBe(true);
      expect.soft(score.language ?? true, score.got).toBe(true);
    });
  });
}

afterAll(() => {
  console.log([...reports, meter.summary()].join("\n"));
});

describeSuite("Classification, English (real model)", classifyFixtures.english);
describeSuite("Classification, Chinese (real model)", classifyFixtures.chinese);
