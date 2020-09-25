const fs = require("fs");
const mtif = require("mtif");
const jsyaml = require("js-yaml");
const TurndownService = require("turndown");

let stream = mtif("blog.txt");
let service = new TurndownService();

stream.on("error", function (err) {
  console.log("err");
  console.log(err);
});

stream.on("entry", function (entry) {
  if (entry.data.status === "Publish") {
    let [month, date, year] = entry.data.date.toLocaleDateString().split("/");
    var body = service.turndown(entry.body);
    if (entry.extendedBody) {
      body += "\n***\n" + service.turndown(entry.extendedBody);
    }
    let path = entry.data.uniqueUrl
      .split("/")
      .pop()
      .replace(".html", "")
      .trim();
    fs.writeFileSync(
      `posts/${year}-${month}-${date}-${path}.md`,
      `---
${jsyaml.safeDump(
  Object.assign(entry.data, {
    comments: entry.comments,
    keywords: entry.keywords,
  })
)}---
${body}`
    );
  }
});

stream.on("end", function () {});
