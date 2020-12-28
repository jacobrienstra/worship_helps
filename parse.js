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
    var body = entry.body;
    if (entry.extendedBody) {
      body += "\n***\n" + entry.extendedBody;
    }
    const Cheerio = cheerio.load(body);
    Bluebird.map(
      Cheerio("img").toArray().concat(Cheerio("a").toArray()),
      async (el) => {
        if (el.name === "img") {
          const imgSrc = Cheerio(el).attr("src");
          const fileName = getFileNameFromUri(imgSrc);
          const imgPath = Path.resolve(__dirname, "img", fileName);

          const imgResponse = await axios({
            method: "get",
            url: imgSrc,
            responseType: "stream",
          }).catch(() => {});

          if (imgResponse) {
            imgResponse.data.pipe(fs.createWriteStream(imgPath));

            Cheerio(el).attr("src", imgPath.replace(__dirname, ""));

            await new Promise((resolve, reject) => {
              imgResponse.data.on("end", () => {
                resolve();
              });

              imgResponse.data.on("error", () => {
                reject();
              });
            });
          }
        } else if (el.name === "a") {
          let aHref = Cheerio(el).attr("href");
          if (
            /http(s)?:\/\/worshiphelps.blogs.com/.test(aHref) &&
            /pdf$|jpg$|jpeg$|png$|gif$|mp3$|mid$|m4a$/.test(aHref)
          ) {
            aHref = aHref.replace(".shared/image.html?/", "");
            const fileName = getFileNameFromUri(aHref);
            const imgPath = Path.resolve(__dirname, "img/shared/", fileName);

            const imgResponse = await axios({
              method: "get",
              url: aHref,
              responseType: "stream",
            }).catch((e) => {});

            if (imgResponse) {
              imgResponse.data.pipe(fs.createWriteStream(imgPath));

              Cheerio(el).attr("href", imgPath.replace(__dirname, ""));

              await new Promise((resolve, reject) => {
                imgResponse.data.on("end", () => {
                  resolve();
                });

                imgResponse.data.on("error", () => {
                  reject();
                });
              });
            }
          }
        }
      }
    ).then(() => {
      let body = Cheerio.html();
      if (entry.data.status === "Publish") {
        let [month, date, year] = entry.data.date
          .toLocaleDateString()
          .split("/");
        body = service.turndown(body);
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
