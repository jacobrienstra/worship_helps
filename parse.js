const fs = require("fs");
const mtif = require("mtif");
const jsyaml = require("js-yaml");
const TurndownService = require("turndown");
const cheerio = require("cheerio");
const Bluebird = require("bluebird");
const axios = require("axios");
const Path = require("path");

function getFileNameFromUri(uri) {
  const s = uri.split("/");
  const fname = s[s.length - 1];
  return decodeURI(fname);
}

let stream = mtif("blog.txt");
let service = new TurndownService();

stream.on("error", function (err) {
  console.log(err);
});

stream.on("entry", async function (entry) {
  if (entry.body) {
    const Cheerio = cheerio.load(entry.body);
    Bluebird.map(Cheerio("img").toArray(), async (el) => {
      const src = Cheerio(el).attr("src");
      const fileName = getFileNameFromUri(src);
      const path = Path.resolve(__dirname, "img", fileName);

      const response = await axios({
        method: "get",
        url: src,
        responseType: "stream",
      }).catch(() => {});

      if (response) {
        response.data.pipe(fs.createWriteStream(path));

        Cheerio(el).attr("src", "/img/" + fileName);

        await new Promise((resolve, reject) => {
          response.data.on("end", () => {
            resolve();
          });

          response.data.on("error", () => {
            reject();
          });
        });
      }
    }).then(() => {
      let body = Cheerio.html();
      if (entry.data.status === "Publish") {
        let [month, date, year] = entry.data.date
          .toLocaleDateString()
          .split("/");
        body = service.turndown(body);
        if (entry.extendedBody) {
          body += "\n***\n" + service.turndown(entry.extendedBody);
        } // TODO: add to processing
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
  }
});

stream.on("end", function () {});
