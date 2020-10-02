const fs = require("fs");
const mtif = require("mtif");
const jsyaml = require("js-yaml");
const TurndownService = require("turndown");

let stream = mtif("blog.txt");
let service = new TurndownService();

stream.on("error", function (err) {
  console.log(err);
});

stream.on("entry", function (entry) {
  if (entry.data.status === "Publish") {
    let [month, date, year] = entry.data.date.toLocaleDateString().split("/");
    var body = service.turndown(entry.body);
    if (entry.extendedBody) {
      body += "\n***\n" + service.turndown(entry.extendedBody);
    }
    let permalink = entry.data.uniqueUrl.replace(
      "https://worshiphelps.blogs.com",
      ""
    );
    let path = entry.data.uniqueUrl
      .split("/")
      .pop()
      .replace(".html", "")
      .trim();
    fs.writeFileSync(
      `posts/${year}-${month}-${date}-${path}.md`,
      `---
layout: post.pug
permalink: ${permalink}
${jsyaml.safeDump(
  Object.assign(entry.data, {
    comments: entry.comments,
    keywords: entry.keywords,
    tags: entry.data.category.concat(["post"]),
  })
)}---
${body}`
    );
  }
});

stream.on("end", function () {});
