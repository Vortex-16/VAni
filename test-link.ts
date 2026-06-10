import { generateLinkCode } from "./artifacts/api-server/src/lib/linkCode";

for (let i = 0; i < 5; i++) {
  console.log(generateLinkCode());
}
