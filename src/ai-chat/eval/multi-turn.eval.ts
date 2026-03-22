import { evalite } from "evalite";
import { generateMultiTurnResponse } from "./helpers.ts";
import { matchesPattern, minLength } from "./scorers.ts";

evalite("Multi-turn: Refinement", {
  data: () => [
    {
      input: [
        { userMessage: "Recommend me a movie" },
        { userMessage: "Something more recent, from the last few years" },
      ],
    },
  ],
  task: async (turns) => {
    const results = await generateMultiTurnResponse(turns);
    const lastTurn = results[results.length - 1];
    if (!lastTurn) {
      throw new Error("No results from multi-turn conversation");
    }
    return lastTurn.responseText;
  },
  scorers: [minLength(50), matchesPattern(/\b(201[5-9]|202[0-9])\b/)],
});

evalite("Multi-turn: Genre switch", {
  data: () => [
    {
      input: [
        { userMessage: "Recommend me a horror movie" },
        {
          userMessage:
            "Actually, I changed my mind. How about a comedy instead?",
        },
      ],
    },
  ],
  task: async (turns) => {
    const results = await generateMultiTurnResponse(turns);
    const lastTurn = results[results.length - 1];
    if (!lastTurn) {
      throw new Error("No results from multi-turn conversation");
    }
    return lastTurn.responseText;
  },
  scorers: [
    minLength(50),
    matchesPattern(/comedy|comedies|funny|laugh|humou?r|hilarious/i),
  ],
});
