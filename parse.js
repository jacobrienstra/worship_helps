const fs = require("fs");
const mtif = require("mtif");
const jsyaml = require("js-yaml");
const TurndownService = require("turndown");
const cheerio = require("cheerio");
const Bluebird = require("bluebird");
const axios = require("axios");
const Path = require("path");
const slug = require("slug");

function getFileNameFromUri(uri) {
  const s = uri.split("/");
  const fname = s[s.length - 1];
  return decodeURI(fname).slice(-20);
}

let stream = mtif("blog.txt");
let service = new TurndownService();

stream.on("error", function (err) {
  console.log(err);
});

let posts = [];

stream.on("entry", function (entry) {
  posts.push(entry);
});

stream.on("end", function () {
  parse(posts);
});

async function parse(entries) {
  await Bluebird.each(entries, async (entry) => {
    console.log(`Starting on ${entry.data.title}`);
    if (entry.body) {
      var body = entry.body;
      if (entry.extendedBody) {
        body += "\n***\n" + entry.extendedBody;
      }
      const Cheerio = cheerio.load(body);
      await Bluebird.mapSeries(
        Cheerio("img").toArray().concat(Cheerio("a").toArray()),
        async (el) => {
          if (el.name === "img") {
            let imgSrc = Cheerio(el).attr("src");
            let fileName = getFileNameFromUri(imgSrc);
            const imgPath = Path.resolve(__dirname, "img", fileName);
            if (!/pdf$|jpg$|jpeg$|png$|gif$|mp3$|mid$|m4a$/.test(fileName)) {
              fileName = `${fileName}.png`;
            }

            // download all pictures for us
            let imgResponse = await axios({
              method: "get",
              url: imgSrc,
              responseType: "stream",
            }).catch((e) => {
              imgSrc = imgSrc.replace("http://", "https://");
              return axios({
                method: "get",
                url: imgSrc,
                responseType: "stream",
              }).catch((e) => {
                console.log(imgSrc, `(${e.message})\n`);
              });
            });

            if (
              imgResponse &&
              imgResponse.status >= 200 &&
              imgResponse.status < 300
            ) {
              await imgResponse.data.pipe(fs.createWriteStream(imgPath));

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
            aHref = aHref.replace(".shared/image.html?/", "");
            if (aHref.startsWith("http")) {
              const linkTest = await axios({
                method: "get",
                url: aHref,
                responseType: "stream",
              }).catch((e) => {
                aHref = aHref.replace("http://", "https://");
                return axios({
                  method: "get",
                  url: aHref,
                  responseType: "stream",
                }).catch((e) => {
                  console.log(aHref, `(${e.message})\n`);
                });
              });

              // Download any pictures currently hosted
              if (
                linkTest &&
                linkTest.status >= 200 &&
                linkTest.status < 300 &&
                /http(s)?:\/\/worshiphelps.blogs.com/.test(aHref) &&
                /pdf$|jpg$|jpeg$|png$|gif$|mp3$|mid$|m4a$/.test(aHref)
              ) {
                const fileName = getFileNameFromUri(aHref);
                const imgPath = Path.resolve(
                  __dirname,
                  "img/shared/",
                  fileName
                );
                await linkTest.data.pipe(fs.createWriteStream(imgPath));

                Cheerio(el).attr("href", imgPath.replace(__dirname, ""));

                await new Promise((resolve, reject) => {
                  linkTest.data.on("end", () => {
                    resolve();
                  });
                  linkTest.data.on("error", () => {
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
    console.log(`Finished ${entry.data.title}`);
  });
}
