import { evalite } from "evalite";
import { generateResponse } from "./helpers.ts";
import { matchesPattern, minLength, notContainsText } from "./scorers.ts";

evalite("Recommendations", {
  data: () => [
    {
      input: "Recommend me a sci-fi movie",
    },
    {
      input: "I'm feeling sad, recommend something uplifting",
    },
    {
      input: "What are some good Christopher Nolan movies?",
    },
  ],
  task: async (input) => {
    return generateResponse(input);
  },
  scorers: [
    minLength(50),
    notContainsText("http://"),
    notContainsText("https://"),
    matchesPattern(/\b(19|20)\d{2}\b/),
  ],
});
